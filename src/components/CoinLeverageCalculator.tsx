import { useEffect, useMemo, useRef, useState } from 'react';
import type { LadderEntryInput, PositionSide } from '../types/coin';
import { DEFAULT_PNL_CHANGES, buildLadder, buildPnlTable } from '../utils/coinLeverage';
import { formatKRW, formatSignedPercent, formatUSD } from '../utils/format';

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

function formatMoneyDisplay(value: number): string {
  if (!Number.isFinite(value)) return '';
  const sign = value < 0 ? '-' : '';
  const [intPart, decPart] = Math.abs(value).toString().split('.');
  const grouped = Number(intPart).toLocaleString('en-US');
  return decPart ? `${sign}${grouped}.${decPart}` : `${sign}${grouped}`;
}

function parseMoneyInput(text: string): number {
  const n = Number(text.replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : 0;
}

export function CoinLeverageCalculator() {
  const [totalCapital, setTotalCapital] = useState(20000);
  const [leverage, setLeverage] = useState(10);
  const [side, setSide] = useState<PositionSide>('long');
  const [maintenanceMarginPct, setMaintenanceMarginPct] = useState(0.5);
  const [exchangeRate, setExchangeRate] = useState(1500);

  const [coinPrice, setCoinPrice] = useState(100);
  const [initialAmount, setInitialAmount] = useState(2000);
  const [initialRatio, setInitialRatio] = useState(10);
  const [targetPrice, setTargetPrice] = useState(100);

  const [extraEntries, setExtraEntries] = useState<LadderEntryInput[]>([]);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const idCounter = useRef(1);

  const initialRatioClamped = clamp(initialRatio, 1, 40);
  const initialRatioPercent = 100 / initialRatioClamped;

  const prevRatioRef = useRef(initialRatioClamped);
  useEffect(() => {
    if (prevRatioRef.current !== initialRatioClamped) {
      prevRatioRef.current = initialRatioClamped;
      setInitialAmount(Math.round((totalCapital / initialRatioClamped) * 100) / 100);
    }
  }, [initialRatioClamped, totalCapital]);

  const initialAmountRatioPercent = totalCapital > 0 ? clamp((initialAmount / totalCapital) * 100, 0, 100) : 0;

  const entries = useMemo<LadderEntryInput[]>(
    () => [{ id: 'initial', price: coinPrice, ratio: initialAmountRatioPercent }, ...extraEntries],
    [coinPrice, initialAmountRatioPercent, extraEntries],
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

  const targetChangePct = current.avgPrice > 0 ? (targetPrice - current.avgPrice) / current.avgPrice : 0;
  const targetPnl =
    side === 'long'
      ? current.cumQty * (targetPrice - current.avgPrice)
      : current.cumQty * (current.avgPrice - targetPrice);
  const targetRoe = current.cumMargin > 0 ? targetPnl / current.cumMargin : 0;
  const targetIsLiquidated =
    current.avgPrice > 0 && (side === 'long' ? targetPrice <= current.liqPrice : targetPrice >= current.liqPrice);

  const pnlRows = useMemo(
    () => buildPnlTable(current.avgPrice, current.cumQty, current.cumMargin, side, DEFAULT_PNL_CHANGES),
    [current.avgPrice, current.cumQty, current.cumMargin, side],
  );

  const addEntry = () => {
    const lastPrice = entries[entries.length - 1]?.price ?? coinPrice;
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

  const resetEntries = () => {
    setExtraEntries([]);
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

      <div className="grid lg:grid-cols-2 gap-4 items-start">
        {/* 기본 설정 */}
        <div className="card-lg space-y-5">
          <h2 className="text-base font-bold">기본 설정</h2>
          <div className="grid md:grid-cols-2 gap-x-6 gap-y-5">
            <MoneyInput
              label="총 자금 (USD)"
              value={totalCapital}
              onChange={setTotalCapital}
              hint={formatKRW(totalCapital * exchangeRate)}
            />
            <NumberInput
              label="레버리지 (1~100배)"
              value={leverage}
              onChange={(n) => setLeverage(Math.round(n))}
              min={1}
              max={100}
              step={1}
              hint={`${leverage}x`}
            />
            <MoneyInput
              label="투입 금액 (USD)"
              value={initialAmount}
              onChange={setInitialAmount}
              hint={`비율 변경 시 자동 재계산 (직접 수정 가능) · 현재 총자금의 ${initialAmountRatioPercent.toFixed(1)}%`}
            />
            <NumberInput
              label="처음 들어가는 비율 (1~40등분)"
              value={initialRatio}
              onChange={setInitialRatio}
              min={1}
              max={40}
              step={1}
              hint={`1/${initialRatioClamped} = ${formatUSD(totalCapital / initialRatioClamped)} (총자금의 ${initialRatioPercent.toFixed(1)}%)`}
            />
            <NumberInput
              label="유지증거금률 (%)"
              value={maintenanceMarginPct}
              onChange={setMaintenanceMarginPct}
              min={0}
              max={10}
              step={0.1}
              hint="거래소·종목별로 상이 (기본 0.5%)"
            />
            <MoneyInput label="환율 (KRW/USD)" value={exchangeRate} onChange={setExchangeRate} />
            <MoneyInput
              label="코인 가격 (USD)"
              value={coinPrice}
              onChange={setCoinPrice}
              hint="최초 진입 시점의 실제 코인 시장가 (평단가·청산가 계산에 사용)"
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
  
        {/* 수익 시뮬레이션 */}
        <div className="card-lg">
          <h2 className="text-base font-bold mb-1">평단가 기준 수익 시뮬레이션</h2>
          <p className="text-xs muted mb-3">
            평단가 {formatUSD(current.avgPrice)} 대비 유리한 방향({side === 'long' ? '상승' : '하락'})으로 0.3%~10.0%
            움직였을 때 예상 수익 (0.1%p 단위, 수수료·펀딩비 미반영). 손실·청산 위험은 상단 청산가·청산까지 여유를
            참고하세요.
          </p>
          <div
            className="overflow-x-auto rounded-lg border max-h-96 overflow-y-auto"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <table className="w-full text-sm">
              <thead
                className="text-xs uppercase tracking-wider sticky top-0"
                style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)' }}
              >
                <tr>
                  <th className="px-3 py-2 text-left whitespace-nowrap">변동률</th>
                  <th className="px-3 py-2 text-right whitespace-nowrap">가격 (USD)</th>
                  <th className="px-3 py-2 text-right whitespace-nowrap">포지션 가치 (USD)</th>
                  <th className="px-3 py-2 text-right whitespace-nowrap">수익 (USD)</th>
                  <th className="px-3 py-2 text-right whitespace-nowrap">수익 (KRW)</th>
                  <th className="px-3 py-2 text-right whitespace-nowrap">ROE</th>
                </tr>
              </thead>
              <tbody>
                {pnlRows.map((row) => (
                  <tr key={row.changePct} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                    <td className="px-3 py-2 font-semibold whitespace-nowrap">
                      {formatSignedPercent(row.changePct)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">{formatUSD(row.price)}</td>
                    <td className="px-3 py-2 text-right tabular-nums muted whitespace-nowrap">
                      {formatUSD(current.cumMargin * leverage * (1 + row.changePct))}
                    </td>
                    <td
                      className="px-3 py-2 text-right tabular-nums font-semibold whitespace-nowrap"
                      style={{ color: 'var(--color-success)' }}
                    >
                      {formatUSD(row.pnl)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums muted whitespace-nowrap">
                      {formatKRW(row.pnl * exchangeRate)}
                    </td>
                    <td
                      className="px-3 py-2 text-right tabular-nums font-semibold whitespace-nowrap"
                      style={{ color: 'var(--color-success)' }}
                    >
                      {formatSignedPercent(row.roe)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 목표가 손익 계산 */}
      <div className="card-lg space-y-4">
        <h2 className="text-base font-bold">목표가 손익 계산</h2>
        <p className="text-xs muted">
          현재(또는 목표) 가격을 입력하면 평단가 {formatUSD(current.avgPrice)} 대비 변동률과 손익을 계산합니다.
        </p>
        <MoneyInput
          label="현재 가격 (USD)"
          value={targetPrice}
          onChange={setTargetPrice}
          hint={targetIsLiquidated ? '이 가격에서는 이미 청산됩니다' : undefined}
        />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <ResultCard
            label="변동률"
            value={formatSignedPercent(targetChangePct)}
            accent={targetChangePct >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}
          />
          <ResultCard
            label="손익 (USD)"
            value={formatUSD(targetPnl)}
            accent={targetPnl >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}
          />
          <ResultCard
            label="손익 (KRW)"
            value={formatKRW(targetPnl * exchangeRate)}
            accent={targetPnl >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}
          />
          <ResultCard
            label="ROE"
            value={formatSignedPercent(targetRoe)}
            accent={targetRoe >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}
          />
        </div>
      </div>

      {/* 물타기 사다리 */}
      <div className="card-lg space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">물타기 단계</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              disabled={extraEntries.length === 0}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                borderColor: 'var(--color-danger)',
                color: 'var(--color-danger)',
                backgroundColor: 'color-mix(in srgb, var(--color-danger) 8%, transparent)',
              }}
            >
              초기화
            </button>
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
                <th className="px-3 py-2 text-left whitespace-nowrap">단계</th>
                <th className="px-3 py-2 text-right">진입가</th>
                <th className="px-3 py-2 text-right whitespace-nowrap">최초가 대비</th>
                <th className="px-3 py-2 text-right whitespace-nowrap">투입 비율</th>
                <th className="px-3 py-2 text-right whitespace-nowrap">투입 증거금</th>
                <th className="px-3 py-2 text-right whitespace-nowrap">누적 평단가</th>
                <th className="px-3 py-2 text-right whitespace-nowrap">평가손익</th>
                <th className="px-3 py-2 text-right whitespace-nowrap">누적 청산가</th>
                <th className="px-3 py-2 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {ladder.map((row, idx) => {
                const isInitial = idx === 0;
                return (
                  <tr key={row.id} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                    <td className="px-3 py-2 font-semibold whitespace-nowrap">
                      {isInitial ? '최초' : `물타기 ${idx}`}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {isInitial ? (
                        <span className="tabular-nums">{formatUSD(row.price)}</span>
                      ) : (
                        <InlineMoneyInput
                          value={row.price}
                          onChange={(n) => updateEntry(row.id, 'price', Math.max(0, n))}
                        />
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums muted whitespace-nowrap">
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
                          suffix="%"
                          onChange={(n) => updateEntry(row.id, 'ratio', n)}
                        />
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums muted whitespace-nowrap">
                      {formatUSD(row.margin)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold whitespace-nowrap">
                      {formatUSD(row.avgPrice)}
                    </td>
                    <td
                      className="px-3 py-2 text-right tabular-nums font-semibold whitespace-nowrap"
                      style={{
                        color:
                          row.stagePnl > 0
                            ? 'var(--color-success)'
                            : row.stagePnl < 0
                              ? 'var(--color-danger)'
                              : undefined,
                      }}
                    >
                      {formatUSD(row.stagePnl)}
                      <span className="muted font-normal ml-1">({formatSignedPercent(row.stageRoe)})</span>
                    </td>
                    <td
                      className="px-3 py-2 text-right tabular-nums font-semibold whitespace-nowrap"
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

      <div
        className="rounded-xl px-4 py-3 text-xs border leading-relaxed"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}
      >
        <strong>주의:</strong> 본 계산기는 크로스 마진 기준 단순 근사 모델입니다. 총 자금 전체가 이 포지션의 증거금으로
        쓰인다고 가정하며(계좌 내 다른 동시 포지션 없음 전제), 수수료·펀딩비·거래소별 유지증거금 구간 차등·슬리피지는
        반영되지 않아 실제 청산가는 거래소 화면과 다를 수 있습니다. 투자 판단은 본인 책임하에 신중히 결정하세요.
      </div>

      {showResetConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ backgroundColor: 'color-mix(in srgb, black 50%, transparent)' }}
          onClick={() => setShowResetConfirm(false)}
        >
          <div
            className="card-lg max-w-sm w-full space-y-4"
            style={{ backgroundColor: 'var(--color-surface)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1.5">
              <h3 className="text-base font-bold">물타기 단계를 초기화할까요?</h3>
              <p className="text-sm muted">
                추가한 물타기 단계 {extraEntries.length}개가 모두 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => {
                  resetEntries();
                  setShowResetConfirm(false);
                }}
                className="px-3 py-1.5 rounded-lg text-sm font-semibold text-white transition-colors"
                style={{ backgroundColor: 'var(--color-danger)' }}
              >
                초기화
              </button>
            </div>
          </div>
        </div>
      )}
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
  hint,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
}) {
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(String(value));
  }, [value, focused]);

  const commit = () => {
    setFocused(false);
    const parsed = Number(text);
    let committed = Number.isFinite(parsed) ? parsed : value;
    if (min !== undefined) committed = Math.max(min, committed);
    if (max !== undefined) committed = Math.min(max, committed);
    setText(String(committed));
    onChange(committed);
  };

  return (
    <div>
      <label className="text-sm font-semibold block mb-2">{label}</label>
      <input
        type="text"
        inputMode="decimal"
        value={text}
        onFocus={() => setFocused(true)}
        onChange={(e) => {
          setText(e.target.value);
          const parsed = Number(e.target.value);
          if (Number.isFinite(parsed)) onChange(parsed);
        }}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
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

function MoneyInput({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  hint?: string;
}) {
  const [text, setText] = useState(formatMoneyDisplay(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(formatMoneyDisplay(value));
  }, [value, focused]);

  return (
    <div>
      <label className="text-sm font-semibold block mb-2">{label}</label>
      <input
        type="text"
        inputMode="decimal"
        value={text}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => {
          setText(e.target.value);
          onChange(Math.max(0, parseMoneyInput(e.target.value)));
        }}
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

function InlineMoneyInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [text, setText] = useState(formatMoneyDisplay(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(formatMoneyDisplay(value));
  }, [value, focused]);

  return (
    <input
      type="text"
      inputMode="decimal"
      value={text}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={(e) => {
        setText(e.target.value);
        onChange(Math.max(0, parseMoneyInput(e.target.value)));
      }}
      className="w-28 px-2 py-1 rounded-md border tabular-nums text-right text-sm"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
        color: 'var(--color-text)',
      }}
    />
  );
}

function InlineNumberInput({
  value,
  onChange,
  min,
  max,
  suffix,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(String(value));
  }, [value, focused]);

  const commit = () => {
    setFocused(false);
    const parsed = Number(text);
    let committed = Number.isFinite(parsed) ? parsed : value;
    if (min !== undefined) committed = Math.max(min, committed);
    if (max !== undefined) committed = Math.min(max, committed);
    setText(String(committed));
    onChange(committed);
  };

  return (
    <span className="inline-flex items-center gap-1 justify-end">
      <input
        type="text"
        inputMode="decimal"
        value={text}
        onFocus={() => setFocused(true)}
        onChange={(e) => {
          setText(e.target.value);
          const parsed = Number(e.target.value);
          if (Number.isFinite(parsed)) onChange(parsed);
        }}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
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
