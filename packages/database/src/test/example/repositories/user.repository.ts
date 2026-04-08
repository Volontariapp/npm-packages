import type { Repository } from 'typeorm';
import { BaseRepository } from '../../../core/base.repository.js';
import { UserModel } from '../models/user.model.js';
import { ProfileModel } from '../models/profile.model.js';
import { UserEntity } from '../entities/user.entity.js';
import { ProfileEntity } from '../entities/profile.entity.js';
import { databaseMapper } from '../../../core/mapper.service.js';

databaseMapper.registerBidirectional(ProfileModel, ProfileEntity);
databaseMapper.registerBidirectional(UserModel, UserEntity, {
  exclude: ['password'],
});

export class UserRepository extends BaseRepository<UserModel, UserEntity, number> {
  constructor(repository: Repository<UserModel>) {
    super(repository, UserEntity, UserModel);
  }
}
