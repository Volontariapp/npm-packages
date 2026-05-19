import type { PostProcessorOptions } from './post-processor-options.interface.js';
import type { RetryOptions } from './retry-options.interface.js';

/**
 * Normalized (fully required) version of PostProcessorOptions used internally by BasePostProcessor.
 * All optional properties have been replaced with their default values.
 */
export interface NormalizedPostProcessorOptions extends Required<PostProcessorOptions> {
  /**
   * Retry options are always set to Required<RetryOptions> in normalized form.
   */
  retry: Required<RetryOptions>;
}
