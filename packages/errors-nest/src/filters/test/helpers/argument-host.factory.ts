import { jest } from '@jest/globals';
import type { ArgumentsHost } from '@nestjs/common';
import type { MockHttpRequest, MockHttpResponse } from '../interfaces/filter.test.interfaces.js';

export function createMockResponse(): MockHttpResponse {
  const jsonMock = jest.fn();
  const statusMock: MockHttpResponse['status'] = jest
    .fn()
    .mockReturnValue({ json: jsonMock }) as unknown as MockHttpResponse['status'];
  return { status: statusMock, json: jsonMock as MockHttpResponse['json'] };
}

export function createHttpHost(
  response: MockHttpResponse,
  request: MockHttpRequest,
): ArgumentsHost {
  return {
    getType: jest.fn().mockReturnValue('http'),
    switchToHttp: jest.fn().mockReturnValue({
      getResponse: jest.fn().mockReturnValue(response),
      getRequest: jest.fn().mockReturnValue(request),
    }),
    switchToRpc: jest.fn(),
    switchToWs: jest.fn(),
    getArgs: jest.fn(),
    getArgByIndex: jest.fn(),
  } as unknown as ArgumentsHost;
}

export function createRpcHost(): ArgumentsHost {
  return {
    getType: jest.fn().mockReturnValue('rpc'),
    switchToHttp: jest.fn(),
    switchToRpc: jest.fn(),
    switchToWs: jest.fn(),
    getArgs: jest.fn(),
    getArgByIndex: jest.fn(),
  } as unknown as ArgumentsHost;
}
