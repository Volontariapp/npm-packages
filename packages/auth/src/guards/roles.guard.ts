import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { INSUFFICIENT_PERMISSIONS, MISSING_AUTHENTICATED_USER } from '@volontariapp/errors-nest';
import type { AuthUser } from '../interfaces/auth-user.interface.js';
import { Logger } from '@volontariapp/logger';

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

    const { user } = context.switchToHttp().getRequest<{ user?: AuthUser }>();

    if (!user) {
      this.logger.warn('User object missing from request in RolesGuard');
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
