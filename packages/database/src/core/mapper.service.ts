export type Constructor<T> = new (...args: unknown[]) => T;

type MapperFunction<TSource, TDestination> = (source: TSource) => TDestination;

export interface MappingOverride<TSource, TDestination> {
  field: keyof TDestination;
  resolve: (source: TSource) => TDestination[keyof TDestination];
}

export interface BidirectionalConfig<A, B> {
  exclude?: Array<keyof A | keyof B>;
  overridesAtoB?: Array<MappingOverride<A, B>>;
  overridesBtoA?: Array<MappingOverride<B, A>>;
}

export class MapperService {
  private readonly mappings = new Map<string, MapperFunction<unknown, unknown>>();
  private readonly sourceToDestinations = new Map<string, Set<string>>();

  private getMappingKey<TSource, TDestination>(
    source: Constructor<TSource> | string,
    destination: Constructor<TDestination> | string,
  ): string {
    const sName = typeof source === 'string' ? source : source.name;
    const dName = typeof destination === 'string' ? destination : destination.name;
    return `${sName}->${dName}`;
  }

  register<TSource, TDestination>(
    source: Constructor<TSource>,
    destination: Constructor<TDestination>,
    mapFn: MapperFunction<TSource, TDestination>,
  ): void {
    const key = this.getMappingKey(source, destination);
    this.mappings.set(key, mapFn as MapperFunction<unknown, unknown>);

    const destinations = this.sourceToDestinations.get(source.name) ?? new Set();
    destinations.add(destination.name);
    this.sourceToDestinations.set(source.name, destinations);
  }

  registerBidirectional<A extends object, B extends object>(
    classA: Constructor<A>,
    classB: Constructor<B>,
    config?: BidirectionalConfig<A, B>,
  ): void {
    const excludeSet = new Set<string>((config?.exclude ?? []) as string[]);

    const instanceA = new classA();
    const instanceB = new classB();

    const keysA = new Set<string>(Object.getOwnPropertyNames(instanceA));
    const keysB = new Set<string>(Object.getOwnPropertyNames(instanceB));
    const sharedKeys = [...keysA].filter((k) => keysB.has(k) && !excludeSet.has(k));

    const buildMapper = <TSource extends object, TDestination extends object>(
      destClass: Constructor<TDestination>,
      overrides: Map<string, MappingOverride<TSource, TDestination>>,
    ) => {
      return (source: TSource) => {
        const target = new destClass();
        const record = target as Record<string, unknown>;
        const sourceRecord = source as Record<string, unknown>;

        for (const key of sharedKeys) {
          if (!(key in sourceRecord)) continue;

          const override = overrides.get(key);
          if (override) {
            record[key] = override.resolve(source);
          } else {
            const val = sourceRecord[key];
            if (val !== null && val !== undefined && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
              const valConstructor = (val as { constructor: Constructor<unknown> }).constructor;
              const destinations = this.sourceToDestinations.get(valConstructor.name);
              if (destinations && destinations.size > 0) {
                const firstDest = [...destinations][0];
                const mappingKey = this.getMappingKey(valConstructor.name, firstDest);
                const nestedMapper = this.mappings.get(mappingKey);
                if (nestedMapper) {
                  record[key] = nestedMapper(val);
                  continue;
                }
              }
            }
            record[key] = val;
          }
        }

        for (const [field, override] of overrides) {
          if (!sharedKeys.includes(field)) {
            record[field] = override.resolve(source);
          }
        }
        return target;
      };
    };

    const overridesAtoBMap = new Map<string, MappingOverride<A, B>>();
    for (const o of config?.overridesAtoB ?? []) overridesAtoBMap.set(o.field as string, o);

    const overridesBtoAMap = new Map<string, MappingOverride<B, A>>();
    for (const o of config?.overridesBtoA ?? []) overridesBtoAMap.set(o.field as string, o);

    this.register(classA, classB, buildMapper<A, B>(classB, overridesAtoBMap));
    this.register(classB, classA, buildMapper<B, A>(classA, overridesBtoAMap));
  }

  map<TSource, TDestination>(
    sourceObject: TSource,
    sourceClass: Constructor<TSource>,
    destinationClass: Constructor<TDestination>,
  ): TDestination {
    const key = this.getMappingKey(sourceClass, destinationClass);
    const mapper = this.mappings.get(key) as MapperFunction<TSource, TDestination> | undefined;

    if (!mapper) {
      throw new Error(`No mapping registered from ${sourceClass.name} to ${destinationClass.name}`);
    }

    return mapper(sourceObject);
  }

  mapArray<TSource, TDestination>(
    sourceArray: TSource[],
    sourceClass: Constructor<TSource>,
    destinationClass: Constructor<TDestination>,
  ): TDestination[] {
    return sourceArray.map((item) => this.map(item, sourceClass, destinationClass));
  }

  has<TSource, TDestination>(
    source: Constructor<TSource>,
    destination: Constructor<TDestination>,
  ): boolean {
    return this.mappings.has(this.getMappingKey(source, destination));
  }

  clear(): void {
    this.mappings.clear();
    this.sourceToDestinations.clear();
  }
}

export const databaseMapper = new MapperService();
