import { type JsonObject } from '@volontariapp/database';

export enum JobType {
  FAKE = 'fake.job',
}

export interface FakePayload extends JsonObject {
  foo: string;
  count: number;
}
