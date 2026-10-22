function trimNumber(value: number): string {
  const rounded = Number(value.toFixed(2));
  return String(rounded);
}

export function formatKg(value: number | null): string {
  return value === null ? '—' : `${trimNumber(value)} кг`;
}

export function formatPercent(value: number): string {
  return `${trimNumber(value)}%`;
}

export function formatMinutes(value: number): string {
  if (value < 60) return `${trimNumber(value)} мин`;
  const hours = Math.floor(value / 60);
  const minutes = Math.round(value % 60);
  if (minutes === 60) return `${hours + 1} ч 0 мин`;
  return `${hours} ч ${minutes} мин`;
}
