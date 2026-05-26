import type { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTagSchemaAndAddEventLocalisation1776110000000 implements MigrationInterface {
  name = 'UpdateTagSchemaAndAddEventLocalisation1776110000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Tags: Rename color to balise and increase length
    await queryRunner.query(`ALTER TABLE "tags" RENAME COLUMN "color" TO "balise"`);
    await queryRunner.query(`ALTER TABLE "tags" ALTER COLUMN "balise" TYPE character varying(100)`);

    // 2. Events: Add missing localisationName column
    await queryRunner.query(
      `ALTER TABLE "events" ADD "localisationName" character varying(255) NOT NULL DEFAULT ''`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse events change
    await queryRunner.query(`ALTER TABLE "events" DROP COLUMN "localisationName"`);

    // Reverse tags change
    await queryRunner.query(`ALTER TABLE "tags" ALTER COLUMN "balise" TYPE character varying(7)`);
    await queryRunner.query(`ALTER TABLE "tags" RENAME COLUMN "balise" TO "color"`);
  }
}
