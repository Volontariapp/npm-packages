import { getGrpcOptions } from '../grpc.helpers.js';
import type { GrpcOptions } from '@nestjs/microservices';

/**
 * Generates gRPC options specifically for the EVENT microservice.
 */
export const getEventGrpcOptions = (url: string): GrpcOptions => {
  return getGrpcOptions('EVENT', url);
};

export enum EVENT_COMMAND_METHODS {
  CREATE_EVENT = 'CreateEvent',
  UPDATE_EVENT = 'UpdateEvent',
  CHANGE_EVENT_STATE = 'ChangeEventState',
  MANAGE_REQUIREMENTS = 'ManageRequirements',
  DELETE_EVENT = 'DeleteEvent',
}

export enum EVENT_QUERY_METHODS {
  GET_EVENT = 'GetEvent',
  SEARCH_EVENTS = 'SearchEvents',
  LIST_REQUIREMENTS = 'ListRequirements',
}

export enum TAG_COMMAND_METHODS {
  CREATE_TAG = 'CreateTag',
  UPDATE_TAG = 'UpdateTag',
  DELETE_TAG = 'DeleteTag',
}

export enum TAG_QUERY_METHODS {
  GET_TAGS = 'GetTags',
}
