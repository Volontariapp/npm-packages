import { randomUUID } from 'node:crypto';
import { UserId, PostId, EventId } from '../../../value-objects/ids.vo.js';

export class UserIdFactory {
  static build(value: string = randomUUID()): UserId {
    return new UserId(value);
  }
}

export class PostIdFactory {
  static build(value: string = randomUUID()): PostId {
    return new PostId(value);
  }
}

export class EventIdFactory {
  static build(value: string = randomUUID()): EventId {
    return new EventId(value);
  }
}
