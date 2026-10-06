import { registerStorageMappings } from './mapper.js';

export * from './file.model.js';
export * from './released-entity.model.js';
export * from './transformers/bigint-number.transformer.js';
export * from './mapper.js';

// As in domain-post and domain-event: importing the models is enough to register the mappings.
registerStorageMappings();
