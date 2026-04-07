import type { NestMiddleware } from '@nestjs/common';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AccessTokenMiddleware implements NestMiddleware {
  use(req: unknown, _res: unknown, next: unknown): void {
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
      token = cookies['accessToken'] ?? cookies['access_token'];
    }

    if (typeof token === 'string' && token !== '') {
      request['accessToken'] = token;
    }
    nextFn();
  }
}
