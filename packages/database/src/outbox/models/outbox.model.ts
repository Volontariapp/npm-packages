import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { OutboxStatus } from '../types/outbox.status.js';

@Entity('outbox')
export class OutboxModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Tracking and attempts
  @Column({ type: 'varchar', length: 20, default: OutboxStatus.PENDING })
  status: OutboxStatus = OutboxStatus.PENDING;
  @Column({ type: 'int', default: 0 })
  attempts: number = 0;
  @Column({ type: 'text', nullable: true })
  lastError?: string;

  @Column({ type: 'varchar', length: 100 })
  type!: string;
  @Column({ type: 'varchar', length: 100 })
  emitter!: string;

  @Column({ name: 'updated_at', type: 'timestamp'})
  updatedAt?: Date;
  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date = new Date();
}
