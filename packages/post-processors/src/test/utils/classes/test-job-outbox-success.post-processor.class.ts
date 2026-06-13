import { JobOutboxSuccessPostProcessor } from '../../../common/job-outbox-success.post-processor.js';
import type { CommonEventMessagingType } from '@volontariapp/messaging';
import type { BatchEventItem } from '../../../interfaces/index.js';

export class TestSuccessProcessor extends JobOutboxSuccessPostProcessor {
  public testProcessEvents(events: BatchEventItem<CommonEventMessagingType.JOB_OUTBOX_SUCCESS>[]) {
    return this.processEvents(events);
  }

  public getLogger() {
    return this.logger;
  }
}
