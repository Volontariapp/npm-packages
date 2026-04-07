import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { JwtService } from '../services/jwt.service.js';
import { MISSING_ACCESS_TOKEN, INVALID_ACCESS_TOKEN } from '@volontariapp/errors-nest';

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Record<string, unknown>>();
    const token = request['accessToken'];

    if (typeof token !== 'string') {
      throw MISSING_ACCESS_TOKEN();
    }

    try {
      const user = await this.jwtService.verifyAccessToken(token);
      request['user'] = user;
      return true;
    } catch (error) {
      throw INVALID_ACCESS_TOKEN(error instanceof Error ? error.message : undefined);
    }
  }
}
