# @volontariapp/validation-nest

A high-performance validation library for NestJS, specifically designed to handle the nuances of gRPC and Protocol Buffers communication.

## Why this library?

When using NestJS with gRPC (via `google.protobuf`), several serialization challenges arise that standard validation pipes don't handle out of the box:

1.  **Int64 Complexity**: Large integers (like Timestamps) are often serialized as `string` to prevent precision loss in JavaScript, but your DTOs might expect `number`.
2.  **Proto3 Default Values**: Proto3 initializes missing strings as `""`. This causes `@IsOptional()` or `@IsUUID()` validators to fail because the field is technically "present" but empty.
3.  **Enum Mismatch**: gRPC often sends enum values as their string keys (e.g., `"EVENT_TYPE_SOCIAL"`) while TypeScript enums and logic expect the numeric index (e.g., `1`).

## Implementation

The `GrpcValidationPipe` extends the standard NestJS `ValidationPipe` and adds a pre-processing step to normalize data before validation.

### Key Features

- **Automatic Int64/Timestamp Casting**: Automatically converts `seconds` and `nanos` fields from `string` to `number`.
- **Empty String Normalization**: Automatically converts `""` to `undefined`, allowing `@IsOptional()` to work correctly.
- **Generic Enum Mapping**: Maps string enum keys to their corresponding numeric values via a configurable map.
- **Strictly Typed**: Built with strict TypeScript support, ensuring no precision is lost and types are respected.
- **Micro-Logger**: Built-in debug logging to trace incoming data and the processed result before validation hits your controllers.

## Installation

```bash
yarn add @volontariapp/validation-nest
```

## Usage

Register the pipe in your `AppModule` or globally. Use `useFactory` to provide your specific enum mappings.

```typescript
import { APP_PIPE } from '@nestjs/core';
import { GrpcValidationPipe } from '@volontariapp/validation-nest';
import { EventType, EventState } from '@volontariapp/contracts-nest';

@Module({
  providers: [
    {
      provide: APP_PIPE,
      useFactory: () =>
        new GrpcValidationPipe({
          enumMaps: {
            type: EventType,
            state: EventState,
          },
        }),
    },
  ],
})
export class AppModule {}
```

## Options

`GrpcValidationPipe` accepts all standard `ValidationPipeOptions` (NestJS) plus:

- `enumMaps`: A key-value object where the key is the property name in your DTO and the value is the TypeScript Enum object.
