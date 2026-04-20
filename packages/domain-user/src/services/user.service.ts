import { Inject, Injectable } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import { PostgresUserRepository } from '../repositories/postgres-user.repository.js';
import type { IUserRepository } from '../repositories/index.js';

@Injectable()
export class UserService {
  private readonly logger = new Logger({ context: UserService.name });

  constructor(
    @Inject(PostgresUserRepository)
    private readonly userRepository: IUserRepository,
  ) {}
}
