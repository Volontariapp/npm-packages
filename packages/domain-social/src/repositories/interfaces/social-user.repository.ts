export interface ISocialUserRepository {
  createNode(userId: string): Promise<void>;
  deleteNode(userId: string): Promise<void>;
  exists(userId: string): Promise<boolean>;
}
