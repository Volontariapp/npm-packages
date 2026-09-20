import { EntityType } from '../enums/entity-type.enum.js';
import { InvalidFileExtensionException } from '../exceptions/invalid-file-extension.exception.js';
import {
  ALLOWED_MIME_TYPES_BY_ENTITY,
  GLOBAL_ALLOWED_MIME_TYPES,
} from './mime-type.constants.js';

export class MimeType {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value.toLowerCase().trim();
  }

  public static create(value: string, entityType?: EntityType | string): MimeType {
    if (!value || typeof value !== 'string') {
      throw new InvalidFileExtensionException(String(value), entityType);
    }

    const normalized = value.toLowerCase().trim();

    if (entityType && entityType in ALLOWED_MIME_TYPES_BY_ENTITY) {
      const allowedForEntity = ALLOWED_MIME_TYPES_BY_ENTITY[entityType as EntityType];
      if (!allowedForEntity.includes(normalized)) {
        throw new InvalidFileExtensionException(normalized, entityType);
      }
    } else {
      if (!GLOBAL_ALLOWED_MIME_TYPES.includes(normalized)) {
        throw new InvalidFileExtensionException(normalized, entityType);
      }
    }

    return new MimeType(normalized);
  }

  public getValue(): string {
    return this.value;
  }

  public equals(other: MimeType): boolean {
    if (!other || !(other instanceof MimeType)) {
      return false;
    }
    return this.value === other.getValue();
  }
}
