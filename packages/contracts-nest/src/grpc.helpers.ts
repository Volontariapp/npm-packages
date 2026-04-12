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
}

export enum GRPC_MICROSERVICES {
  USER = 'USER',
  POST = 'POST',
  EVENT = 'EVENT',
}

export const USER_GRPC_METHODS = {
  GET_USER: 'GetUser',
  LIST_USERS: 'ListUsers',
  CREATE_USER: 'CreateUser',
  UPDATE_USER: 'UpdateUser',
  DELETE_USER: 'DeleteUser',
} as const;

export const POST_GRPC_METHODS = {
  GET_POST: 'GetPost',
  LIST_POSTS: 'ListPosts',
  CREATE_POST: 'CreatePost',
  UPDATE_POST: 'UpdatePost',
  DELETE_POST: 'DeletePost',
} as const;

export const EVENT_COMMAND_METHODS = {
  CREATE_EVENT: 'CreateEvent',
  UPDATE_EVENT: 'UpdateEvent',
  CHANGE_EVENT_STATE: 'ChangeEventState',
  MANAGE_REQUIREMENTS: 'ManageRequirements',
  DELETE_EVENT: 'DeleteEvent',
} as const;

export const EVENT_QUERY_METHODS = {
  GET_EVENT: 'GetEvent',
  SEARCH_EVENTS: 'SearchEvents',
  LIST_REQUIREMENTS: 'ListRequirements',
} as const;

export const TAG_COMMAND_METHODS = {
  CREATE_TAG: 'CreateTag',
  UPDATE_TAG: 'UpdateTag',
  DELETE_TAG: 'DeleteTag',
} as const;

export const TAG_QUERY_METHODS = {
  GET_TAGS: 'GetTags',
} as const;

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
};

export const getGrpcOptions = (
  domain: keyof typeof GRPC_SERVICES_CONFIG,
  url: string,
): GrpcOptions => {
  const config = GRPC_SERVICES_CONFIG[domain];
  const protoRoot = join(__dirname, '../proto');
  logger.info(`Generating gRPC options for ${domain} domain at ${url}`);

  return {
    transport: Transport.GRPC,
    options: {
      url,
      package: config.package,
      protoPath: join(protoRoot, `volontariapp/${config.domain}/${config.protoFileName}`),
      loader: {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
        includeDirs: [protoRoot],
      },
    },
  };
};
