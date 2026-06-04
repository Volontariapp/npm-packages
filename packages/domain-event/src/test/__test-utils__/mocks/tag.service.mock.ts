import { createMock } from '@volontariapp/testing';
import type { TagService } from '../../../services/tag.service.js';

export const createTagServiceMock = () => createMock<TagService>();
