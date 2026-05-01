import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialUserSchema1776334421317 implements MigrationInterface {
  name = 'InitialUserSchema1776334421317';
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "badges" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" varchar NOT NULL,
                "slug" varchar NOT NULL,
                "description" text NOT NULL,
                "icon_path" varchar,
                CONSTRAINT "UQ_badges_slug" UNIQUE ("slug"),
                CONSTRAINT "PK_badges_id" PRIMARY KEY ("id")
            )
        `);

    await queryRunner.query(`
            CREATE TABLE "users" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "email" varchar(255) NOT NULL,
                "phone" varchar,
                "pseudo" varchar(255) NOT NULL,
                "role" varchar NOT NULL,
                "password_hash" varchar NOT NULL,
                "bio" text,
                "logo_path" varchar,
                "total_impact_score" integer NOT NULL DEFAULT 0,
                "rna" varchar,
                CONSTRAINT "UQ_users_email" UNIQUE ("email"),
                CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
            )
        `);

    await queryRunner.query(`
            CREATE TABLE "user_badges" (
                "user_id" uuid NOT NULL,
                "badge_id" uuid NOT NULL,
                "awarded_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_user_badges" PRIMARY KEY ("user_id", "badge_id")
            )
        `);

    await queryRunner.query(`
            ALTER TABLE "user_badges"
            ADD CONSTRAINT "FK_user_badges_user" FOREIGN KEY ("user_id")
            REFERENCES "users"("id") ON DELETE CASCADE
        `);
    await queryRunner.query(`
            ALTER TABLE "user_badges"
            ADD CONSTRAINT "FK_user_badges_badge" FOREIGN KEY ("badge_id")
            REFERENCES "badges"("id") ON DELETE CASCADE
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user_badges" DROP CONSTRAINT "FK_user_badges_badge"`);
    await queryRunner.query(`ALTER TABLE "user_badges" DROP CONSTRAINT "FK_user_badges_user"`);
    await queryRunner.query(`DROP TABLE "user_badges"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TABLE "badges"`);
  }
}
