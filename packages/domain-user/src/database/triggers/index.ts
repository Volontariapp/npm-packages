import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sqlDir = existsSync(join(__dirname, 'users.trigger.sql'))
  ? __dirname
  : join(__dirname, '../../../src/database/triggers');

const readSqlFile = (filename: string) => readFileSync(join(sqlDir, filename), 'utf8');

export const USERS_TRIGGER = readSqlFile('users.trigger.sql');
