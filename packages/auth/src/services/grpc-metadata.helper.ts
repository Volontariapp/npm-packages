import { Injectable } from '@nestjs/common';
import { Metadata } from '@grpc/grpc-js';
import type { JwtService } from './jwt.service.js';
import { INTERNAL_TOKEN_METADATA_KEY } from '../constants/index.js';
import type { AuthUser } from '../interfaces/index.js';
import { Logger } from '@volontariapp/logger';

@Injectable()
export class GrpcMetadataHelper {
  private readonly logger = new Logger({ context: 'GrpcMetadataHelper', format: 'json' });
  constructor(private readonly jwtService: JwtService) {}

  async createInternalMetadata(user: AuthUser): Promise<Metadata> {
    const metadata = new Metadata();
    const token = await this.jwtService.signInternal(user);
    metadata.set(INTERNAL_TOKEN_METADATA_KEY, token);
    this.logger.debug(`Created internal metadata for user ${user.id}`);
    return metadata;
  }
}
