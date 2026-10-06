import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Test copy of the `ms_storage` schema (docs/stockage-fichiers/08-contrats-et-evolutions.md,
 * section 8). The production migration lives in `ms-storage`.
 */
export class InitialStorageSchema1791300000000 implements MigrationInterface {
  name = 'InitialStorageSchema1791300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "files" (
        "id" uuid NOT NULL,
        "owner_id" uuid NOT NULL,
        "entity_type" character varying NOT NULL,
        "entity_id" uuid,
        "status" character varying NOT NULL DEFAULT 'PENDING',
        "scan_status" character varying NOT NULL DEFAULT 'AWAITING_UPLOAD',
        "rejection_reason" character varying,
        "declared_mime_type" character varying NOT NULL,
        "declared_size" bigint NOT NULL,
        "actual_size" bigint,
        "quarantine_key" character varying NOT NULL,
        "public_key" character varying,
        "scan_attempts" integer NOT NULL DEFAULT 0,
        "rescan_scheduled_at" TIMESTAMP WITH TIME ZONE,
        "validation_mode" character varying NOT NULL,
        "upload_expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "confirmed_at" TIMESTAMP WITH TIME ZONE,
        "scanned_at" TIMESTAMP WITH TIME ZONE,
        "reserved_at" TIMESTAMP WITH TIME ZONE,
        "attached_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_files_id" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_files_entity" ON "files" ("entity_type", "entity_id")`,
    );
    await queryRunner.query(`CREATE INDEX "idx_files_owner" ON "files" ("owner_id")`);
    await queryRunner.query(
      `CREATE INDEX "idx_files_awaiting" ON "files" ("upload_expires_at") WHERE "scan_status" = 'AWAITING_UPLOAD'`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_files_scanning" ON "files" ("confirmed_at") WHERE "scan_status" = 'SCANNING'`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_files_unused" ON "files" ("confirmed_at") WHERE "status" = 'PENDING'`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_files_reserved" ON "files" ("reserved_at") WHERE "status" = 'RESERVED'`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_files_orphaned" ON "files" ("updated_at") WHERE "status" = 'ORPHANED'`,
    );

    await queryRunner.query(
      `CREATE TABLE "released_entities" (
        "entity_type" character varying NOT NULL,
        "entity_id" uuid NOT NULL,
        "released_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_released_entities" PRIMARY KEY ("entity_type", "entity_id")
      )`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "released_entities"`);
    await queryRunner.query(`DROP INDEX "public"."idx_files_orphaned"`);
    await queryRunner.query(`DROP INDEX "public"."idx_files_reserved"`);
    await queryRunner.query(`DROP INDEX "public"."idx_files_unused"`);
    await queryRunner.query(`DROP INDEX "public"."idx_files_scanning"`);
    await queryRunner.query(`DROP INDEX "public"."idx_files_awaiting"`);
    await queryRunner.query(`DROP INDEX "public"."idx_files_owner"`);
    await queryRunner.query(`DROP INDEX "public"."idx_files_entity"`);
    await queryRunner.query(`DROP TABLE "files"`);
  }
}
