import type { ObjectLiteral } from '@volontariapp/database';

/** Surface de `InsertQueryBuilder` utilisee pour un `INSERT ... ON CONFLICT DO NOTHING`. */
export interface InsertOrIgnoreBuilder {
  into(target: string): InsertOrIgnoreBuilder;
  values(row: ObjectLiteral): InsertOrIgnoreBuilder;
  orIgnore(): InsertOrIgnoreBuilder;
  execute(): Promise<unknown>;
}

/** Surface d'un `Repository` TypeORM suffisante pour inserer en ignorant les doublons de cle. */
export interface InsertOrIgnoreSource {
  createQueryBuilder(): { insert(): InsertOrIgnoreBuilder };
}

/**
 * `INSERT ... ON CONFLICT DO NOTHING`. La cible est donnee par nom : `into(Model)` fait exploser
 * l'inference TypeScript (TS2589) sur un modele a payload generique.
 */
export async function insertOrIgnore(
  source: InsertOrIgnoreSource,
  targetName: string,
  row: ObjectLiteral,
): Promise<void> {
  await source.createQueryBuilder().insert().into(targetName).values(row).orIgnore().execute();
}
