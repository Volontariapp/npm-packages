import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { INSUFFICIENT_PERMISSIONS, MISSING_AUTHENTICATED_USER } from '@volontariapp/errors-nest';
import { Logger } from '@volontariapp/logger';
import type { JwtPayload } from '@volontariapp/shared';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger({ context: 'RolesGuard', format: 'json' });
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requiredRoles.length === 0) {
      return true;
    }

    let user: JwtPayload | undefined;

    if (context.getType() === 'rpc') {
      const rpcContext = context.switchToRpc().getContext<Record<string, unknown>>();
      user = rpcContext['user'] as JwtPayload | undefined;
    } else {
      const request = context.switchToHttp().getRequest<Record<string, unknown>>();
      user = request['user'] as JwtPayload | undefined;
    }

    if (!user) {
      this.logger.warn('User object missing from request/context in RolesGuard');
      throw MISSING_AUTHENTICATED_USER();
    }

    if (!requiredRoles.includes(user.role)) {
      this.logger.warn(
        `User ${user.id} with role ${user.role} does not have required roles: ${requiredRoles.join(', ')}`,
      );
      throw INSUFFICIENT_PERMISSIONS();
    }

    this.logger.debug(
      `User ${user.id} role ${user.role} authorized for roles: ${requiredRoles.join(', ')}`,
    );

    return true;
  }
}
