import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';
import type { AuthUser } from '../interfaces/auth-user.interface.js';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser | undefined => {
    if (ctx.getType() === 'rpc') {
      const rpcContext = ctx.switchToRpc().getContext<Record<string, unknown>>();
      return rpcContext.user as AuthUser | undefined;
    }
    const request = ctx.switchToHttp().getRequest<{ user?: AuthUser }>();
    return request.user;
  },
);
