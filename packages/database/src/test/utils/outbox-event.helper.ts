import { OutboxModel } from "../../outbox/models/outbox.model.js";

export const makeOutboxEvent = (overrides: Partial<OutboxModel> = {}): OutboxModel => {
  const event = new OutboxModel();
  event.type = 'user.created';
  event.emitter = 'database-tests';
  event.updatedAt = new Date();
  return Object.assign(event, overrides);
};
