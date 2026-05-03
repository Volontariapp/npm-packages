import type {
  CreateUserNodeResponse,
  DeleteUserNodeResponse,
  GetUserNodeResponse,
  CreatePostNodeResponse,
  DeletePostNodeResponse,
  GetPostNodeResponse,
  CreateEventNodeResponse,
  DeleteEventNodeResponse,
  GetEventNodeResponse,
} from '../../../social/social.responses.js';

// User node lifecycle
export interface CreateUserNodeWebResponse extends CreateUserNodeResponse {}
export interface DeleteUserNodeWebResponse extends DeleteUserNodeResponse {}
export interface GetUserNodeWebResponse extends GetUserNodeResponse {}

// Post node lifecycle
export interface CreatePostNodeWebResponse extends CreatePostNodeResponse {}
export interface DeletePostNodeWebResponse extends DeletePostNodeResponse {}
export interface GetPostNodeWebResponse extends GetPostNodeResponse {}

// Event node lifecycle
export interface CreateEventNodeWebResponse extends CreateEventNodeResponse {}
export interface DeleteEventNodeWebResponse extends DeleteEventNodeResponse {}
export interface GetEventNodeWebResponse extends GetEventNodeResponse {}
