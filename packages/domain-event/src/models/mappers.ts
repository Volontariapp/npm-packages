import { databaseMapper } from '@volontariapp/database';
import { EventModel } from './event.model.js';
import { EventEntity } from '../entities/event.entity.js';
import { TagModel } from './tag.model.js';
import { TagEntity } from '../entities/tag.entity.js';
import { RequirementModel } from './requirement.model.js';
import { RequirementEntity } from '../entities/requirement.entity.js';
import { EventLocation } from '../value-objects/event-location.value-object.js';

interface GeoJsonObject {
  type: string;
  coordinates: [number, number];
}

export function registerEventMappings() {
  databaseMapper.registerBidirectional(TagEntity, TagModel);
  databaseMapper.registerBidirectional(RequirementEntity, RequirementModel);

  databaseMapper.registerBidirectional(EventEntity, EventModel, {
    exclude: ['location'],
    overridesAtoB: [
      {
        field: 'location',
        resolve: (source) =>
          `${source.location.longitude.toString()},${source.location.latitude.toString()}`,
      },
    ],
    overridesBtoA: [
      {
        field: 'location',
        resolve: (source) => {
          const loc = source.location as unknown;
          if (typeof loc === 'string') {
            const matches = loc.match(/POINT\(([^ ]+) ([^)]+)\)/);
            if (matches) {
              return new EventLocation(parseFloat(matches[2]), parseFloat(matches[1]));
            }
          } else if (typeof loc === 'object' && loc !== null && 'coordinates' in loc) {
            const geoJson = loc as GeoJsonObject;
            return new EventLocation(geoJson.coordinates[1], geoJson.coordinates[0]);
          }
          return new EventLocation(0, 0);
        },
      },
    ],
  });
}
