import { JobOutboxFailedPostProcessor } from '../../../common/job-outbox-failed.post-processor.js';
import type { StreamEvent, IJobAuditPayload } from '@volontariapp/messaging';

export class TestFailedProcessor extends JobOutboxFailedPostProcessor {
  public testProcessEvent(event: StreamEvent<IJobAuditPayload>, messageId: string) {
    return this.processEvent(event, messageId);
  }

  public getLogger() {
    return this.logger;
  }
}
