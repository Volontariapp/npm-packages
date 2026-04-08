import type { Type } from '@nestjs/common';
import { applyDecorators } from '@nestjs/common';
import type { ApiResponseOptions } from '@nestjs/swagger';
import { ApiResponse } from '@nestjs/swagger';
import type { BaseError } from '@volontariapp/errors';
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
      code: 'ERROR_CODE',
      message: description ?? 'An error occurred',
      timestamp: new Date().toISOString(),
      path: '/api/resource',
      ...example,
    };

    responseOptions.content = {
      'application/json': {
        example: fullExample,
      },
    };
    responseOptions.type = type;
  } else {
    responseOptions.type = type;
  }

  return applyDecorators(ApiResponse(responseOptions));
}

function createErrorDecorator<T extends BaseError>(ErrorClass: Type<T>) {
  return (options?: string | ApiErrorOptions) => {
    const error = new ErrorClass();
    const isString = typeof options === 'string';
    const description = isString ? options : options?.description;
    const example = isString ? undefined : options?.example;
    const type = isString ? undefined : options?.type;

    return ApiErrorResponse({
      status: error.statusCode,
      description: description ?? error.message,
      example,
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
