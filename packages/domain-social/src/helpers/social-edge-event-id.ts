import { createHash } from 'node:crypto';

/** Espace de noms fixe (UUID v4 tire une fois) des identifiants d'evenements de relations sociales. */
const SOCIAL_EDGE_EVENT_NAMESPACE = '6f1c2f6e-3a8e-4f43-9d1b-5c1b8c7a2e90';

function uuidToBytes(uuid: string): Buffer {
  return Buffer.from(uuid.replace(/-/g, ''), 'hex');
}

function bytesToUuid(bytes: Buffer): string {
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/**
 * Identifiant deterministe (UUID v5) de l'evenement metier ecrit apres l'application d'un job
 * `SOCIAL_EDGE_APPLY`. Derive de l'id du job (= id de la ligne `jobs_outbox`) et du type
 * d'evenement : un job rejoue produit le meme id, donc `INSERT ... ON CONFLICT (id) DO NOTHING`
 * absorbe le doublon. Deux intentions successives sur le meme couple (like, unlike, like) ont
 * chacune leur job, donc leur propre evenement.
 */
export function buildSocialEdgeEventId(jobId: string, eventType: string): string {
  const hash = createHash('sha1')
    .update(uuidToBytes(SOCIAL_EDGE_EVENT_NAMESPACE))
    .update(`${jobId}:${eventType}`, 'utf8')
    .digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return bytesToUuid(bytes);
}
