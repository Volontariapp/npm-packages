import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Catch, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { BaseError, GrpcStatus } from '@volontariapp/errors';
import type { ErrorResponseDto } from '../swagger/error-response.dto.js';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const isBaseError = exception instanceof BaseError;
    const isHttpException = exception instanceof HttpException;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal Server Error';
    let code = 'INTERNAL_ERROR';
    let details: Record<string, unknown> | undefined = undefined;
    let grpcCode = GrpcStatus.INTERNAL;

    if (isBaseError) {
      status = exception.statusCode;
      message = exception.message;
      code = exception.code;
      details = exception.details;
      grpcCode = exception.grpcCode;
    } else if (isHttpException) {
      status = exception.getStatus();
      const response = exception.getResponse() as unknown;
      if (typeof response === 'string') {
        message = response;
      } else if (typeof response === 'object' && response !== null && 'message' in response) {
        message = String((response as Record<string, unknown>).message);
      } else {
        message = exception.message;
      }
      code = exception.name;
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(`Unhandled Exception: ${exception.message}`, exception.stack);
    } else {
      this.logger.error(`Unknown Exception: ${JSON.stringify(exception)}`);
    }

    const type = host.getType();

    if (type === 'http') {
      const ctx = host.switchToHttp();
      const response = ctx.getResponse<{
        status: (code: number) => { json: (body: ErrorResponseDto) => void };
      }>();
      const request = ctx.getRequest<{ url: string }>();

      const errorResponse: ErrorResponseDto = {
        statusCode: status,
        code,
        message,
        details,
        timestamp: new Date().toISOString(),
        path: request.url,
      };

      response.status(status).json(errorResponse);
      return;
    }

    if (type === 'rpc') {
      const rpcException = new RpcException({
        code: isBaseError ? grpcCode : GrpcStatus.INTERNAL,
        message: JSON.stringify({
          statusCode: status,
          code,
          message,
          details,
          timestamp: new Date().toISOString(),
        }),
      });
      return rpcException;
    }

    this.logger.warn(`Unknown context type: ${type}`);
    return exception;
  }
}
