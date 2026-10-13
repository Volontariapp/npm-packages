import { ParentBasedSampler, TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-base';
import type { Sampler } from '@opentelemetry/sdk-trace-base';
import { logger } from './monitoring-logger.js';

/** Standard OpenTelemetry variable for the sampler argument; here, the ratio of root traces kept. */
export const SAMPLE_RATIO_ENV = 'OTEL_TRACES_SAMPLER_ARG';

/** Keep everything: the behaviour before sampling was configurable. */
export const DEFAULT_SAMPLE_RATIO = 1;

/**
 * Picks the ratio of root traces to keep: the option, then `OTEL_TRACES_SAMPLER_ARG`,
 * then 1. A value that is not a number between 0 and 1 falls back to the default with a warning.
 */
export function resolveSampleRatio(
  option?: number,
  env: Record<string, string | undefined> = process.env,
): number {
  const raw = option ?? env[SAMPLE_RATIO_ENV];
  if (raw === undefined || raw === '') {
    return DEFAULT_SAMPLE_RATIO;
  }

  const ratio = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(ratio) || ratio < 0 || ratio > 1) {
    logger.warn(
      `Invalid trace sample ratio "${String(raw)}": expected a number between 0 and 1, using ${String(DEFAULT_SAMPLE_RATIO)}`,
    );
    return DEFAULT_SAMPLE_RATIO;
  }
  return ratio;
}

/**
 * Samples a ratio of root traces and follows the decision of the parent for the rest.
 * Parent-based matters across the async chain: a trace dropped at the gateway stays
 * dropped in the workers and post-processors, instead of being re-sampled at each hop.
 */
export function createSampler(ratio: number): Sampler {
  return new ParentBasedSampler({ root: new TraceIdRatioBasedSampler(ratio) });
}
