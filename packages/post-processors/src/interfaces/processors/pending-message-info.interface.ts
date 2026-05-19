export interface PendingMessageInfo {
  messageId: string;
  consumerName: string;
  idleTimeMs: number;
  deliveryCount: number;
}
