import { CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import type { BadgeModel } from "./badge.model.js";
import type { UserModel } from "./user.model.js";

@Entity('user_badges')
export class UserBadgeModel {
  @PrimaryColumn({ type: 'uuid', name: "user_id" })
  userId!: string;

  @PrimaryColumn({ type: 'uuid', name: "badge_id" })
  badgeId!: string;

  @ManyToOne('UserModel', 'userBadges', { onDelete: 'CASCADE' })
  @JoinColumn({ name: "user_id" })
  user!: UserModel;

  @ManyToOne('BadgeModel', 'userBadges', { onDelete: 'CASCADE' })
  @JoinColumn({ name: "badge_id" })
  badge!: BadgeModel;

  @CreateDateColumn({ name: "awarded_at" })
  awardedAt!: Date;
}
