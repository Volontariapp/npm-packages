import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBadgePointsAndProgressDedup1793970000000 implements MigrationInterface {
  name = 'AddBadgePointsAndProgressDedup1793970000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Expand : colonne nullable, aucun impact sur le code qui ne la lit pas encore.
    await queryRunner.query(`ALTER TABLE "badges" ADD COLUMN "points" integer NULL`);

    // Points du catalogue de @volontariapp/shared (BADGE_POINTS_VERSION 1, points x10).
    await queryRunner.query(`
      UPDATE "badges" AS b SET "points" = v."points"
      FROM (VALUES
        ('EVENT_PARTICIPATION_TIER_1', 100),
        ('EVENT_PARTICIPATION_TIER_2', 250),
        ('EVENT_PARTICIPATION_TIER_3', 500),
        ('EVENT_PARTICIPATION_TIER_4', 1000),
        ('EVENT_SOCIAL_TIER_1', 150),
        ('EVENT_SOCIAL_TIER_2', 400),
        ('EVENT_ECOLOGY_TIER_1', 150),
        ('EVENT_ECOLOGY_TIER_2', 400),
        ('EVENT_HYBRID_ECO_SOCIAL_TIER_1', 600),
        ('EVENT_HOST_COUNT_1', 200),
        ('COMMUNITY_POST_COUNT_1', 100),
        ('SOCIAL_LIKE_COUNT_10', 100),
        ('EVENT_WISHLIST_COUNT_10', 100)
      ) AS v("slug", "points")
      WHERE b."slug" = v."slug"
    `);

    await queryRunner.query(`
      CREATE TABLE "badge_point_credits" (
        "user_id" uuid NOT NULL,
        "badge_id" uuid NOT NULL,
        "points" integer NOT NULL,
        "formula_version" integer NOT NULL DEFAULT 1,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_badge_point_credits" PRIMARY KEY ("user_id", "badge_id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "badge_point_credits"
      ADD CONSTRAINT "FK_badge_point_credits_user" FOREIGN KEY ("user_id")
      REFERENCES "users"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "badge_point_credits"
      ADD CONSTRAINT "FK_badge_point_credits_badge" FOREIGN KEY ("badge_id")
      REFERENCES "badges"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      CREATE TABLE "badge_progress_dedup" (
        "user_id" uuid NOT NULL,
        "metric" varchar(64) NOT NULL,
        "ref_id" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_badge_progress_dedup" PRIMARY KEY ("user_id", "metric", "ref_id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "badge_progress_dedup"
      ADD CONSTRAINT "FK_badge_progress_dedup_user" FOREIGN KEY ("user_id")
      REFERENCES "users"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "badge_progress_dedup" DROP CONSTRAINT "FK_badge_progress_dedup_user"`,
    );
    await queryRunner.query(`DROP TABLE "badge_progress_dedup"`);

    await queryRunner.query(
      `ALTER TABLE "badge_point_credits" DROP CONSTRAINT "FK_badge_point_credits_badge"`,
    );
    await queryRunner.query(
      `ALTER TABLE "badge_point_credits" DROP CONSTRAINT "FK_badge_point_credits_user"`,
    );
    await queryRunner.query(`DROP TABLE "badge_point_credits"`);

    await queryRunner.query(`ALTER TABLE "badges" DROP COLUMN "points"`);
  }
}
