import { type JsonObject } from '@volontariapp/database';

export enum JobType {
  FAKE = 'fake.job',
}

export interface JobsOutboxFakePayload extends JsonObject {
  foo: string;
  count: number;
}
