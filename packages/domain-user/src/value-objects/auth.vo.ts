import type { UserEntity } from '../entities/user.entity.js';

export class SignUpInput {
  constructor(
    public readonly email: string,
    public readonly password: string,
    public readonly pseudo?: string,
    public readonly bio?: string,
    public readonly logoPath?: string,
    public readonly rna?: string,
  ) {}
}

export class LoginInput {
  constructor(
    public readonly email: string,
    public readonly password: string,
  ) {}
}

export class AuthTokens {
  constructor(
    public readonly accessToken: string,
    public readonly refreshToken: string,
  ) {}
}

export class SignUpOutput {
  constructor(
    public readonly user: UserEntity,
    public readonly auth: AuthTokens,
  ) {}
}

export class RefreshTokensInput {
  constructor(public readonly refreshToken: string) {}
}
