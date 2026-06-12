import type { CommonEventMessagingType } from '@volontariapp/messaging';
import { type StreamEvent, type IJobAuditPayload } from '@volontariapp/messaging';
import { randomUUID } from 'node:crypto';

export function makeTestJobOutboxEvent(
  jobId: string,
  eventType: CommonEventMessagingType,
  jobType: string = 'test-job',
  resultPayload: Record<string, unknown> = {},
  errorMessage: string | null = null,
): StreamEvent<IJobAuditPayload> {
  const auditPayload: IJobAuditPayload = {
    id: randomUUID(),
    job_id: jobId,
    job_type: jobType,
    status: 'completed',
    worker_id: 'test-worker',
    current_attempt: 1,
    started_at: new Date().toISOString(),
    finished_at: new Date().toISOString(),
    result_payload: resultPayload,
    error_message: errorMessage,
    error_stack: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return {
    id: randomUUID(),
    type: eventType.toString(),
    emitter: 'test-emitter',
    emitterId: randomUUID(),
    correlationId: randomUUID(),
    version: 1,
    payload: {
      after: auditPayload,
    },
    createdAt: new Date().toISOString(),
  };
}
