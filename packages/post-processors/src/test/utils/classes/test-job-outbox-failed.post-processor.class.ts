import { JobOutboxFailedPostProcessor } from '../../../common/job-outbox-failed.post-processor.js';
import type { CommonEventMessagingType } from '@volontariapp/messaging';
import type { BatchEventItem } from '../../../interfaces/index.js';

export class TestFailedProcessor extends JobOutboxFailedPostProcessor {
  public testProcessEvents(events: BatchEventItem<CommonEventMessagingType.JOB_OUTBOX_FAILED>[]) {
    return this.processEvents(events);
  }

  public getLogger() {
    return this.logger;
  }
}
