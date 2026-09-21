import { describe, it, expect } from '@jest/globals';
import {
  SagaGatherType,
  SAGA_GATHER_COMPLETION_MAPPING,
  getGatherCompletionConfig,
} from './gather-registry.js';
import { EventMessagingType } from '../events/index.js';
import { WebsocketMessagingType } from '../websockets/index.js';

describe('SagaGatherRegistry', () => {
  it('should return valid completion config for EVENT_CREATION', () => {
    const config = getGatherCompletionConfig(SagaGatherType.EVENT_CREATION);
    expect(config).toEqual(SAGA_GATHER_COMPLETION_MAPPING[SagaGatherType.EVENT_CREATION]);
    expect(config).toEqual({
      targetEvent: EventMessagingType.EVENT_CREATED,
      stream: 'event:created',
      wsEvent: WebsocketMessagingType.EVENT_CREATED,
    });
  });

  it('should return valid completion config for USER_CREATION', () => {
    const config = getGatherCompletionConfig(SagaGatherType.USER_CREATION);
    expect(config).toEqual({
      targetEvent: EventMessagingType.USER_CREATED,
      stream: 'user:created',
      wsEvent: WebsocketMessagingType.USER_CREATED,
    });
  });

  it('should return valid completion config for EVENT_DELETION', () => {
    const config = getGatherCompletionConfig(SagaGatherType.EVENT_DELETION);
    expect(config).toEqual({
      targetEvent: EventMessagingType.EVENT_DELETED,
      stream: 'event:deleted',
      wsEvent: WebsocketMessagingType.EVENT_DELETED,
    });
  });

  it('should throw an error if an invalid gather type is requested', () => {
    expect(() => getGatherCompletionConfig('INVALID_GATHER' as any)).toThrow(
      '[Messaging] No completion config found for saga gather type: INVALID_GATHER',
    );
  });
});
