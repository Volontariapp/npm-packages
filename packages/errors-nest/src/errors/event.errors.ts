import { NotFoundError, ConflictError, BadRequestError } from '@volontariapp/errors';

export const EVENT_NOT_FOUND = (id: string) => new NotFoundError(`Event with id ${id} not found`);

export const EVENT_ALREADY_EXISTS = (title: string) =>
  new ConflictError(`Event with title "${title}" already exists`);

export const TAG_NOT_FOUND = (id: string) => new NotFoundError(`Tag with id ${id} not found`);

export const TAG_ALREADY_EXISTS = (slug: string) =>
  new ConflictError(`Tag with slug ${slug} already exists`);

export const REQUIREMENT_NOT_FOUND = (id: string) =>
  new NotFoundError(`Requirement with id ${id} not found`);

export const INVALID_LOCATION = (details: string) =>
  new BadRequestError(`Invalid location: ${details}`, 'INVALID_EVENT_LOCATION');

export const INVALID_EVENT_STATE_TRANSITION = (from: string, to: string) =>
  new BadRequestError(`Cannot transition event from ${from} to ${to}`, 'INVALID_STATE_TRANSITION');
