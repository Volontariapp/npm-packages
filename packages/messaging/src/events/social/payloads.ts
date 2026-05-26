export enum SocialEventMessagingType {
  SOCIAL_USER_CHANGED = 'social_user.changed',
  SOCIAL_POST_CHANGED = 'social_post.changed',
  SOCIAL_EVENT_CHANGED = 'social_event.changed',
}

export interface ISocialUserPayload {
  userId: string;
}

export interface ISocialPostPayload {
  postId: string;
}

export interface ISocialEventPayload {
  eventId: string;
}
