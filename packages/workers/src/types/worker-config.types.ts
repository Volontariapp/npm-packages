export interface WorkerConnectionConfig {
  host: string;
  port: number;
  db?: number;
  maxRetriesPerRequest?: number | null;
  enableReadyCheck?: boolean;
  enableOfflineQueue?: boolean;
}

export interface WorkerConfig {
  queueName: string;
  concurrency?: number;
  connection: WorkerConnectionConfig;
}
