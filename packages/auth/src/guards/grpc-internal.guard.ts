import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import type { Metadata } from '@grpc/grpc-js';
import type { JwtService } from '../jwt.service.js';
import { INTERNAL_TOKEN_METADATA_KEY } from '../constants.js';

@Injectable()
export class GrpcInternalGuard implements CanActivate {
  private readonly logger = new Logger(GrpcInternalGuard.name);

  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'rpc') {
      return true;
    }

    const metadata = context.switchToRpc().getContext();
    const tokens = metadata.get(INTERNAL_TOKEN_METADATA_KEY);

    if (!tokens || tokens.length === 0) {
      this.logger.warn(`Missing ${INTERNAL_TOKEN_METADATA_KEY} in metadata`);
      throw new RpcException({
        code: 16, // UNAUTHENTICATED
        message: 'Missing internal token',
      });
    }

    const token = tokens[0] as string;

    try {
      const user = await this.jwtService.verifyInternal(token);

      const rpcContext = context.switchToRpc().getContext();
      (rpcContext as Record<string, unknown>).user = user;

      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Invalid internal token: ${message}`);
      throw new RpcException({
        code: 16, // UNAUTHENTICATED
        message: 'Invalid internal token',
      });
    }
  }
}
