import { createMock } from '@volontariapp/testing';
import type { EntityManager, Repository } from '@volontariapp/database';
import { JobsOutboxModel } from '@volontariapp/database';
import type { TransactionalDataSource } from '../../../helpers/transactional-data-source.js';

export interface TransactionalDataSourceMock {
  dataSource: ReturnType<typeof createMock<TransactionalDataSource>>;
  manager: ReturnType<typeof createMock<EntityManager>>;
  jobsRepository: ReturnType<typeof createMock<Repository<JobsOutboxModel>>>;
}

/**
 * `jobsRepository.create` recoit le modele mappe (c'est lui qu'on inspecte pour le job).
 * `transaction` execute le travail une fois sur `manager` et propage son rejet (l'equivalent d'un
 * ROLLBACK : l'appelant voit l'erreur). `dataSource.manager` est le meme manager. `jobsRepository` est ce que `manager.getRepository` renvoie.
 */
export const createTransactionalDataSourceMock = (): TransactionalDataSourceMock => {
  const dataSource = createMock<TransactionalDataSource>();
  const manager = createMock<EntityManager>();
  const jobsRepository = createMock<Repository<JobsOutboxModel>>();
  Object.defineProperty(dataSource, 'manager', { value: manager });
  dataSource.transaction.mockImplementation((work) => work(manager));
  manager.getRepository.mockReturnValue(jobsRepository);
  jobsRepository.create.mockReturnValue(new JobsOutboxModel());
  jobsRepository.save.mockResolvedValue(new JobsOutboxModel());
  return { dataSource, manager, jobsRepository };
};
