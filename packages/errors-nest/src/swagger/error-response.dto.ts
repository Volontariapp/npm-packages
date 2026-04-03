import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({
    description: 'The HTTP status code',
    example: 400,
  })
  public statusCode!: number;

  @ApiProperty({
    description: 'The internal error code',
    example: 'BAD_REQUEST',
  })
  public code!: string;

  @ApiProperty({
    description: 'The error message',
    example: 'Invalid input parameters',
  })
  public message!: string;

  @ApiProperty({
    description: 'Additional error details',
    required: false,
    example: { field: 'email', issue: 'invalid format' },
  })
  public details?: Record<string, unknown>;

  @ApiProperty({
    description: 'Timestamp when the error occurred',
    example: '2023-10-01T10:00:00.000Z',
  })
  public timestamp!: string;

  @ApiProperty({
    description: 'The path where the error occurred',
    required: false,
    example: '/api/v1/users',
  })
  public path?: string;
}
