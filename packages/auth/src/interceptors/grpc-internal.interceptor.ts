import type {
  CallHandler,
  ExecutionContext,
  NestInterceptor,
} from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type { Observable } from 'rxjs';
import { from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { JwtService } from '../jwt.service.js';

@Injectable()
export class GrpcInternalInterceptor implements NestInterceptor {
  constructor(private readonly jwtService: JwtService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const httpRequest = context.switchToHttp().getRequest();
    const user = httpRequest.user;

    if (!user) {
      return next.handle();
    }

    return from(this.jwtService.signInternal(user)).pipe(
      switchMap((_token) => {
        return next.handle();
      })
    );
  }
}
