import type { UserId } from '../value-objects/ids.vo.js';

export class SocialUser {
  constructor(public readonly id: UserId) {}
}
