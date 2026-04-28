import { OutboxModel } from '../../../outbox/models/outbox.model.js';

type OutboxFactory<TEvent extends OutboxModel> = () => TEvent;

export const makeOutboxEvent = <TEvent extends OutboxModel = OutboxModel>(
  overrides: Partial<TEvent> = {},
  factory: OutboxFactory<TEvent> = () => new OutboxModel() as TEvent,
): TEvent => {
  const event = factory();
  event.type = 'user.created';
  event.emitter = 'database-tests';
  event.updatedAt = new Date();
  return Object.assign(event, overrides);
};
