import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ChartQueryDto } from './dto/chart-query.dto';
import { CreateMetricDto } from './dto/create-metric.dto';
import { ListMetricsQueryDto } from './dto/list-metrics-query.dto';
import { MetricsService } from './metrics.service';

@ApiTags('metrics')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create metric' })
  create(@Body() dto: CreateMetricDto) {
    return this.metrics.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List metrics (keyset pagination)' })
  list(@Query() q: ListMetricsQueryDto) {
    return this.metrics.list(q);
  }

  @Get('chart')
  @ApiOperation({ summary: 'Chart data: latest value per local calendar day' })
  chart(@Query() q: ChartQueryDto) {
    return this.metrics.chart(q);
  }
}
