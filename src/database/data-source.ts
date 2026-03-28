import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { buildTypeOrmOptionsFromEnv } from './typeorm-options';

config();

export default new DataSource(buildTypeOrmOptionsFromEnv());
