import { getGrpcOptions } from '../grpc.helpers.js';
import type { GrpcOptions } from '@nestjs/microservices';

/**
 * Generates gRPC options specifically for the USER microservice.
 */
export const getUserGrpcOptions = (url: string): GrpcOptions => {
  return getGrpcOptions('USER', url);
};
