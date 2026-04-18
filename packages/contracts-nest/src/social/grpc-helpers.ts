import { getGrpcOptions } from '../grpc.helpers.js';
import type { GrpcOptions } from '@nestjs/microservices';

/**
 * Generates gRPC options specifically for the SOCIAL microservice.
 */
export const getSocialGrpcOptions = (url: string): GrpcOptions => {
  return getGrpcOptions('SOCIAL', url);
};

export enum SOCIAL_USER_NODE_METHODS {
  CREATE_USER_NODE = 'createUserNode',
  DELETE_USER_NODE = 'deleteUserNode',
  GET_USER_NODE = 'getUserNode',
}

export enum RELATIONSHIP_METHODS {
  POST_FOLLOW_USER = 'postFollowUser',
  DELETE_FOLLOW_USER = 'deleteFollowUser',
  POST_BLOCK_USER = 'postBlockUser',
  DELETE_BLOCK_USER = 'deleteBlockUser',
  GET_MY_FOLLOWS = 'getMyFollows',
  GET_MY_FOLLOWERS = 'getMyFollowers',
  GET_MY_BLOCKS = 'getMyBlocks',
  GET_WHO_BLOCKED_ME = 'getWhoBlockedMe',
}

export enum PUBLICATION_METHODS {
  CREATE_POST_NODE = 'createPostNode',
  DELETE_POST_NODE = 'deletePostNode',
  POST_USER_OWN = 'postUserOwn',
  DELETE_USER_OWN = 'deleteUserOwn',
  GET_POST_NODE = 'getPostNode',
  GET_USER_POSTS = 'getUserPosts',
  GET_FEED = 'getFeed',
}

export enum INTERACTION_METHODS {
  POST_LIKE_POST = 'postLikePost',
  DELETE_LIKE_POST = 'deleteLikePost',
  GET_USER_LIKES = 'getUserLikes',
  GET_POST_LIKERS = 'getPostLikers',
}

export enum PARTICIPATION_METHODS {
  CREATE_EVENT_NODE = 'createEventNode',
  DELETE_EVENT_NODE = 'deleteEventNode',
  POST_USER_EVENT = 'postUserEvent',
  DELETE_USER_EVENT = 'deleteUserEvent',
  POST_USER_PARTICIPATE_EVENT = 'postUserParticipateEvent',
  DELETE_USER_PARTICIPATE_EVENT = 'deleteUserParticipateEvent',
  GET_USER_EVENT = 'getUserEvent',
  GET_USER_PARTICIPATE_EVENT = 'getUserParticipateEvent',
  GET_EVENT_PARTICIPANTS = 'getEventParticipants',
  GET_EVENT_NODE = 'getEventNode',
}

export enum EVENT_POST_LINK_METHODS {
  LINK_POST_TO_EVENT = 'linkPostToEvent',
  UNLINK_POST_FROM_EVENT = 'unlinkPostFromEvent',
  GET_EVENT_RELATED_TO_POST = 'getEventRelatedToPost',
  GET_EVENT_POSTS = 'getEventPosts',
}
