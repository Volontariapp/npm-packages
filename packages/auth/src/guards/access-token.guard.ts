import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { JwtService } from '../services/jwt.service.js';
import { MISSING_ACCESS_TOKEN, INVALID_ACCESS_TOKEN } from '@volontariapp/errors-nest';
import { Logger } from '@volontariapp/logger';

@Injectable()
export class AccessTokenGuard implements CanActivate {
  private readonly logger = new Logger({ context: 'AccessTokenGuard', format: 'json' });
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Record<string, unknown>>();
    const token = request['accessToken'];

    if (typeof token !== 'string') {
      this.logger.warn('Access token is missing from request');
      throw MISSING_ACCESS_TOKEN();
    }

    try {
      const user = await this.jwtService.verifyAccessToken(token);
      request['user'] = user;
      this.logger.debug(`User ${user.id} authenticated with access token`);
      return true;
    } catch (error) {
      this.logger.error('Access token verification failed', error);
      throw INVALID_ACCESS_TOKEN(error instanceof Error ? error.message : undefined);
    }
  }
}
