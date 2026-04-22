import type { SimulationState } from '../hooks/useSimulation';
import { LIMITS } from '../utils/constants';
import { formatManwonDetail, formatMonthly, formatPercent } from '../utils/format';
import { Slider } from './Slider';

interface StrategyCompareProps {
  state: SimulationState;
}

export function StrategyCompare({ state }: StrategyCompareProps) {
  const { compareEnabled, setCompareEnabled, strategyB, setStrategyB, result, resultB } = state;

  return (
    <div className="card-lg space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold">전략 비교 모드</h2>
          <p className="text-xs muted">현재 설정(전략 A)과 비교할 SCHD 비율/성장률 설정</p>
        </div>
        <button
          type="button"
          onClick={() => setCompareEnabled(!compareEnabled)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
          style={{
            borderColor: compareEnabled ? 'var(--color-jepi)' : 'var(--color-border)',
            color: compareEnabled ? 'var(--color-jepi)' : 'var(--color-text-secondary)',
            backgroundColor: compareEnabled
              ? 'color-mix(in srgb, var(--color-jepi) 10%, transparent)'
              : 'transparent',
          }}
        >
          {compareEnabled ? '비교 ON' : '비교 OFF'}
        </button>
      </div>

      {compareEnabled && (
        <>
          <div className="grid md:grid-cols-2 gap-x-6 gap-y-5">
            <Slider
              label="전략 B · SCHD 비율"
              value={strategyB.schdRatio}
              min={LIMITS.SCHD_RATIO.min}
              max={LIMITS.SCHD_RATIO.max}
              step={LIMITS.SCHD_RATIO.step}
              onChange={(v) => setStrategyB({ ...strategyB, schdRatio: v })}
              formatValue={(v) => `${v}%`}
              accent="var(--color-jepi)"
            />
            <Slider
              label="전략 B · SCHD 성장률"
              value={strategyB.schdGrowthRate}
              min={LIMITS.SCHD_GROWTH_RATE.min}
              max={LIMITS.SCHD_GROWTH_RATE.max}
              step={LIMITS.SCHD_GROWTH_RATE.step}
              onChange={(v) => setStrategyB({ ...strategyB, schdGrowthRate: v })}
              formatValue={(v) => formatPercent(v, 1)}
              accent="var(--color-jepi)"
            />
          </div>

          {resultB && (
            <div className="grid sm:grid-cols-3 gap-3 pt-2">
              <CompareItem
                label="30년차 세후 월 격차"
                valueA={formatMonthly(result.rows[result.rows.length - 1].monthlyIncome)}
                valueB={formatMonthly(resultB.rows[resultB.rows.length - 1].monthlyIncome)}
              />
              <CompareItem
                label="30년 누적 배당 격차"
                valueA={formatManwonDetail(result.rows[result.rows.length - 1].cumulativeNet)}
                valueB={formatManwonDetail(resultB.rows[resultB.rows.length - 1].cumulativeNet)}
              />
              <CompareItem
                label="30년 뒤 총 평가액 격차"
                valueA={formatManwonDetail(result.rows[result.rows.length - 1].totalValue)}
                valueB={formatManwonDetail(resultB.rows[resultB.rows.length - 1].totalValue)}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CompareItem({ label, valueA, valueB }: { label: string; valueA: string; valueB: string }) {
  return (
    <div className="card">
      <div className="text-xs muted mb-2">{label}</div>
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-[10px] muted">전략 A</div>
          <div className="text-sm font-bold tabular-nums" style={{ color: 'var(--color-schd)' }}>
            {valueA}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] muted">전략 B</div>
          <div className="text-sm font-bold tabular-nums" style={{ color: 'var(--color-jepi)' }}>
            {valueB}
          </div>
        </div>
      </div>
    </div>
  );
}
