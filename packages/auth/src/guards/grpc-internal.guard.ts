import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Injectable, Logger } from '@nestjs/common';
import { UnauthorizedError } from '@volontariapp/errors';
import type { Metadata } from '@grpc/grpc-js';
import type { JwtService } from '../services/jwt.service.js';
import { INTERNAL_TOKEN_METADATA_KEY } from '../constants/index.js';

@Injectable()
export class GrpcInternalGuard implements CanActivate {
  private readonly logger = new Logger(GrpcInternalGuard.name);

  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'rpc') {
      return true;
    }

    const rpcArgumentsHost = context.switchToRpc();
    const metadata = rpcArgumentsHost.getContext<Metadata>();
    const tokens = metadata.get(INTERNAL_TOKEN_METADATA_KEY);

    if (tokens.length === 0) {
      this.logger.warn(`Missing ${INTERNAL_TOKEN_METADATA_KEY} in metadata`);
      throw new UnauthorizedError('Missing internal token');
    }

    const token = tokens[0] as string;

    try {
      const user = await this.jwtService.verifyInternal(token);

      const rpcContext = rpcArgumentsHost.getContext<Record<string, unknown>>();
      rpcContext.user = user;

      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Invalid internal token: ${message}`);
      throw new UnauthorizedError('Invalid internal token');
    }
  }
}
