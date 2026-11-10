import { randomUUID } from 'node:crypto';
import {
  SocialEdgeAction,
  SocialEdgeKind,
  type ISocialEdgeApplyPayload,
} from '@volontariapp/messaging';

export class SocialEdgePayloadFactory {
  static build(overrides: Partial<ISocialEdgeApplyPayload> = {}): ISocialEdgeApplyPayload {
    return {
      kind: SocialEdgeKind.LIKE,
      fromId: randomUUID(),
      toId: randomUUID(),
      action: SocialEdgeAction.ADD,
      intentAt: '2026-11-10T10:00:00.000Z',
      ...overrides,
    };
  }
}
