import { type DatabaseHealthError } from '@volontariapp/errors';

export type DatabaseHealthStatus = 'up' | 'down';

export interface DatabaseHealthResult {
  name: string;
  status: DatabaseHealthStatus;
  message: string;
  error?: DatabaseHealthError;
}
