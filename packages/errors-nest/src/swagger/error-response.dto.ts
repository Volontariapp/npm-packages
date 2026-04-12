import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({
    description: 'The HTTP status code',
  })
  public statusCode!: number;

  @ApiProperty({
    description: 'The internal error code',
  })
  public code!: string;

  @ApiProperty({
    description: 'The error message',
  })
  public message!: string;

  @ApiProperty({
    description: 'Additional error details',
    required: false,
  })
  public details?: Record<string, unknown>;

  @ApiProperty({
    description: 'Timestamp when the error occurred',
  })
  public timestamp!: string;

  @ApiProperty({
    description: 'The path where the error occurred',
    required: false,
  })
  public path?: string;
}
