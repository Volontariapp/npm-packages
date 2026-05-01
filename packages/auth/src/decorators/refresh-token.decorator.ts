import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { IS_REFRESH_TOKEN_KEY } from '../constants/index.js';
import { RefreshTokenGuard } from '../guards/refresh-token.guard.js';

export function UseRefreshToken(): MethodDecorator & ClassDecorator {
  return applyDecorators(
    SetMetadata(IS_REFRESH_TOKEN_KEY, true),
    UseGuards(RefreshTokenGuard),
  ) as MethodDecorator & ClassDecorator;
}
