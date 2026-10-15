# @volontariapp/storage-pipeline

Pipeline d'infrastructure de stockage et de traitement des fichiers pour Volontariapp.

Ce package centralise la chaîne de traitement et de sécurisation des uploads multimédias, partagée entre `ms-storage` (traitement synchrone) et `worker-storage` (traitement asynchrone).

## Fonctionnalités

1. **Client S3 Quarantaine & Public (`S3StorageClient`)** :
   - Lecture, existence et téléchargement d'objets en quarantaine (`volontariapp-private`).
   - Publication vers le bucket public (`volontariapp-public`).
   - Nettoyage automatique des fichiers rejetés ou libérés.

2. **Génération de formulaires POST d'upload signés (`PresignedPostSigner`)** :
   - Signature avec `publicEndpoint` (accessible depuis le client mobile / web).
   - Verrouillage strict de la clé sur `quarantine/${fileId}`.
   - Contrôle strict du `Content-Type` déclaré et de la plage de taille `[1, maxSizeBytes]`.

3. **Validation Magic Bytes (`validateMagicBytes`, `detectMimeType`)** :
   - Inspection des en-têtes réels pour les formats JPEG (`FF D8 FF`), PNG (`89 50 4E 47 0D 0A 1A 0A`) et WebP (`RIFF...WEBP`).
   - Détection et rejet immédiat des fichiers SVG, scripts et balises HTML / polyglottes.

4. **Client Antivirus ClamAV (`ClamdClient`)** :
   - Communication TCP directe avec le démon `clamd` via le protocole `zINSTREAM\0`.
   - Streaming mémoire en chunks sans écriture disque.
   - Distinction stricte entre infection (`MALWARE`) et panne d'infrastructure (`ScannerTechnicalError`).

5. **Décodeur & Ré-encodeur d'Images (`ImageTransformer`)** :
   - Utilisation de `sharp` pour assainir et normaliser les images.
   - Protection contre les bombes de décompression (`limitInputPixels`).
   - Orientation EXIF automatique avant suppression des métadonnées.
   - Suppression complète de toutes les métadonnées (EXIF, coordonnées GPS / PII, XMP).
   - Redimensionnement et conversion automatique vers le format cible (`webp` ou `png`) selon la politique d'entité (`OutputPolicy`).

6. **Orchestrateur Complet (`StoragePipelineService`)** :
   - Exécution ordonnée du pipeline complet de traitement selon le RFC de stockage.
   - Gestion de la commutativité et non-suppression de la quarantaine sur erreur technique du scanner.

## Installation

```bash
yarn add @volontariapp/storage-pipeline
```

## Utilisation

```typescript
import { StoragePipelineService, EntityType } from '@volontariapp/storage-pipeline';

const pipeline = new StoragePipelineService({
  s3: {
    endpoint: 'http://minio:9000',
    publicEndpoint: 'http://localhost:9000',
    region: 'eu-west-3',
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
    privateBucket: 'volontariapp-private',
    publicBucket: 'volontariapp-public',
    publicBaseUrl: 'http://localhost:9000/volontariapp-public',
  },
  scanner: {
    host: 'clamd',
    port: 3310,
    timeoutMs: 5000,
  },
});

// 1. Signature POST d'upload
const presigned = await pipeline.generateUploadPost({
  fileId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  declaredMimeType: 'image/jpeg',
  maxSizeBytes: 10 * 1024 * 1024,
});

// 2. Traitement du fichier après upload
const result = await pipeline.processFile({
  fileId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  entityType: EntityType.POST,
  declaredMimeType: 'image/jpeg',
  declaredSize: 450210,
});

if (result.status === 'CLEAN') {
  console.log(`Fichier publié avec succès: ${result.publicUrl}`);
} else {
  console.warn(`Fichier rejeté: ${result.rejectionReason}`);
}
```
