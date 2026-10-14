import type { PostMediaScanStatus } from '../enums/index.js';

export class PostMediaEntity {
  id!: string;
  postId!: string;
  fileId!: string;
  position!: number;
  scanStatus!: PostMediaScanStatus;
}
