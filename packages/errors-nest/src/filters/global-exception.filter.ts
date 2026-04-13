import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { GrpcStatus, isBaseError } from '@volontariapp/errors';
import { Logger } from '@volontariapp/logger';
import { throwError, Observable } from 'rxjs';
import type { ErrorResponseDto } from '../swagger/error-response.dto.js';

interface GrpcErrorObject {
  code?: number;
  details?: string;
  message?: string;
}

interface ParsedErrorBody {
  statusCode?: number;
  code?: string;
  message?: string;
  details?: Record<string, unknown>;
  timestamp?: string;
}

interface HttpResponse {
  status(code: number): { json(body: unknown): void };
}

interface HttpRequest {
  url: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger({ context: GlobalExceptionFilter.name, format: 'json' });

  catch(exception: unknown, host: ArgumentsHost): Observable<never> | undefined {
    const type = host.getType();

    let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal Server Error';
    let code = 'INTERNAL_ERROR';
    let details: Record<string, unknown> | undefined = undefined;
    let grpcCode = GrpcStatus.INTERNAL;

    let errorData: unknown = exception;

    if (this.isGrpcError(exception)) {
      const rawMessage = exception.details ?? exception.message ?? '';
      const parsed = this.tryParseJson(rawMessage);
      if (parsed) {
        errorData = parsed;
      }
    }

    if (isBaseError(errorData)) {
      status = errorData.statusCode;
      message = errorData.message;
      code = errorData.code;
      details = errorData.details;
      grpcCode = errorData.grpcCode;
    } else if (errorData instanceof HttpException) {
      status = errorData.getStatus();
      const response = errorData.getResponse();
      message = this.extractHttpMessage(response);
      code = errorData.name;
    } else if (this.isParsedErrorBody(errorData)) {
      status = errorData.statusCode ?? status;
      message = errorData.message ?? message;
      code = errorData.code ?? code;
      details = errorData.details;
    } else if (errorData instanceof Error) {
      message = errorData.message;
    }

    if (status >= 500) {
      const stack = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(`Unhandled Exception: ${message}`, stack);
    }

    if (type === 'http') {
      const ctx = host.switchToHttp();
      const response = ctx.getResponse<HttpResponse>();
      const request = ctx.getRequest<HttpRequest>();

      const errorResponse: ErrorResponseDto = {
        statusCode: status,
        code,
        message,
        details,
        timestamp: new Date().toISOString(),
        path: request.url,
      };

      response.status(status).json(errorResponse);
      return undefined;
    }

    if (type === 'rpc') {
      const rpcErrorBody: ParsedErrorBody = {
        statusCode: status,
        code,
        message,
        details,
        timestamp: new Date().toISOString(),
      };

      const rpcException = new RpcException({
        code: isBaseError(exception) ? exception.grpcCode : grpcCode,
        message: JSON.stringify(rpcErrorBody),
      });

      return throwError(() => rpcException.getError());
    }

    return undefined;
  }

  private isGrpcError(err: unknown): err is GrpcErrorObject {
    if (typeof err !== 'object' || err === null || isBaseError(err)) return false;
    const obj = err as Record<string, unknown>;
    if (typeof obj['code'] === 'number') return true;
    if (typeof obj['details'] === 'string') return true;
    const msg = obj['message'];
    return typeof msg === 'string' && msg.includes('{');
  }

  private isParsedErrorBody(err: unknown): err is ParsedErrorBody {
    return typeof err === 'object' && err !== null && 'statusCode' in err;
  }

  private tryParseJson(str: string): ParsedErrorBody | null {
    if (!str.includes('{')) return null;
    try {
      const start = str.indexOf('{');
      const end = str.lastIndexOf('}') + 1;
      return JSON.parse(str.substring(start, end)) as ParsedErrorBody;
    } catch {
      return null;
    }
  }

  private extractHttpMessage(response: string | object): string {
    if (typeof response === 'string') return response;
    if ('message' in response) {
      const msg = (response as { message: unknown }).message;
      return Array.isArray(msg) ? msg.join(', ') : String(msg);
    }
    return 'Unknown HTTP Error';
  }
}
