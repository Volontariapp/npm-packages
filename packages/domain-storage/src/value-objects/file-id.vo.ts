import { BadRequestError } from '@volontariapp/errors';

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class FileId {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  public static create(id: string): FileId {
    if (!id || typeof id !== 'string' || !UUID_V4_REGEX.test(id)) {
      throw new BadRequestError(`Invalid FileId UUID v4 format: '${id}'`, 'INVALID_FILE_ID', { id });
    }
    // UUIDs are case-insensitive: lowercase so one file never maps to two S3 keys.
    return new FileId(id.toLowerCase());
  }

  public static generate(): FileId {
    return new FileId(crypto.randomUUID());
  }

  public getValue(): string {
    return this.value;
  }

  public equals(other: FileId): boolean {
    if (!(other instanceof FileId)) {
      return false;
    }
    return this.value === other.getValue();
  }
}
