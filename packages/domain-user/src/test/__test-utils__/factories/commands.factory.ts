import { randomUUID } from 'node:crypto';
import { SignUpInput, LoginInput } from '../../../value-objects/index.js';

export class CommandsFactory {
  static buildSignUpCommand(
    overrides: {
      email?: string;
      password?: string;
      pseudo?: string;
      bio?: string;
      logoPath?: string;
      rna?: string;
    } = {},
  ): SignUpInput {
    const uid = randomUUID().slice(0, 8);
    return new SignUpInput(
      overrides.email ?? `user-${uid}@example.com`,
      overrides.password ?? 'SecurePassword123!',
      overrides.pseudo ?? `user-${uid}`,
      overrides.bio ?? `Bio for user ${uid}`,
      overrides.logoPath,
      overrides.rna,
    );
  }

  static buildLoginCommand(overrides: { email?: string; password?: string } = {}): LoginInput {
    return new LoginInput(
      overrides.email ?? 'user@example.com',
      overrides.password ?? 'SecurePassword123!',
    );
  }
}
