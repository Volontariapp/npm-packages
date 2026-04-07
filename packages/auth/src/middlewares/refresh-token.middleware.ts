import type { NestMiddleware } from '@nestjs/common';
import { Injectable } from '@nestjs/common';

@Injectable()
export class RefreshTokenMiddleware implements NestMiddleware {
  use(req: unknown, _res: unknown, next: unknown): void {
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
    }
    nextFn();
  }
}
