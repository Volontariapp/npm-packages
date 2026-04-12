import { NotFoundError, ConflictError } from '@volontariapp/errors';

export const EVENT_NOT_FOUND = (id: string) => new NotFoundError(`Event with id ${id} not found`);

export const TAG_NOT_FOUND = (id: string) => new NotFoundError(`Tag with id ${id} not found`);

export const TAG_ALREADY_EXISTS = (slug: string) =>
  new ConflictError(`Tag with slug ${slug} already exists`);

export const REQUIREMENT_NOT_FOUND = (id: string) =>
  new NotFoundError(`Requirement with id ${id} not found`);
