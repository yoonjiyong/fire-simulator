import type { SimulationResult } from '../types';
import { formatManwonDetail, formatMonthly } from '../utils/format';

interface SummaryCardsProps {
  result: SimulationResult;
}

export function SummaryCards({ result }: SummaryCardsProps) {
  const firstYear = result.rows[0];
  const lastYear = result.rows[result.rows.length - 1];

  const items = [
    {
      label: 'SCHD 투자액',
      value: formatManwonDetail(result.schdInitial),
      accent: 'var(--color-schd)',
    },
    {
      label: 'JEPI 투자액',
      value: formatManwonDetail(result.jepiInitial),
      accent: 'var(--color-jepi)',
    },
    {
      label: '1년차 세후 월',
      value: formatMonthly(firstYear.monthlyIncome),
      sub: `실질 ${formatMonthly(firstYear.realMonthlyIncome)}`,
    },
    {
      label: `${lastYear.year}년차 세후 월`,
      value: formatMonthly(lastYear.monthlyIncome),
      sub: `실질 ${formatMonthly(lastYear.realMonthlyIncome)}`,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((item) => (
        <div key={item.label} className="card">
          <div className="text-xs muted mb-1">{item.label}</div>
          <div className="text-xl md:text-2xl font-bold tabular-nums" style={{ color: item.accent }}>
            {item.value}
          </div>
          {item.sub && <div className="text-xs muted mt-0.5 tabular-nums">{item.sub}</div>}
        </div>
      ))}
    </div>
  );
}
