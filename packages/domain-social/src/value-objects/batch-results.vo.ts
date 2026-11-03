/** Nombre de participants d'un evenement (createur implicite exclu, comme getEventParticipants). */
export class EventParticipantCountVO {
  constructor(
    public readonly eventId: string,
    public readonly count: number,
  ) {}
}

/** Resume des likes d'un post pour un lecteur donne. */
export class PostLikeSummaryVO {
  constructor(
    public readonly postId: string,
    public readonly likeCount: number,
    public readonly likedByMe: boolean,
  ) {}
}
