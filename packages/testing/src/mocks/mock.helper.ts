import { jest } from '@jest/globals';

export const createMock = <T extends object>(): jest.Mocked<T> => {
  const target = {} as jest.Mocked<T>;

  return new Proxy(target, {
    get: (t, p): unknown => {
      if (p === 'then') {
        return undefined;
      }

      const key = p as keyof jest.Mocked<T>;

      if (!(p in t)) {
        Object.defineProperty(t, p, {
          value: jest.fn(),
          writable: true,
          configurable: true,
          enumerable: true,
        });
      }

      return t[key];
    },
  });
};
