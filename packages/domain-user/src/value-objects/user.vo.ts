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
  readonly pseudo?: string;
  readonly bio?: string;
  readonly logoPath?: string;
  readonly rna?: string;

  constructor(data: { pseudo?: string; bio?: string; logoPath?: string; rna?: string }) {
    this.pseudo = data.pseudo;
    this.bio = data.bio;
    this.logoPath = data.logoPath;
    this.rna = data.rna;
  }
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
