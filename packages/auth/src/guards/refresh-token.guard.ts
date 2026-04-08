import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { JwtService } from '../services/jwt.service.js';
import { MISSING_REFRESH_TOKEN, INVALID_REFRESH_TOKEN } from '@volontariapp/errors-nest';
import { Logger } from '@volontariapp/logger';

@Injectable()
export class RefreshTokenGuard implements CanActivate {
  private readonly logger = new Logger({ context: 'RefreshTokenGuard', format: 'json' });
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Record<string, unknown>>();
    const token = request['refreshToken'];

    if (typeof token !== 'string') {
      this.logger.warn('Refresh token is missing from request');
      throw MISSING_REFRESH_TOKEN();
    }

    try {
      const user = await this.jwtService.verifyRefreshToken(token);
      request['user'] = user;
      this.logger.debug(`User ${user.id} authenticated with refresh token`);
      return true;
    } catch (error) {
      this.logger.error('Refresh token verification failed', error);
      throw INVALID_REFRESH_TOKEN(error instanceof Error ? error.message : undefined);
    }
  }
}
