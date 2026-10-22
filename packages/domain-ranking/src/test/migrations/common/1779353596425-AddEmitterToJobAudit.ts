import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmitterToJobAudit1779353596425 implements MigrationInterface {
  name = 'AddEmitterToJobAudit1779353596425';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "job_audit" ADD "emitter" character varying(100)`);
    await queryRunner.query(`UPDATE "job_audit" SET "emitter" = 'unknown' WHERE "emitter" IS NULL`);
    await queryRunner.query(`ALTER TABLE "job_audit" ALTER COLUMN "emitter" SET NOT NULL`);
    await queryRunner.query(`DROP INDEX "public"."IDX_c0816b9c349e6faef069e518d5"`);
    await queryRunner.query(
      `ALTER TABLE "job_audit" ALTER COLUMN "worker_id" TYPE character varying(100)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c0816b9c349e6faef069e518d5" ON "job_audit" ("worker_id") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_c0816b9c349e6faef069e518d5"`);
    await queryRunner.query(
      `ALTER TABLE "job_audit" ALTER COLUMN "worker_id" TYPE character varying(255)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c0816b9c349e6faef069e518d5" ON "job_audit" ("worker_id") `,
    );
    await queryRunner.query(`ALTER TABLE "job_audit" DROP COLUMN "emitter"`);
  }
}
