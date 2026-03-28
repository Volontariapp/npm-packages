import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { MapperService } from '../../core/mapper.service.js';

class MockModel {
  id: number = 0;
  name: string = '';
  internalOnly: string = 'secret';
}

class MockEntity {
  id: number = 0;
  name: string = '';
  get label(): string {
    return `Entity ${this.name}`;
  }
}

describe('Mapper Service (Unit)', () => {
  let mapper: MapperService;

  beforeEach(() => {
    mapper = new MapperService();
    jest.restoreAllMocks();
  });

  it('should auto-detect shared fields for bidirectional mapping', () => {
    mapper.registerBidirectional(MockModel, MockEntity);

    const model = new MockModel();
    model.id = 1;
    model.name = 'Test';
    model.internalOnly = 'ignore me now';

    const entity = mapper.map(model, MockModel, MockEntity);

    expect(entity).toBeInstanceOf(MockEntity);
    expect(entity.id).toBe(1);
    expect(entity.name).toBe('Test');
    expect((entity as unknown as Record<string, unknown>).internalOnly).toBeUndefined();
    expect(entity.label).toBe('Entity Test');
  });

  it('should respect exclude configuration', () => {
    mapper.registerBidirectional(MockModel, MockEntity, {
      exclude: ['name'],
    });

    const model = new MockModel();
    model.id = 1;
    model.name = 'Test';

    const entity = mapper.map(model, MockModel, MockEntity);

    expect(entity.id).toBe(1);
    expect(entity.name).toBe('');
  });

  it('should handle manual overrides', () => {
    mapper.registerBidirectional(MockModel, MockEntity, {
      overridesAtoB: [
        {
          field: 'name',
          resolve: (m) => `Mapped: ${m.name}`,
        },
      ],
    });

    const model = new MockModel();
    model.name = 'Original';

    const entity = mapper.map(model, MockModel, MockEntity);

    expect(entity.name).toBe('Mapped: Original');
  });

  it('should map arrays correctly', () => {
    mapper.registerBidirectional(MockModel, MockEntity);

    const models = [new MockModel(), new MockModel()];
    models[0].id = 1;
    models[1].id = 2;

    const entities = mapper.mapArray(models, MockModel, MockEntity);

    expect(entities).toHaveLength(2);
    expect(entities[0].id).toBe(1);
    expect(entities[1].id).toBe(2);
  });

  it('should handle manual overrides on non-shared fields', () => {
    class MockOtherEntity extends MockEntity {
      other: string = '';
    }

    mapper.registerBidirectional(MockModel, MockOtherEntity, {
      overridesAtoB: [
        {
          field: 'other',
          resolve: (m) => `Field ${m.name}`,
        },
      ],
    });

    const model = new MockModel();
    model.name = 'Test';

    const entity = mapper.map(model, MockModel, MockOtherEntity);
    expect(entity.other).toBe('Field Test');
  });

  it('should throw if map is called for unregistered mapping', () => {
    expect(() => mapper.map({} as unknown as MockModel, MockModel, MockEntity)).toThrow(
      'No mapping registered from MockModel to MockEntity',
    );
  });

  it('should provide has() and clear() methods', () => {
    mapper.registerBidirectional(MockModel, MockEntity);
    expect(mapper.has(MockModel, MockEntity)).toBe(true);

    mapper.clear();
    expect(mapper.has(MockModel, MockEntity)).toBe(false);
  });

  it('should support recursive mapping', () => {
    class ChildModel {
      name = 'child';
    }
    class ChildEntity {
      name = '';
    }
    class ParentModel {
      id = 1;
      name = 'parent';
      child = new ChildModel();
    }
    class ParentEntity {
      id = 0;
      name = '';
      child = new ChildEntity();
    }

    mapper.registerBidirectional(ChildModel, ChildEntity);
    mapper.registerBidirectional(ParentModel, ParentEntity);

    const model = new ParentModel();
    const entity = mapper.map(model, ParentModel, ParentEntity);

    expect(entity.child).toBeInstanceOf(ChildEntity);
    expect(entity.child.name).toBe('child');
  });

  it('should skip recursive mapping if no destination is registered', () => {
    class UnregisteredModel {
      name = 'raw';
    }
    class ParentWithUnregs {
      child = new UnregisteredModel();
    }
    class EntityWithUnregs {
      child = new UnregisteredModel();
    }

    mapper.registerBidirectional(ParentWithUnregs, EntityWithUnregs);

    const model = new ParentWithUnregs();
    const entity = mapper.map(model, ParentWithUnregs, EntityWithUnregs);

    expect(entity.child).toBe(model.child);
  });

  it('should skip recursive mapping if destination exists but mapper is missing', () => {
    class OddModel {
      name = 'odd';
    }
    class OddEntity {
      name = '';
    }

    (
      mapper as unknown as { sourceToDestinations: Map<string, Set<string>> }
    ).sourceToDestinations.set(OddModel.name, new Set([OddEntity.name]));

    class ParentModel {
      child = new OddModel();
    }
    class ParentEntity {
      child = new OddEntity();
    }
    mapper.registerBidirectional(ParentModel, ParentEntity);

    const model = new ParentModel();
    const entity = mapper.map(model, ParentModel, ParentEntity);

    expect(entity.child).toBe(model.child);
  });
});
