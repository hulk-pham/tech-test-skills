import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  MaxLength,
} from 'class-validator';
import { MetricType } from '../../common/type';

export class CreateMetricDto {
  @ApiProperty({ example: 'user-1' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  userId: string;

  @ApiProperty({ enum: MetricType })
  @IsEnum(MetricType)
  type: MetricType;

  @ApiProperty({ example: 12.5 })
  @IsNumber()
  @Type(() => Number)
  value: number;

  @ApiProperty({
    example: 'm',
    description: 'Distance: m, cm, inch, ft, yard. Temperature: C, F, K',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  unit: string;

  @ApiProperty({ example: '2025-03-20T10:00:00.000Z' })
  @IsDateString()
  recordedAt: string;
}
