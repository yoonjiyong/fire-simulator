import { useEffect, useMemo, useState } from 'react';
import type { ThemeMode } from '../hooks/useTheme';
import type { AccountType } from '../types';
import type { EtfSelection } from '../types/dividend';
import { ACCOUNT_RULES, DEFAULTS, LIMITS } from '../utils/constants';
import { DIVIDEND_ETFS } from '../utils/dividendEtfs';
import { formatManwonDetail, formatMonthly, formatPercent } from '../utils/format';
import { simulateDividend } from '../utils/simulateDividend';
import { AlertBox } from './AlertBox';
import { BottomSummary } from './BottomSummary';
import { FxInsight } from './FxInsight';
import { IncomeChart } from './IncomeChart';
import { IncomeTable } from './IncomeTable';
import { Slider } from './Slider';

interface DividendCalculatorProps {
  theme: ThemeMode;
}

const DEFAULT_RATIOS: Record<string, number> = { SCHD: 50, DGRO: 30, JEPQ: 10, JEPI: 10 };

function buildDefaultSelections(): EtfSelection[] {
  return DIVIDEND_ETFS.map((etf) => ({
    ticker: etf.ticker,
    enabled: etf.ticker in DEFAULT_RATIOS,
    ratio: DEFAULT_RATIOS[etf.ticker] ?? 0,
    yieldRate: etf.defaultYield,
    growthRate: etf.defaultGrowthRate,
  }));
}

export function DividendCalculator({ theme }: DividendCalculatorProps) {
  const [totalInvestment, setTotalInvestment] = useState<number>(DEFAULTS.TOTAL_INVESTMENT);
  const [inflationRate, setInflationRate] = useState<number>(DEFAULTS.INFLATION_RATE);
  const [monthlyExpense, setMonthlyExpense] = useState<number>(DEFAULTS.MONTHLY_EXPENSE);
  const [startAge, setStartAge] = useState<number>(DEFAULTS.START_AGE);
  const [accountType, setAccountType] = useState<AccountType>('general');
  const [exchangeRateShock, setExchangeRateShock] = useState<number>(DEFAULTS.EXCHANGE_RATE_SHOCK);
  const [selections, setSelections] = useState<EtfSelection[]>(buildDefaultSelections);

  const toggleSelection = (ticker: string) => {
    setSelections((prev) =>
      prev.map((s) => (s.ticker === ticker ? { ...s, enabled: !s.enabled } : s)),
    );
  };

  const updateSelection = (ticker: string, field: 'ratio' | 'yieldRate' | 'growthRate', value: number) => {
    setSelections((prev) => prev.map((s) => (s.ticker === ticker ? { ...s, [field]: value } : s)));
  };

  const activeSelections = selections.filter((s) => s.enabled);
  const totalRatio = activeSelections.reduce((sum, s) => sum + s.ratio, 0);
  const remainingRatio = 100 - totalRatio;
  const isOverBudget = remainingRatio < 0;

  const result = useMemo(
    () =>
      simulateDividend({
        totalInvestment,
        selections,
        inflationRate,
        monthlyExpense,
        startAge,
        years: DEFAULTS.SIMULATION_YEARS,
        accountType,
        exchangeRateShock,
      }),
    [totalInvestment, selections, inflationRate, monthlyExpense, startAge, accountType, exchangeRateShock],
  );

  const firstYear = result.rows[0];
  const lastYear = result.rows[result.rows.length - 1];

  const usEtfs = DIVIDEND_ETFS.filter((e) => e.region === 'US');
  const krEtfs = DIVIDEND_ETFS.filter((e) => e.region === 'KR');

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">배당금 계산기</h1>
        <p className="text-sm muted">
          인기 배당 ETF를 골라 비중을 정하면 세후 월 배당 수입과 실질 구매력을 30년간 시뮬레이션합니다.
          {' · '}
          현재 계좌: <span style={{ color: 'var(--color-schd)' }}>{ACCOUNT_RULES[accountType].label}</span>
        </p>
      </header>

      {/* 결과 하이라이트 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <ResultCard label="총 투자금" value={formatManwonDetail(totalInvestment)} />
        <ResultCard label="선택 ETF" value={`${activeSelections.length}개`} accent="var(--color-schd)" />
        <ResultCard
          label="총 비중"
          value={`${totalRatio.toFixed(0)}%`}
          accent={isOverBudget ? 'var(--color-danger)' : totalRatio === 100 ? 'var(--color-success)' : 'var(--color-warning)'}
        />
        <ResultCard
          label="1년차 세후 월"
          value={formatMonthly(firstYear?.monthlyIncome ?? 0)}
          sub={firstYear ? `실질 ${formatMonthly(firstYear.realMonthlyIncome)}` : undefined}
        />
        <ResultCard
          label={`${lastYear?.year ?? DEFAULTS.SIMULATION_YEARS}년차 세후 월`}
          value={formatMonthly(lastYear?.monthlyIncome ?? 0)}
          sub={lastYear ? `실질 ${formatMonthly(lastYear.realMonthlyIncome)}` : undefined}
        />
      </div>

      {/* 기본 설정 */}
      <div className="card-lg space-y-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-bold">기본 설정</h2>
          <span className="text-xs muted">슬라이더 조작 시 실시간 반영</span>
        </div>
        <div className="grid md:grid-cols-2 gap-x-6 gap-y-5">
          <Slider
            label="총 투자금"
            value={totalInvestment}
            min={LIMITS.TOTAL_INVESTMENT.min}
            max={LIMITS.TOTAL_INVESTMENT.max}
            step={LIMITS.TOTAL_INVESTMENT.step}
            onChange={setTotalInvestment}
            formatValue={formatManwonDetail}
          />
          <Slider
            label="연 인플레이션"
            value={inflationRate}
            min={LIMITS.INFLATION_RATE.min}
            max={LIMITS.INFLATION_RATE.max}
            step={LIMITS.INFLATION_RATE.step}
            onChange={setInflationRate}
            formatValue={(v) => formatPercent(v, 1)}
          />
          <Slider
            label="월 생활비 (현재 기준)"
            value={monthlyExpense}
            min={LIMITS.MONTHLY_EXPENSE.min}
            max={LIMITS.MONTHLY_EXPENSE.max}
            step={LIMITS.MONTHLY_EXPENSE.step}
            onChange={setMonthlyExpense}
            formatValue={(v) => `${v}만원`}
          />
          <Slider
            label="시작 나이"
            value={startAge}
            min={LIMITS.START_AGE.min}
            max={LIMITS.START_AGE.max}
            step={LIMITS.START_AGE.step}
            onChange={setStartAge}
            formatValue={(v) => `${v}세`}
          />
        </div>

        <div className="border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
          <div className="grid md:grid-cols-2 gap-x-6 gap-y-5">
            <div>
              <div className="text-sm font-semibold mb-2">계좌 유형 (세제 적용)</div>
              <div className="flex flex-wrap gap-2">
                {Object.values(ACCOUNT_RULES).map((opt) => {
                  const selected = accountType === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setAccountType(opt.key)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border"
                      style={{
                        borderColor: selected ? 'var(--color-schd)' : 'var(--color-border)',
                        color: selected ? 'var(--color-schd)' : 'var(--color-text-secondary)',
                        backgroundColor: selected
                          ? 'color-mix(in srgb, var(--color-schd) 10%, transparent)'
                          : 'transparent',
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs muted mt-2">{ACCOUNT_RULES[accountType].description}</p>
            </div>

            <Slider
              label="환율 충격 시나리오"
              value={exchangeRateShock}
              min={LIMITS.EXCHANGE_RATE_SHOCK.min}
              max={LIMITS.EXCHANGE_RATE_SHOCK.max}
              step={LIMITS.EXCHANGE_RATE_SHOCK.step}
              onChange={setExchangeRateShock}
              formatValue={(v) => `${v > 0 ? '+' : ''}${(v * 100).toFixed(0)}%`}
              hint="원/달러 변동 환산 영향"
            />
          </div>
        </div>
      </div>

      {/* ETF 선택 */}
      <div className="card-lg space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">배당 ETF 선택</h2>
          <span className="text-xs muted">배당수익률·성장률은 검색 기준 근사값 · 직접 수정 가능</span>
        </div>

        <div
          className="rounded-lg px-3 py-2 text-xs flex items-center justify-between"
          style={{
            backgroundColor: isOverBudget
              ? 'color-mix(in srgb, var(--color-danger) 10%, transparent)'
              : 'var(--color-bg-secondary)',
            color: isOverBudget ? 'var(--color-danger)' : 'var(--color-text-secondary)',
          }}
        >
          <span>총 비중 {totalRatio.toFixed(0)}% / 100%</span>
          <span className="font-semibold">
            {isOverBudget ? `${Math.abs(remainingRatio).toFixed(0)}% 초과` : `잔여 ${remainingRatio.toFixed(0)}%`}
          </span>
        </div>

        <EtfGroup title="🇺🇸 미국 상장 ETF" etfs={usEtfs} selections={selections} onToggle={toggleSelection} onUpdate={updateSelection} />
        <EtfGroup title="🇰🇷 국내 상장 ETF" etfs={krEtfs} selections={selections} onToggle={toggleSelection} onUpdate={updateSelection} />
      </div>

      <AlertBox result={result} monthlyExpense={monthlyExpense} />

      <FxInsight result={result} shock={exchangeRateShock} />

      <IncomeChart result={result} theme={theme} />

      <IncomeTable result={result} monthlyExpense={monthlyExpense} inflationRate={inflationRate} />

      <BottomSummary result={result} startAge={startAge} />
    </div>
  );
}

function ResultCard({
  label,
  value,
  accent,
  sub,
}: {
  label: string;
  value: string;
  accent?: string;
  sub?: string;
}) {
  return (
    <div className="card">
      <div className="text-xs muted mb-1">{label}</div>
      <div className="text-xl md:text-2xl font-bold tabular-nums" style={{ color: accent }}>
        {value}
      </div>
      {sub && <div className="text-xs muted mt-0.5 tabular-nums">{sub}</div>}
    </div>
  );
}

function EtfGroup({
  title,
  etfs,
  selections,
  onToggle,
  onUpdate,
}: {
  title: string;
  etfs: typeof DIVIDEND_ETFS;
  selections: EtfSelection[];
  onToggle: (ticker: string) => void;
  onUpdate: (ticker: string, field: 'ratio' | 'yieldRate' | 'growthRate', value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold">{title}</div>
      <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
        <table className="w-full text-sm">
          <thead
            className="text-xs uppercase tracking-wider"
            style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)' }}
          >
            <tr>
              <th className="px-3 py-2 text-left w-10"></th>
              <th className="px-3 py-2 text-left whitespace-nowrap">ETF</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">구분</th>
              <th className="px-3 py-2 text-right whitespace-nowrap">배당수익률</th>
              <th className="px-3 py-2 text-right whitespace-nowrap">성장률</th>
              <th className="px-3 py-2 text-right whitespace-nowrap">비중</th>
            </tr>
          </thead>
          <tbody>
            {etfs.map((etf) => {
              const s = selections.find((sel) => sel.ticker === etf.ticker)!;
              return (
                <tr key={etf.ticker} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={s.enabled}
                      onChange={() => onToggle(etf.ticker)}
                      aria-label={`${etf.ticker} 선택`}
                    />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className="font-semibold" style={{ color: s.enabled ? etf.accent : undefined }}>
                      {etf.ticker}
                    </span>
                    <div className="text-xs muted">{etf.name}</div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span
                      className="chip"
                      style={{
                        backgroundColor: 'color-mix(in srgb, var(--color-schd) 10%, transparent)',
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      {etf.category}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <InlinePercentInput
                      value={s.yieldRate}
                      disabled={!s.enabled}
                      onChange={(v) => onUpdate(etf.ticker, 'yieldRate', v)}
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <InlinePercentInput
                      value={s.growthRate}
                      disabled={!s.enabled}
                      onChange={(v) => onUpdate(etf.ticker, 'growthRate', v)}
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <InlineRatioInput
                      value={s.ratio}
                      disabled={!s.enabled}
                      onChange={(v) => onUpdate(etf.ticker, 'ratio', v)}
                    />
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

function InlinePercentInput({
  value,
  disabled,
  onChange,
}: {
  value: number;
  disabled?: boolean;
  onChange: (v: number) => void;
}) {
  const display = Math.round(value * 1000) / 10;
  const [text, setText] = useState(String(display));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(String(display));
  }, [display, focused]);

  const commit = () => {
    setFocused(false);
    const parsed = Number(text);
    const committed = Math.max(0, Number.isFinite(parsed) ? parsed : display);
    setText(String(committed));
    onChange(committed / 100);
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={text}
      disabled={disabled}
      onFocus={() => setFocused(true)}
      onChange={(e) => {
        setText(e.target.value);
        const parsed = Number(e.target.value);
        if (Number.isFinite(parsed)) onChange(parsed / 100);
      }}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      className="w-20 px-2 py-1 rounded-md border tabular-nums text-right text-sm disabled:opacity-40"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
        color: 'var(--color-text)',
      }}
    />
  );
}

function InlineRatioInput({
  value,
  disabled,
  onChange,
}: {
  value: number;
  disabled?: boolean;
  onChange: (v: number) => void;
}) {
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(String(value));
  }, [value, focused]);

  const commit = () => {
    setFocused(false);
    const parsed = Number(text);
    const committed = Math.min(100, Math.max(0, Number.isFinite(parsed) ? parsed : value));
    setText(String(committed));
    onChange(committed);
  };

  return (
    <span className="inline-flex items-center gap-1 justify-end">
      <input
        type="text"
        inputMode="decimal"
        value={text}
        disabled={disabled}
        onFocus={() => setFocused(true)}
        onChange={(e) => {
          setText(e.target.value);
          const parsed = Number(e.target.value);
          if (Number.isFinite(parsed)) onChange(parsed);
        }}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        className="w-16 px-2 py-1 rounded-md border tabular-nums text-right text-sm disabled:opacity-40"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
          color: 'var(--color-text)',
        }}
      />
      <span className="text-xs muted">%</span>
    </span>
  );
}
