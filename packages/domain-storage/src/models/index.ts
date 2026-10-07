import { registerStorageMappings } from './mapper.js';

export * from './file.model.js';
export * from './released-entity.model.js';
export * from './transformers/bigint-number.transformer.js';
export * from './mapper.js';

// Importing the models is enough to register the mappings. Unlike domain-post and domain-event,
// which register at the import of their root entry point, this root must not load typeorm, so
// the registration lives on this sub-path (domain-user leaves it to the consumer instead).
registerStorageMappings();
