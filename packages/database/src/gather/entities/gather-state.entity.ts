import { BaseEntity } from '../../core/base.entity.js';

export class GatherStateEntity extends BaseEntity {
  correlationId!: string;
  triggerEvent!: string;
  expectedEvents!: string[];
  receivedEvents: string[] = [];
}
