/**
 * Envelope wrapping every BullMQ job's data.
 *
 * Carries the originating emitter (source microservice name) alongside
 * the typed business payload so that BaseWorker can persist it into
 * job_audit.emitter — enabling SQL triggers to use NEW.emitter directly
 * without a JOIN back to jobs_outbox.
 */
export interface JobEnvelope<T> {
  payload: T;
  emitter: string;
  emitterId: string;
}
