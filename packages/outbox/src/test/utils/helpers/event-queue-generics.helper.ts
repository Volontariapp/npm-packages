import { type JsonObject } from '@volontariapp/database';

export enum EventType {
  FAKE = 'fake.event',
}

export interface FakePayload extends JsonObject {
  foo: string;
  count: number;
}
