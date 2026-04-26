import { randomUUID } from 'node:crypto';
import type { SignUpCommand, LoginCommand } from '@volontariapp/contracts';

export class CommandsFactory {
  static buildSignUpCommand(overrides: Partial<SignUpCommand> = {}): SignUpCommand {
    const uid = randomUUID().slice(0, 8);
    return {
      email: `user-${uid}@example.com`,
      password: 'SecurePassword123!',
      phone: '+33612345678',
      pseudo: `user-${uid}`,
      bio: `Bio for user ${uid}`,
      logoPath: undefined,
      organisationInfo: undefined,
      ...overrides,
    };
  }

  static buildLoginCommand(overrides: Partial<LoginCommand> = {}): LoginCommand {
    return {
      email: 'user@example.com',
      password: 'SecurePassword123!',
      ...overrides,
    };
  }
}
