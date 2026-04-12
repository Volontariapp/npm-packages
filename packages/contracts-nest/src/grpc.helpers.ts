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
