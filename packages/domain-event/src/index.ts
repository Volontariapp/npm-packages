import { registerEventMappings } from './models/mappers.js';

export * from './entities/event.entity.js';
export * from './entities/tag.entity.js';
export * from './entities/requirement.entity.js';

export * from './models/event.model.js';
export * from './models/tag.model.js';
export * from './models/requirement.model.js';
export * from './models/mappers.js';

export * from './repositories/interfaces/event.repository.js';
export * from './repositories/postgres-event.repository.js';
export * from './repositories/interfaces/tag.repository.js';
export * from './repositories/postgres-tag.repository.js';
export * from './repositories/interfaces/requirement.repository.js';
export * from './repositories/postgres-requirement.repository.js';

export * from './services/index.js';

export * from './value-objects/event-location.value-object.js';
export * from './value-objects/find-around-me.value-object.js';
export * from './value-objects/paginated-events.value-object.js';
export * from './value-objects/search-advanced.value-object.js';

export * from './database/triggers/index.js';

registerEventMappings();
