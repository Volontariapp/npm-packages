import { describe, it, expect, afterEach } from '@jest/globals';
import * as net from 'node:net';
import { ClamdClient } from '../scanner/clamd.client.js';
import { ScannerTechnicalError } from '../errors/scanner-technical.error.js';

describe('ClamdClient', () => {
  let server: net.Server | undefined;
  let serverPort: number;

  function createMockClamdServer(
    responseHandler: (socket: net.Socket, data: Buffer) => void,
  ): Promise<number> {
    return new Promise((resolve, reject) => {
      server = net.createServer((socket) => {
        socket.on('data', (data) => {
          responseHandler(socket, data);
        });
      });

      server.listen(0, '127.0.0.1', () => {
        const address = server?.address() as net.AddressInfo;
        resolve(address.port);
      });

      server.on('error', reject);
    });
  }

  afterEach(async () => {
    if (server) {
      const activeServer = server;
      await new Promise<void>((resolve) => {
        activeServer.close(() => {
          resolve();
        });
      });
    }
  });

  describe('ping', () => {
    it('should return true when clamd responds with PONG', async () => {
      serverPort = await createMockClamdServer((socket) => {
        socket.write('PONG\0');
        socket.end();
      });

      const client = new ClamdClient({ host: '127.0.0.1', port: serverPort, timeoutMs: 1000 });
      const result = await client.ping();
      expect(result).toBe(true);
    });

    it('should throw ScannerTechnicalError when connection is refused', async () => {
      // Port not listening
      const client = new ClamdClient({ host: '127.0.0.1', port: 59999, timeoutMs: 500 });
      await expect(client.ping()).rejects.toThrow(ScannerTechnicalError);
    });
  });

  describe('scanBuffer', () => {
    it('should return isInfected: false when clamd responds with stream: OK', async () => {
      serverPort = await createMockClamdServer((socket, data) => {
        // Read zINSTREAM and chunks
        if (data.includes(Buffer.from('zINSTREAM\0'))) {
          socket.write('stream: OK\0');
          socket.end();
        }
      });

      const client = new ClamdClient({ host: '127.0.0.1', port: serverPort, timeoutMs: 1000 });
      const testBuffer = Buffer.from('Safe harmless image bytes');
      const result = await client.scanBuffer(testBuffer);

      expect(result.isInfected).toBe(false);
      expect(result.virusName).toBeUndefined();
      expect(result.response).toBe('stream: OK');
    });

    it('should return isInfected: true with virusName when malware is detected', async () => {
      serverPort = await createMockClamdServer((socket) => {
        socket.write('stream: Eicar-Test-Signature FOUND\0');
        socket.end();
      });

      const client = new ClamdClient({ host: '127.0.0.1', port: serverPort, timeoutMs: 1000 });
      const testBuffer = Buffer.from(
        'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*',
      );
      const result = await client.scanBuffer(testBuffer);

      expect(result.isInfected).toBe(true);
      expect(result.virusName).toBe('Eicar-Test-Signature');
      expect(result.response).toContain('FOUND');
    });

    it('should throw ScannerTechnicalError when clamd returns an unexpected ERROR message', async () => {
      serverPort = await createMockClamdServer((socket) => {
        if (!socket.writableEnded && socket.writable) {
          socket.write('stream: Internal clamscan error ERROR\0');
          socket.end();
        }
      });

      const client = new ClamdClient({ host: '127.0.0.1', port: serverPort, timeoutMs: 1000 });
      await expect(client.scanBuffer(Buffer.from('test'))).rejects.toThrow(ScannerTechnicalError);
    });

    it('should throw ScannerTechnicalError on socket timeout', async () => {
      serverPort = await createMockClamdServer((_socket) => {
        // Do not respond, let client time out
      });

      const client = new ClamdClient({ host: '127.0.0.1', port: serverPort, timeoutMs: 200 });
      await expect(client.scanBuffer(Buffer.from('data'))).rejects.toThrow(ScannerTechnicalError);
    });
  });
});
