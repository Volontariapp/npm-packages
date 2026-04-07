import { Controller, Get, UseGuards, UseInterceptors, Req } from '@nestjs/common';
import {
  AccessTokenGuard,
  RefreshTokenGuard,
  GrpcInternalGuard,
  RolesGuard,
  Roles,
  GrpcInternalInterceptor,
  CurrentUser,
} from '../../index.js';
import type { AuthUser } from '../../interfaces/index.js';

@Controller('test')
export class AuthTestController {
  @Get('external')
  @UseGuards(AccessTokenGuard)
  @UseInterceptors(GrpcInternalInterceptor)
  getExternal(@CurrentUser() user: AuthUser, @Req() req: Record<string, unknown>) {
    return {
      user,
      internalToken: req['internalToken'],
    };
  }

  @Get('internal')
  @UseGuards(GrpcInternalGuard)
  getInternal(@CurrentUser() user: AuthUser) {
    return { user };
  }

  @Get('admin')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles('admin')
  getAdmin() {
    return { status: 'ok' };
  }

  @Get('refresh')
  @UseGuards(RefreshTokenGuard)
  getRefresh(@CurrentUser() user: AuthUser) {
    return { user };
  }
}
