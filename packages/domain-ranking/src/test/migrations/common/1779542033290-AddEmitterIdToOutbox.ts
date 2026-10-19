import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmitterIdToOutbox1779542033290 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "event_queue" ADD "emitterId" uuid NOT NULL DEFAULT uuid_generate_v4()`,
    );
    await queryRunner.query(`ALTER TABLE "event_queue" ALTER COLUMN "emitterId" DROP DEFAULT`);

    await queryRunner.query(
      `ALTER TABLE "jobs_outbox" ADD "emitterId" uuid NOT NULL DEFAULT uuid_generate_v4()`,
    );
    await queryRunner.query(`ALTER TABLE "jobs_outbox" ALTER COLUMN "emitterId" DROP DEFAULT`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "jobs_outbox" DROP COLUMN "emitterId"`);
    await queryRunner.query(`ALTER TABLE "event_queue" DROP COLUMN "emitterId"`);
  }
}
