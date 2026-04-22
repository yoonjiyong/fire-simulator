export function formatManwon(value: number): string {
  if (Math.abs(value) >= 10000) {
    const eok = value / 10000;
    return `${eok.toFixed(eok % 1 === 0 ? 0 : 2)}억`;
  }
  return `${Math.round(value).toLocaleString('ko-KR')}만`;
}

export function formatManwonDetail(value: number): string {
  const rounded = Math.round(value);
  if (Math.abs(rounded) >= 10000) {
    const eok = Math.floor(rounded / 10000);
    const man = rounded % 10000;
    if (man === 0) return `${eok}억원`;
    return `${eok}억 ${man.toLocaleString('ko-KR')}만원`;
  }
  return `${rounded.toLocaleString('ko-KR')}만원`;
}

export function formatMonthly(value: number): string {
  return `${Math.round(value).toLocaleString('ko-KR')}만원`;
}

export function formatPercent(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatInt(value: number): string {
  return Math.round(value).toLocaleString('ko-KR');
}
