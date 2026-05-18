export enum PostJobType {
  PUBLISH_POST = 'post.publish_post',
}

export interface IPublishPostPayload {
  postId: string;
  authorId: string;
}
