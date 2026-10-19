export enum RankingQueue {
  /** Background computations of the event lists. */
  RANKING = 'ranking-queue',
  /** Background computations of the post feeds. */
  FEED = 'ranking-feed-queue',
  /** ON_DEMAND and MANUAL computations, for both lists: a user is waiting for a screen. */
  FALLBACK_RANKING = 'fallback-ranking-queue',
}
