import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { JwtService } from '../services/jwt.service.js';
import { MISSING_REFRESH_TOKEN, INVALID_REFRESH_TOKEN } from '../errors/auth.errors.js';

@Injectable()
export class RefreshTokenGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Record<string, unknown>>();
    const token = request['refreshToken'];

    if (typeof token !== 'string') {
      throw MISSING_REFRESH_TOKEN();
    }

    try {
      const user = await this.jwtService.verifyRefreshToken(token);
      request['user'] = user;
      return true;
    } catch (error) {
      throw INVALID_REFRESH_TOKEN(error instanceof Error ? error.message : undefined);
    }
  }
}
