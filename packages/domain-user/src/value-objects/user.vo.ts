import type { UserEntity } from '../entities/user.entity.js';

export class UserId {
  constructor(public readonly value: string) {}
}

export class UserEmail {
  constructor(public readonly value: string) {}
}

export class UserRna {
  constructor(public readonly value: string) {}
}

export class UpdateUserInput {
  constructor(
    public readonly pseudo?: string,
    public readonly bio?: string,
    public readonly logoPath?: string,
    public readonly rna?: string,
  ) {}
}

export class PaginationInput {
  constructor(
    public readonly limit?: number,
    public readonly offset?: number,
  ) {}
}

export class UserListResult {
  constructor(
    public readonly users: UserEntity[],
    public readonly total: number,
  ) {}
}

export class ImpactScore {
  constructor(public readonly value: number) {}
}
