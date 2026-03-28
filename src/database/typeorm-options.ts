import { DataSourceOptions } from 'typeorm';
import { Metric } from '../metrics/entities/metric.entity';
import { CreateMetrics1743000000000 } from './migrations/1743000000000-CreateMetrics';

export const typeOrmEntities = [Metric];

export const typeOrmMigrations = [CreateMetrics1743000000000];

export function buildTypeOrmOptionsFromEnv(): DataSourceOptions {
  return {
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: typeOrmEntities,
    migrations: typeOrmMigrations,
    synchronize: false,
    logging: process.env.LOG_SQL === 'true',
  };
}
