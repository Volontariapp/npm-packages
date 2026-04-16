import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { UserBadgeModel } from './user-badge.model.js';

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

  @Column({ name: "password_hash"})
  passwordHash!: string;

  @Column()
  salt!: string;

  @Column({ type: 'text', nullable: true })
  bio?: string;

  @Column({ type: 'varchar', nullable: true })
  logoPath?: string;

  @Column({ type: 'int', default: 0, name: "total_impact_score" })
  totalImpactScore!: number;

  @OneToMany(() => UserBadgeModel, userBadge => userBadge.user)
  userBadges!: UserBadgeModel[];
}
