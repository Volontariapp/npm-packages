# Changelog

## 0.6.0

### Minor Changes

- Add `logger.audit(entry)` for the audit trail of sensitive actions. It writes one `info` line tagged `audit: true` with `actor`, `action`, `target` (`type` and `id`) and `result` (`success`, `failure` or `denied`), plus the `timestamp` and `trace_id` every log already carries. Unlike the other methods it ignores the minimum level, so a service that only logs warnings and errors in production does not lose the record of a sensitive action. It goes through the same masking as every other log. `AUDIT_ACTIONS` and the `AuditAction`, `AuditEntry`, `AuditTarget` and `AuditResult` types are exported; the list of actions is closed: `user.admin_deleted`, `user.admin_updated`, `badge.created`, `badge.updated`, `badge.deleted`.

## 0.5.0

### Minor Changes

- Load plan (300 req/s), phases 1 to 3:

  - logger: the default `minLevel` is read at each call, so loggers created at import time follow the level set at startup; new `isLevelEnabled(level)` and `minLevel` getter.
  - config: `configureLogger(config.logger, extra?)` applies the configured format and level (it was never passed, every service logged at debug); an unknown level falls back to `info` with a warning. `parseLogLevel` and `LOG_LEVELS` exported.
  - contracts-nest: `getGrpcOptions` sets channel options: client `round_robin` load balancing (no TXT service config lookup) and server max connection age of 5 minutes (30 s grace) so that clients re-resolve and pick up new replicas. Optional third argument to override channel options.
  - domain-post: `listPaginated` and `PostService.listPosts` accept `{ knownTotal }` to skip the COUNT query when the caller caches the total.

## 0.4.0

### Minor Changes

- feat(logger): add static setDefaultConfig, getDefaultConfig and resetDefaultConfig to allow global configuration inheritance

## 0.3.1

### Patch Changes

- Add status attribute to JSON log payload matching level for native Datadog status resolution

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
