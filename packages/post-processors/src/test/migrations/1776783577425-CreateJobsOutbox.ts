import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateJobsOutbox1776783577425 implements MigrationInterface {
  name = 'CreateJobsOutbox1776783577425';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await queryRunner.query(
      `CREATE TABLE "jobs_outbox" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "status" character varying(20) NOT NULL DEFAULT 'PENDING',
        "attempts" integer NOT NULL DEFAULT '0',
        "lastError" text,
        "type" character varying(100) NOT NULL,
        "emitter" character varying(100) NOT NULL,
        "updated_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "target" character varying(100) NOT NULL,
        "payload" jsonb NOT NULL,
        "scheduled_at" TIMESTAMP NOT NULL,
        "traceId" uuid,
        CONSTRAINT "PK_7172b6dd5767f423ecb44d9fb57" PRIMARY KEY ("id")
      )`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "jobs_outbox"');
  }
}
