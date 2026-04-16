import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { UserBadgeModel } from "./user-badge.model.js";

@Entity('badges')
export class BadgeModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ unique: true })
  slug!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({name: "icon_path"})
  iconPath!: string;

  @OneToMany(() => UserBadgeModel, userBadge => userBadge.badge)
  userBadges!: UserBadgeModel[];
}
