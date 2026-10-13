import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { registerGracefulShutdown } from '../shutdown.js';
import { logger } from '../monitoring-logger.js';

class FakeProcess extends EventEmitter {
  public readonly pid = 4242;
  public readonly kill = jest.fn<(pid: number, signal: 'SIGTERM') => void>();
}

const settle = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

describe('registerGracefulShutdown (Unit)', () => {
  let proc: FakeProcess;
  let shutdown: jest.Mock<() => Promise<void>>;

  beforeEach(() => {
    proc = new FakeProcess();
    shutdown = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should flush the SDK on SIGTERM', async () => {
    // Arrange
    registerGracefulShutdown({ shutdown }, proc);

    // Act
    proc.emit('SIGTERM');
    await settle();

    // Assert
    expect(shutdown).toHaveBeenCalledTimes(1);
  });

  it('should send the signal again when nothing else handles it, so the process still exits', async () => {
    // Arrange
    registerGracefulShutdown({ shutdown }, proc);

    // Act
    proc.emit('SIGTERM');
    await settle();

    // Assert
    expect(proc.kill).toHaveBeenCalledTimes(1);
    expect(proc.kill).toHaveBeenCalledWith(4242, 'SIGTERM');
  });

  it('should leave the termination to another SIGTERM listener such as the NestJS shutdown hooks', async () => {
    // Arrange
    registerGracefulShutdown({ shutdown }, proc);
    proc.on('SIGTERM', () => undefined);

    // Act
    proc.emit('SIGTERM');
    await settle();

    // Assert
    expect(shutdown).toHaveBeenCalledTimes(1);
    expect(proc.kill).not.toHaveBeenCalled();
  });

  it('should still decide from the listeners present when the signal arrives, even if they leave during the flush', async () => {
    // Arrange: the other listener removes itself at once, as NestJS does while it closes the app
    registerGracefulShutdown({ shutdown }, proc);
    const nest = (): void => {
      proc.removeListener('SIGTERM', nest);
    };
    proc.on('SIGTERM', nest);

    // Act
    proc.emit('SIGTERM');
    await settle();

    // Assert
    expect(proc.listenerCount('SIGTERM')).toBe(0);
    expect(proc.kill).not.toHaveBeenCalled();
  });

  it('should log a failed flush and still terminate when nothing else handles the signal', async () => {
    // Arrange
    const failure = new Error('exporter unreachable');
    shutdown.mockRejectedValue(failure);
    const errorSpy = jest.spyOn(logger, 'error').mockReturnValue(undefined);
    registerGracefulShutdown({ shutdown }, proc);

    // Act
    proc.emit('SIGTERM');
    await settle();

    // Assert
    expect(errorSpy).toHaveBeenCalledWith('OTel SDK shutdown error', failure);
    expect(proc.kill).toHaveBeenCalledTimes(1);
  });

  it('should react to the first SIGTERM only', async () => {
    // Arrange
    registerGracefulShutdown({ shutdown }, proc);

    // Act
    proc.emit('SIGTERM');
    proc.emit('SIGTERM');
    await settle();

    // Assert
    expect(shutdown).toHaveBeenCalledTimes(1);
  });
});
