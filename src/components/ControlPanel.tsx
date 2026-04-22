import type { SimulationState } from '../hooks/useSimulation';
import type { AccountType } from '../types';
import { ACCOUNT_RULES, LIMITS } from '../utils/constants';
import { formatManwonDetail, formatPercent } from '../utils/format';
import { Slider } from './Slider';

interface ControlPanelProps {
  state: SimulationState;
}

export function ControlPanel({ state }: ControlPanelProps) {
  const jepiRatio = 100 - state.schdRatio;
  const accountOptions = Object.values(ACCOUNT_RULES);

  return (
    <div className="card-lg space-y-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-bold">시뮬레이션 설정</h2>
        <span className="text-xs muted">슬라이더 조작 시 실시간 반영</span>
      </div>

      <div className="grid md:grid-cols-2 gap-x-6 gap-y-5">
        <Slider
          label={`SCHD 비율 / JEPI ${jepiRatio}%`}
          value={state.schdRatio}
          min={LIMITS.SCHD_RATIO.min}
          max={LIMITS.SCHD_RATIO.max}
          step={LIMITS.SCHD_RATIO.step}
          onChange={state.setSchdRatio}
          formatValue={(v) => `${v}%`}
          accent="var(--color-schd)"
        />
        <Slider
          label="총 투자금"
          value={state.totalInvestment}
          min={LIMITS.TOTAL_INVESTMENT.min}
          max={LIMITS.TOTAL_INVESTMENT.max}
          step={LIMITS.TOTAL_INVESTMENT.step}
          onChange={state.setTotalInvestment}
          formatValue={formatManwonDetail}
        />
        <Slider
          label="SCHD 연 주가 성장률"
          value={state.schdGrowthRate}
          min={LIMITS.SCHD_GROWTH_RATE.min}
          max={LIMITS.SCHD_GROWTH_RATE.max}
          step={LIMITS.SCHD_GROWTH_RATE.step}
          onChange={state.setSchdGrowthRate}
          formatValue={(v) => formatPercent(v, 1)}
          accent="var(--color-schd)"
          hint="JEPI 0% 고정"
        />
        <Slider
          label="연 인플레이션"
          value={state.inflationRate}
          min={LIMITS.INFLATION_RATE.min}
          max={LIMITS.INFLATION_RATE.max}
          step={LIMITS.INFLATION_RATE.step}
          onChange={state.setInflationRate}
          formatValue={(v) => formatPercent(v, 1)}
        />
        <Slider
          label="월 생활비 (현재 기준)"
          value={state.monthlyExpense}
          min={LIMITS.MONTHLY_EXPENSE.min}
          max={LIMITS.MONTHLY_EXPENSE.max}
          step={LIMITS.MONTHLY_EXPENSE.step}
          onChange={state.setMonthlyExpense}
          formatValue={(v) => `${v}만원`}
        />
        <Slider
          label="시작 나이"
          value={state.startAge}
          min={LIMITS.START_AGE.min}
          max={LIMITS.START_AGE.max}
          step={LIMITS.START_AGE.step}
          onChange={state.setStartAge}
          formatValue={(v) => `${v}세`}
        />
      </div>

      <div className="border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
        <div className="grid md:grid-cols-2 gap-x-6 gap-y-5">
          <div>
            <div className="text-sm font-semibold mb-2">계좌 유형 (세제 적용)</div>
            <div className="flex flex-wrap gap-2">
              {accountOptions.map((opt) => {
                const selected = state.accountType === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => state.setAccountType(opt.key as AccountType)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border"
                    style={{
                      borderColor: selected ? 'var(--color-schd)' : 'var(--color-border)',
                      color: selected ? 'var(--color-schd)' : 'var(--color-text-secondary)',
                      backgroundColor: selected ? 'color-mix(in srgb, var(--color-schd) 10%, transparent)' : 'transparent',
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs muted mt-2">
              {ACCOUNT_RULES[state.accountType].description}
            </p>
          </div>

          <Slider
            label="환율 충격 시나리오"
            value={state.exchangeRateShock}
            min={LIMITS.EXCHANGE_RATE_SHOCK.min}
            max={LIMITS.EXCHANGE_RATE_SHOCK.max}
            step={LIMITS.EXCHANGE_RATE_SHOCK.step}
            onChange={state.setExchangeRateShock}
            formatValue={(v) => `${v > 0 ? '+' : ''}${(v * 100).toFixed(0)}%`}
            hint="원/달러 변동 환산 영향"
          />
        </div>
      </div>
    </div>
  );
}
