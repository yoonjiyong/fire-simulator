import { useMemo, useRef, useState } from 'react';
import type { LadderEntryInput, PositionSide } from '../types/coin';
import { DEFAULT_PNL_CHANGES, buildLadder, buildPnlTable } from '../utils/coinLeverage';
import { formatKRW, formatSignedPercent, formatUSD } from '../utils/format';

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export function CoinLeverageCalculator() {
  const [totalCapital, setTotalCapital] = useState(20000);
  const [leverage, setLeverage] = useState(10);
  const [side, setSide] = useState<PositionSide>('long');
  const [maintenanceMarginPct, setMaintenanceMarginPct] = useState(0.5);
  const [exchangeRate, setExchangeRate] = useState(1500);

  const [initialPrice, setInitialPrice] = useState(100);
  const [initialRatio, setInitialRatio] = useState(20);

  const [extraEntries, setExtraEntries] = useState<LadderEntryInput[]>([]);
  const idCounter = useRef(1);

  const entries = useMemo<LadderEntryInput[]>(
    () => [{ id: 'initial', price: initialPrice, ratio: clamp(initialRatio, 1, 40) }, ...extraEntries],
    [initialPrice, initialRatio, extraEntries],
  );

  const ladder = useMemo(
    () =>
      buildLadder({
        totalCapital,
        leverage,
        side,
        maintenanceMarginRate: maintenanceMarginPct / 100,
        entries,
      }),
    [totalCapital, leverage, side, maintenanceMarginPct, entries],
  );

  const current = ladder[ladder.length - 1] ?? {
    avgPrice: 0,
    liqPrice: 0,
    cumMargin: 0,
    cumQty: 0,
  };

  const totalRatioUsed = entries.reduce((sum, e) => sum + e.ratio, 0);
  const remainingRatio = 100 - totalRatioUsed;
  const isOverBudget = remainingRatio < 0;

  const liqDistance =
    current.avgPrice > 0
      ? side === 'long'
        ? (current.avgPrice - current.liqPrice) / current.avgPrice
        : (current.liqPrice - current.avgPrice) / current.avgPrice
      : 0;

  const pnlRows = useMemo(
    () => buildPnlTable(current.avgPrice, current.cumQty, current.cumMargin, side, DEFAULT_PNL_CHANGES),
    [current.avgPrice, current.cumQty, current.cumMargin, side],
  );

  const addEntry = () => {
    const lastPrice = entries[entries.length - 1]?.price ?? initialPrice;
    const step = side === 'long' ? 0.95 : 1.05;
    idCounter.current += 1;
    setExtraEntries((prev) => [
      ...prev,
      {
        id: `entry-${idCounter.current}`,
        price: Math.round(lastPrice * step * 100) / 100,
        ratio: Math.max(1, Math.min(5, remainingRatio)),
      },
    ]);
  };

  const updateEntry = (id: string, field: 'price' | 'ratio', value: number) => {
    setExtraEntries((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  };

  const removeEntry = (id: string) => {
    setExtraEntries((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">코인 레버리지 · 물타기 계산기</h1>
        <p className="text-sm muted">
          총 자금·레버리지·진입 비율을 입력하면 단계별 평단가와 청산가, 구간별 손익을 계산합니다.
        </p>
      </header>

      {/* 결과 하이라이트 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <ResultCard label="평단가" value={formatUSD(current.avgPrice)} />
        <ResultCard
          label="청산가"
          value={formatUSD(current.liqPrice)}
          accent="var(--color-danger)"
          highlight
        />
        <ResultCard
          label="청산까지 여유"
          value={current.avgPrice > 0 ? formatSignedPercent(liqDistance) : '—'}
          accent={liqDistance < 0.1 ? 'var(--color-danger)' : 'var(--color-warning)'}
        />
        <ResultCard label="총 투입 증거금" value={formatUSD(current.cumMargin)} />
        <ResultCard
          label="포지션 가치"
          value={formatUSD(current.cumMargin * leverage)}
          accent="var(--color-schd)"
        />
      </div>

      {/* 기본 설정 */}
      <div className="card-lg space-y-5">
        <h2 className="text-base font-bold">기본 설정</h2>
        <div className="grid md:grid-cols-2 gap-x-6 gap-y-5">
          <NumberInput
            label="총 자금 (USD)"
            value={totalCapital}
            onChange={(n) => setTotalCapital(Math.max(0, n))}
            min={0}
            step={100}
            hint={formatKRW(totalCapital * exchangeRate)}
          />
          <NumberInput
            label="레버리지 (1~100배)"
            value={leverage}
            onChange={(n) => setLeverage(clamp(Math.round(n), 1, 100))}
            min={1}
            max={100}
            step={1}
            hint={`${leverage}x`}
          />
          <NumberInput
            label="유지증거금률 (%)"
            value={maintenanceMarginPct}
            onChange={(n) => setMaintenanceMarginPct(clamp(n, 0, 10))}
            min={0}
            max={10}
            step={0.1}
            hint="거래소·종목별로 상이 (기본 0.5%)"
          />
          <NumberInput
            label="환율 (KRW/USD)"
            value={exchangeRate}
            onChange={(n) => setExchangeRate(Math.max(0, n))}
            min={0}
            step={10}
          />
        </div>

        <div>
          <div className="text-sm font-semibold mb-2">포지션 방향</div>
          <div className="flex gap-2">
            {(['long', 'short'] as PositionSide[]).map((s) => {
              const selected = side === s;
              const label = s === 'long' ? '롱 (상승 베팅)' : '숏 (하락 베팅)';
              const accent = s === 'long' ? 'var(--color-success)' : 'var(--color-danger)';
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSide(s)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border"
                  style={{
                    borderColor: selected ? accent : 'var(--color-border)',
                    color: selected ? accent : 'var(--color-text-secondary)',
                    backgroundColor: selected ? `color-mix(in srgb, ${accent} 10%, transparent)` : 'transparent',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 첫 진입 */}
      <div className="card-lg space-y-5">
        <h2 className="text-base font-bold">최초 진입</h2>
        <div className="grid md:grid-cols-2 gap-x-6 gap-y-5">
          <NumberInput
            label="진입가 (USD)"
            value={initialPrice}
            onChange={(n) => setInitialPrice(Math.max(0, n))}
            min={0}
            step={0.01}
          />
          <NumberInput
            label="처음 들어가는 비율 (1~40%)"
            value={initialRatio}
            onChange={(n) => setInitialRatio(clamp(n, 1, 40))}
            min={1}
            max={40}
            step={1}
            hint={formatUSD((totalCapital * clamp(initialRatio, 1, 40)) / 100)}
          />
        </div>
      </div>

      {/* 물타기 사다리 */}
      <div className="card-lg space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">물타기 단계</h2>
          <button
            type="button"
            onClick={addEntry}
            disabled={remainingRatio <= 0}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              borderColor: 'var(--color-schd)',
              color: 'var(--color-schd)',
              backgroundColor: 'color-mix(in srgb, var(--color-schd) 8%, transparent)',
            }}
          >
            + 단계 추가
          </button>
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
          <span>총 투입 비율 {totalRatioUsed.toFixed(1)}% / 100%</span>
          <span className="font-semibold">
            {isOverBudget ? `${Math.abs(remainingRatio).toFixed(1)}% 초과` : `잔여 ${remainingRatio.toFixed(1)}%`}
          </span>
        </div>

        <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
          <table className="w-full text-sm">
            <thead
              className="text-xs uppercase tracking-wider"
              style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)' }}
            >
              <tr>
                <th className="px-3 py-2 text-left">단계</th>
                <th className="px-3 py-2 text-right">진입가</th>
                <th className="px-3 py-2 text-right">최초가 대비</th>
                <th className="px-3 py-2 text-right">투입 비율</th>
                <th className="px-3 py-2 text-right">투입 증거금</th>
                <th className="px-3 py-2 text-right">누적 평단가</th>
                <th className="px-3 py-2 text-right">누적 청산가</th>
                <th className="px-3 py-2 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {ladder.map((row, idx) => {
                const isInitial = idx === 0;
                return (
                  <tr key={row.id} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                    <td className="px-3 py-2 font-semibold">{isInitial ? '최초' : `물타기 ${idx}`}</td>
                    <td className="px-3 py-2 text-right">
                      {isInitial ? (
                        <span className="tabular-nums">{formatUSD(row.price)}</span>
                      ) : (
                        <InlineNumberInput
                          value={row.price}
                          min={0}
                          step={0.01}
                          onChange={(n) => updateEntry(row.id, 'price', Math.max(0, n))}
                        />
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums muted">
                      {isInitial ? '—' : formatSignedPercent(row.changeFromFirst)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {isInitial ? (
                        <span className="tabular-nums">{row.ratio.toFixed(1)}%</span>
                      ) : (
                        <InlineNumberInput
                          value={row.ratio}
                          min={0}
                          max={100}
                          step={0.5}
                          suffix="%"
                          onChange={(n) => updateEntry(row.id, 'ratio', clamp(n, 0, 100))}
                        />
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums muted">{formatUSD(row.margin)}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold">
                      {formatUSD(row.avgPrice)}
                    </td>
                    <td
                      className="px-3 py-2 text-right tabular-nums font-semibold"
                      style={{ color: 'var(--color-danger)' }}
                    >
                      {formatUSD(row.liqPrice)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {!isInitial && (
                        <button
                          type="button"
                          onClick={() => removeEntry(row.id)}
                          className="text-xs muted hover:opacity-70"
                          aria-label="단계 삭제"
                        >
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 수익률 테이블 */}
      <div className="card-lg">
        <h2 className="text-base font-bold mb-1">평단가 기준 손익 시뮬레이션</h2>
        <p className="text-xs muted mb-3">
          현재까지 물타기 반영 평단가 {formatUSD(current.avgPrice)} 기준, 가격 변동률별 손익 (수수료·펀딩비 미반영)
        </p>
        <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
          <table className="w-full text-sm">
            <thead
              className="text-xs uppercase tracking-wider"
              style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)' }}
            >
              <tr>
                <th className="px-3 py-2 text-left">가격 변동률</th>
                <th className="px-3 py-2 text-right">가격</th>
                <th className="px-3 py-2 text-right">손익 (USD)</th>
                <th className="px-3 py-2 text-right">손익 (KRW)</th>
                <th className="px-3 py-2 text-right">ROE</th>
              </tr>
            </thead>
            <tbody>
              {pnlRows.map((row) => {
                const isZero = row.changePct === 0;
                const isPositive = row.pnl > 0;
                const isNegative = row.pnl < 0;
                const priceBelowLiq =
                  side === 'long' ? row.price <= current.liqPrice : row.price >= current.liqPrice;
                return (
                  <tr
                    key={row.changePct}
                    className="border-t"
                    style={{
                      borderColor: 'var(--color-border)',
                      backgroundColor: isZero
                        ? 'color-mix(in srgb, var(--color-schd) 8%, transparent)'
                        : undefined,
                    }}
                  >
                    <td className="px-3 py-2 font-semibold">{formatSignedPercent(row.changePct)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatUSD(row.price)}
                      {priceBelowLiq && (
                        <span
                          className="chip ml-2"
                          style={{
                            backgroundColor: 'color-mix(in srgb, var(--color-danger) 18%, transparent)',
                            color: 'var(--color-danger)',
                          }}
                        >
                          청산권
                        </span>
                      )}
                    </td>
                    <td
                      className="px-3 py-2 text-right tabular-nums font-semibold"
                      style={{
                        color: isPositive
                          ? 'var(--color-success)'
                          : isNegative
                            ? 'var(--color-danger)'
                            : undefined,
                      }}
                    >
                      {formatUSD(row.pnl)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums muted">
                      {formatKRW(row.pnl * exchangeRate)}
                    </td>
                    <td
                      className="px-3 py-2 text-right tabular-nums font-semibold"
                      style={{
                        color: isPositive
                          ? 'var(--color-success)'
                          : isNegative
                            ? 'var(--color-danger)'
                            : undefined,
                      }}
                    >
                      {formatSignedPercent(row.roe)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div
        className="rounded-xl px-4 py-3 text-xs border leading-relaxed"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}
      >
        <strong>주의:</strong> 본 계산기는 격리 마진 기준 단순 근사 모델입니다. 수수료, 펀딩비, 거래소별 유지증거금
        구간 차등, 슬리피지는 반영되지 않으며 실제 청산가는 거래소 화면과 다를 수 있습니다. 투자 판단은 본인 책임하에
        신중히 결정하세요.
      </div>
    </div>
  );
}

function ResultCard({
  label,
  value,
  accent,
  highlight,
}: {
  label: string;
  value: string;
  accent?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className="card"
      style={
        highlight
          ? {
              borderColor: accent ?? 'var(--color-schd)',
              backgroundColor: 'color-mix(in srgb, var(--color-danger) 6%, var(--color-surface))',
            }
          : undefined
      }
    >
      <div className="text-xs muted mb-1">{label}</div>
      <div className="text-lg md:text-xl font-bold tabular-nums" style={{ color: accent }}>
        {value}
      </div>
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  step,
  hint,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step: number;
  hint?: string;
}) {
  return (
    <div>
      <label className="text-sm font-semibold block mb-2">{label}</label>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-full px-3 py-2 rounded-lg border tabular-nums text-base font-semibold"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
          color: 'var(--color-text)',
        }}
      />
      {hint && <div className="text-xs muted mt-1.5">{hint}</div>}
    </div>
  );
}

function InlineNumberInput({
  value,
  onChange,
  min,
  max,
  step,
  suffix,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step: number;
  suffix?: string;
}) {
  return (
    <span className="inline-flex items-center gap-1 justify-end">
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-24 px-2 py-1 rounded-md border tabular-nums text-right text-sm"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
          color: 'var(--color-text)',
        }}
      />
      {suffix && <span className="text-xs muted">{suffix}</span>}
    </span>
  );
}
