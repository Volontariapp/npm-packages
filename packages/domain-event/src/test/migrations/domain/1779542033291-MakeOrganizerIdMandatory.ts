import type { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeOrganizerIdMandatory1779542033291 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "events" ALTER COLUMN "organizerId" SET NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "events" ALTER COLUMN "organizerId" DROP NOT NULL`);
  }
}
