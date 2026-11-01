export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export function smooth(a, b, x) {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}

export function timeState(year, seconds) {
  if (!Number.isFinite(year) || !Number.isFinite(seconds)) throw new TypeError('Finite year and seconds required');
  return {
    year: clamp(year, 0, 100),
    seconds,
    construction: smooth(8, 38, year),
    collapse: smooth(42, 72, year),
    soilHeight: 8 * smooth(68, 98, year),
    scaffold: year > 7 && year < 40
  };
}
