export enum CommonEventMessagingType {
  JOB_OUTBOX_SUCCESS = 'job.outbox.success',
  JOB_OUTBOX_FAILED = 'job.outbox.failed',
}

export interface EventChangedPayload<T> {
  before: T | null;
  after: T | null;
}

export interface IJobAuditPayload {
  id: string;
  job_id: string;
  job_type: string;
  status: string;
  worker_id: string;
  current_attempt: number;
  started_at: string | null;
  finished_at: string | null;
  result_payload: Record<string, unknown> | null;
  error_message: string | null;
  error_stack: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface IEventIdPayload {
  eventId: string;
}
export interface IPostIdPayload {
  postId: string;
}
export interface IUserIdPayload {
  userId: string;
}
