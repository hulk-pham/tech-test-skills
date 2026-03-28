import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { MetricType } from '../../common/type';

export enum ChartPeriod {
  OneMonth = '1m',
  TwoMonths = '2m',
}

export class ChartQueryDto {
  @ApiProperty({ example: 'user-1' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  userId: string;

  @ApiProperty({ enum: MetricType })
  @IsEnum(MetricType)
  type: MetricType;

  @ApiProperty({
    enum: ChartPeriod,
    description:
      '1m = 1 calendar month window ending at endDate; 2m = 2 months',
  })
  @IsEnum(ChartPeriod)
  period: ChartPeriod;

  @ApiProperty({
    example: 'Asia/Ho_Chi_Minh',
    description: 'IANA timezone for local calendar day bucketing',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  timeZone: string;

  @ApiPropertyOptional({
    description:
      'End date (inclusive) in YYYY-MM-DD interpreted in timeZone; default = today in that zone',
    example: '2025-03-26',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  targetUnit?: string;
}
