import { databaseMapper } from '../core/mapper.service.js';
import { GatherStateEntity } from './entities/gather-state.entity.js';
import { GatherStateModel } from './models/gather-state.model.js';

databaseMapper.registerBidirectional(GatherStateModel, GatherStateEntity);

export * from './models/gather-state.model.js';
export * from './entities/gather-state.entity.js';
