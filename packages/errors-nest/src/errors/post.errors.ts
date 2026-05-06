import { NotFoundError, ConflictError } from '@volontariapp/errors';

export const POST_NOT_FOUND = (id: string) => new NotFoundError(`Post with id ${id} not found`);

export const POST_ALREADY_EXISTS = (title: string) =>
  new ConflictError(`Post with title "${title}" already exists`);
