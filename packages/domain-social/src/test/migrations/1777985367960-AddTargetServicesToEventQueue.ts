import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTargetServicesToEventQueue1777985367960 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "event_queue" ADD "target_services" varchar array NOT NULL DEFAULT '{}'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "event_queue" DROP COLUMN "target_services"`);
  }
}
