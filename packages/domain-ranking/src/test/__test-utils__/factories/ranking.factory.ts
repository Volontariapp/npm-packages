import { randomUUID } from 'node:crypto';
import { RankingRunEntity, RankingScoreEntity } from '../../../entities/index.js';

export class RankingFactory {
  static buildScore(overrides: Partial<RankingScoreEntity> = {}): RankingScoreEntity {
    const score = new RankingScoreEntity();
    score.userId = overrides.userId ?? randomUUID();
    score.eventId = overrides.eventId ?? randomUUID();
    score.score = overrides.score ?? 0.5;
    score.structuralScore = overrides.structuralScore ?? 0.5;
    score.semanticScore = overrides.semanticScore ?? null;
    score.rank = overrides.rank ?? 1;
    score.reasons = overrides.reasons ?? [];
    score.computedAt = overrides.computedAt ?? new Date();
    return score;
  }

  static buildRun(overrides: Partial<RankingRunEntity> = {}): RankingRunEntity {
    const run = new RankingRunEntity();
    run.userId = overrides.userId ?? randomUUID();
    run.listKind = overrides.listKind ?? 'EVENT';
    run.listVersion = overrides.listVersion ?? randomUUID();
    run.startedAt = overrides.startedAt ?? new Date();
    run.computedAt = overrides.computedAt ?? new Date();
    run.source = overrides.source ?? 'FULL';
    run.formulaVersion = overrides.formulaVersion ?? 1;
    run.reason = overrides.reason ?? 'ON_DEMAND';
    run.candidateCount = overrides.candidateCount ?? 0;
    run.jevScoredCount = overrides.jevScoredCount ?? 0;
    run.jevInputTokens = overrides.jevInputTokens ?? null;
    run.jevOutputTokens = overrides.jevOutputTokens ?? null;
    run.durationMs = overrides.durationMs ?? 1;
    run.lastError = overrides.lastError ?? null;
    return run;
  }
}
