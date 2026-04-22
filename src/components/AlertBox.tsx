import type { SimulationResult } from '../types';
import { formatMonthly } from '../utils/format';

interface AlertBoxProps {
  result: SimulationResult;
  monthlyExpense: number;
}

export function AlertBox({ result, monthlyExpense }: AlertBoxProps) {
  const firstYear = result.rows[0];
  const diff = firstYear.monthlyIncome - monthlyExpense;
  const isSufficient = diff >= 0;

  const color = isSufficient ? 'var(--color-success)' : 'var(--color-danger)';
  const tint = isSufficient
    ? 'color-mix(in srgb, var(--color-success) 12%, transparent)'
    : 'color-mix(in srgb, var(--color-danger) 12%, transparent)';
  const message = isSufficient
    ? `생활비 ${monthlyExpense}만원 대비 월 ${formatMonthly(Math.abs(diff))} 여유가 있습니다.`
    : `생활비 ${monthlyExpense}만원 대비 월 ${formatMonthly(Math.abs(diff))} 부족합니다.`;

  return (
    <div
      className="rounded-xl px-4 py-3 flex items-center gap-3 border"
      style={{ backgroundColor: tint, borderColor: color, color }}
    >
      <span className="text-xl leading-none">{isSufficient ? '✓' : '⚠'}</span>
      <span className="text-sm font-semibold">{message}</span>
    </div>
  );
}
