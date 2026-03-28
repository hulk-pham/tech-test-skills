import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  Optional,
} from '@nestjs/common';
import Redis from 'ioredis';
import {
  CHART_CACHE_TTL_SEC,
  convertValue,
  decodeCursor,
  DEFAULT_PAGE_SIZE,
  encodeCursor,
  formatChartLocalDate,
  isValidIanaTimeZone,
  MAX_PAGE_SIZE,
  MetricType,
  REDIS_CLIENT,
  stringifyChartPoints,
  unitBelongsToType,
} from '../common';
import {
  ChartPointDto,
  ChartQueryDto,
  CreateMetricDto,
  ListMetricsQueryDto,
} from './dto';
import { MetricsTypeOrmRepository } from './metrics-typeorm.repository';

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  constructor(
    private readonly metricsRepo: MetricsTypeOrmRepository,
    @Optional()
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis | null,
  ) {}

  private chartCacheKeyPrefix(userId: string): string {
    return `chart:${userId}:`;
  }

  async invalidateChartCacheForUser(userId: string): Promise<void> {
    if (!this.redis) return;
    const prefix = this.chartCacheKeyPrefix(userId);
    try {
      let scanCursor = '0';
      do {
        const [nextScanCursor, matchedKeys] = await this.redis.scan(
          scanCursor,
          'MATCH',
          `${prefix}*`,
          'COUNT',
          100,
        );
        scanCursor = nextScanCursor;
        if (matchedKeys.length) await this.redis.del(...matchedKeys);
      } while (scanCursor !== '0');
    } catch (invalidateError: unknown) {
      this.logger.warn(`Redis chart invalidation failed: ${invalidateError}`);
    }
  }

  private stableChartCacheKey(chartQuery: ChartQueryDto): string {
    const endDateCacheToken = chartQuery.endDate ?? '__auto__';
    const targetUnitCacheToken = chartQuery.targetUnit ?? '__raw__';
    return `${this.chartCacheKeyPrefix(chartQuery.userId)}${chartQuery.type}:${chartQuery.period}:${chartQuery.timeZone}:${endDateCacheToken}:${targetUnitCacheToken}`;
  }

  private async tryGetChartFromCache(
    cacheKey: string,
  ): Promise<ChartPointDto[] | null> {
    if (!this.redis) return null;

    try {
      const serialized = await this.redis.get(cacheKey);
      if (!serialized) return null;

      return JSON.parse(serialized) as ChartPointDto[];
    } catch (err) {
      this.logger.warn('Cache read/parse failed', { cacheKey, err });
      return null;
    }
  }

  private async setChartCache(
    cacheKey: string,
    chartPoints: ChartPointDto[],
  ): Promise<void> {
    if (!this.redis) return;

    try {
      const payload = stringifyChartPoints(chartPoints);

      await this.redis.set(cacheKey, payload, 'EX', CHART_CACHE_TTL_SEC);
    } catch (err) {
      this.logger.warn('Cache write failed', { cacheKey, err });
    }
  }

  async create(createInput: CreateMetricDto) {
    if (!unitBelongsToType(createInput.unit, createInput.type)) {
      throw new BadRequestException(
        `Unit "${createInput.unit}" is not valid for type ${createInput.type}`,
      );
    }
    const recordedAt = new Date(createInput.recordedAt);
    if (Number.isNaN(recordedAt.getTime())) {
      throw new BadRequestException(
        'recordedAt must be a valid ISO-8601 datetime',
      );
    }
    const metricEntity = this.metricsRepo.create({
      userId: createInput.userId,
      type: createInput.type,
      value: String(createInput.value),
      unit: createInput.unit,
      recordedAt,
    });
    const savedMetric = await this.metricsRepo.save(metricEntity);
    await this.invalidateChartCacheForUser(createInput.userId);
    return savedMetric;
  }

  async list(listQuery: ListMetricsQueryDto): Promise<{
    items: Array<{
      id: string;
      userId: string;
      type: string;
      value: number;
      unit: string;
      recordedAt: string;
    }>;
    nextCursor: string | null;
  }> {
    const limit = Math.min(listQuery.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const decodedListCursor = listQuery.cursor
      ? decodeCursor(listQuery.cursor)
      : undefined;

    const metricsKeysetPage = await this.metricsRepo.findKeysetPage({
      userId: listQuery.userId,
      type: listQuery.type,
      limit,
      cursorRecordedAt: decodedListCursor?.recordedAt,
      cursorId: decodedListCursor?.id,
    });

    const hasMoreRowsThanPage = metricsKeysetPage.length > limit;
    const metricsInCurrentPage = hasMoreRowsThanPage
      ? metricsKeysetPage.slice(0, limit)
      : metricsKeysetPage;
    const lastMetricInPage =
      metricsInCurrentPage[metricsInCurrentPage.length - 1];
    const nextCursor =
      hasMoreRowsThanPage && lastMetricInPage
        ? encodeCursor(lastMetricInPage.recordedAt, String(lastMetricInPage.id))
        : null;

    const items = metricsInCurrentPage.map((metric) => {
      const storedNumericValue = Number(metric.value);
      let displayValue = storedNumericValue;
      let displayUnit = metric.unit;
      if (listQuery.targetUnit) {
        if (
          !unitBelongsToType(listQuery.targetUnit, listQuery.type as MetricType)
        ) {
          throw new BadRequestException(
            `targetUnit "${listQuery.targetUnit}" invalid for type ${listQuery.type}`,
          );
        }
        displayValue = convertValue(
          storedNumericValue,
          metric.unit,
          listQuery.targetUnit,
          listQuery.type as MetricType,
        );
        displayUnit = listQuery.targetUnit;
      }
      return {
        id: String(metric.id),
        userId: metric.userId,
        type: metric.type,
        value: displayValue,
        unit: displayUnit,
        recordedAt: metric.recordedAt.toISOString(),
      };
    });

    return { items, nextCursor };
  }

  async chart(chartQuery: ChartQueryDto): Promise<ChartPointDto[]> {
    if (!isValidIanaTimeZone(chartQuery.timeZone)) {
      throw new BadRequestException(
        `Invalid IANA timeZone: ${chartQuery.timeZone}`,
      );
    }
    if (chartQuery.targetUnit) {
      if (!unitBelongsToType(chartQuery.targetUnit, chartQuery.type)) {
        throw new BadRequestException(
          `targetUnit "${chartQuery.targetUnit}" invalid for type ${chartQuery.type}`,
        );
      }
    }

    const cacheKey = this.stableChartCacheKey(chartQuery);
    const cachedChartPoints = await this.tryGetChartFromCache(cacheKey);
    if (cachedChartPoints) return cachedChartPoints;

    const latestMetricPerLocalDay =
      await this.metricsRepo.findChartLatestPerDay({
        timeZone: chartQuery.timeZone,
        userId: chartQuery.userId,
        type: chartQuery.type,
        endDate: chartQuery.endDate ?? null,
        period: chartQuery.period,
      });

    const chartPoints: ChartPointDto[] = latestMetricPerLocalDay.map(
      (latestDayRow) => {
        const storedNumericValue = Number(latestDayRow.value);
        const metricType = latestDayRow.type as MetricType;
        let pointValue = storedNumericValue;
        let pointUnit = latestDayRow.unit;
        if (chartQuery.targetUnit) {
          pointValue = convertValue(
            storedNumericValue,
            latestDayRow.unit,
            chartQuery.targetUnit,
            metricType,
          );
          pointUnit = chartQuery.targetUnit;
        }
        const calendarDateLabel = formatChartLocalDate(latestDayRow.local_date);
        return { date: calendarDateLabel, value: pointValue, unit: pointUnit };
      },
    );

    // skip cache if payload is too large
    if (chartPoints.length <= 200) {
      await this.setChartCache(cacheKey, chartPoints);
    }

    return chartPoints;
  }
}
