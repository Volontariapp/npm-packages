import { getGrpcOptions } from '../grpc.helpers.js';
import type { GrpcOptions } from '@nestjs/microservices';

/**
 * Generates gRPC options specifically for the POST microservice.
 */
export const getPostGrpcOptions = (url: string): GrpcOptions => {
  return getGrpcOptions('POST', url);
};

export enum POST_METHODS {
  GET_POST = 'GetPost',
  LIST_POSTS = 'ListPosts',
  CREATE_POST = 'CreatePost',
  UPDATE_POST = 'UpdatePost',
  DELETE_POST = 'DeletePost',
}
