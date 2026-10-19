import { InternalServerError } from '@volontariapp/errors';

/** The semantic scorer is not reachable or refused the request: the caller falls back to the structural score. */
export class RankingScorerUnavailableException extends InternalServerError {
  constructor(message = 'Ranking scorer unavailable') {
    super(message, 'RANKING_SCORER_UNAVAILABLE');
  }
}
