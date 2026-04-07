import { Controller, Get, UseGuards } from '@nestjs/common';
import { GrpcInternalGuard } from '../../guards/grpc-internal.guard.js';
import type { AuthUser } from '../../interfaces/auth-user.interface.js';
import { CurrentUser } from '../../decorators/current-user.decorator.js';

@Controller('test')
export class AuthTestController {
  @Get('protected')
  @UseGuards(GrpcInternalGuard)
  getProtected(@CurrentUser() user: AuthUser) {
    return { success: true, user };
  }

  @Get('public')
  getPublic() {
    return { success: true };
  }
}
