import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import type { UserBadgeModel } from "./user-badge.model.js";

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

  @Column({name: "icon_path", type: 'varchar', nullable: true })
  iconPath?: string;

  /** Points crédités à l'attribution. Nullable (étape Expand), le catalogue de `shared` fait foi. */
  @Column({ type: 'int', nullable: true })
  points?: number;

  @OneToMany('UserBadgeModel', 'badge')
  userBadges!: UserBadgeModel[];
}
