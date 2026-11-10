import type { EntityManager } from '@volontariapp/database';

/**
 * Surface du `DataSource` TypeORM utilisee par les services de relations : une transaction et le
 * manager hors transaction. Le vrai `DataSource` la satisfait ; les tests la simulent sans classe TypeORM.
 */
export interface TransactionalDataSource {
  readonly manager: EntityManager;
  transaction<T>(work: (manager: EntityManager) => Promise<T>): Promise<T>;
}
