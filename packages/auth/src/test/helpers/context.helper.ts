import { jest } from '@jest/globals';
import type { ExecutionContext } from '@nestjs/common';
import { createMock } from '@golevelup/ts-jest';
import type { Metadata } from '@grpc/grpc-js';
import type { AuthUser } from '../../interfaces/auth-user.interface.js';

export const createExecutionContext = (
  metadataValues: Record<string, string[]> = {},
  user?: AuthUser,
): ExecutionContext => {
  const metadataMock = createMock<Metadata>({
    get: jest.fn((key: string) => metadataValues[key] ?? []),
    set: jest.fn(),
  });

  const rpcContext = { user };

  const rpcArgumentsHost = createMock<ReturnType<ExecutionContext['switchToRpc']>>();
  rpcArgumentsHost.getContext.mockImplementation((key?: string): unknown => {
    return key === 'metadata' || key === undefined ? metadataMock : rpcContext;
  });

  return createMock<ExecutionContext>({
    getType: () => 'rpc',
    switchToRpc: () => rpcArgumentsHost,
  });
};
