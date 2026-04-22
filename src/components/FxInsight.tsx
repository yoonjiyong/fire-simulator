import type { SimulationResult } from '../types';
import { formatMonthly, formatPercent } from '../utils/format';

interface FxInsightProps {
  result: SimulationResult;
  shock: number;
}

export function FxInsight({ result, shock }: FxInsightProps) {
  if (shock === 0) return null;

  const first = result.rows[0];
  const last = result.rows[result.rows.length - 1];
  const color = shock > 0 ? 'var(--color-success)' : 'var(--color-danger)';

  return (
    <div
      className="rounded-xl px-4 py-3 flex items-center justify-between border text-sm"
      style={{
        borderColor: color,
        color,
        backgroundColor: 'color-mix(in srgb, currentColor 10%, transparent)',
      }}
    >
      <span className="font-semibold">
        원/달러 환율 {shock > 0 ? '+' : ''}{formatPercent(Math.abs(shock), 0)} 시나리오 환산
      </span>
      <span className="tabular-nums text-xs md:text-sm">
        1년차 {formatMonthly(first.fxAdjustedMonthly)} · 30년차 {formatMonthly(last.fxAdjustedMonthly)}
      </span>
    </div>
  );
}
