# Changelog

## 0.3.0

### Minor Changes

- Mask personal data and add trace correlation (tickets 3.0 and 3.1).

  - Masking (3.0): metadata, positional params, error details and the message are masked before serialization, in JSON and text. Keys are matched by fragment, case-insensitively and ignoring `-` and `_` (`password`, `token`, `authorization`, `cookie`, `apikey`, `email`, `phone`, `iban`... so `x-internal-token` and `refresh_token` are covered), and strings are scanned for emails, JWTs and `Bearer` credentials. The walk is recursive, handles arrays, class instances, errors and circular references (`[Circular]`), and never mutates the object passed by the caller.
  - Configurable: `new Logger({ masking: { keys, patterns, replacement } })` extends the defaults, `masking: false` disables it. New exports: `Masker`, `MaskingConfig`, `DEFAULT_SENSITIVE_KEYS`, `DEFAULT_SENSITIVE_PATTERNS`, `DEFAULT_REDACTION`, `CIRCULAR_REFERENCE`.
  - Trace correlation (3.1): inside an active OpenTelemetry span, the JSON payload carries `trace_id` (hex), `dd.trace_id` (lower 64 bits, decimal) and `dd.span_id` (decimal). They are written after the caller metadata, which cannot override them. The text format is unchanged. New exports: `getTraceFields`, `TraceFields`. New dependency: `@opentelemetry/api` (`^1.9.0`, no SDK).

  Behavior change: masking is on by default, so a consumer that logged an `email`, `phone` or `token` field will now see `[REDACTED]` once it bumps.

## 0.2.7

### Patch Changes

- README bump

## 0.2.6

### Patch Changes

- README bump

## 0.2.5

### Patch Changes

- license package

## 0.2.4

### Patch Changes

- testing lib added

## 0.2.3

### Patch Changes

- Standardize test and coverage scripts across packages. Add test:coverage with json-summary reporter for CI reporting.

## 0.2.2

### Patch Changes

- bump global version

## 0.2.1

### Patch Changes

- bump ci

## 0.2.0

### Minor Changes

- solid logger

All notable changes to this project will be documented in this file.

## 0.1.0

### Minor Changes

- Initial package scaffold.
