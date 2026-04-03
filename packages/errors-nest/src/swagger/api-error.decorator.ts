import type { Type } from '@nestjs/common';
import { applyDecorators } from '@nestjs/common';
import type { ApiResponseOptions } from '@nestjs/swagger';
import { ApiResponse } from '@nestjs/swagger';
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

export function ApiErrorResponse(options: {
  status: number;
  description?: string;
  type?: Type<unknown> | [Type<unknown>] | string;
}) {
  const { status, description, type = ErrorResponseDto } = options;
  return applyDecorators(
    ApiResponse({
      status,
      description: description ?? `Error ${status.toString()}`,
      type,
    } as ApiResponseOptions),
  );
}

export function ApiNotFoundResponse(description = new NotFoundError().message) {
  return ApiErrorResponse({ status: new NotFoundError().statusCode, description });
}

export function ApiBadRequestResponse(description = new BadRequestError().message) {
  return ApiErrorResponse({ status: new BadRequestError().statusCode, description });
}

export function ApiUnauthorizedResponse(description = new UnauthorizedError().message) {
  return ApiErrorResponse({ status: new UnauthorizedError().statusCode, description });
}

export function ApiForbiddenResponse(description = new ForbiddenError().message) {
  return ApiErrorResponse({ status: new ForbiddenError().statusCode, description });
}

export function ApiInternalServerErrorResponse(description = new InternalServerError().message) {
  return ApiErrorResponse({ status: new InternalServerError().statusCode, description });
}

export function ApiConflictResponse(description = new ConflictError().message) {
  return ApiErrorResponse({ status: new ConflictError().statusCode, description });
}

export function ApiUnprocessableEntityResponse(
  description = new UnprocessableEntityError().message,
) {
  return ApiErrorResponse({ status: new UnprocessableEntityError().statusCode, description });
}

export function ApiTooManyRequestsResponse(description = new TooManyRequestsError().message) {
  return ApiErrorResponse({ status: new TooManyRequestsError().statusCode, description });
}
