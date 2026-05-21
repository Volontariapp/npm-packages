import { JobOutboxSuccessPostProcessor } from '../../../common/job-outbox-success.post-processor.js';
import type { StreamEvent, IJobAuditPayload } from '@volontariapp/messaging';

export class TestSuccessProcessor extends JobOutboxSuccessPostProcessor {
  public testProcessEvent(event: StreamEvent<IJobAuditPayload>, messageId: string) {
    return this.processEvent(event, messageId);
  }

  public getLogger() {
    return this.logger;
  }
}
