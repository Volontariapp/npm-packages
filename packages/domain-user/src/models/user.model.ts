import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import type { UserBadgeModel } from './user-badge.model.js';
import { UserStatus } from '../entities/user-status.enum.js';

@Entity('users')
export class UserModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'varchar', nullable: true })
  phone?: string;

  @Column({ type: 'varchar', length: 255 })
  pseudo!: string;

  @Column()
  role!: string;

  @Column({ name: 'password_hash' })
  passwordHash!: string;

  @Column({ type: 'text', nullable: true })
  bio?: string;

  @Column({ type: 'varchar', nullable: true, name: 'logo_path' })
  /** @deprecated Use avatarFileId */
  logoPath?: string;

  @Column({ type: 'uuid', nullable: true, name: 'avatar_file_id' })
  avatarFileId?: string | null;

  @Column({ type: 'varchar', nullable: true })
  rna?: string;

  @Column({ type: 'int', default: 0, name: 'total_impact_score' })
  totalImpactScore!: number;

  @Column({ type: 'varchar', length: 32, default: UserStatus.ACTIVE })
  status!: UserStatus;

  @Column({ type: 'timestamptz', nullable: true, name: 'deletion_requested_at' })
  deletionRequestedAt?: Date;

  @OneToMany('UserBadgeModel', 'user')
  userBadges!: UserBadgeModel[];
}
