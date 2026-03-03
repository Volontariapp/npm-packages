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

export enum USER_GRPC_METHODS {
  GET_USER = 'getUser',
  LIST_USERS = 'listUsers',
  CREATE_USER = 'createUser',
  UPDATE_USER = 'updateUser',
  DELETE_USER = 'deleteUser',
}

export enum POST_GRPC_METHODS {
  GET_POST = 'getPost',
  LIST_POSTS = 'listPosts',
  CREATE_POST = 'createPost',
  UPDATE_POST = 'updatePost',
  DELETE_POST = 'deletePost',
}

export enum EVENT_GRPC_METHODS {
  GET_EVENT = 'getEvent',
  LIST_EVENTS = 'listEvents',
  CREATE_EVENT = 'createEvent',
  UPDATE_EVENT = 'updateEvent',
  DELETE_EVENT = 'deleteEvent',
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
