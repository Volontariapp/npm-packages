import { jest } from '@jest/globals';
import { connectivityState } from '@grpc/grpc-js';

export type WaitForReadyCallback = (error?: Error) => void;

/** The part of a grpc-js `Client` that `StorageClientService` uses to open its channel. */
export interface GrpcClientMock {
  waitForReady: jest.Mock<(deadline: Date | number, callback: WaitForReadyCallback) => void>;
  getChannel: jest.Mock<() => { getConnectivityState: (tryToConnect: boolean) => number }>;
}

export const createGrpcClientMock = (
  state: number = connectivityState.IDLE,
): GrpcClientMock => ({
  waitForReady: jest.fn<(deadline: Date | number, callback: WaitForReadyCallback) => void>(),
  getChannel: jest.fn(() => ({ getConnectivityState: () => state })),
});
