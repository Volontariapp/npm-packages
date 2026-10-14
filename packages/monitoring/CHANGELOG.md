# Changelog

## 2.2.2

### Patch Changes

- Updated dependencies []:
  - @volontariapp/logger@0.4.0

## 2.2.1

### Patch Changes

- Updated dependencies []:
  - @volontariapp/logger@0.3.1

## 2.2.0

### Minor Changes

- `initTracing`: configurable sampling (`ParentBased(TraceIdRatioBased)`, option `sampleRatio` or `OTEL_TRACES_SAMPLER_ARG`, default 1), `deployment.environment` resource attribute (option `environment` or `DD_ENV`, omitted when unset), and a SIGTERM handler that flushes the SDK without `process.exit(0)`, so NestJS shutdown hooks can finish. When no other SIGTERM listener exists the signal is sent again after the flush, so the process still exits.

## 2.1.8

### Patch Changes

- Updated dependencies []:
  - @volontariapp/logger@0.3.0

## 2.1.7

### Patch Changes

- Updated dependencies []:
  - @volontariapp/logger@0.2.7

## 2.1.6

### Patch Changes

- README bump

- Updated dependencies []:
  - @volontariapp/logger@0.2.6

## 2.1.5

### Patch Changes

- license package

- Updated dependencies []:
  - @volontariapp/logger@0.2.5

## 2.1.4

### Patch Changes

- Updated dependencies []:
  - @volontariapp/logger@0.2.4

## 2.1.3

### Patch Changes

- Updated dependencies []:
  - @volontariapp/logger@0.2.3

## 2.1.2

### Patch Changes

- bump global version

- Updated dependencies []:
  - @volontariapp/logger@0.2.2

## 2.1.1

### Patch Changes

- bump ci

- Updated dependencies []:
  - @volontariapp/logger@0.2.1

## 2.1.0

### Minor Changes

- logger added

## 2.0.4

### Patch Changes

- bump open telemetrie deps

## 2.0.3

### Patch Changes

- bump open telemetrie deps

## 2.0.2

### Patch Changes

- bump open telemetrie deps

## 2.0.1

### Patch Changes

- update version for exposing dist

## 2.0.0

### Major Changes

- CI done, so major release to flush previous trash versions
