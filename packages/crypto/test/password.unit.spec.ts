import { hashPassword, verifyPassword } from '../src/hashing/password.js';

import { InternalServerError } from '@volontariapp/errors';

describe('password', () => {
  it('should hash a password into salt:hash format', () => {
    const pwd = 'my-secure-password';
    const hash = hashPassword(pwd);
    expect(hash).toContain(':');
  });

  it('should verify a correct password', () => {
    const pwd = 'my-secure-password';
    const hash = hashPassword(pwd);
    expect(verifyPassword(pwd, hash)).toBe(true);
  });

  it('should not verify an incorrect password', () => {
    const pwd = 'my-secure-password';
    const hash = hashPassword(pwd);
    expect(verifyPassword('wrong-password', hash)).toBe(false);
  });

  it('should not verify an invalid hash format', () => {
    expect(verifyPassword('pwd', 'invalidformat')).toBe(false);
  });

  it('should throw InternalServerError if password hashing fails', () => {
    expect(() => hashPassword({} as string)).toThrow(InternalServerError);
  });

  it('should throw InternalServerError if password verification fails with invalid types', () => {
    expect(() => verifyPassword({} as string, 'salt:key')).toThrow(InternalServerError);
  });
});
