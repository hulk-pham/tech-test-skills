export enum MetricType {
  Distance = 'Distance',
  Temperature = 'Temperature',
}

export const DISTANCE_UNITS = ['m', 'cm', 'inch', 'ft', 'yard'] as const;
export type DistanceUnit = (typeof DISTANCE_UNITS)[number];

export const TEMPERATURE_UNITS = ['C', 'F', 'K'] as const;
export type TemperatureUnit = (typeof TEMPERATURE_UNITS)[number];

export type ChartPointSerializable = {
  date: string;
  value: number;
  unit: string;
};
