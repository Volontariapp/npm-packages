import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { GrpcOptions } from '@nestjs/microservices';
import { Transport } from '@nestjs/microservices';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export enum GRPC_SERVICES {
  USER = 'USER',
  POST = 'POST',
  EVENT = 'EVENT',
}

export const GRPC_SERVICES_CONFIG = {
  [GRPC_SERVICES.USER]: {
    package: 'volontariapp.user',
    protoFileName: 'user.services.proto',
    domain: 'user',
  },
  [GRPC_SERVICES.POST]: {
    package: 'volontariapp.post',
    protoFileName: 'post.services.proto',
    domain: 'post',
  },
  [GRPC_SERVICES.EVENT]: {
    package: 'volontariapp.event',
    protoFileName: 'event.services.proto',
    domain: 'event',
  },
};

export const getGrpcOptions = (service: GRPC_SERVICES, url: string): GrpcOptions => {
  const config = GRPC_SERVICES_CONFIG[service];
  const protoRoot = join(__dirname, '../proto');

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
