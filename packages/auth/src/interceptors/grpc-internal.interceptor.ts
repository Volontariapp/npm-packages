import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type { Observable } from 'rxjs';
import { from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { GrpcMetadataHelper } from '../services/grpc-metadata.helper.js';
import { INTERNAL_TOKEN_METADATA_KEY } from '../constants/index.js';
import type { AuthUser } from '../interfaces/auth-user.interface.js';
import { Logger } from '@volontariapp/logger';

@Injectable()
export class GrpcInternalInterceptor implements NestInterceptor {
  private readonly logger = new Logger({ context: 'GrpcInternalInterceptor', format: 'json' });
  constructor(private readonly metadataHelper: GrpcMetadataHelper) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpRequest = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = httpRequest.user;

    if (!user) {
      return next.handle();
    }

    return from(this.metadataHelper.createInternalMetadata(user)).pipe(
      switchMap((metadata) => {
        const token = metadata.get(INTERNAL_TOKEN_METADATA_KEY)[0] as string;
        this.logger.debug(`Transformed Access Token to Internal Token for user ${user.id}`);
        const req = httpRequest as unknown as Record<string, unknown>;
        req['internalToken'] = token;
        req['internalMetadata'] = metadata;
        return next.handle();
      }),
    );
  }
}
