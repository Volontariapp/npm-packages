import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTargetServicesToEventQueue1777985367962 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('event_queue');
    const hasTargetServices = table?.findColumnByName('target_services');

    if (!hasTargetServices) {
      await queryRunner.query(
        `ALTER TABLE "event_queue" ADD "target_services" varchar array NOT NULL DEFAULT '{}'`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('event_queue');
    const hasTargetServices = table?.findColumnByName('target_services');
    if (hasTargetServices) {
      await queryRunner.query(`ALTER TABLE "event_queue" DROP COLUMN "target_services"`);
    }
  }
}
