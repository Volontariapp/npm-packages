import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { INSUFFICIENT_PERMISSIONS, MISSING_AUTHENTICATED_USER } from '@volontariapp/errors-nest';
import type { AuthUser } from '../interfaces/auth-user.interface.js';

@Injectable()
export class RolesGuard implements CanActivate {
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
      throw MISSING_AUTHENTICATED_USER();
    }

    if (!requiredRoles.includes(user.role)) {
      throw INSUFFICIENT_PERMISSIONS();
    }

    return true;
  }
}
