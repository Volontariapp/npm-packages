import { Injectable } from '@nestjs/common';
import { Metadata } from '@grpc/grpc-js';
import type { JwtService } from './jwt.service.js';
import { INTERNAL_TOKEN_METADATA_KEY } from '../constants/index.js';
import type { AuthUser } from '../interfaces/index.js';

@Injectable()
export class GrpcMetadataHelper {
  constructor(private readonly jwtService: JwtService) {}

  async createInternalMetadata(user: AuthUser): Promise<Metadata> {
    const metadata = new Metadata();
    const token = await this.jwtService.signInternal(user);
    metadata.add(INTERNAL_TOKEN_METADATA_KEY, token);
    return metadata;
  }
}
