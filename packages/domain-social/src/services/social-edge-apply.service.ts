import { Injectable, Inject } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Logger } from '@volontariapp/logger';
import type { ObjectLiteral } from '@volontariapp/database';
import { databaseMapper, EventQueueEntity, EventQueueModel } from '@volontariapp/database';
import {
  PostEventMessagingType,
  SocialEdgeAction,
  SocialEdgeKind,
  SocialEventMessagingType,
  type ISocialEdgeApplyPayload,
} from '@volontariapp/messaging';
import { Streams } from '@volontariapp/shared';
import { SOCIAL_EDGE_EMITTER } from '../constants.js';
import { buildSocialEdgeEventId } from '../helpers/social-edge-event-id.js';
import { insertOrIgnore, type InsertOrIgnoreSource } from '../helpers/insert-or-ignore.js';
import { ensureOutboxMappers } from '../helpers/outbox-mappers.js';
import type { TransactionalDataSource } from '../helpers/transactional-data-source.js';
import { PostgresSocialEdgeRepository } from '../repositories/postgres-social-edge.repository.js';
import { Neo4jSocialEdgeRepository } from '../repositories/neo4j-social-edge.repository.js';
import type { ISocialEdgeRepository } from '../repositories/interfaces/social-edge.repository.js';
import type { ISocialEdgeGraphRepository } from '../repositories/interfaces/social-edge-graph.repository.js';

/** Un noeud (utilisateur, post ou evenement) n'est pas encore dans le graphe : le job doit repasser. */
export class SocialEdgeNodeMissingError extends Error {
  constructor(
    readonly kind: SocialEdgeKind,
    readonly fromId: string,
    readonly toId: string,
  ) {
    super(`Social edge ${kind} ${fromId} -> ${toId}: node not in the graph yet, retry later`);
    this.name = 'SocialEdgeNodeMissingError';
  }
}

export interface SocialEdgeApplyContext {
  /** Id du job BullMQ = id de la ligne `jobs_outbox` : sert a deriver l'id de l'evenement. */
  jobId: string;
  /** Contexte de trace du job, repris par l'evenement emis. */
  traceparent?: string;
}

export interface SocialEdgeApplyResult {
  /** Id de l'evenement metier ecrit (ou deja ecrit) apres l'application ; absent si le type n'en emet pas. */
  eventId?: string;
}

interface BusinessEvent {
  type: PostEventMessagingType | SocialEventMessagingType;
  stream: Streams;
  payload: object;
}

function resolveBusinessEvent(payload: ISocialEdgeApplyPayload): BusinessEvent | null {
  const adding = payload.action === SocialEdgeAction.ADD;
  switch (payload.kind) {
    case SocialEdgeKind.LIKE:
      return {
        type: adding ? PostEventMessagingType.POST_LIKED : PostEventMessagingType.POST_UNLIKED,
        stream: adding ? Streams.POST_LIKED : Streams.POST_UNLIKED,
        payload: { postId: payload.toId, authorId: payload.fromId },
      };
    case SocialEdgeKind.WISH:
      return {
        type: adding
          ? SocialEventMessagingType.EVENT_SOCIAL_WISHED
          : SocialEventMessagingType.EVENT_SOCIAL_UNWISHED,
        stream: adding ? Streams.EVENT_SOCIAL_WISHED : Streams.EVENT_SOCIAL_UNWISHED,
        payload: { eventId: payload.toId, userId: payload.fromId },
      };
    default:
      // Follow et participation n'emettent aucun evenement metier aujourd'hui (comportement conserve).
      return null;
  }
}

/**
 * Handler metier de `SOCIAL_EDGE_APPLY` (appele par worker-social) :
 * 1. relit l'etat voulu de chaque relation du couple dans `social_edge` ;
 * 2. fait converger Neo4j (une transaction, `MERGE` ou `DELETE`), idempotent donc rejouable ;
 * 3. une fois le graphe a jour, ecrit l'evenement metier dans `event_queue` avec un id
 *    deterministe (`ON CONFLICT DO NOTHING`), pour que les consommateurs voient le graphe a jour.
 * Lever une erreur = le job est reessaye par BullMQ (12 tentatives, puis DLQ).
 */
@Injectable()
export class SocialEdgeApplyService {
  private readonly logger = new Logger({ context: SocialEdgeApplyService.name });

  constructor(
    @InjectDataSource()
    private readonly dataSource: TransactionalDataSource,
    @Inject(PostgresSocialEdgeRepository)
    private readonly edges: ISocialEdgeRepository,
    @Inject(Neo4jSocialEdgeRepository)
    private readonly graph: ISocialEdgeGraphRepository,
    @InjectRepository(EventQueueModel)
    private readonly eventQueueRepository: InsertOrIgnoreSource,
  ) {
    ensureOutboxMappers();
  }

  async apply(
    payload: ISocialEdgeApplyPayload,
    context: SocialEdgeApplyContext,
  ): Promise<SocialEdgeApplyResult> {
    const kinds = payload.companionKind ? [payload.kind, payload.companionKind] : [payload.kind];
    const states = await Promise.all(
      kinds.map(async (kind) => ({
        kind,
        present: await this.edges.exists(
          this.dataSource.manager,
          kind,
          payload.fromId,
          payload.toId,
        ),
      })),
    );

    const results = await this.graph.converge(payload.fromId, payload.toId, states);
    const missing = results.find((result) => result.present && result.affected === 0);
    if (missing) {
      throw new SocialEdgeNodeMissingError(missing.kind, payload.fromId, payload.toId);
    }

    const eventId = await this.emitBusinessEvent(payload, context);
    this.logger.log(
      `Applied social edge ${payload.kind} ${payload.action}: ${payload.fromId} -> ${payload.toId}`,
    );
    return eventId ? { eventId } : {};
  }

  private async emitBusinessEvent(
    payload: ISocialEdgeApplyPayload,
    context: SocialEdgeApplyContext,
  ): Promise<string | undefined> {
    const event = resolveBusinessEvent(payload);
    if (!event) return undefined;

    const id = buildSocialEdgeEventId(context.jobId, event.type);
    const entity = EventQueueEntity.createEvent({
      id,
      type: event.type,
      emitter: SOCIAL_EDGE_EMITTER,
      emitterId: payload.fromId,
      traceparent: context.traceparent,
      payload: event.payload,
      targetServices: [event.stream],
    });
    const model: ObjectLiteral = databaseMapper.map(entity, EventQueueEntity, EventQueueModel);
    await insertOrIgnore(this.eventQueueRepository, EventQueueModel.name, model);
    return id;
  }
}
