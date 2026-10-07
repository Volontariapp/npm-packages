export const DEFAULT_REDACTION = '[REDACTED]';
export const CIRCULAR_REFERENCE = '[Circular]';

export const DEFAULT_SENSITIVE_KEYS: readonly string[] = [
  'password',
  'passwd',
  'secret',
  'token',
  'authorization',
  'cookie',
  'apikey',
  'privatekey',
  'email',
  'phone',
  'firstname',
  'lastname',
  'birthdate',
  'iban',
  'creditcard',
  'cardnumber',
  'cvv',
];

export const DEFAULT_SENSITIVE_PATTERNS: readonly RegExp[] = [
  /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g,
  /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/g,
  /Bearer\s+[A-Za-z0-9._~+/=-]+/gi,
];

export interface MaskingConfig {
  /** Key fragments to mask, added to the defaults. Matched case-insensitively, ignoring `-` and `_`. */
  keys?: readonly string[];
  /** Value patterns to mask inside strings, added to the defaults. */
  patterns?: readonly RegExp[];
  /** Replacement text. Defaults to `[REDACTED]`. */
  replacement?: string;
}

const normalizeKey = (key: string): string => key.toLowerCase().replace(/[-_\s]/g, '');

const withGlobalFlag = (pattern: RegExp): RegExp =>
  pattern.global ? pattern : new RegExp(pattern.source, `${pattern.flags}g`);

export class Masker {
  private readonly keys: readonly string[];
  private readonly patterns: readonly RegExp[];
  private readonly replacement: string;

  constructor(config?: MaskingConfig) {
    this.keys = [...DEFAULT_SENSITIVE_KEYS, ...(config?.keys ?? [])]
      .map(normalizeKey)
      .filter((key) => key.length > 0);
    this.patterns = [...DEFAULT_SENSITIVE_PATTERNS, ...(config?.patterns ?? [])].map(
      withGlobalFlag,
    );
    this.replacement = config?.replacement ?? DEFAULT_REDACTION;
  }

  public maskString(value: string): string {
    return this.patterns.reduce(
      (masked, pattern) => masked.replace(pattern, this.replacement),
      value,
    );
  }

  /** Returns a masked copy of `value`. The original is never mutated. */
  public mask(value: unknown): unknown {
    return this.visit(value, new WeakSet<object>());
  }

  public maskRecord(value: Record<string, unknown>): Record<string, unknown> {
    return this.visit(value, new WeakSet<object>()) as Record<string, unknown>;
  }

  private isSensitiveKey(key: string): boolean {
    const normalized = normalizeKey(key);
    return this.keys.some((fragment) => normalized.includes(fragment));
  }

  private visit(value: unknown, ancestors: WeakSet<object>): unknown {
    if (typeof value === 'string') {
      return this.maskString(value);
    }
    if (typeof value !== 'object' || value === null || value instanceof Date) {
      return value;
    }
    if (ancestors.has(value)) {
      return CIRCULAR_REFERENCE;
    }

    ancestors.add(value);
    try {
      if (Array.isArray(value)) {
        return value.map((item: unknown) => this.visit(item, ancestors));
      }
      if (value instanceof Error) {
        return {
          name: value.name,
          message: this.maskString(value.message),
          stack: value.stack === undefined ? undefined : this.maskString(value.stack),
        };
      }

      const masked: Record<string, unknown> = {};
      for (const [key, child] of Object.entries(value)) {
        masked[key] = this.isSensitiveKey(key) ? this.replacement : this.visit(child, ancestors);
      }
      return masked;
    } finally {
      ancestors.delete(value);
    }
  }
}
