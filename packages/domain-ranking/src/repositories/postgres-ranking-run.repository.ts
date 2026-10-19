import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from '@volontariapp/database';
import { BaseRepository } from '@volontariapp/database';
import type { TransactionManager } from './sql.js';
import { RankingRunEntity } from '../entities/index.js';
import type { RankingListKind } from '../enums/index.js';
import { RankingRunModel } from '../models/index.js';
import type {
  ActiveUser,
  ActiveUsersCursor,
  IRankingRunRepository,
  ListFreshness,
} from './interfaces/index.js';
import { rowsOf } from './sql.js';

@Injectable()
export class PostgresRankingRunRepository
  extends BaseRepository<RankingRunModel, RankingRunEntity>
  implements IRankingRunRepository
{
  constructor(
    @InjectRepository(RankingRunModel)
    repository: Repository<RankingRunModel>,
  ) {
    super(repository, RankingRunEntity, RankingRunModel);
  }

  findByKey(userId: string, listKind: RankingListKind): Promise<RankingRunEntity | null> {
    return this.findOne({ userId, listKind });
  }

  async isUpToDate(params: {
    userId: string;
    listKind: RankingListKind;
    requestedAt: string;
    formulaVersion: number;
  }): Promise<boolean> {
    const rows = rowsOf<{ up_to_date: boolean }>(
      await this.repository.query(
        `SELECT (started_at >= $3::timestamptz AND formula_version = $4::integer) AS up_to_date
         FROM ranking_run WHERE user_id = $1::uuid AND list_kind = $2::varchar`,
        [params.userId, params.listKind, params.requestedAt, params.formulaVersion],
      ),
    );
    return rows.at(0)?.up_to_date ?? false;
  }

  async freshness(params: {
    userId: string;
    listKind: RankingListKind;
    maxAgeHours: number;
    formulaVersion: number;
  }): Promise<ListFreshness> {
    const rows = rowsOf<{ stale: boolean }>(
      await this.repository.query(
        `SELECT (computed_at < now() - make_interval(hours => $3::integer)
                 OR formula_version <> $4::integer) AS stale
         FROM ranking_run WHERE user_id = $1::uuid AND list_kind = $2::varchar`,
        [params.userId, params.listKind, params.maxAgeHours, params.formulaVersion],
      ),
    );
    const row = rows.at(0);
    if (!row) return 'MISSING';
    return row.stale ? 'STALE' : 'FRESH';
  }

  async listActiveUsers(params: {
    listKind: RankingListKind;
    days: number;
    limit: number;
    after?: ActiveUsersCursor;
  }): Promise<ActiveUser[]> {
    const rows = rowsOf<{ user_id: string; computed_at: string }>(
      await this.repository.query(
        `SELECT user_id, computed_at::text AS computed_at
         FROM ranking_run
         WHERE list_kind = $1::varchar
           AND computed_at > now() - make_interval(days => $2::integer)
           AND ($3::timestamptz IS NULL OR (computed_at, user_id) < ($3::timestamptz, $4::uuid))
         ORDER BY computed_at DESC, user_id DESC
         LIMIT $5::integer`,
        [
          params.listKind,
          params.days,
          params.after?.computedAt ?? null,
          params.after?.userId ?? null,
          params.limit,
        ],
      ),
    );
    return rows.map((row) => ({ userId: row.user_id, computedAt: row.computed_at }));
  }

  async purgeByUser(
    userId: string,
    manager: TransactionManager = this.repository.manager,
  ): Promise<number> {
    const result = await manager.delete(RankingRunModel, { userId });
    return result.affected ?? 0;
  }
}
