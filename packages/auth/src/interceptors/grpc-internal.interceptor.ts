import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type { Observable } from 'rxjs';
import { from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { JwtService } from '../services/jwt.service.js';
import type { AuthUser } from '../interfaces/auth-user.interface.js';

@Injectable()
export class GrpcInternalInterceptor implements NestInterceptor {
  constructor(private readonly jwtService: JwtService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpRequest = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = httpRequest.user;

    if (!user) {
      return next.handle();
    }

    return from(this.jwtService.signInternal(user)).pipe(
      switchMap((token) => {
        const req = httpRequest as unknown as Record<string, unknown>;
        req['internalToken'] = token;
        return next.handle();
      }),
    );
  }
}
