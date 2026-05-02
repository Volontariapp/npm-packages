import { describe, it, expect, beforeAll } from '@jest/globals';
import { databaseMapper } from '@volontariapp/database';
import { UserRoles } from '@volontariapp/shared';
import { registerUserMappings } from '../../models/mapper.js';
import { UserEntity } from '../../entities/user.entity.js';
import { UserModel } from '../../models/user.model.js';
import { BadgeEntity } from '../../entities/badge.entity.js';
import { BadgeModel } from '../../models/badge.model.js';
import type { UserBadgeModel } from '../../models/user-badge.model.js';
import { UserFactory } from '../__test-utils__/factories/user.factory.js';
import { BadgeFactory } from '../__test-utils__/factories/badge.factory.js';

describe('Mapper (Unit)', () => {
  beforeAll(() => {
    registerUserMappings();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // UserEntity ↔ UserModel
  // ───────────────────────────────────────────────────────────────────────────
  describe('UserEntity ↔ UserModel', () => {
    describe('HAPPY PATH: UserEntity → UserModel (all fields)', () => {
      it('should map UserEntity to UserModel with all shared fields', () => {
        // ARRANGE
        const entity = UserFactory.build({
          id: 'user-1',
          email: 'john@example.com',
          pseudo: 'johndoe',
          bio: 'A passionate volunteer',
          logoPath: '/logos/user1.png',
          totalImpactScore: 42,
          role: UserRoles.VOLUNTEER,
        });

        // ACT
        const model = databaseMapper.map(entity, UserEntity, UserModel);

        // ASSERT
        expect(model).toBeInstanceOf(UserModel);
        expect(model.id).toBe('user-1');
        expect(model.email).toBe('john@example.com');
        expect(model.pseudo).toBe('johndoe');
        expect(model.bio).toBe('A passionate volunteer');
        expect(model.logoPath).toBe('/logos/user1.png');
        expect(model.totalImpactScore).toBe(42);
        expect(model.role).toBe(UserRoles.VOLUNTEER);
      });

      it('should map UserEntity with RNA (organization) to UserModel', () => {
        // ARRANGE
        const entity = UserFactory.build({
          id: 'org-1',
          email: 'org@example.com',
          pseudo: 'greenorg',
          rna: 'W123456789',
          totalImpactScore: 100,
          role: UserRoles.ORGANIZATION,
        });

        // ACT
        const model = databaseMapper.map(entity, UserEntity, UserModel);

        // ASSERT
        expect(model).toBeInstanceOf(UserModel);
        expect(model.rna).toBe('W123456789');
        expect(model.role).toBe(UserRoles.ORGANIZATION);
      });

      it('should map UserEntity with minimal fields to UserModel', () => {
        // ARRANGE
        const entity = new UserEntity();
        entity.id = 'min-user';
        entity.email = 'min@example.com';
        entity.pseudo = 'minimal';
        entity.role = UserRoles.VOLUNTEER;
        entity.totalImpactScore = 0;

        // ACT
        const model = databaseMapper.map(entity, UserEntity, UserModel);

        // ASSERT
        expect(model.id).toBe('min-user');
        expect(model.email).toBe('min@example.com');
        expect(model.pseudo).toBe('minimal');
        expect(model.totalImpactScore).toBe(0);
        expect(model.bio).toBeUndefined();
        expect(model.rna).toBeUndefined();
        expect(model.logoPath).toBeUndefined();
      });
    });

    describe('HAPPY PATH: UserModel → UserEntity (bidirectional)', () => {
      it('should map UserModel back to UserEntity with role conversion', () => {
        // ARRANGE
        const model = new UserModel();
        model.id = 'user-2';
        model.email = 'alice@example.com';
        model.pseudo = 'alicewonder';
        model.bio = 'Nature lover';
        model.totalImpactScore = 25;
        model.role = UserRoles.VOLUNTEER;

        // ACT
        const entity = databaseMapper.map(model, UserModel, UserEntity);

        // ASSERT
        expect(entity).toBeInstanceOf(UserEntity);
        expect(entity.id).toBe('user-2');
        expect(entity.email).toBe('alice@example.com');
        expect(entity.pseudo).toBe('alicewonder');
        expect(entity.bio).toBe('Nature lover');
        expect(entity.totalImpactScore).toBe(25);
        expect(entity.role).toBe(UserRoles.VOLUNTEER);
      });

      it('should map UserModel with RNA back to UserEntity correctly', () => {
        // ARRANGE
        const model = new UserModel();
        model.id = 'org-2';
        model.email = 'org2@example.com';
        model.pseudo = 'greenforce';
        model.rna = 'W987654321';
        model.role = UserRoles.ORGANIZATION;
        model.totalImpactScore = 50;

        // ACT
        const entity = databaseMapper.map(model, UserModel, UserEntity);

        // ASSERT
        expect(entity.rna).toBe('W987654321');
        expect(entity.role).toBe(UserRoles.ORGANIZATION);
      });
    });

    describe('HAPPY PATH: Excluded fields not mapped', () => {
      it('should exclude badges field when mapping UserEntity to UserModel', () => {
        // ARRANGE
        const badge = BadgeFactory.build({ id: 'badge-1' });
        const entity = UserFactory.build({
          id: 'user-3',
          badges: [badge],
        });

        // ACT
        const model = databaseMapper.map(entity, UserEntity, UserModel);

        // ASSERT
        expect(model.userBadges).toBeUndefined();
      });

      it('should exclude passwordHash field from mapping', () => {
        // ARRANGE
        const model = new UserModel();
        model.id = 'test-id';
        model.email = 'test@example.com';
        model.pseudo = 'testpseudo';
        model.role = UserRoles.VOLUNTEER;
        model.totalImpactScore = 0;
        model.passwordHash = 'hashed_password_123';

        // ACT
        const mapped = databaseMapper.map(model, UserModel, UserEntity);

        // ASSERT - mapped entity should not have passwordHash
        expect((mapped as unknown as Record<string, unknown>).passwordHash).toBeUndefined();
      });

      it('should not include userBadges in mapped entity', () => {
        // ARRANGE
        const model = new UserModel();
        model.id = 'user-5';
        model.email = 'test@example.com';
        model.pseudo = 'testuser';
        model.role = UserRoles.VOLUNTEER;
        model.totalImpactScore = 0;
        model.userBadges = []; // This should be excluded

        // ACT
        const entity = databaseMapper.map(model, UserModel, UserEntity);

        // ASSERT
        expect((entity as unknown as Record<string, unknown>).userBadges).toBeUndefined();
      });
    });

    describe('SAD PATH: Badges resolution from userBadges', () => {
      it('should resolve badges from userBadges when mapping UserModel to UserEntity', () => {
        // ARRANGE
        const badgeModel = new BadgeModel();
        badgeModel.id = 'badge-1';
        badgeModel.name = 'Green Champion';
        badgeModel.slug = 'green-champion';
        badgeModel.description = 'Awarded for environmental action';

        const userBadge: Partial<UserBadgeModel> = {
          userId: 'user-6',
          badgeId: 'badge-1',
          badge: badgeModel,
        };

        const model = new UserModel();
        model.id = 'user-6';
        model.email = 'eco@example.com';
        model.pseudo = 'ecohero';
        model.role = UserRoles.VOLUNTEER;
        model.totalImpactScore = 10;
        model.userBadges = [userBadge as UserBadgeModel];

        // ACT
        const entity = databaseMapper.map(model, UserModel, UserEntity);

        // ASSERT
        expect(entity.badges).toHaveLength(1);
        expect(entity.badges[0]).toBeInstanceOf(BadgeEntity);
        expect(entity.badges[0].id).toBe('badge-1');
        expect(entity.badges[0].name).toBe('Green Champion');
      });

      it('should return empty array when userBadges is null', () => {
        // ARRANGE
        const model = new UserModel();
        model.id = 'user-7';
        model.email = 'nobadge@example.com';
        model.pseudo = 'newuser';
        model.role = UserRoles.VOLUNTEER;
        model.totalImpactScore = 0;
        model.userBadges = null as unknown as UserBadgeModel[];

        // ACT
        const entity = databaseMapper.map(model, UserModel, UserEntity);

        // ASSERT
        expect(entity.badges).toEqual([]);
      });

      it('should return empty array when userBadges is undefined', () => {
        // ARRANGE
        const model = new UserModel();
        model.id = 'user-8';
        model.email = 'nope@example.com';
        model.pseudo = 'fresh';
        model.role = UserRoles.VOLUNTEER;
        model.totalImpactScore = 0;
        model.userBadges = undefined as unknown as UserBadgeModel[];

        // ACT
        const entity = databaseMapper.map(model, UserModel, UserEntity);

        // ASSERT
        expect(entity.badges).toEqual([]);
      });

      it('should filter out undefined/null badges from userBadges array', () => {
        // ARRANGE
        const badgeModel = new BadgeModel();
        badgeModel.id = 'badge-2';
        badgeModel.name = 'Active Volunteer';
        badgeModel.slug = 'active-volunteer';
        badgeModel.description = 'Awarded for consistent activity';

        const model = new UserModel();
        model.id = 'user-9';
        model.email = 'mixed@example.com';
        model.pseudo = 'mixeduser';
        model.role = UserRoles.VOLUNTEER;
        model.totalImpactScore = 20;
        model.userBadges = [
          {
            userId: 'user-9',
            badgeId: 'badge-2',
            badge: badgeModel,
          } as unknown as UserBadgeModel,
          {
            userId: 'user-9',
            badgeId: 'null-badge',
            badge: null as unknown as BadgeModel,
          } as unknown as UserBadgeModel,
          {
            userId: 'user-9',
            badgeId: 'undefined-badge',
            badge: undefined as unknown as BadgeModel,
          } as unknown as UserBadgeModel,
        ];

        // ACT
        const entity = databaseMapper.map(model, UserModel, UserEntity);

        // ASSERT
        expect(entity.badges).toHaveLength(1);
        expect(entity.badges[0].id).toBe('badge-2');
        expect(entity.badges[0].name).toBe('Active Volunteer');
      });

      it('should handle multiple valid badges in userBadges array', () => {
        // ARRANGE
        const badge1 = new BadgeModel();
        badge1.id = 'badge-a';
        badge1.name = 'Badge A';
        badge1.slug = 'badge-a';
        badge1.description = 'First badge';

        const badge2 = new BadgeModel();
        badge2.id = 'badge-b';
        badge2.name = 'Badge B';
        badge2.slug = 'badge-b';
        badge2.description = 'Second badge';

        const model = new UserModel();
        model.id = 'user-10';
        model.email = 'multibadge@example.com';
        model.pseudo = 'superuser';
        model.role = UserRoles.VOLUNTEER;
        model.totalImpactScore = 75;
        model.userBadges = [
          { userId: 'user-10', badgeId: 'badge-a', badge: badge1 } as unknown as UserBadgeModel,
          { userId: 'user-10', badgeId: 'badge-b', badge: badge2 } as unknown as UserBadgeModel,
        ];

        // ACT
        const entity = databaseMapper.map(model, UserModel, UserEntity);

        // ASSERT
        expect(entity.badges).toHaveLength(2);
        expect(entity.badges[0].id).toBe('badge-a');
        expect(entity.badges[0].name).toBe('Badge A');
        expect(entity.badges[1].id).toBe('badge-b');
        expect(entity.badges[1].name).toBe('Badge B');
      });
    });

    describe('ERROR HANDLING: Role conversion edge cases', () => {
      it('should handle role as UserRoles.VOLUNTEER enum correctly', () => {
        // ARRANGE
        const entity = UserFactory.build({ role: UserRoles.VOLUNTEER });

        // ACT
        const model = databaseMapper.map(entity, UserEntity, UserModel);

        // ASSERT
        expect(model.role).toBe(UserRoles.VOLUNTEER);
        expect(typeof model.role).toBe('string');
      });

      it('should handle role as UserRoles.ORGANIZATION enum correctly', () => {
        // ARRANGE
        const entity = UserFactory.build({ role: UserRoles.ORGANIZATION });

        // ACT
        const model = databaseMapper.map(entity, UserEntity, UserModel);

        // ASSERT
        expect(model.role).toBe(UserRoles.ORGANIZATION);
        expect(typeof model.role).toBe('string');
      });

      it('should convert role string back to UserRoles enum', () => {
        // ARRANGE
        const model = new UserModel();
        model.id = 'enum-test';
        model.email = 'enumtest@example.com';
        model.pseudo = 'enumuser';
        model.role = UserRoles.VOLUNTEER;
        model.totalImpactScore = 0;

        // ACT
        const entity = databaseMapper.map(model, UserModel, UserEntity);

        // ASSERT
        expect(entity.role).toBe(UserRoles.VOLUNTEER);
        expect(typeof entity.role).toBe('string');
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // BadgeEntity ↔ BadgeModel
  // ───────────────────────────────────────────────────────────────────────────
  describe('BadgeEntity ↔ BadgeModel', () => {
    describe('HAPPY PATH: BadgeEntity → BadgeModel (all fields)', () => {
      it('should map BadgeEntity to BadgeModel with all fields', () => {
        // ARRANGE
        const entity = BadgeFactory.build({
          id: 'badge-100',
          name: 'Environmental Hero',
          slug: 'environmental-hero',
          description: 'Awarded for outstanding environmental action',
          iconPath: '/icons/hero.svg',
        });

        // ACT
        const model = databaseMapper.map(entity, BadgeEntity, BadgeModel);

        // ASSERT
        expect(model).toBeInstanceOf(BadgeModel);
        expect(model.id).toBe('badge-100');
        expect(model.name).toBe('Environmental Hero');
        expect(model.slug).toBe('environmental-hero');
        expect(model.description).toBe('Awarded for outstanding environmental action');
        expect(model.iconPath).toBe('/icons/hero.svg');
      });

      it('should map BadgeEntity without optional iconPath', () => {
        // ARRANGE
        const entity = new BadgeEntity();
        entity.id = 'badge-200';
        entity.name = 'Community Helper';
        entity.slug = 'community-helper';
        entity.description = 'Awarded for community support';

        // ACT
        const model = databaseMapper.map(entity, BadgeEntity, BadgeModel);

        // ASSERT
        expect(model.id).toBe('badge-200');
        expect(model.name).toBe('Community Helper');
        expect(model.slug).toBe('community-helper');
        expect(model.description).toBe('Awarded for community support');
        expect(model.iconPath).toBeUndefined();
      });
    });

    describe('HAPPY PATH: BadgeModel → BadgeEntity (bidirectional)', () => {
      it('should map BadgeModel back to BadgeEntity', () => {
        // ARRANGE
        const model = new BadgeModel();
        model.id = 'badge-300';
        model.name = 'Social Butterfly';
        model.slug = 'social-butterfly';
        model.description = 'Awarded for connecting people';
        model.iconPath = '/icons/butterfly.svg';

        // ACT
        const entity = databaseMapper.map(model, BadgeModel, BadgeEntity);

        // ASSERT
        expect(entity).toBeInstanceOf(BadgeEntity);
        expect(entity.id).toBe('badge-300');
        expect(entity.name).toBe('Social Butterfly');
        expect(entity.slug).toBe('social-butterfly');
        expect(entity.description).toBe('Awarded for connecting people');
        expect(entity.iconPath).toBe('/icons/butterfly.svg');
      });

      it('should map BadgeModel without optional iconPath to entity', () => {
        // ARRANGE
        const model = new BadgeModel();
        model.id = 'badge-400';
        model.name = 'Sustainable Thinker';
        model.slug = 'sustainable-thinker';
        model.description = 'Awarded for sustainable initiatives';

        // ACT
        const entity = databaseMapper.map(model, BadgeModel, BadgeEntity);

        // ASSERT
        expect(entity.id).toBe('badge-400');
        expect(entity.name).toBe('Sustainable Thinker');
        expect(entity.iconPath).toBeUndefined();
      });
    });

    describe('ERROR HANDLING: Badge mapping integrity', () => {
      it('should preserve all required fields during bidirectional mapping', () => {
        // ARRANGE
        const badge = BadgeFactory.build({
          id: 'badge-500',
          name: 'Test Badge',
          slug: 'test-badge',
          description: 'For testing',
        });

        // ACT
        const model = databaseMapper.map(badge, BadgeEntity, BadgeModel);
        const entityBack = databaseMapper.map(model, BadgeModel, BadgeEntity);

        // ASSERT
        expect(entityBack.id).toBe(badge.id);
        expect(entityBack.name).toBe(badge.name);
        expect(entityBack.slug).toBe(badge.slug);
        expect(entityBack.description).toBe(badge.description);
      });

      it('should handle special characters in badge fields', () => {
        // ARRANGE
        const entity = new BadgeEntity();
        entity.id = 'special-badge';
        entity.name = 'Éco-Responsable™';
        entity.slug = 'eco-responsable-special';
        entity.description = 'Badge with special chars: @, #, $, &, é, ç, etc.';
        entity.iconPath = '/icons/special-😀.svg';

        // ACT
        const model = databaseMapper.map(entity, BadgeEntity, BadgeModel);

        // ASSERT
        expect(model.name).toBe('Éco-Responsable™');
        expect(model.description).toContain('@');
        expect(model.description).toContain('é');
      });
    });
  });
});
