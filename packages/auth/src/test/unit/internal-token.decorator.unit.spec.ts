import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants.js';
import { InternalToken } from '../../decorators/internal-token.decorator.js';
import type { ExecutionContext } from '@nestjs/common';
import type { Metadata } from '@grpc/grpc-js';
import { describe, expect, it, jest } from '@jest/globals';
import type { RpcArgumentsHost } from '@nestjs/common/interfaces';

describe('InternalToken Decorator', () => {
  function getParamDecoratorFactory(
    decorator: (data?: unknown) => ParameterDecorator,
  ): (data: unknown, ctx: ExecutionContext) => unknown {
    class Test {
      public test(@decorator() value: unknown) {
        return value;
      }
    }

    const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, Test, 'test') as Record<
      string,
      { factory: (data: unknown, ctx: ExecutionContext) => unknown }
    >;

    const key = Object.keys(args)[0];
    if (!key) {
      throw new Error('No args found');
    }
    return args[key].factory;
  }

  const factory = getParamDecoratorFactory(InternalToken);

  it('should return undefined if context type is not rpc', () => {
    const mockContext = {
      getType: jest.fn<() => string>().mockReturnValue('http'),
    } as unknown as ExecutionContext;
    const getTypeSpy = jest.spyOn(mockContext, 'getType');

    const result = factory(null, mockContext);
    expect(result).toBeUndefined();
    expect(getTypeSpy).toHaveBeenCalled();
  });

  it('should return undefined if x-internal-token is missing', () => {
    const mockMetadata = {
      get: jest.fn<(key: string) => string[]>().mockReturnValue([]),
    } as unknown as Metadata;

    const mockRpcArgumentsHost = {
      getContext: jest.fn<() => Metadata>().mockReturnValue(mockMetadata),
    } as unknown as RpcArgumentsHost;

    const mockContext = {
      getType: jest.fn<() => string>().mockReturnValue('rpc'),
      switchToRpc: jest.fn<() => RpcArgumentsHost>().mockReturnValue(mockRpcArgumentsHost),
    } as unknown as ExecutionContext;
    const getTypeSpy = jest.spyOn(mockContext, 'getType');
    const switchToRpcSpy = jest.spyOn(mockContext, 'switchToRpc');
    const getContextSpy = jest.spyOn(mockRpcArgumentsHost, 'getContext');

    const result = factory(null, mockContext);
    expect(result).toBeUndefined();
    expect(getTypeSpy).toHaveBeenCalled();
    expect(switchToRpcSpy).toHaveBeenCalled();
    expect(getContextSpy).toHaveBeenCalled();
  });

  it('should return the token string when present', () => {
    const tokenStr = 'my-internal-token';
    const mockMetadata = {
      get: jest.fn<(key: string) => string[]>().mockImplementation((key: string) => {
        if (key === 'x-internal-token') {
          return [tokenStr];
        }
        return [];
      }),
    } as unknown as Metadata;

    const mockRpcArgumentsHost = {
      getContext: jest.fn<() => Metadata>().mockReturnValue(mockMetadata),
    } as unknown as RpcArgumentsHost;

    const mockContext = {
      getType: jest.fn<() => string>().mockReturnValue('rpc'),
      switchToRpc: jest.fn<() => RpcArgumentsHost>().mockReturnValue(mockRpcArgumentsHost),
    } as unknown as ExecutionContext;

    const getTypeSpy = jest.spyOn(mockContext, 'getType');
    const switchToRpcSpy = jest.spyOn(mockContext, 'switchToRpc');
    const getContextSpy = jest.spyOn(mockRpcArgumentsHost, 'getContext');
    const getSpy = jest.spyOn(mockMetadata, 'get');

    const result = factory(null, mockContext);
    expect(result).toBe(tokenStr);
    expect(getTypeSpy).toHaveBeenCalled();
    expect(switchToRpcSpy).toHaveBeenCalled();
    expect(getContextSpy).toHaveBeenCalled();
    expect(getSpy).toHaveBeenCalledWith('x-internal-token');
  });
});
