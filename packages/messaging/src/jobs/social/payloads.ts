export enum SocialJobType {
  FOLLOW_USER = 'social.follow_user',
}

export interface IFollowUserPayload {
  followerId: string;
  followingId: string;
}
