import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEventOrganizerAndMakeRequirementCreatorNullable1776104180000
  implements MigrationInterface
{
  name = 'AddEventOrganizerAndMakeRequirementCreatorNullable1776104180000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "events" ADD "organizerId" uuid`);
    await queryRunner.query(`ALTER TABLE "requirements" ALTER COLUMN "createdBy" DROP NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "requirements" ALTER COLUMN "createdBy" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "events" DROP COLUMN "organizerId"`);
  }
}
