import type { UserEntity } from '../../entities/user.entity.js';
import type { UserStatus } from '../../entities/user-status.enum.js';

/** Parametres de lecture paginee filtree en SQL (le filtre precede LIMIT/OFFSET). */
export interface UserPageQuery {
  /** Taille de page; bornee par DEFAULT_PAGE_LIMIT / MAX_PAGE_LIMIT de @volontariapp/database. */
  limit?: number;
  offset?: number;
  /** Statuts exclus de la page ET du total (ex. PENDING_DELETION). */
  excludeStatuses?: UserStatus[];
}

export interface IUserRepository {
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  findByRna(rna: string): Promise<UserEntity | null>;
  // Deprecie (volontairement sans tag JSDoc pour ne pas casser le lint des appelants):
  // ne filtre pas les statuts et n'impose aucun ordre, preferer `findPage`.
  findAll(limit?: number, offset?: number): Promise<[UserEntity[], number]>;
  /**
   * Page ordonnee par id; l'exclusion de statuts est appliquee en SQL avant LIMIT/OFFSET,
   * le total ne compte que les lignes retenues.
   */
  findPage(query: UserPageQuery): Promise<[UserEntity[], number]>;
  /**
   * Une seule requete, relations de `findById` chargees (badges). Les ids en double ou
   * vides sont ignores, au plus MAX_USER_IDS_PER_LOOKUP ids sont lus; les ids inconnus
   * sont absents du resultat. Aucun ordre garanti.
   */
  findByIds(ids: string[]): Promise<UserEntity[]>;
  create(user: Partial<UserEntity>): Promise<UserEntity>;
  update(id: string, data: Partial<UserEntity>): Promise<UserEntity | null>;
  updateAvatar(id: string, newAvatarFileId: string | null): Promise<UserEntity | null>;
  delete(id: string): Promise<boolean>;
  requestDeletionWithUserDeleted(id: string): Promise<UserEntity | null>;
  finalizeDeletion(id: string): Promise<boolean>;
  addBadgeToUser(userId: string, badgeId: string): Promise<void>;
  removeBadgeFromUser(userId: string, badgeId: string): Promise<void>;
  incrementImpactScore(userId: string, score: number): Promise<void>;
  createWithHashedPassword(user: Partial<UserEntity>, password: string): Promise<UserEntity>;
  findPasswordHashByEmail(email: string): Promise<string | null>;
  findPasswordHashById(id: string): Promise<string | null>;
}
