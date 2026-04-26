import type { Type } from '@nestjs/common';
import { applyDecorators } from '@nestjs/common';
import type { ApiResponseOptions } from '@nestjs/swagger';
import { ApiResponse, getSchemaPath } from '@nestjs/swagger';
import type { BaseApiError } from '@volontariapp/errors';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
  TooManyRequestsError,
  UnauthorizedError,
  UnprocessableEntityError,
} from '@volontariapp/errors';
import { ErrorResponseDto } from './error-response.dto.js';

export interface ApiErrorOptions {
  description?: string;
  example?: Partial<ErrorResponseDto>;
  type?: Type<unknown> | [Type<unknown>] | string;
}

export function ApiErrorResponse(
  options: {
    status: number;
  } & ApiErrorOptions,
) {
  const { status, description, example, type = ErrorResponseDto } = options;

  const responseOptions: ApiResponseOptions = {
    status,
    description: description ?? `Error ${status.toString()}`,
  };

  if (example) {
    const fullExample = {
      statusCode: status,
      code: 'INTERNAL_ERROR',
      message: description ?? 'An unexpected error occurred',
      timestamp: new Date().toISOString(),
      path: '/api/v1/resource',
      ...example,
    };

    responseOptions.content = {
      'application/json': {
        schema: { $ref: getSchemaPath(type as string) },
        examples: {
          [status.toString()]: {
            summary: description ?? `Error ${status.toString()}`,
            value: fullExample,
          },
        },
      },
    };
  } else {
    responseOptions.type = type;
  }

  return applyDecorators(ApiResponse(responseOptions));
}

function createErrorDecorator<T extends BaseApiError>(ErrorClass: Type<T>) {
  return (options?: string | ApiErrorOptions) => {
    const ErrorConstructor = ErrorClass as new () => T;
    const errorInstance = new ErrorConstructor();
    const isString = typeof options === 'string';
    const description = isString ? options : options?.description;
    const example = isString ? undefined : options?.example;
    const type = isString ? undefined : options?.type;

    return ApiErrorResponse({
      status: errorInstance.statusCode,
      description: description ?? errorInstance.message,
      example: example ?? {
        statusCode: errorInstance.statusCode,
        code: errorInstance.code,
        message: errorInstance.message,
      },
      type,
    });
  };
}

export const ApiNotFoundResponse = createErrorDecorator(NotFoundError);
export const ApiBadRequestResponse = createErrorDecorator(BadRequestError);
export const ApiUnauthorizedResponse = createErrorDecorator(UnauthorizedError);
export const ApiForbiddenResponse = createErrorDecorator(ForbiddenError);
export const ApiInternalServerErrorResponse = createErrorDecorator(InternalServerError);
export const ApiConflictResponse = createErrorDecorator(ConflictError);
export const ApiUnprocessableEntityResponse = createErrorDecorator(UnprocessableEntityError);
export const ApiTooManyRequestsResponse = createErrorDecorator(TooManyRequestsError);

export function CustomApiError(
  errorFactory: (...args: unknown[]) => BaseApiError,
  options?: ApiErrorOptions,
) {
  const errorInstance = errorFactory();
  const description = options?.description ?? errorInstance.message;

  return ApiErrorResponse({
    status: errorInstance.statusCode,
    description,
    example: options?.example ?? {
      statusCode: errorInstance.statusCode,
      code: errorInstance.code,
      message: errorInstance.message,
    },
    type: options?.type,
  });
}
