import * as net from 'node:net';
import { Readable } from 'node:stream';
import { ScannerTechnicalError } from '../errors/scanner-technical.error.js';
import type { ClamdScannerConfig } from '../config/storage-pipeline.config.js';

export interface ClamdScanResult {
  readonly isInfected: boolean;
  readonly virusName?: string;
  readonly response: string;
}

const DEFAULT_CLAMD_PORT = 3310;
const DEFAULT_TIMEOUT_MS = 5000;
const CHUNK_SIZE = 64 * 1024; // 64 KiB chunks for streaming

export class ClamdClient {
  private readonly host: string;
  private readonly port: number;
  private readonly timeoutMs: number;

  constructor(config: ClamdScannerConfig) {
    this.host = config.host;
    this.port = config.port ?? DEFAULT_CLAMD_PORT;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  /**
   * Pings the ClamAV daemon using the PING command.
   * Returns true if clamd answers PONG, false or throws ScannerTechnicalError otherwise.
   */
  async ping(): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      const socket = new net.Socket();
      let response = '';

      socket.setTimeout(this.timeoutMs);

      socket.on('connect', () => {
        socket.write('zPING\0');
      });

      socket.on('data', (data) => {
        response += data.toString('utf8');
      });

      socket.on('end', () => {
        resolve(response.includes('PONG'));
      });

      socket.on('timeout', () => {
        socket.destroy();
        reject(
          new ScannerTechnicalError(
            `ClamAV ping timed out after ${String(this.timeoutMs)}ms`,
            'SCANNER_TIMEOUT',
            {
              host: this.host,
              port: this.port,
              timeoutMs: this.timeoutMs,
            },
          ),
        );
      });

      socket.on('error', (err) => {
        socket.destroy();
        reject(
          new ScannerTechnicalError(
            `ClamAV ping connection failed: ${err.message}`,
            'SCANNER_CONNECTION_ERROR',
            {
              host: this.host,
              port: this.port,
              originalError: err.message,
            },
          ),
        );
      });

      socket.connect(this.port, this.host);
    });
  }

  /**
   * Scans a Buffer using ClamAV's zINSTREAM protocol.
   */
  async scanBuffer(buffer: Buffer, timeoutMs?: number): Promise<ClamdScanResult> {
    const stream = Readable.from(buffer);
    return this.scanStream(stream, timeoutMs);
  }

  /**
   * Scans a readable stream using ClamAV's zINSTREAM protocol.
   */
  async scanStream(stream: NodeJS.ReadableStream, timeoutMs?: number): Promise<ClamdScanResult> {
    const effectiveTimeout = timeoutMs ?? this.timeoutMs;

    return new Promise<ClamdScanResult>((resolve, reject) => {
      const socket = new net.Socket();
      let response = '';
      let isSocketEnded = false;

      const cleanup = () => {
        if (!isSocketEnded) {
          isSocketEnded = true;
          socket.destroy();
        }
      };

      socket.setTimeout(effectiveTimeout);

      socket.on('timeout', () => {
        cleanup();
        reject(
          new ScannerTechnicalError(
            `ClamAV scan timed out after ${String(effectiveTimeout)}ms`,
            'SCANNER_TIMEOUT',
            {
              host: this.host,
              port: this.port,
              timeoutMs: effectiveTimeout,
            },
          ),
        );
      });

      socket.on('error', (err) => {
        cleanup();
        reject(
          new ScannerTechnicalError(
            `ClamAV connection error during scan: ${err.message}`,
            'SCANNER_CONNECTION_ERROR',
            {
              host: this.host,
              port: this.port,
              originalError: err.message,
            },
          ),
        );
      });

      socket.on('data', (data) => {
        response += data.toString('utf8');
      });

      socket.on('end', () => {
        cleanup();
        try {
          const result = this.parseClamdResponse(response);
          resolve(result);
        } catch (parseError) {
          reject(parseError instanceof Error ? parseError : new Error(String(parseError)));
        }
      });

      socket.on('connect', () => {
        void (async () => {
          try {
            // Send INSTREAM command
            socket.write('zINSTREAM\0');

            for await (const chunk of stream) {
              const bufferChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);

              // Stream chunk in slices of at most CHUNK_SIZE
              let offset = 0;
              while (offset < bufferChunk.length) {
                const slice = bufferChunk.subarray(offset, offset + CHUNK_SIZE);
                offset += slice.length;

                const lengthHeader = Buffer.alloc(4);
                lengthHeader.writeUInt32BE(slice.length, 0);

                const canContinue = socket.write(lengthHeader);
                socket.write(slice);

                if (!canContinue) {
                  await new Promise((r) => socket.once('drain', r));
                }
              }
            }

            // Zero-length chunk signals end of stream
            const zeroLength = Buffer.alloc(4);
            zeroLength.writeUInt32BE(0, 0);
            socket.write(zeroLength);
          } catch (streamError: unknown) {
            cleanup();
            const message =
              streamError instanceof Error ? streamError.message : String(streamError);
            reject(
              new ScannerTechnicalError(
                `Error streaming data to ClamAV: ${message}`,
                'SCANNER_STREAM_ERROR',
                {
                  host: this.host,
                  port: this.port,
                  originalError: message,
                },
              ),
            );
          }
        })();
      });

      socket.connect(this.port, this.host);
    });
  }

  /**
   * Parses the text response received from clamd.
   * Expected format:
   * - "stream: OK" -> Clean
   * - "stream: <signature> FOUND" -> Infected
   * - "stream: ... ERROR" -> Scanner technical error
   */
  private parseClamdResponse(rawResponse: string): ClamdScanResult {
    const cleanResponse = rawResponse.replace(/\0/g, '').trim();

    if (cleanResponse.endsWith('OK')) {
      return {
        isInfected: false,
        response: cleanResponse,
      };
    }

    if (cleanResponse.includes('FOUND')) {
      const match = cleanResponse.match(/stream:\s*(.+)\s+FOUND/i);
      const virusName = match?.[1] ? match[1].trim() : 'Malware.Generic';
      return {
        isInfected: true,
        virusName,
        response: cleanResponse,
      };
    }

    // Any other response is considered an internal scanner error
    throw new ScannerTechnicalError(
      `Unexpected response from ClamAV: ${cleanResponse || '<empty response>'}`,
      'SCANNER_UNEXPECTED_RESPONSE',
      {
        host: this.host,
        port: this.port,
        rawResponse: cleanResponse,
      },
    );
  }
}
