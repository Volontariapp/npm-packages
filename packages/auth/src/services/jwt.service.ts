import { Inject, Injectable } from '@nestjs/common';
import * as jose from 'jose';
import { InternalServerError } from '@volontariapp/errors';
import { AUTH_OPTIONS } from '../constants/index.js';
import type { AuthConfig, AuthUser } from '../interfaces/index.js';

@Injectable()
export class JwtService {
  private readonly internalSecret: Uint8Array;
  private readonly gatewaySecret?: Uint8Array;

  constructor(@Inject(AUTH_OPTIONS) private readonly options: AuthConfig) {
    if (!options.internalSecret) {
      throw new InternalServerError('Internal secret not configured', 'AUTH_CONFIG_ERROR');
    }
    if (!options.internalExpiresIn) {
      throw new InternalServerError('Internal expiration time not configured', 'AUTH_CONFIG_ERROR');
    }
    if (!options.gatewaySecret) {
      throw new InternalServerError('Gateway secret not configured', 'AUTH_CONFIG_ERROR');
    }
    if (!options.gatewayExpiresIn) {
      throw new InternalServerError('Gateway expiration time not configured', 'AUTH_CONFIG_ERROR');
    }

    this.internalSecret = new TextEncoder().encode(options.internalSecret);
    this.gatewaySecret = new TextEncoder().encode(options.gatewaySecret);
  }

  async signInternal(user: AuthUser): Promise<string> {
    const sessionPayload: jose.JWTPayload = { ...user };

    const token = await new jose.SignJWT(sessionPayload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(this.options.internalExpiresIn.toString())
      .sign(this.internalSecret);

    return token;
  }

  async verifyInternal(token: string): Promise<AuthUser> {
    const { payload } = await jose.jwtVerify(token, this.internalSecret);
    return payload as unknown as AuthUser;
  }

  async verifyExternal(token: string): Promise<AuthUser> {
    const secret = this.gatewaySecret;
    if (!secret) {
      throw new InternalServerError('Gateway secret not configured', 'AUTH_CONFIG_ERROR');
    }
    const { payload } = await jose.jwtVerify(token, secret);
    return payload as unknown as AuthUser;
  }
}
