/** Datadog's own variable for the environment tag. */
export const ENVIRONMENT_ENV = 'DD_ENV';

/** Resource attribute Datadog maps to its `env` tag. */
export const DEPLOYMENT_ENVIRONMENT_ATTRIBUTE = 'deployment.environment';

/**
 * Environment name (`prod`, `staging`...): the option, then `DD_ENV`. Returns `undefined`
 * rather than guessing from `NODE_ENV`, so an unset environment is visible instead of mislabelled.
 */
export function resolveEnvironment(
  option?: string,
  env: Record<string, string | undefined> = process.env,
): string | undefined {
  const value = (option ?? env[ENVIRONMENT_ENV])?.trim();
  return value === undefined || value === '' ? undefined : value;
}
