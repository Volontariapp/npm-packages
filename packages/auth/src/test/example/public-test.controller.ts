import { Controller, Get, UseGuards } from '@nestjs/common';
import { Public, AccessTokenGuard, UseRefreshToken } from '../../index.js';

@Controller('public-test')
export class PublicTestController {
  @UseRefreshToken()
  @Get('refresh')
  getRefresh() {
    return { status: 'refreshed' };
  }

  @Public()
  @Get('open')
  getOpen() {
    return { status: 'open' };
  }

  @Get('closed')
  getClosed() {
    return { status: 'closed' };
  }

  @Public()
  @Get('mixed')
  @UseGuards(AccessTokenGuard)
  getMixed() {
    return { status: 'mixed' };
  }
}

@Public()
@Controller('public-class-test')
export class PublicClassTestController {
  @Get('one')
  getOne() {
    return { status: 'one' };
  }

  @Get('two')
  getTwo() {
    return { status: 'two' };
  }
}
