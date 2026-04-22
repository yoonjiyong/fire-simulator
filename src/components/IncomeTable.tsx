import type { SimulationResult } from '../types';
import { formatManwonDetail, formatMonthly } from '../utils/format';

interface IncomeTableProps {
  result: SimulationResult;
  monthlyExpense: number;
  inflationRate: number;
}

export function IncomeTable({ result, monthlyExpense, inflationRate }: IncomeTableProps) {
  return (
    <div className="card-lg">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-base font-bold">연간 상세 내역</h2>
        <span className="text-xs muted">
          생활비 미달 = 빨강 · 금융소득 2,000만원 초과 = 종합과세 배지
        </span>
      </div>
      <div className="overflow-x-auto max-h-[480px] rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
        <table className="w-full text-sm">
          <thead
            className="sticky top-0 z-10 text-xs uppercase tracking-wider"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              color: 'var(--color-text-secondary)',
            }}
          >
            <tr>
              <th className="px-3 py-2 text-left">연차</th>
              <th className="px-3 py-2 text-left">나이</th>
              <th className="px-3 py-2 text-right">총 평가액</th>
              <th className="px-3 py-2 text-right">세전 배당</th>
              <th className="px-3 py-2 text-right">세금</th>
              <th className="px-3 py-2 text-right">세후 월</th>
              <th className="px-3 py-2 text-right">실질 월</th>
              <th className="px-3 py-2 text-right">필요 생활비</th>
              <th className="px-3 py-2 text-left">상태</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row) => {
              const needed = monthlyExpense * Math.pow(1 + inflationRate, row.year);
              const insufficient = row.monthlyIncome < needed;
              return (
                <tr
                  key={row.year}
                  className="border-t"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <td className="px-3 py-2">{row.year}</td>
                  <td className="px-3 py-2">{row.age}세</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatManwonDetail(row.totalValue)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatMonthly(row.grossDividend)}</td>
                  <td className="px-3 py-2 text-right tabular-nums muted">{formatMonthly(row.tax)}</td>
                  <td
                    className="px-3 py-2 text-right tabular-nums font-semibold"
                    style={{ color: insufficient ? 'var(--color-danger)' : undefined }}
                  >
                    {formatMonthly(row.monthlyIncome)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums muted">{formatMonthly(row.realMonthlyIncome)}</td>
                  <td className="px-3 py-2 text-right tabular-nums muted">{formatMonthly(needed)}</td>
                  <td className="px-3 py-2">
                    {row.isOverThreshold && (
                      <span
                        className="chip"
                        style={{
                          backgroundColor: 'color-mix(in srgb, var(--color-warning) 18%, transparent)',
                          color: 'var(--color-warning)',
                        }}
                      >
                        종합과세
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
