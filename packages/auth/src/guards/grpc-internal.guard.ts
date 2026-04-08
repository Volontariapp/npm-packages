import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { JwtService } from '../services/jwt.service.js';
import { INTERNAL_TOKEN_METADATA_KEY } from '../constants/index.js';
import { MISSING_INTERNAL_TOKEN, INVALID_INTERNAL_TOKEN } from '@volontariapp/errors-nest';
import type { Metadata } from '@grpc/grpc-js';
import { Logger } from '@volontariapp/logger';

@Injectable()
export class GrpcInternalGuard implements CanActivate {
  private readonly logger = new Logger({ context: 'GrpcInternalGuard', format: 'json' });
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rpcContext = context.switchToRpc().getContext<Metadata>();
    const tokens = rpcContext.get(INTERNAL_TOKEN_METADATA_KEY);
    const token = tokens[0];

    if (typeof token !== 'string') {
      this.logger.warn('Internal gRPC token is missing from metadata');
      throw MISSING_INTERNAL_TOKEN();
    }

    try {
      const user = await this.jwtService.verifyInternal(token);
      (rpcContext as unknown as Record<string, unknown>)['user'] = user;
      this.logger.debug(`Internal gRPC request authorized for user ${user.id}`);
      return true;
    } catch (error) {
      this.logger.error('Internal gRPC token verification failed', error);
      throw INVALID_INTERNAL_TOKEN(error instanceof Error ? error.message : undefined);
    }
  }
}
