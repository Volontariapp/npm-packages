import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { GrpcOptions } from '@nestjs/microservices';
import { Transport } from '@nestjs/microservices';
import { Logger } from '@volontariapp/logger';

const logger = new Logger({ context: 'GrpcHelper', format: 'json' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export enum GRPC_SERVICES {
  USER_SERVICE = 'UserService',
  POST_SERVICE = 'PostService',
  EVENT_COMMAND_SERVICE = 'EventCommandService',
  EVENT_QUERY_SERVICE = 'EventQueryService',
  TAG_COMMAND_SERVICE = 'TagCommandService',
  TAG_QUERY_SERVICE = 'TagQueryService',
  SOCIAL_USER_NODE_COMMAND_SERVICE = 'SocialUserNodeCommandService',
  SOCIAL_USER_NODE_QUERY_SERVICE = 'SocialUserNodeQueryService',
  RELATIONSHIP_COMMAND_SERVICE = 'RelationshipCommandService',
  RELATIONSHIP_QUERY_SERVICE = 'RelationshipQueryService',
  PUBLICATION_COMMAND_SERVICE = 'PublicationCommandService',
  PUBLICATION_QUERY_SERVICE = 'PublicationQueryService',
  INTERACTION_COMMAND_SERVICE = 'InteractionCommandService',
  INTERACTION_QUERY_SERVICE = 'InteractionQueryService',
  PARTICIPATION_COMMAND_SERVICE = 'ParticipationCommandService',
  PARTICIPATION_QUERY_SERVICE = 'ParticipationQueryService',
  EVENT_POST_LINK_COMMAND_SERVICE = 'EventPostLinkCommandService',
  EVENT_POST_LINK_QUERY_SERVICE = 'EventPostLinkQueryService',
  STORAGE_SERVICE = 'StorageService',
  RANKING_QUERY_SERVICE = 'RankingQueryService',
  RANKING_COMMAND_SERVICE = 'RankingCommandService',
}

export enum GRPC_MICROSERVICES {
  USER = 'USER',
  POST = 'POST',
  EVENT = 'EVENT',
  SOCIAL = 'SOCIAL',
  STORAGE = 'STORAGE',
  RANKING = 'RANKING',
}

export const GRPC_SERVICES_CONFIG = {
  USER: {
    package: 'volontariapp.user',
    protoFileName: 'user.services.proto',
    domain: 'user',
  },
  POST: {
    package: 'volontariapp.post',
    protoFileName: 'post.services.proto',
    domain: 'post',
  },
  EVENT: {
    package: 'volontariapp.event',
    protoFileName: 'event.services.proto',
    domain: 'event',
  },
  SOCIAL: {
    package: 'volontariapp.social',
    protoFileName: 'social.services.proto',
    domain: 'social',
  },
  STORAGE: {
    package: 'volontariapp.storage',
    protoFileName: 'storage.services.proto',
    domain: 'storage',
  },
  RANKING: {
    package: 'volontariapp.ranking',
    protoFileName: 'ranking.services.proto',
    domain: 'ranking',
  },
};

/**
 * Channel options shared by gRPC clients and servers (grpc-js ignores the ones of the other side).
 *
 * Client: `round_robin` spreads calls over every address the DNS returns. Behind a ClusterIP
 * Service there is one address, so nothing changes; behind a headless Service (one address per
 * ready pod) calls are balanced between replicas instead of pinned to one per HTTP/2 connection.
 * Service config from DNS TXT records is disabled: one lookup less, and this config is the only one.
 *
 * Server: connections are closed gracefully after 5 minutes, so that clients reconnect and
 * resolve the DNS again. That is how a client picks up a replica added after it connected.
 */
export const GRPC_MAX_CONNECTION_AGE_MS = 5 * 60 * 1000;
export const GRPC_MAX_CONNECTION_AGE_GRACE_MS = 30 * 1000;

export const GRPC_CHANNEL_OPTIONS: Readonly<Record<string, string | number>> = {
  'grpc.service_config': JSON.stringify({ loadBalancingConfig: [{ round_robin: {} }] }),
  'grpc.service_config_disable_resolution': 1,
  'grpc.max_connection_age_ms': GRPC_MAX_CONNECTION_AGE_MS,
  'grpc.max_connection_age_grace_ms': GRPC_MAX_CONNECTION_AGE_GRACE_MS,
};

export const getGrpcOptions = (
  domain: keyof typeof GRPC_SERVICES_CONFIG,
  url: string,
  channelOptions: Readonly<Record<string, string | number>> = {},
): GrpcOptions => {
  const config = GRPC_SERVICES_CONFIG[domain];
  const protoRoot = join(__dirname, '../proto');
  logger.info(`Generating gRPC options for ${domain} domain at ${url}`);

  return {
    transport: Transport.GRPC,
    options: {
      url,
      // A fresh object per call: Nest writes message size limits into it.
      channelOptions: { ...GRPC_CHANNEL_OPTIONS, ...channelOptions },
      package: config.package,
      protoPath: join(protoRoot, `volontariapp/${config.domain}/${config.protoFileName}`),
      loader: {
        keepCase: false,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
        includeDirs: [protoRoot],
      },
    },
  };
};
