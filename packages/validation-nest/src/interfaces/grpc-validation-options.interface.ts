import type { ValidationPipeOptions } from '@nestjs/common';

export interface GrpcValidationOptions extends ValidationPipeOptions {
  enumMaps?: Record<string, Record<string | number, string | number>>;
}
