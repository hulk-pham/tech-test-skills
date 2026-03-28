import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../common';
import { Metric } from './entities/metric.entity';
import { MetricsController } from './metrics.controller';
import { MetricsTypeOrmRepository } from './metrics-typeorm.repository';
import { MetricsService } from './metrics.service';

@Module({
  imports: [TypeOrmModule.forFeature([Metric])],
  controllers: [MetricsController],
  providers: [
    MetricsTypeOrmRepository,
    MetricsService,
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Redis | null => {
        const url = config.get<string>('REDIS_URL')?.trim();
        if (!url) return null;
        return new Redis(url, { maxRetriesPerRequest: 2 });
      },
    },
  ],
  exports: [MetricsService],
})
export class MetricsModule {}
