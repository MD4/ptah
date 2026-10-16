export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

export const clampGraph = (values: number[]): number[] => {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min;

  if (range === 0) {
    return values.map(() => 0);
  }

  return values.map((value) => (value - min) / range);
};
