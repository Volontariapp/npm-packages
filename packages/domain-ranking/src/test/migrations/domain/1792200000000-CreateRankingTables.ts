import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRankingTables1792200000000 implements MigrationInterface {
  name = 'CreateRankingTables1792200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "ranking_score" (
        "user_id" uuid NOT NULL,
        "event_id" uuid NOT NULL,
        "score" numeric(5,4) NOT NULL CONSTRAINT "CHK_ranking_score_score" CHECK ("score" BETWEEN 0 AND 1),
        "structural_score" numeric(5,4) NOT NULL CONSTRAINT "CHK_ranking_score_structural" CHECK ("structural_score" BETWEEN 0 AND 1),
        "semantic_score" numeric(5,4) NULL CONSTRAINT "CHK_ranking_score_semantic" CHECK ("semantic_score" BETWEEN 0 AND 1),
        "rank" integer NOT NULL CONSTRAINT "CHK_ranking_score_rank" CHECK ("rank" >= 1),
        "reasons" varchar(30)[] NOT NULL DEFAULT '{}',
        "computed_at" timestamptz NOT NULL,
        CONSTRAINT "PK_ranking_score" PRIMARY KEY ("user_id", "event_id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_ranking_score_user_rank" ON "ranking_score" ("user_id", "rank")`,
    );

    await queryRunner.query(`
      CREATE TABLE "ranking_post_score" (
        "user_id" uuid NOT NULL,
        "post_id" uuid NOT NULL,
        "author_id" uuid NOT NULL,
        "origin" varchar(10) NOT NULL,
        "score" numeric(5,4) NOT NULL CONSTRAINT "CHK_ranking_post_score_score" CHECK ("score" BETWEEN 0 AND 1),
        "structural_score" numeric(5,4) NOT NULL CONSTRAINT "CHK_ranking_post_score_structural" CHECK ("structural_score" BETWEEN 0 AND 1),
        "semantic_score" numeric(5,4) NULL CONSTRAINT "CHK_ranking_post_score_semantic" CHECK ("semantic_score" BETWEEN 0 AND 1),
        "rank" integer NOT NULL CONSTRAINT "CHK_ranking_post_score_rank" CHECK ("rank" >= 1),
        "reasons" varchar(30)[] NOT NULL DEFAULT '{}',
        "computed_at" timestamptz NOT NULL,
        CONSTRAINT "PK_ranking_post_score" PRIMARY KEY ("user_id", "post_id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_ranking_post_score_user_rank" ON "ranking_post_score" ("user_id", "rank")`,
    );

    await queryRunner.query(`
      CREATE TABLE "ranking_run" (
        "user_id" uuid NOT NULL,
        "list_kind" varchar(10) NOT NULL,
        "list_version" uuid NOT NULL,
        "started_at" timestamptz NOT NULL,
        "computed_at" timestamptz NOT NULL,
        "source" varchar(20) NOT NULL,
        "formula_version" integer NOT NULL,
        "reason" varchar(30) NOT NULL,
        "candidate_count" integer NOT NULL,
        "jev_scored_count" integer NOT NULL DEFAULT 0,
        "jev_input_tokens" integer NULL,
        "jev_output_tokens" integer NULL,
        "duration_ms" integer NOT NULL,
        "last_error" text NULL,
        CONSTRAINT "PK_ranking_run" PRIMARY KEY ("user_id", "list_kind"),
        CONSTRAINT "CHK_ranking_run_kind" CHECK ("list_kind" IN ('EVENT', 'POST'))
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_ranking_run_active" ON "ranking_run" ("list_kind", "computed_at" DESC, "user_id" DESC)`,
    );

    await queryRunner.query(`
      CREATE TABLE "ranking_request" (
        "user_id" uuid NOT NULL,
        "list_kind" varchar(10) NOT NULL,
        "requested_at" timestamptz NOT NULL,
        "reason" varchar(30) NOT NULL,
        "job_enqueued_at" timestamptz NOT NULL,
        CONSTRAINT "PK_ranking_request" PRIMARY KEY ("user_id", "list_kind"),
        CONSTRAINT "CHK_ranking_request_kind" CHECK ("list_kind" IN ('EVENT', 'POST'))
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "ranking_like_log" (
        "user_id" uuid NOT NULL,
        "post_id" uuid NOT NULL,
        "occurred_at" timestamptz NOT NULL,
        "deleted_at" timestamptz NULL,
        "origin" varchar(10) NOT NULL,
        CONSTRAINT "PK_ranking_like_log" PRIMARY KEY ("user_id", "post_id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_ranking_like_log_user_date" ON "ranking_like_log" ("user_id", "occurred_at" DESC)`,
    );

    await queryRunner.query(`
      CREATE TABLE "ranking_event_feedback" (
        "user_id" uuid NOT NULL,
        "event_id" uuid NOT NULL,
        "action" varchar(10) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ranking_event_feedback" PRIMARY KEY ("user_id", "event_id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_ranking_event_feedback_event" ON "ranking_event_feedback" ("event_id", "action")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_ranking_event_feedback_user_date" ON "ranking_event_feedback" ("user_id", "created_at" DESC)`,
    );

    await queryRunner.query(`
      CREATE TABLE "ranking_event_wish" (
        "user_id" uuid NOT NULL,
        "event_id" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ranking_event_wish" PRIMARY KEY ("user_id", "event_id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_ranking_event_wish_event" ON "ranking_event_wish" ("event_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "ranking_event_mention" (
        "post_id" uuid NOT NULL,
        "event_id" uuid NOT NULL,
        "author_id" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ranking_event_mention" PRIMARY KEY ("post_id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_ranking_event_mention_event_date" ON "ranking_event_mention" ("event_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_ranking_event_mention_author" ON "ranking_event_mention" ("author_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "ranking_user_location" (
        "user_id" uuid NOT NULL,
        "location_enc" bytea NOT NULL,
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ranking_user_location" PRIMARY KEY ("user_id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "ranking_rate_bucket" (
        "user_id" uuid NOT NULL,
        "bucket" varchar(20) NOT NULL,
        "tokens" numeric(6,3) NOT NULL,
        "updated_at" timestamptz NOT NULL,
        CONSTRAINT "PK_ranking_rate_bucket" PRIMARY KEY ("user_id", "bucket")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "ranking_rate_bucket"`);
    await queryRunner.query(`DROP TABLE "ranking_user_location"`);
    await queryRunner.query(`DROP INDEX "idx_ranking_event_mention_author"`);
    await queryRunner.query(`DROP INDEX "idx_ranking_event_mention_event_date"`);
    await queryRunner.query(`DROP TABLE "ranking_event_mention"`);
    await queryRunner.query(`DROP INDEX "idx_ranking_event_wish_event"`);
    await queryRunner.query(`DROP TABLE "ranking_event_wish"`);
    await queryRunner.query(`DROP INDEX "idx_ranking_event_feedback_user_date"`);
    await queryRunner.query(`DROP INDEX "idx_ranking_event_feedback_event"`);
    await queryRunner.query(`DROP TABLE "ranking_event_feedback"`);
    await queryRunner.query(`DROP INDEX "idx_ranking_like_log_user_date"`);
    await queryRunner.query(`DROP TABLE "ranking_like_log"`);
    await queryRunner.query(`DROP TABLE "ranking_request"`);
    await queryRunner.query(`DROP INDEX "idx_ranking_run_active"`);
    await queryRunner.query(`DROP TABLE "ranking_run"`);
    await queryRunner.query(`DROP INDEX "idx_ranking_post_score_user_rank"`);
    await queryRunner.query(`DROP TABLE "ranking_post_score"`);
    await queryRunner.query(`DROP INDEX "idx_ranking_score_user_rank"`);
    await queryRunner.query(`DROP TABLE "ranking_score"`);
  }
}
