import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { GrpcMetadataHelper } from '../../services/grpc-metadata.helper.js';
import type { JwtService } from '../../services/jwt.service.js';
import { createMock } from '@golevelup/ts-jest';
import { createAuthUser } from '../factories/auth-user.factory.js';
import { INTERNAL_TOKEN_METADATA_KEY } from '../../constants/index.js';

import { Logger } from '@volontariapp/logger';

describe('GrpcMetadataHelper (Unit)', () => {
  let helper: GrpcMetadataHelper;
  let jwtService: JwtService;

  beforeEach(() => {
    jest.restoreAllMocks();
    jwtService = createMock<JwtService>();
    helper = new GrpcMetadataHelper(jwtService);
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
  });

  it('should create metadata with internal token', async () => {
    const user = createAuthUser();
    const token = 'internal-token-xyz';
    const signSpy = jest.spyOn(jwtService, 'signInternal').mockResolvedValue(token);

    const metadata = await helper.createInternalMetadata(user);

    expect(metadata.get(INTERNAL_TOKEN_METADATA_KEY)).toEqual([token]);
    expect(signSpy).toHaveBeenCalledWith(user);
  });
});
