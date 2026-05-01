import { getGrpcOptions } from '../grpc.helpers.js';
import type { GrpcOptions } from '@nestjs/microservices';

/**
 * Generates gRPC options specifically for the USER microservice.
 */
export const getUserGrpcOptions = (url: string): GrpcOptions => {
  return getGrpcOptions('USER', url);
};

export enum USER_COMMAND_METHODS {
  SIGN_UP = 'SignUp',
  LOGIN = 'Login',
  REFRESH_TOKEN = 'RefreshToken',
  UPDATE_USER = 'UpdateUser',
  DELETE_USER = 'DeleteUser',
  ADD_BADGE_TO_USER = 'AddBadgeToUser',
  REMOVE_BADGE_FROM_USER = 'RemoveBadgeFromUser',
  INCREMENT_IMPACT_SCORE = 'IncrementImpactScore',
}

export enum USER_QUERY_METHODS {
  GET_USER = 'GetUser',
  LIST_USERS = 'ListUsers',
}

export enum BADGE_COMMAND_METHODS {
  CREATE_BADGE = 'CreateBadge',
  UPDATE_BADGE = 'UpdateBadge',
  DELETE_BADGE = 'DeleteBadge',
}

export enum BADGE_QUERY_METHODS {
  GET_BADGE = 'GetBadge',
  GET_BADGE_BY_SLUG = 'GetBadgeBySlug',
  LIST_BADGES = 'ListBadges',
}
