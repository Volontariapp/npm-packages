import type {
  PostBlockUserResponse,
  DeleteBlockUserResponse,
  GetMyBlocksResponse,
  GetWhoBlockedMeResponse,
  AdminPostBlockUserResponse,
  AdminDeleteBlockUserResponse,
  AdminGetMyBlocksResponse,
  AdminGetWhoBlockedMeResponse,
} from '../../../social/social.responses.js';

export interface PostBlockUserWebResponse extends PostBlockUserResponse {}
export interface DeleteBlockUserWebResponse extends DeleteBlockUserResponse {}
export interface GetMyBlocksWebResponse extends GetMyBlocksResponse {}
export interface GetWhoBlockedMeWebResponse extends GetWhoBlockedMeResponse {}

export interface AdminPostBlockUserWebResponse extends AdminPostBlockUserResponse {}
export interface AdminDeleteBlockUserWebResponse extends AdminDeleteBlockUserResponse {}
export interface AdminGetMyBlocksWebResponse extends AdminGetMyBlocksResponse {}
export interface AdminGetWhoBlockedMeWebResponse extends AdminGetWhoBlockedMeResponse {}
