import type { ProfileEntity } from './profile.entity.js';

export class UserEntity {
  id!: number;

  firstName!: string;

  lastName!: string;

  email!: string;

  createdAt!: Date;

  loginCount: number = 0;

  profile?: ProfileEntity;

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}
