import { BadRequestException } from '@nestjs/common';
import fastJson from 'fast-json-stringify';
import {
  CELSIUS_PER_FAHRENHEIT_DELTA,
  chartPointsCacheSchema,
  FAHRENHEIT_FREEZING,
  FAHRENHEIT_PER_CELSIUS_DELTA,
  KELVIN_TO_CELSIUS_OFFSET,
  TO_METERS,
} from './constants';
import {
  ChartPointSerializable,
  DISTANCE_UNITS,
  MetricType,
  TEMPERATURE_UNITS,
  type DistanceUnit,
  type TemperatureUnit,
} from './type';

export function isDistanceUnit(u: string): u is DistanceUnit {
  return (DISTANCE_UNITS as readonly string[]).includes(u);
}

export function isTemperatureUnit(u: string): u is TemperatureUnit {
  return (TEMPERATURE_UNITS as readonly string[]).includes(u);
}

export function unitBelongsToType(unit: string, type: MetricType): boolean {
  if (type === MetricType.Distance) return isDistanceUnit(unit);
  if (type === MetricType.Temperature) return isTemperatureUnit(unit);
  return false;
}

function distanceToMeters(value: number, from: DistanceUnit): number {
  return value * TO_METERS[from];
}

function metersToDistance(valueMeters: number, to: DistanceUnit): number {
  return valueMeters / TO_METERS[to];
}

function toCelsius(value: number, from: TemperatureUnit): number {
  switch (from) {
    case 'C':
      return value;
    case 'F':
      return (value - FAHRENHEIT_FREEZING) * CELSIUS_PER_FAHRENHEIT_DELTA;
    case 'K':
      return value - KELVIN_TO_CELSIUS_OFFSET;
  }
}

function fromCelsius(valueC: number, to: TemperatureUnit): number {
  switch (to) {
    case 'C':
      return valueC;
    case 'F':
      return valueC * FAHRENHEIT_PER_CELSIUS_DELTA + FAHRENHEIT_FREEZING;
    case 'K':
      return valueC + KELVIN_TO_CELSIUS_OFFSET;
  }
}

function roundDecimals(n: number, places = 6): number {
  const p = 10 ** places;
  return Math.round(n * p) / p;
}

export function convertValue(
  value: number,
  fromUnit: string,
  toUnit: string,
  type: MetricType,
): number {
  if (fromUnit === toUnit) return roundDecimals(value);

  if (type === MetricType.Distance) {
    if (!isDistanceUnit(fromUnit) || !isDistanceUnit(toUnit)) {
      throw new Error(`Invalid distance unit: ${fromUnit} -> ${toUnit}`);
    }
    const m = distanceToMeters(value, fromUnit);
    return roundDecimals(metersToDistance(m, toUnit));
  }

  if (type === MetricType.Temperature) {
    if (!isTemperatureUnit(fromUnit) || !isTemperatureUnit(toUnit)) {
      throw new Error(`Invalid temperature unit: ${fromUnit} -> ${toUnit}`);
    }
    const c = toCelsius(value, fromUnit);
    return roundDecimals(fromCelsius(c, toUnit));
  }

  throw new Error(`Unknown metric type: ${type}`);
}

// --- Cursor, timezone, ngày chart

export function isValidIanaTimeZone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function encodeCursor(recordedAt: Date, id: string): string {
  return Buffer.from(
    JSON.stringify({ t: recordedAt.toISOString(), i: id }),
    'utf8',
  ).toString('base64url');
}

/** PostgreSQL `date` → JS Date tại local midnight (postgres-date); không dùng toISOString() kẻo lệch ngày khi TZ ≠ UTC. */
export function formatChartLocalDate(raw: unknown): string {
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    const y = raw.getFullYear();
    const m = String(raw.getMonth() + 1).padStart(2, '0');
    const d = String(raw.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(raw).slice(0, 10);
}

export function decodeCursor(cursor: string): { recordedAt: Date; id: string } {
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');
    const o = JSON.parse(raw) as { t: string; i: string };
    return { recordedAt: new Date(o.t), id: String(o.i) };
  } catch {
    throw new BadRequestException('Invalid cursor');
  }
}

export const stringifyChartPoints = fastJson(
  chartPointsCacheSchema as unknown as Parameters<typeof fastJson>[0],
) as (points: ReadonlyArray<ChartPointSerializable>) => string;
