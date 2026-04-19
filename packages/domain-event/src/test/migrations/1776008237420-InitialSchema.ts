import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1776008237420 implements MigrationInterface {
  name = 'InitialSchema1776008237420';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "postgis"`);
    await queryRunner.query(
      `CREATE TABLE "tags" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "slug" character varying(100) NOT NULL, "color" character varying(7) NOT NULL, CONSTRAINT "UQ_b3aa10c29ea4e61a830362bd25a" UNIQUE ("slug"), CONSTRAINT "PK_e7dc17249a1148a1970748eda99" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "requirements" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "quantity" integer NOT NULL, "isSystem" boolean NOT NULL DEFAULT false, "createdBy" uuid NOT NULL, CONSTRAINT "PK_4e966e20a0ebaf89e4c1ed664a4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."events_type_enum" AS ENUM('EVENT_TYPE_UNSPECIFIED', 'EVENT_TYPE_SOCIAL', 'EVENT_TYPE_ECOLOGY', 'UNRECOGNIZED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."events_state_enum" AS ENUM('EVENT_STATE_UNSPECIFIED', 'EVENT_STATE_DRAFT', 'EVENT_STATE_PUBLISHED', 'EVENT_STATE_CANCELLED', 'UNRECOGNIZED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "description" text NOT NULL, "startAt" TIMESTAMP NOT NULL, "endAt" TIMESTAMP NOT NULL, "location" geography(Point,4326), "type" "public"."events_type_enum" NOT NULL DEFAULT 'EVENT_TYPE_UNSPECIFIED', "state" "public"."events_state_enum" NOT NULL DEFAULT 'EVENT_STATE_DRAFT', "awardedImpactScore" integer NOT NULL DEFAULT '0', "maxParticipants" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_40731c7151fe4be3116e45ddf73" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "event_tags" ("eventsId" uuid NOT NULL, "tagsId" uuid NOT NULL, CONSTRAINT "PK_eee0b2936d8aacc61f362957376" PRIMARY KEY ("eventsId", "tagsId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2125cdd476172e1742b23b8658" ON "event_tags" ("eventsId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a5a1c5b8a419a36959425e9757" ON "event_tags" ("tagsId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "event_requirements" ("eventsId" uuid NOT NULL, "requirementsId" uuid NOT NULL, CONSTRAINT "PK_4e316d0a5eae4a8e275a508d957" PRIMARY KEY ("eventsId", "requirementsId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_94fb974ea3a82c4aaea84706cd" ON "event_requirements" ("eventsId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_812e6e81386d374b79fa39b6a4" ON "event_requirements" ("requirementsId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "event_tags" ADD CONSTRAINT "FK_2125cdd476172e1742b23b8658e" FOREIGN KEY ("eventsId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_tags" ADD CONSTRAINT "FK_a5a1c5b8a419a36959425e9757e" FOREIGN KEY ("tagsId") REFERENCES "tags"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_requirements" ADD CONSTRAINT "FK_94fb974ea3a82c4aaea84706cd9" FOREIGN KEY ("eventsId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_requirements" ADD CONSTRAINT "FK_812e6e81386d374b79fa39b6a44" FOREIGN KEY ("requirementsId") REFERENCES "requirements"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "event_requirements" DROP CONSTRAINT "FK_812e6e81386d374b79fa39b6a44"`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_requirements" DROP CONSTRAINT "FK_94fb974ea3a82c4aaea84706cd9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_tags" DROP CONSTRAINT "FK_a5a1c5b8a419a36959425e9757e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_tags" DROP CONSTRAINT "FK_2125cdd476172e1742b23b8658e"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_812e6e81386d374b79fa39b6a4"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_94fb974ea3a82c4aaea84706cd"`);
    await queryRunner.query(`DROP TABLE "event_requirements"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_a5a1c5b8a419a36959425e9757"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_2125cdd476172e1742b23b8658"`);
    await queryRunner.query(`DROP TABLE "event_tags"`);
    await queryRunner.query(`DROP TABLE "events"`);
    await queryRunner.query(`DROP TYPE "public"."events_state_enum"`);
    await queryRunner.query(`DROP TYPE "public"."events_type_enum"`);
    await queryRunner.query(`DROP TABLE "requirements"`);
    await queryRunner.query(`DROP TABLE "tags"`);
  }
}
