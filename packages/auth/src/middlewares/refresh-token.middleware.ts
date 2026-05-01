import type { NestMiddleware } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';

@Injectable()
export class RefreshTokenMiddleware implements NestMiddleware {
  private readonly logger = new Logger({ context: 'RefreshTokenMiddleware', format: 'json' });
  use = (req: unknown, _res: unknown, next: unknown): void => {
    const request = req as Record<string, unknown>;
    const nextFn = next as () => void;
    const headers = (request['headers'] ?? {}) as Record<string, unknown>;
    const authHeader = headers['authorization'];
    let token: string | undefined;

    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (
      request['cookies'] !== undefined &&
      typeof request['cookies'] === 'object' &&
      request['cookies'] !== null
    ) {
      const cookies = request['cookies'] as Record<string, string | undefined>;
      token = cookies['refreshToken'] ?? cookies['refresh_token'];
    }

    if (typeof token === 'string' && token !== '') {
      request['refreshToken'] = token;
      this.logger.debug('Extracted refresh token from request');
    } else {
      this.logger.warn('No refresh token found in headers or cookies');
    }
    nextFn();
  };
}
