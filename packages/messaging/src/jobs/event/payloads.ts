export enum EventsJobType {
  PUBLISH_EVENT = 'events.publish_event',
}

export interface IPublishEventPayload {
  eventId: string;
  creatorId: string;
}
