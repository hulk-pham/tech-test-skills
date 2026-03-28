import { DistanceUnit } from './type';

export const TO_METERS: Record<DistanceUnit, number> = {
  m: 1,
  cm: 0.01,
  inch: 0.0254,
  ft: 0.3048,
  yard: 0.9144,
};

export const FAHRENHEIT_FREEZING = 32;
export const FAHRENHEIT_PER_CELSIUS_DELTA = 9 / 5;
export const CELSIUS_PER_FAHRENHEIT_DELTA = 1 / FAHRENHEIT_PER_CELSIUS_DELTA;
export const KELVIN_TO_CELSIUS_OFFSET = 273.15;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/** Token inject Nest cho client Redis tùy chọn (chart cache). */
export const REDIS_CLIENT = 'REDIS_CLIENT' as const;

/** TTL (giây) cho cache JSON chart trên Redis. */
export const CHART_CACHE_TTL_SEC = 120;

export const chartPointsCacheSchema = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      date: { type: 'string' },
      value: { type: 'number' },
      unit: { type: 'string' },
    },
    required: ['date', 'value', 'unit'],
  },
} as const;