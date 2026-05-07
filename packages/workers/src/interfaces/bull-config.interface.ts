export interface BullConnectionConfig {
  host: string;
  port: number;
  password: string;
  db: number;
  maxRetriesPerRequest: null;
  enableReadyCheck: boolean;
  enableOfflineQueue: boolean;
}

export interface BullDefaultJobOptions {
  attempts: number;
  backoff: { type: string; delay: number };
  removeOnComplete: boolean;
  removeOnFail: boolean;
}

export interface BullWorkerModuleConfig {
  connection: BullConnectionConfig;
  defaultJobOptions: BullDefaultJobOptions;
}
