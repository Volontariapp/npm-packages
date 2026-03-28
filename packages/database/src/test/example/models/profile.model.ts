import { Entity, PrimaryGeneratedColumn, Column, OneToOne } from 'typeorm';
import type { UserModel } from './user.model.js';

@Entity('profiles')
export class ProfileModel {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', nullable: true })
  bio!: string;

  @OneToOne('UserModel', 'profile')
  user!: UserModel;
}
