export const Colors = {
  Reset: '\x1b[0m',
  Bright: '\x1b[1m',
  Dim: '\x1b[2m',

  FgBlack: '\x1b[30m',
  FgRed: '\x1b[31m',
  FgGreen: '\x1b[32m',
  FgYellow: '\x1b[33m',
  FgBlue: '\x1b[34m',
  FgMagenta: '\x1b[35m',
  FgCyan: '\x1b[36m',
  FgWhite: '\x1b[37m',
  FgGray: '\x1b[90m',

  BgBlack: '\x1b[40m',
  BgRed: '\x1b[41m',
  BgGreen: '\x1b[42m',
};

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export const getLevelColor = (level: LogLevel): string => {
  switch (level) {
    case 'debug':
      return Colors.FgGray;
    case 'info':
      return Colors.FgBlue;
    case 'warn':
      return Colors.FgYellow;
    case 'error':
      return Colors.FgRed;
    case 'fatal':
      return Colors.BgRed + Colors.FgWhite;
    default:
      return Colors.Reset;
  }
};
