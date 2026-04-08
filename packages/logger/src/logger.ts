import type { LogLevel } from './colors.js';
import { Colors, getLevelColor } from './colors.js';

export interface LoggerConfig {
  context?: string;
  format?: 'json' | 'text';
  minLevel?: LogLevel;
}

export class Logger {
  private readonly context: string;
  private readonly format: 'json' | 'text';
  private readonly minLevel: LogLevel;

  private readonly levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    fatal: 4,
  };

  constructor(config?: LoggerConfig) {
    this.context = config?.context ?? 'App';
    this.format = config?.format ?? 'text';
    this.minLevel = config?.minLevel ?? 'debug';
  }

  public log(message: unknown, ...optionalParams: unknown[]): void {
    this.info(message, ...optionalParams);
  }

  public debug(message: unknown, ...optionalParams: unknown[]): void {
    this.print('debug', message, optionalParams);
  }

  public info(message: unknown, ...optionalParams: unknown[]): void {
    this.print('info', message, optionalParams);
  }

  public warn(message: unknown, ...optionalParams: unknown[]): void {
    this.print('warn', message, optionalParams);
  }

  public error(message: unknown, ...optionalParams: unknown[]): void {
    this.print('error', message, optionalParams);
  }

  public fatal(message: unknown, ...optionalParams: unknown[]): void {
    this.print('fatal', message, optionalParams);
  }

  public verbose(message: unknown, ...optionalParams: unknown[]): void {
    this.print('debug', message, optionalParams);
  }

  private print(level: LogLevel, message: unknown, params: unknown[]): void {
    if (this.levels[level] < this.levels[this.minLevel]) {
      return;
    }

    const timestamp = new Date().toISOString();

    let contextOverride = this.context;
    let optionalArgs = params;

    if (params.length > 0 && typeof params[params.length - 1] === 'string') {
      contextOverride = params[params.length - 1] as string;
      optionalArgs = params.slice(0, params.length - 1);
    }

    const parsedMessage = typeof message === 'string' ? message : this.stringifyUnknown(message);
    const meta = this.parseParams(optionalArgs);
    const logMethod =
      level === 'error' || level === 'fatal' ? 'error' : level === 'warn' ? 'warn' : 'log';

    if (this.format === 'json') {
      const payload = {
        timestamp,
        level,
        context: contextOverride,
        message: parsedMessage,
        ...meta,
      };

      console[logMethod](JSON.stringify(payload));
      return;
    }

    const color = getLevelColor(level);
    const reset = Colors.Reset;
    const dim = Colors.Dim;

    const levelStr = `${color}[${level.toUpperCase()}]${reset}`;
    const contextStr = `${Colors.FgYellow}[${contextOverride}]${reset}`;
    const timeStr = `${dim}${timestamp}${reset}`;

    let output = `${timeStr} ${levelStr} ${contextStr} ${parsedMessage}`;

    if (Object.keys(meta).length > 0) {
      output += ` ${color}${JSON.stringify(meta, null, 2)}${reset}`;
    }

    console[logMethod](output);
  }

  private stringifyUnknown(val: unknown): string {
    if (val instanceof Error) {
      return val.stack ?? val.message;
    }
    try {
      if (typeof val === 'object' && val !== null) {
        return JSON.stringify(val);
      }
      return String(val);
    } catch {
      return String(val);
    }
  }

  private parseParams(params: unknown[]): Record<string, unknown> {
    const meta: Record<string, unknown> = {};

    if (params.length === 0) {
      return meta;
    }

    if (params.length === 1 && typeof params[0] === 'object' && params[0] !== null) {
      if (params[0] instanceof Error) {
        meta.error = params[0].message;
        meta.stack = params[0].stack;
      } else {
        return params[0] as Record<string, unknown>;
      }
    } else {
      meta.params = params;
    }

    return meta;
  }
}
