import { Injectable, Inject } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Logger } from '@volontariapp/logger';
import {
  DATABASE_ERROR,
  SOCIAL_EVENT_NOT_FOUND,
  SOCIAL_PARTICIPATION_ALREADY_EXISTS,
  SOCIAL_PARTICIPATION_NOT_FOUND,
  SOCIAL_RELATIONSHIP_ALREADY_EXISTS,
  SOCIAL_RELATIONSHIP_NOT_FOUND,
  SOCIAL_WISH_ALREADY_EXISTS,
  SOCIAL_WISH_NOT_FOUND,
} from '@volontariapp/errors-nest';
import { isBaseError } from '@volontariapp/errors';
import type { EntityManager } from '@volontariapp/database';
import { JobsOutboxEntity, JobsOutboxModel } from '@volontariapp/database';
import { JobsOutboxRepository } from '@volontariapp/outbox';
import {
  SocialEdgeAction,
  SocialEdgeKind,
  SocialJobType,
  SocialQueue,
  type ISocialEdgeApplyPayload,
} from '@volontariapp/messaging';
import { SOCIAL_EDGE_EMITTER } from '../constants.js';
import { ensureOutboxMappers } from '../helpers/outbox-mappers.js';
import type { TransactionalDataSource } from '../helpers/transactional-data-source.js';
import { SocialEventMapper } from '../mappers/social-event.mapper.js';
import { PostgresSocialEdgeRepository } from '../repositories/postgres-social-edge.repository.js';
import { Neo4jParticipationRepository } from '../repositories/neo4j-participation.repository.js';
import type { ISocialEdgeRepository } from '../repositories/interfaces/social-edge.repository.js';
import type { IParticipationRepository } from '../repositories/interfaces/participation.repository.js';
import { EventId, PostId, UserId } from '../value-objects/ids.vo.js';

type ConflictErrorFactory = (fromId: string, toId: string) => Error;

interface EdgeSpec {
  kind: SocialEdgeKind;
  /** Erreur 409 quand la relation existe deja (ajout). */
  alreadyExists: ConflictErrorFactory;
  /** Erreur 404 quand la relation n'existe pas (retrait). */
  notFound: ConflictErrorFactory;
  /** Relation retiree dans la meme transaction quand on ajoute (participer retire le souhait). */
  companionKind?: SocialEdgeKind;
  /** Verifie l'existence du noeud evenement dans Neo4j (une lecture) avant la transaction. */
  checkEventExists?: boolean;
  errorLabel: string;
}

const LIKE_SPEC: EdgeSpec = {
  kind: SocialEdgeKind.LIKE,
  alreadyExists: (from, to) => SOCIAL_RELATIONSHIP_ALREADY_EXISTS(from, to, 'LIKE'),
  notFound: (from, to) => SOCIAL_RELATIONSHIP_NOT_FOUND(from, to, 'LIKE'),
  errorLabel: 'like relationship',
};

const FOLLOW_SPEC: EdgeSpec = {
  kind: SocialEdgeKind.FOLLOW,
  alreadyExists: (from, to) => SOCIAL_RELATIONSHIP_ALREADY_EXISTS(from, to, 'FOLLOW'),
  notFound: (from, to) => SOCIAL_RELATIONSHIP_NOT_FOUND(from, to, 'FOLLOW'),
  errorLabel: 'follow relationship',
};

const WISH_SPEC: EdgeSpec = {
  kind: SocialEdgeKind.WISH,
  alreadyExists: (from, to) => SOCIAL_WISH_ALREADY_EXISTS(from, to),
  notFound: (from, to) => SOCIAL_WISH_NOT_FOUND(from, to),
  checkEventExists: true,
  errorLabel: 'event wish',
};

const PARTICIPATE_SPEC: EdgeSpec = {
  kind: SocialEdgeKind.PARTICIPATE,
  alreadyExists: (from, to) => SOCIAL_PARTICIPATION_ALREADY_EXISTS(from, to),
  notFound: (from, to) => SOCIAL_PARTICIPATION_NOT_FOUND(from, to),
  companionKind: SocialEdgeKind.WISH,
  checkEventExists: true,
  errorLabel: 'event participation',
};

/**
 * Chemin synchrone "Postgres d'abord" de ms-social : une transaction Postgres ecrit l'etat voulu
 * (`social_edge`) et un job `SOCIAL_EDGE_APPLY` (`jobs_outbox`), sans toucher Neo4j (sauf une
 * lecture `eventExists` pour souhait et participation). `worker-social` applique ensuite le graphe
 * via `SocialEdgeApplyService`. Le contrat d'erreur (409, 404) vient de la ligne `social_edge`.
 */
@Injectable()
export class SocialEdgeIntentService {
  private readonly logger = new Logger({ context: SocialEdgeIntentService.name });

  constructor(
    @InjectDataSource()
    private readonly dataSource: TransactionalDataSource,
    @Inject(PostgresSocialEdgeRepository)
    private readonly edges: ISocialEdgeRepository,
    @Inject(Neo4jParticipationRepository)
    private readonly participation: IParticipationRepository,
  ) {
    ensureOutboxMappers();
  }

  likePost(userId: UserId, postId: PostId): Promise<void> {
    return this.add(LIKE_SPEC, userId.value, postId.value);
  }

  unlikePost(userId: UserId, postId: PostId): Promise<void> {
    return this.remove(LIKE_SPEC, userId.value, postId.value);
  }

  followUser(followerId: UserId, followedId: UserId): Promise<void> {
    return this.add(FOLLOW_SPEC, followerId.value, followedId.value);
  }

  unfollowUser(followerId: UserId, followedId: UserId): Promise<void> {
    return this.remove(FOLLOW_SPEC, followerId.value, followedId.value);
  }

  wishEvent(userId: UserId, eventId: EventId): Promise<void> {
    return this.add(WISH_SPEC, userId.value, eventId.value);
  }

  unwishEvent(userId: UserId, eventId: EventId): Promise<void> {
    return this.remove(WISH_SPEC, userId.value, eventId.value);
  }

  /** Participer retire le souhait du meme couple dans la meme transaction. */
  participateEvent(userId: UserId, eventId: EventId): Promise<void> {
    return this.add(PARTICIPATE_SPEC, userId.value, eventId.value);
  }

  leaveEvent(userId: UserId, eventId: EventId): Promise<void> {
    return this.remove(PARTICIPATE_SPEC, userId.value, eventId.value);
  }

  /**
   * Mode `sync` (double ecriture) : recopie l'etat dans `social_edge` apres l'ecriture Neo4j, sans
   * job et sans erreur de conflit (`ON CONFLICT DO NOTHING`, `DELETE` sans effet si absente).
   */
  async mirrorEdge(
    kind: SocialEdgeKind,
    fromId: string,
    toId: string,
    action: SocialEdgeAction,
  ): Promise<void> {
    try {
      await this.dataSource.transaction(async (manager) => {
        if (action === SocialEdgeAction.ADD) {
          await this.edges.insertIfAbsent(manager, kind, fromId, toId);
        } else {
          await this.edges.deleteIfPresent(manager, kind, fromId, toId);
        }
      });
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(`Failed to mirror ${kind} ${action}: ${fromId} -> ${toId}`, error);
      throw DATABASE_ERROR('mirroring social edge', (error as Error).message);
    }
  }

  /**
   * A appeler avec le `DETACH DELETE` d'un noeud (utilisateur, post, evenement) : sans cela un
   * nouveau like du meme identifiant renverrait `ALREADY_EXISTS` a tort.
   */
  async deleteEdgesOfNode(nodeId: string): Promise<number> {
    try {
      return await this.dataSource.transaction((manager) => this.edges.deleteByNode(manager, nodeId));
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(`Failed to delete social edges of node ${nodeId}`, error);
      throw DATABASE_ERROR('deleting social edges of node', (error as Error).message);
    }
  }

  private async add(spec: EdgeSpec, fromId: string, toId: string): Promise<void> {
    await this.run(spec, fromId, toId, SocialEdgeAction.ADD, async (manager) => {
      const created = await this.edges.insertIfAbsent(manager, spec.kind, fromId, toId);
      if (!created) throw spec.alreadyExists(fromId, toId);
      if (spec.companionKind) {
        await this.edges.deleteIfPresent(manager, spec.companionKind, fromId, toId);
      }
    });
  }

  private async remove(spec: EdgeSpec, fromId: string, toId: string): Promise<void> {
    await this.run(spec, fromId, toId, SocialEdgeAction.REMOVE, async (manager) => {
      const removed = await this.edges.deleteIfPresent(manager, spec.kind, fromId, toId);
      if (!removed) throw spec.notFound(fromId, toId);
    });
  }

  private async run(
    spec: EdgeSpec,
    fromId: string,
    toId: string,
    action: SocialEdgeAction,
    writeEdge: (manager: EntityManager) => Promise<void>,
  ): Promise<void> {
    try {
      this.logger.log(`Social edge intent ${spec.kind} ${action}: ${fromId} -> ${toId}`);
      if (spec.checkEventExists) {
        const event = SocialEventMapper.toEntity(new EventId(toId));
        if (!(await this.participation.eventExists(event))) {
          throw SOCIAL_EVENT_NOT_FOUND(toId);
        }
      }
      await this.dataSource.transaction(async (manager) => {
        await writeEdge(manager);
        await this.enqueueApplyJob(manager, spec, fromId, toId, action);
      });
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(
        `Failed social edge intent ${spec.kind} ${action}: ${fromId} -> ${toId}`,
        error,
      );
      throw DATABASE_ERROR(`writing ${spec.errorLabel}`, (error as Error).message);
    }
  }

  private async enqueueApplyJob(
    manager: EntityManager,
    spec: EdgeSpec,
    fromId: string,
    toId: string,
    action: SocialEdgeAction,
  ): Promise<void> {
    const payload: ISocialEdgeApplyPayload = {
      kind: spec.kind,
      fromId,
      toId,
      action,
      intentAt: new Date().toISOString(),
      ...(action === SocialEdgeAction.ADD && spec.companionKind
        ? { companionKind: spec.companionKind }
        : {}),
    };
    const job = JobsOutboxEntity.createJob<SocialJobType.SOCIAL_EDGE_APPLY>({
      type: SocialJobType.SOCIAL_EDGE_APPLY,
      emitter: SOCIAL_EDGE_EMITTER,
      emitterId: fromId,
      target: SocialQueue.SOCIAL,
      payload,
      // Colonne NOT NULL dans la table jobs_outbox des ms ; une date passee ne retarde pas le job.
      scheduledAt: new Date(),
    });
    const jobsRepository = new JobsOutboxRepository<SocialJobType.SOCIAL_EDGE_APPLY>(
      manager.getRepository(JobsOutboxModel),
    );
    await jobsRepository.create(job);
  }
}
