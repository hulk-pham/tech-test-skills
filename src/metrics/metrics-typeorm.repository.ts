import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ChartPeriod } from './dto/chart-query.dto';
import { Metric } from './entities/metric.entity';

export interface ChartSqlRow {
  id: string;
  user_id: string;
  type: string;
  value: string;
  unit: string;
  recorded_at: Date;
  local_date: unknown;
}

@Injectable()
export class MetricsTypeOrmRepository {
  constructor(
    @InjectRepository(Metric)
    private readonly metricRepo: Repository<Metric>,
    private readonly dataSource: DataSource,
  ) {}

  create(partial: Partial<Metric>): Metric {
    return this.metricRepo.create(partial);
  }

  async save(metric: Metric): Promise<Metric> {
    return this.metricRepo.save(metric);
  }

  async findKeysetPage(params: {
    userId: string;
    type: string;
    limit: number;
    cursorRecordedAt?: Date;
    cursorId?: string;
  }): Promise<Metric[]> {
    const qb = this.metricRepo
      .createQueryBuilder('m')
      .where('m.user_id = :userId', { userId: params.userId })
      .andWhere('m.type = :type', { type: params.type })
      .orderBy('m.recorded_at', 'DESC')
      .addOrderBy('m.id', 'DESC')
      .take(params.limit + 1);

    if (params.cursorRecordedAt && params.cursorId) {
      qb.andWhere('(m.recorded_at, m.id) < (:ts::timestamptz, :id::bigint)', {
        ts: params.cursorRecordedAt.toISOString(),
        id: params.cursorId,
      });
    }

    return qb.getMany();
  }

  async findChartLatestPerDay(params: {
    timeZone: string;
    userId: string;
    type: string;
    endDate: string | null;
    period: ChartPeriod;
  }): Promise<ChartSqlRow[]> {
    const lookbackInterval =
      params.period === ChartPeriod.OneMonth ? '1 month' : '2 months';

    const sql = `
      WITH bounds AS (
        SELECT
          COALESCE(
            $4::date,
            ((now() AT TIME ZONE $1::text))::date
          ) AS end_local
      ),
      span AS (
        SELECT
          end_local,
          (end_local::timestamp - $5::interval)::date AS start_local
        FROM bounds
      ),
      ranked AS (
        SELECT
          m.id,
          m.user_id,
          m.type,
          m.value,
          m.unit,
          m.recorded_at,
          (m.recorded_at AT TIME ZONE $1::text)::date AS local_date,
          ROW_NUMBER() OVER (
            PARTITION BY m.user_id, m.type, (m.recorded_at AT TIME ZONE $1::text)::date
            ORDER BY m.recorded_at DESC, m.id DESC
          ) AS rn
        FROM metrics m
        CROSS JOIN span s
        WHERE m.user_id = $2
          AND m.type = $3
          AND (m.recorded_at AT TIME ZONE $1::text)::date >= s.start_local
          AND (m.recorded_at AT TIME ZONE $1::text)::date <= s.end_local
      )
      SELECT id, user_id, type, value, unit, recorded_at, local_date
      FROM ranked
      WHERE rn = 1
      ORDER BY local_date ASC
    `;

    return this.dataSource.query(sql, [
      params.timeZone,
      params.userId,
      params.type,
      params.endDate,
      lookbackInterval,
    ]);
  }
}
