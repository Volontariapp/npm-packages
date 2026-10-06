export enum StorageJobType {
  SCAN_FILE = 'storage.scan_file',
  CLEANUP_FILES = 'storage.cleanup_files',
}

export interface IScanFilePayload {
  fileId: string;
}

export type ICleanupFilesPayload = Record<string, never>;
