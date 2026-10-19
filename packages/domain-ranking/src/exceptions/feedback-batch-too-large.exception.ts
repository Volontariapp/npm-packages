import { BadRequestError } from '@volontariapp/errors';
import { MAX_FEEDBACK_ITEMS } from '../constants/index.js';

export class FeedbackBatchTooLargeException extends BadRequestError {
  constructor(size: number) {
    super(
      `A feedback batch holds ${String(MAX_FEEDBACK_ITEMS)} items at most, got ${String(size)}.`,
      'FEEDBACK_BATCH_TOO_LARGE',
      { size, max: MAX_FEEDBACK_ITEMS },
    );
  }
}
