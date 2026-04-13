import { getGrpcOptions } from '../grpc.helpers.js';
import type { GrpcOptions } from '@nestjs/microservices';

/**
 * Generates gRPC options specifically for the EVENT microservice.
 */
export const getEventGrpcOptions = (url: string): GrpcOptions => {
  return getGrpcOptions('EVENT', url);
};
