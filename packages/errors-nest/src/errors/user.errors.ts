import { NotFoundError,ConflictError, BadRequestError } from '@volontariapp/errors';

export const USER_NOT_FOUND = (id: string) => new NotFoundError(`User with id ${id} not found`);

export const USER_ALREADY_EXISTS = (email: string) =>
  new ConflictError(`User with email "${email}" already exists`);

export const INVALID_RNA = (rna: string) =>
  new BadRequestError(`The RNA number "${rna}" is not valid`);

export const USER_ALREADY_HAS_BADGE = (userId: string, badgeId: string) =>
  new ConflictError(`User with id ${userId} already has badge with id ${badgeId}`);

export const USER_BADGE_NOT_FOUND = (userId: string, badgeId: string) =>
  new NotFoundError(`User with id ${userId} does not have badge with id ${badgeId}`);

export const BADGE_NOT_FOUND = (id: string) => new NotFoundError(`Badge with id ${id} not found`);

export const INVALID_SCORE_INCREMENT = (score: number) =>
  new BadRequestError(`Score increment of ${score.toString()} is invalid`);
