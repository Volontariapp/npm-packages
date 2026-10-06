import type {
  IBadgeCreatedPayload,
  IBadgeDeletedPayload,
  IBadgeIconReplacedPayload,
  IEventCoverReplacedPayload,
  IEventCreatedPayload,
  IPostCreatedPayload,
  IUserAvatarReplacedPayload,
} from '../events/index.js';

export const buildPostCreatedPayload = (
  overrides: Partial<IPostCreatedPayload> = {},
): IPostCreatedPayload => ({
  postId: 'post-1',
  userId: 'user-1',
  fileIds: ['file-1'],
  ...overrides,
});

export const buildEventCreatedPayload = (
  overrides: Partial<IEventCreatedPayload> = {},
): IEventCreatedPayload => ({
  eventId: 'event-1',
  userId: 'user-1',
  localisationName: 'Paris',
  ...overrides,
});

export const buildEventCoverReplacedPayload = (
  overrides: Partial<IEventCoverReplacedPayload> = {},
): IEventCoverReplacedPayload => ({
  eventId: 'event-1',
  userId: 'user-1',
  newFileId: 'file-2',
  oldFileId: 'file-1',
  ...overrides,
});

export const buildUserAvatarReplacedPayload = (
  overrides: Partial<IUserAvatarReplacedPayload> = {},
): IUserAvatarReplacedPayload => ({
  userId: 'user-1',
  newFileId: 'file-2',
  oldFileId: 'file-1',
  ...overrides,
});

export const buildBadgeCreatedPayload = (
  overrides: Partial<IBadgeCreatedPayload> = {},
): IBadgeCreatedPayload => ({
  badgeId: 'badge-1',
  ...overrides,
});

export const buildBadgeIconReplacedPayload = (
  overrides: Partial<IBadgeIconReplacedPayload> = {},
): IBadgeIconReplacedPayload => ({
  badgeId: 'badge-1',
  newFileId: 'file-2',
  ...overrides,
});

export const buildBadgeDeletedPayload = (
  overrides: Partial<IBadgeDeletedPayload> = {},
): IBadgeDeletedPayload => ({
  badgeId: 'badge-1',
  ...overrides,
});
