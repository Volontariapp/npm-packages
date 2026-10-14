import { Inject, Injectable, OnModuleInit, Optional } from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import { Metadata } from '@grpc/grpc-js';
import { firstValueFrom, throwError, timeout } from 'rxjs';
import {
  STORAGE_SERVICE_NAME,
  type StorageServiceClient,
  type ConfirmFileAttachmentCommand,
  type ConfirmFileAttachmentResponse,
  EntityType,
} from '@volontariapp/contracts-nest';
import { Logger } from '@volontariapp/logger';
import { isBaseError } from '@volontariapp/errors';
import { STORAGE_ATTACHMENT_FAILED, STORAGE_TIMEOUT } from '@volontariapp/errors-nest';
import { DEFAULT_STORAGE_TIMEOUT_MS, STORAGE_CLIENT_OPTIONS } from '../constants.js';
import type {
  ConfirmAttachmentOptions,
  StorageClientOptions,
  WithMetadata,
} from '../interfaces/index.js';
import { isGrpcError } from '../errors/index.js';

@Injectable()
export class StorageClientService implements OnModuleInit {
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
            with: () => throwError(() => STORAGE_TIMEOUT(command.entityId, timeoutMs)),
          }),
        ),
      );
    } catch (error) {
      if (isBaseError(error)) {
        throw error;
      }
      const grpcErr = isGrpcError(error) ? error : undefined;
      const message = grpcErr?.details ?? (error instanceof Error ? error.message : String(error));
      this.logger.error(`ConfirmFileAttachment failed for entity ${command.entityId}: ${message}`);
      throw STORAGE_ATTACHMENT_FAILED(command.entityId, message);
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
