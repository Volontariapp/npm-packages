import type { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateOutboxModels1777630651338 implements MigrationInterface {
  name = 'UpdateOutboxModels1777630651338';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "event_queue" ALTER COLUMN "updated_at" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "jobs_outbox" ALTER COLUMN "updated_at" DROP NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "jobs_outbox" ALTER COLUMN "updated_at" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "event_queue" ALTER COLUMN "updated_at" SET NOT NULL`);
  }
}
