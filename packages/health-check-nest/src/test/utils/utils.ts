import type { HealthCheckService } from '@nestjs/terminus';

type HealthCheckHandler = () => Promise<Record<string, unknown>>;

function createHealthServiceMock(): HealthCheckService {
  const healthServiceMock = {
    check: (checks: HealthCheckHandler[]) => {
      const [first] = checks;
      return first();
    },
  };

  return healthServiceMock as HealthCheckService;
}

export { createHealthServiceMock, type HealthCheckHandler };
