import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddScoringVersionToEvent1792200000000 implements MigrationInterface {
  name = 'AddScoringVersionToEvent1792200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "events" ADD "scoring_version" integer NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "events" DROP COLUMN "scoring_version"`);
  }
}
