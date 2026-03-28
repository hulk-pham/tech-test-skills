import { convertValue } from './utils';
import { MetricType } from './type';

describe('convertValue', () => {
  it('converts distance m -> cm', () => {
    expect(convertValue(1, 'm', 'cm', MetricType.Distance)).toBe(100);
  });

  it('converts inch -> m', () => {
    expect(convertValue(1, 'inch', 'm', MetricType.Distance)).toBeCloseTo(
      0.0254,
      5,
    );
  });

  it('converts C -> F', () => {
    expect(convertValue(0, 'C', 'F', MetricType.Temperature)).toBe(32);
  });

  it('converts F -> C', () => {
    expect(convertValue(32, 'F', 'C', MetricType.Temperature)).toBe(0);
  });

  it('converts K -> C', () => {
    expect(convertValue(273.15, 'K', 'C', MetricType.Temperature)).toBeCloseTo(
      0,
      5,
    );
  });
});
