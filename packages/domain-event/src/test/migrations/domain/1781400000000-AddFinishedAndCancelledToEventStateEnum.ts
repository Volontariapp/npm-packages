import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The `events_state_enum` was left at {0,1,2,3,-1} (UNSPECIFIED, DRAFT, PUBLISHED,
 * IN_PROGRESS, UNRECOGNIZED) by 1777630647719-UpdateEventEnums, but the
 * @volontariapp/contracts EventState enum also defines EVENT_STATE_FINISHED = 4 and
 * EVENT_STATE_CANCELLED = 5. Any query filtering on those values fails with
 * "invalid input value for enum events_state_enum" since Postgres never had them.
 */
export class AddFinishedAndCancelledToEventStateEnum1781400000000 implements MigrationInterface {
  name = 'AddFinishedAndCancelledToEventStateEnum1781400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "public"."events_state_enum" ADD VALUE IF NOT EXISTS '4'`);
    await queryRunner.query(`ALTER TYPE "public"."events_state_enum" ADD VALUE IF NOT EXISTS '5'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."events_state_enum" RENAME TO "events_state_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."events_state_enum" AS ENUM('0', '1', '2', '3', '-1')`,
    );
    await queryRunner.query(`ALTER TABLE "events" ALTER COLUMN "state" DROP DEFAULT`);
    await queryRunner.query(
      `ALTER TABLE "events" ALTER COLUMN "state" TYPE "public"."events_state_enum" USING "state"::"text"::"public"."events_state_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "events" ALTER COLUMN "state" SET DEFAULT '1'`);
    await queryRunner.query(`DROP TYPE "public"."events_state_enum_old"`);
  }
}
