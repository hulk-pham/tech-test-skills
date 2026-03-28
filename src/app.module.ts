import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { rateLimitModuleOptions } from './common/rate-limit.config';
import { typeOrmEntities, typeOrmMigrations } from './database/typeorm-options';
import { HealthModule } from './health/health.module';
import { MetricsModule } from './metrics/metrics.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => rateLimitModuleOptions(config),
    }),
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
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
