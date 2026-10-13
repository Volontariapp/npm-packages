import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddJobAudit1779114963391 implements MigrationInterface {
  name = 'AddJobAudit1779114963391';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "job_audit" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "updated_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "job_id" character varying(100) NOT NULL, "job_type" character varying(255) NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'PENDING', "worker_id" character varying(255) NOT NULL, "current_attempt" integer NOT NULL DEFAULT '1', "started_at" TIMESTAMP, "finished_at" TIMESTAMP, "result_payload" jsonb, "error_message" text, "error_stack" text, CONSTRAINT "UQ_97856738d27cf25a03a19858f9f" UNIQUE ("job_id"), CONSTRAINT "PK_c580f2b133efd041412070efcc5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6dc48bc8128876ec2584ca468f" ON "job_audit" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c0816b9c349e6faef069e518d5" ON "job_audit" ("worker_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fde22585be17fba51745a56ea1" ON "job_audit" ("job_type") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_97856738d27cf25a03a19858f9" ON "job_audit" ("job_id") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_97856738d27cf25a03a19858f9"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_fde22585be17fba51745a56ea1"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_c0816b9c349e6faef069e518d5"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_6dc48bc8128876ec2584ca468f"`);
    await queryRunner.query(`DROP TABLE "job_audit"`);
  }
}
