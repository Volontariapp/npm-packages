import type { NestMiddleware } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';

@Injectable()
export class RefreshTokenMiddleware implements NestMiddleware {
  private readonly logger = new Logger({ context: 'RefreshTokenMiddleware', format: 'json' });
  use = (req: unknown, _res: unknown, next: unknown): void => {
    const request = req as Record<string, unknown>;
    const nextFn = next as () => void;
    let token: string | undefined;

    if (
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
    }
    nextFn();
  };
}
