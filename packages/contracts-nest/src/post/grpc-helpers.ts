import { getGrpcOptions } from '../grpc.helpers.js';
import type { GrpcOptions } from '@nestjs/microservices';

/**
 * Generates gRPC options specifically for the POST microservice.
 */
export const getPostGrpcOptions = (url: string): GrpcOptions => {
  return getGrpcOptions('POST', url);
};
