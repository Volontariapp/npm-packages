import type { GrpcStatus } from '@volontariapp/errors';

export interface MockHttpResponse {
  status: (code: number) => MockHttpResponse;
  json: (body: Record<string, unknown>) => void;
}

export interface MockHttpRequest {
  url: string;
}

export interface GrpcErrorPayload {
  code: GrpcStatus;
  message: string;
}

export interface ParsedGrpcBody {
  statusCode: number;
  code: string;
  message: string;
  timestamp?: string;
}

export type JsonBody = Record<string, unknown>;
