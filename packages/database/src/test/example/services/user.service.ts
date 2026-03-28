import type { UserRepository } from '../repositories/user.repository.js';
import type { UserEntity } from '../entities/user.entity.js';

export class UserTestService {
  constructor(private readonly userRepository: UserRepository) {}

  async createUser(data: {
    firstName: string;
    lastName: string;
    email: string;
  }): Promise<UserEntity> {
    return this.userRepository.create(data);
  }

  async getAllUsers(): Promise<UserEntity[]> {
    return this.userRepository.find();
  }
  async getByEmail(email: string): Promise<UserEntity | null> {
    const user: UserEntity | null = await this.userRepository.findOne({ email });
    return user;
  }
}
