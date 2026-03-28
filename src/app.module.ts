import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeOrmEntities, typeOrmMigrations } from './database/typeorm-options';
import { HealthModule } from './health/health.module';
import { MetricsModule } from './metrics/metrics.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        entities: typeOrmEntities,
        migrations: typeOrmMigrations,
        synchronize: config.get<string>('TYPEORM_SYNC') === 'true',
        migrationsRun: config.get<string>('TYPEORM_MIGRATIONS_RUN') === 'true',
        logging: config.get<string>('LOG_SQL') === 'true',
      }),
      inject: [ConfigService],
    }),
    MetricsModule,
    HealthModule,
  ],
})
export class AppModule {}
