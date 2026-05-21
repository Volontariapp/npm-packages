import type { MigrationInterface, QueryRunner } from 'typeorm';

export class PolymorphicPlum1777985367959 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "event_queue" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP DEFAULT NULL,
                "status" varchar NOT NULL,
                "attempts" integer NOT NULL DEFAULT 0,
                "lastError" varchar DEFAULT NULL,
                "type" varchar NOT NULL,
                "emitter" varchar NOT NULL,
                "traceId" varchar DEFAULT NULL,
                "version" integer NOT NULL DEFAULT 1,
                "payload" jsonb NOT NULL,
                "processedAt" TIMESTAMP DEFAULT NULL,
                CONSTRAINT "PK_event_queue_id" PRIMARY KEY ("id")
            )`,
    );

    await queryRunner.query(
      `CREATE TABLE "jobs_outbox" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP DEFAULT NULL,
                "status" varchar NOT NULL,
                "attempts" integer NOT NULL DEFAULT 0,
                "lastError" varchar DEFAULT NULL,
                "type" varchar NOT NULL,
                "emitter" varchar NOT NULL,
                "traceId" varchar DEFAULT NULL,
                "target" varchar NOT NULL,
                "payload" jsonb NOT NULL,
                "scheduledAt" TIMESTAMP DEFAULT NULL,
                CONSTRAINT "PK_jobs_outbox_id" PRIMARY KEY ("id")
            )`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "jobs_outbox"`);
    await queryRunner.query(`DROP TABLE "event_queue"`);
  }
}
