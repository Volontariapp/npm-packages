import { jest } from '@jest/globals';

export interface MockRequest {
  params: Record<string, string>;
  query: Record<string, string | string[] | undefined>;
  body: unknown;
  headers: Record<string, string | string[] | undefined>;
  user: unknown;
  [key: string]: unknown;
}

export interface MockResponse {
  status: jest.Mock;
  json: jest.Mock;
  send: jest.Mock;
  setHeader: jest.Mock;
  end: jest.Mock;
  [key: string]: unknown;
}

export const createMockRequest = (overrides: Partial<MockRequest> = {}): MockRequest => {
  return {
    params: {},
    query: {},
    body: {},
    headers: {},
    user: null,
    ...overrides,
  } as MockRequest;
};

export const createMockResponse = (): MockResponse => {
  const res = {} as MockResponse;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  res.end = jest.fn().mockReturnValue(res);
  return res;
};
