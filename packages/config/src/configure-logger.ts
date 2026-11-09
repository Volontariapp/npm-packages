import { Logger } from '@volontariapp/logger';
import type { LogLevel, LoggerConfig as LoggerSettings } from '@volontariapp/logger';
import type { LoggerConfig } from './configs/logger-config.js';

export const LOG_LEVELS: readonly LogLevel[] = ['debug', 'info', 'warn', 'error', 'fatal'];

/** Level applied when the configured one is not a known level: never silence errors by mistake. */
export const FALLBACK_LOG_LEVEL: LogLevel = 'info';

const isLogLevel = (value: string): value is LogLevel =>
  (LOG_LEVELS as readonly string[]).includes(value);

/** Normalises a configured level (`"WARN"`, `" info "`), or returns undefined when it is unknown. */
export function parseLogLevel(value: string | undefined): LogLevel | undefined {
  const normalised = value?.trim().toLowerCase() ?? '';
  return isLogLevel(normalised) ? normalised : undefined;
}

/**
 * Applies the `logger` section of a service configuration to every Logger of the process:
 * format and minimum level, plus the extra settings of the service (masking, context).
 * Call it once at startup, before the application is created. Loggers created earlier
 * (at import time) follow the level too, since they read it at each call.
 */
export function configureLogger(
  config: LoggerConfig,
  extra: Omit<Partial<LoggerSettings>, 'format' | 'minLevel'> = {},
): LogLevel {
  const parsed = parseLogLevel(config.level);
  const minLevel = parsed ?? FALLBACK_LOG_LEVEL;

  Logger.setDefaultConfig({ ...extra, format: config.format, minLevel });

  if (parsed === undefined) {
    new Logger({ context: 'ConfigureLogger' }).warn(
      `Unknown logger level "${config.level}", expected one of ${LOG_LEVELS.join(', ')}: using ${FALLBACK_LOG_LEVEL}`,
    );
  }
  return minLevel;
}
