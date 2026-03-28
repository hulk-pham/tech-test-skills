import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { MetricType, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../../common';
export class ListMetricsQueryDto {
  @ApiProperty({ example: 'user-1' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  userId: string;

  @ApiProperty({ enum: MetricType })
  @IsEnum(MetricType)
  type: MetricType;

  @ApiPropertyOptional({ description: 'Page size', default: DEFAULT_PAGE_SIZE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Opaque cursor from previous response nextCursor',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    description: 'If set, values converted to this unit in the response',
  })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  targetUnit?: string;
}
