import type { MigrationInterface, QueryRunner } from 'typeorm';

export class JobsOutboxAndEventQueue1776783577424 implements MigrationInterface {
  name = 'JobsOutboxAndEventQueue1776783577424';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user_badges" DROP CONSTRAINT "FK_user_badges_user"`);
    await queryRunner.query(`ALTER TABLE "user_badges" DROP CONSTRAINT "FK_user_badges_badge"`);
    await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "logo_path" TO "logoPath"`);
    await queryRunner.query(
      `CREATE TABLE "event_queue" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "status" character varying(20) NOT NULL DEFAULT 'PENDING', "attempts" integer NOT NULL DEFAULT '0', "lastError" text, "type" character varying(100) NOT NULL, "emitter" character varying(100) NOT NULL, "updated_at" TIMESTAMP NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "payload" jsonb NOT NULL, "processed_at" TIMESTAMP, CONSTRAINT "PK_f2ab43ee6a569a89ba286db2fa6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "jobs_outbox" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "status" character varying(20) NOT NULL DEFAULT 'PENDING', "attempts" integer NOT NULL DEFAULT '0', "lastError" text, "type" character varying(100) NOT NULL, "emitter" character varying(100) NOT NULL, "updated_at" TIMESTAMP NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "target" character varying(100) NOT NULL, "payload" jsonb NOT NULL, "scheduled_at" TIMESTAMP NOT NULL, CONSTRAINT "PK_7172b6dd5767f423ecb44d9fb57" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`ALTER TABLE "badges" ALTER COLUMN "icon_path" DROP NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "user_badges" ADD CONSTRAINT "FK_f1221d9b1aaa64b1f3c98ed46d3" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_badges" ADD CONSTRAINT "FK_715b81e610ab276ff6603cfc8e8" FOREIGN KEY ("badge_id") REFERENCES "badges"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_badges" DROP CONSTRAINT "FK_715b81e610ab276ff6603cfc8e8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_badges" DROP CONSTRAINT "FK_f1221d9b1aaa64b1f3c98ed46d3"`,
    );
    await queryRunner.query(`ALTER TABLE "badges" ALTER COLUMN "icon_path" SET NOT NULL`);
    await queryRunner.query(`DROP TABLE "jobs_outbox"`);
    await queryRunner.query(`DROP TABLE "event_queue"`);
    await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "logoPath" TO "logo_path"`);
    await queryRunner.query(
      `ALTER TABLE "user_badges" ADD CONSTRAINT "FK_user_badges_badge" FOREIGN KEY ("badge_id") REFERENCES "badges"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_badges" ADD CONSTRAINT "FK_user_badges_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
