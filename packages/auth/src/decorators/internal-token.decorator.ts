import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';
import type { Metadata } from '@grpc/grpc-js';

export const InternalToken = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    if (ctx.getType() === 'rpc') {
      const rpcContext = ctx.switchToRpc().getContext<Metadata>();
      const tokens = rpcContext.get('x-internal-token');
      if (tokens.length > 0) {
        const token = tokens[0];
        return typeof token === 'string' ? token : undefined;
      }
    }
    return undefined;
  },
);
