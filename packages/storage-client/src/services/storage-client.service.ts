import { Inject, Injectable, OnApplicationBootstrap, OnModuleInit, Optional } from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import { type Client, connectivityState, Metadata } from '@grpc/grpc-js';
import { firstValueFrom, throwError, timeout } from 'rxjs';
import {
  STORAGE_SERVICE_NAME,
  type StorageServiceClient,
  type ConfirmFileAttachmentCommand,
  type ConfirmFileAttachmentResponse,
  EntityType,
} from '@volontariapp/contracts-nest';
import { Logger } from '@volontariapp/logger';
import { GrpcStatus, isBaseError } from '@volontariapp/errors';
import { STORAGE_ATTACHMENT_FAILED, STORAGE_TIMEOUT } from '@volontariapp/errors-nest';
import {
  DEFAULT_STORAGE_TIMEOUT_MS,
  STORAGE_CHANNEL_READY_DEADLINE_MS,
  STORAGE_CLIENT_OPTIONS,
} from '../constants.js';
import type {
  ConfirmAttachmentOptions,
  StorageClientOptions,
  WithMetadata,
} from '../interfaces/index.js';
import { isGrpcError, relayStorageError } from '../errors/index.js';

@Injectable()
export class StorageClientService implements OnModuleInit, OnApplicationBootstrap {
  private readonly logger = new Logger({ context: StorageClientService.name });
  private storageService!: WithMetadata<StorageServiceClient>;

  constructor(
    @Inject(STORAGE_SERVICE_NAME)
    private readonly clientGrpc: ClientGrpc,
    @Optional()
    @Inject(STORAGE_CLIENT_OPTIONS)
    private readonly defaultOptions?: StorageClientOptions,
  ) {}

  onModuleInit() {
    this.storageService =
      this.clientGrpc.getService<WithMetadata<StorageServiceClient>>(STORAGE_SERVICE_NAME);
  }

  /**
   * Starts connecting the storage channel at startup instead of on the first call (G7: the first
   * `ConfirmFileAttachment` of a fresh channel could exceed its deadline). Does not block the
   * startup; logs how long the channel took to become READY, or its state when it did not.
   */
  onApplicationBootstrap(): void {
    let client: Client;
    try {
      client = this.clientGrpc.getClientByServiceName<Client>(STORAGE_SERVICE_NAME);
    } catch (error) {
      this.logger.warn(
        `Storage channel not opened at startup: ${error instanceof Error ? error.message : String(error)}`,
      );
      return;
    }

    const startedAt = Date.now();
    client.waitForReady(startedAt + STORAGE_CHANNEL_READY_DEADLINE_MS, (error?: Error) => {
      const elapsedMs = Date.now() - startedAt;
      if (error === undefined) {
        this.logger.log(`Storage channel READY in ${String(elapsedMs)}ms`);
        return;
      }
      this.logger.warn(
        `Storage channel not READY after ${String(elapsedMs)}ms (${this.channelState()}): ${error.message}`,
      );
    });
  }

  async confirmFileAttachment(
    command: ConfirmFileAttachmentCommand,
    options?: ConfirmAttachmentOptions,
  ): Promise<ConfirmFileAttachmentResponse> {
    const timeoutMs =
      options?.timeoutMs ?? this.defaultOptions?.timeoutMs ?? DEFAULT_STORAGE_TIMEOUT_MS;
    const internalToken = options?.internalToken ?? this.defaultOptions?.internalToken;

    const metadata = new Metadata();
    if (internalToken) {
      metadata.set('x-internal-token', internalToken);
    }

    try {
      return await firstValueFrom(
        this.storageService.confirmFileAttachment(command, metadata).pipe(
          timeout({
            first: timeoutMs,
            with: () => {
              this.logger.warn(
                `ConfirmFileAttachment timed out after ${String(timeoutMs)}ms for entity ${command.entityId} (storage channel ${this.channelState()})`,
              );
              return throwError(() => STORAGE_TIMEOUT(command.entityId, timeoutMs));
            },
          }),
        ),
      );
    } catch (error) {
      if (isBaseError(error)) {
        throw error;
      }
      const grpcErr = isGrpcError(error) ? error : undefined;
      const relayed = grpcErr === undefined ? undefined : relayStorageError(grpcErr);
      if (relayed !== undefined) {
        this.logger.warn(
          `ConfirmFileAttachment refused for entity ${command.entityId}: ${relayed.code}`,
        );
        throw relayed;
      }
      const message =
        grpcErr === undefined
          ? error instanceof Error
            ? error.message
            : String(error)
          : `${GrpcStatus[grpcErr.code] ?? String(grpcErr.code)}: ${grpcErr.details}`;
      this.logger.error(`ConfirmFileAttachment failed for entity ${command.entityId}: ${message}`);
      throw STORAGE_ATTACHMENT_FAILED(command.entityId, message);
    }
  }

  /** Connectivity state of the storage channel, for diagnostics; never connects. */
  private channelState(): string {
    try {
      const state = this.clientGrpc
        .getClientByServiceName<Client>(STORAGE_SERVICE_NAME)
        .getChannel()
        .getConnectivityState(false);
      return connectivityState[state];
    } catch {
      return 'UNKNOWN';
    }
  }

  async confirmPostAttachment(
    postId: string,
    fileIds: string[],
    options?: ConfirmAttachmentOptions,
  ): Promise<ConfirmFileAttachmentResponse> {
    return this.confirmFileAttachment(
      {
        entityId: postId,
        entityType: EntityType.ENTITY_TYPE_POST,
        fileIds,
      },
      options,
    );
  }

  async confirmEventCoverAttachment(
    eventId: string,
    fileId: string,
    options?: ConfirmAttachmentOptions,
  ): Promise<ConfirmFileAttachmentResponse> {
    return this.confirmFileAttachment(
      {
        entityId: eventId,
        entityType: EntityType.ENTITY_TYPE_EVENT_COVER,
        fileIds: [fileId],
      },
      options,
    );
  }

  async confirmUserAvatarAttachment(
    userId: string,
    fileId: string,
    options?: ConfirmAttachmentOptions,
  ): Promise<ConfirmFileAttachmentResponse> {
    return this.confirmFileAttachment(
      {
        entityId: userId,
        entityType: EntityType.ENTITY_TYPE_USER_AVATAR,
        fileIds: [fileId],
      },
      options,
    );
  }

  async confirmBadgeIconAttachment(
    badgeId: string,
    fileId: string,
    options?: ConfirmAttachmentOptions,
  ): Promise<ConfirmFileAttachmentResponse> {
    return this.confirmFileAttachment(
      {
        entityId: badgeId,
        entityType: EntityType.ENTITY_TYPE_BADGE_ICON,
        fileIds: [fileId],
      },
      options,
    );
  }
}
