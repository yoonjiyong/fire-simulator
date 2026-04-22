import type { SimulationResult } from '../types';
import { formatManwonDetail } from '../utils/format';

interface BottomSummaryProps {
  result: SimulationResult;
  startAge: number;
}

export function BottomSummary({ result, startAge }: BottomSummaryProps) {
  const lastYear = result.rows[result.rows.length - 1];
  const cumulative = lastYear.cumulativeNet;
  const finalValue = lastYear.totalValue;
  const thresholdYear = result.thresholdEnteredYear;

  const items = [
    {
      label: `${lastYear.year}년 누적 세후 배당`,
      value: formatManwonDetail(cumulative),
    },
    {
      label: `${lastYear.year}년 뒤 총 평가액`,
      value: formatManwonDetail(finalValue),
    },
    {
      label: '종합과세 진입 시점',
      value:
        thresholdYear === null
          ? '진입하지 않음'
          : `${thresholdYear}년차 (${startAge + thresholdYear}세)`,
      accent: thresholdYear !== null ? 'var(--color-warning)' : undefined,
    },
  ];

  return (
    <div className="grid sm:grid-cols-3 gap-3">
      {items.map((item) => (
        <div key={item.label} className="card">
          <div className="text-xs muted mb-1">{item.label}</div>
          <div
            className="text-lg md:text-xl font-bold tabular-nums"
            style={{ color: item.accent }}
          >
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}
