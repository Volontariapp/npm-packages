import type { CreateTagCommand, UpdateTagCommand } from '../../../event/event.command.js';

/**
 * Tag related requests
 */
export interface CreateTagRequest extends CreateTagCommand {}
export interface UpdateTagRequest extends Partial<UpdateTagCommand> {}
