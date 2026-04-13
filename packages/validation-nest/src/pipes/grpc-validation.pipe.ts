import { Injectable, ValidationPipe, Logger } from '@nestjs/common';
import type { ArgumentMetadata } from '@nestjs/common';
import type { GrpcValidationOptions } from '../interfaces/grpc-validation-options.interface.js';

@Injectable()
export class GrpcValidationPipe extends ValidationPipe {
  private readonly logger = new Logger('GrpcValidation');
  private readonly enumMaps: Record<string, Record<string | number, string | number>>;

  constructor(options?: GrpcValidationOptions) {
    super({
      transform: true,
      whitelist: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      ...options,
    });
    this.enumMaps = options?.enumMaps ?? {};
  }

  async transform(value: unknown, metadata: ArgumentMetadata): Promise<unknown> {
    const processedValue = this.processData(value);

    try {
      return await super.transform(processedValue, metadata);
    } catch (error) {
      this.logger.error(`Validation failed for ${metadata.metatype?.name ?? 'Unknown'}`);
      this.logger.error(JSON.stringify(error, null, 2));
      throw error;
    }
  }

  private processData(obj: unknown): unknown {
    if (typeof obj !== 'object' || obj === null) {
      return obj === '' ? undefined : obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((v: unknown) => this.processData(v));
    }

    const typedObj = obj as Record<string, unknown>;

    return Object.keys(typedObj).reduce<Record<string, unknown>>((acc, key) => {
      let val = typedObj[key];

      if (val === '') {
        acc[key] = undefined;
        return acc;
      }

      if ((key === 'seconds' || key === 'nanos') && typeof val === 'string') {
        const num = Number(val);
        if (!isNaN(num)) {
          acc[key] = num;
          return acc;
        }
      }

      if (key in this.enumMaps) {
        const enumObj = this.enumMaps[key];
        if (typeof val === 'string' && isNaN(Number(val))) {
          const mappedValue = enumObj[val];
          val = typeof mappedValue === 'number' ? mappedValue : val;
        }
      }

      acc[key] = this.processData(val);
      return acc;
    }, {});
  }
}
