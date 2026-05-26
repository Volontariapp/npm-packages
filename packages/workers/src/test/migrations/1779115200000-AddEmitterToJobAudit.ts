import { TableColumn, type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddEmitterToJobAudit1779115200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'job_audit',
      new TableColumn({
        name: 'emitter',
        type: 'varchar',
        length: '100',
        isNullable: false,
        default: "'unknown'",
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('job_audit', 'emitter');
  }
}
