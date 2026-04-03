import { Inject, Injectable } from '@nestjs/common';
import * as jose from 'jose';
import { AUTH_OPTIONS } from './constants.js';
import type { AuthConfig } from './interfaces/auth-config.interface.js';
import type { AuthUser } from './interfaces/auth-user.interface.js';

@Injectable()
export class JwtService {
  private readonly internalSecret: Uint8Array;
  private readonly gatewaySecret?: Uint8Array;

  constructor(@Inject(AUTH_OPTIONS) private readonly options: AuthConfig) {
    this.internalSecret = new TextEncoder().encode(options.internalSecret);
    const gatewaySec = options.gatewaySecret;
    if (gatewaySec) {
      this.gatewaySecret = new TextEncoder().encode(gatewaySec);
    }
  }

  async signInternal(user: AuthUser): Promise<string> {
    return new jose.SignJWT({ ...user })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(this.options.internalExpiresIn ?? '1m')
      .sign(this.internalSecret);
  }

  async verifyInternal(token: string): Promise<AuthUser> {
    const { payload } = await jose.jwtVerify(token, this.internalSecret);
    return payload as unknown as AuthUser;
  }

  async verifyExternal(token: string): Promise<AuthUser> {
    if (!this.gatewaySecret) {
      throw new Error('Gateway secret not configured');
    }
    const { payload } = await jose.jwtVerify(token, this.gatewaySecret);
    return payload as unknown as AuthUser;
  }
}
