export enum PostEventMessagingType {
  POST_CREATED = 'post.created',
  POST_DELETED = 'post.deleted',
}

export interface IPostCreatedPayload {
  id: string;
  eventId?: string;
}

export interface IPostDeletedPayload {
  id: string;
}
