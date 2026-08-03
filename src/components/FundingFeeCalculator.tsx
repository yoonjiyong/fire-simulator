import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { FUNDING_DATA_UPDATED_AT } from '../data/coinFunding';
import type { CoinKey, MarketRegime } from '../types/funding';
import {
  COIN_KEYS,
  COIN_META,
  LIQUIDATION_CHANGE,
  PRESET_KEYS,
  REGIME_LABELS,
  type StatsRange,
  STATS_RANGE_LABELS,
  backtest,
  backtestPresets,
  defaultYieldFor,
  fundingMonths,
  overallMedianYield,
  scenarioFunding,
  simulateFunding,
  sliceMonths,
  statsMonths,
  summarizeRegimes,
} from '../utils/fundingFee';
import { formatManwonDetail, formatPercent, formatSignedPercent } from '../utils/format';

const REGIMES: MarketRegime[] = ['bull', 'sideways', 'bear'];

const REGIME_ICONS: Record<MarketRegime, string> = {
  bull: '📈',
  sideways: '➡️',
  bear: '📉',
};

const REGIME_COLORS: Record<MarketRegime, string> = {
  bull: 'var(--color-success)',
  sideways: 'var(--color-warning)',
  bear: 'var(--color-danger)',
};

/** 장세를 고르면 가격 변동률도 그 장세의 대표값으로 함께 옮겨준다. */
const REGIME_PRICE_CHANGE: Record<MarketRegime, number> = {
  bull: 40,
  sideways: 0,
  bear: -30,
};

const STORAGE_PREFIX = 'fundingFeeCalculator.';

function usePersistedNumber(key: string, defaultValue: number): [number, (n: number) => void] {
  const storageKey = STORAGE_PREFIX + key;
  const [value, setValue] = useState<number>(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      const parsed = raw === null ? NaN : Number(raw);
      return Number.isFinite(parsed) ? parsed : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, String(value));
    } catch {
      // 저장 실패(프라이빗 브라우징 등) 시 무시 — 이번 세션 동안은 정상 동작
    }
  }, [storageKey, value]);

  return [value, setValue];
}

function usePersistedString<T extends string>(key: string, defaultValue: T, valid: readonly T[]): [T, (v: T) => void] {
  const storageKey = STORAGE_PREFIX + key;
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(storageKey) as T | null;
      return raw !== null && valid.includes(raw) ? raw : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, value);
    } catch {
      // 저장 실패 시 무시
    }
  }, [storageKey, value]);

  return [value, setValue];
}

function formatMoneyDisplay(value: number): string {
  if (!Number.isFinite(value)) return '';
  return Math.round(value).toLocaleString('en-US');
}

export function FundingFeeCalculator() {
  const [coin, setCoin] = usePersistedString<CoinKey>('coin', 'XRP', COIN_KEYS);
  const [totalCapital, setTotalCapital] = usePersistedNumber('totalCapital', 100000);
  const [months, setMonths] = usePersistedNumber('months', 12);
  const [regime, setRegime] = usePersistedString<MarketRegime>('regime', 'sideways', REGIMES);
  const [statsRange, setStatsRange] = usePersistedString<StatsRange>('statsRange', 'recent2y', ['all', 'recent2y']);
  const [monthlyYieldPct, setMonthlyYieldPct] = usePersistedNumber('monthlyYieldPct', 0);
  const [priceChangePct, setPriceChangePct] = usePersistedNumber('priceChangePct', 0);
  const [presetKey, setPresetKey] = usePersistedString('presetKey', 'recent12m', PRESET_KEYS);

  const coinMonths = useMemo(() => fundingMonths(coin), [coin]);
  const dataFrom = coinMonths[0]?.month ?? '';
  const dataTo = coinMonths.at(-1)?.month ?? '';

  const summary = useMemo(() => summarizeRegimes(statsMonths(coin, statsRange)), [coin, statsRange]);

  // 장세·통계 구간을 바꾸면 월 펀딩비율과 가격 변동률을 그 조합의 대표값으로 되돌린다.
  // (사용자가 직접 수정한 값은 다음 장세 변경 전까지 유지된다.)
  const applyRegime = (next: MarketRegime) => {
    setRegime(next);
    setMonthlyYieldPct(Number((defaultYieldFor(coin, next, statsRange) * 100).toFixed(3)));
    setPriceChangePct(REGIME_PRICE_CHANGE[next]);
  };

  useEffect(() => {
    setMonthlyYieldPct(Number((defaultYieldFor(coin, regime, statsRange) * 100).toFixed(3)));
    // 코인·통계 구간이 바뀌면 대표 펀딩비율만 갱신한다 — 가격 변동률은 통계와 무관하다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coin, statsRange]);

  const scenario = useMemo(
    () => scenarioFunding(monthlyYieldPct / 100, months, priceChangePct / 100),
    [monthlyYieldPct, months, priceChangePct],
  );

  const result = useMemo(
    () =>
      simulateFunding({
        totalCapital,
        totalFundingYield: scenario.totalFundingYield,
        months,
        priceChange: priceChangePct / 100,
      }),
    [totalCapital, scenario, months, priceChangePct],
  );

  const presets = useMemo(() => backtestPresets(coin), [coin]);
  const preset = presets.find((p) => p.key === presetKey) ?? presets[0];
  const bt = useMemo(() => backtest(sliceMonths(coin, preset.from, preset.to)), [coin, preset]);

  // 백테스트는 시나리오와 같은 투입금·1:1 배분으로, 각 달의 실제 정산가로 계산된 누적 펀딩비를 그대로 쓴다.
  const btResult = useMemo(
    () =>
      bt
        ? simulateFunding({
            totalCapital,
            totalFundingYield: bt.totalFundingYield,
            months: bt.monthCount,
            priceChange: bt.priceChange,
            maxPriceChange: bt.maxPriceChange,
          })
        : null,
    [bt, totalCapital],
  );

  const chartData = useMemo(
    () =>
      (bt?.months ?? []).map((m) => ({
        month: m.month.slice(2), // 'YY-MM'
        yieldPct: m.fundingYield * 100,
        regime: m.regime,
      })),
    [bt],
  );

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">펀비 계산기</h1>
        <p className="text-sm muted">
          총 투입금을 현물과 1배 숏에 1:1로 나눠 가격 위험을 상쇄하고 펀딩비만 수취하는 델타 뉴트럴 전략을, 바이낸스{' '}
          {COIN_META[coin].symbol}의 실제 펀딩비 이력({dataFrom} ~ {dataTo})으로 계산합니다.
        </p>
      </header>

      {/* 코인 선택 — 코인마다 펀딩비 수준과 상장 시점이 달라 모든 계산이 이 선택을 따라간다. */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {COIN_KEYS.map((k) => {
          const selected = coin === k;
          const meta = COIN_META[k];
          return (
            <button
              key={k}
              type="button"
              onClick={() => setCoin(k)}
              className="px-3 py-2.5 rounded-lg border transition-colors cursor-pointer text-left"
              style={{
                borderColor: selected ? 'var(--color-schd)' : 'var(--color-border)',
                backgroundColor: selected
                  ? 'color-mix(in srgb, var(--color-schd) 10%, transparent)'
                  : 'var(--color-surface)',
              }}
            >
              <div className="text-sm font-bold flex items-center gap-1.5">
                <span aria-hidden="true">{meta.icon}</span>
                <span style={{ color: selected ? 'var(--color-schd)' : undefined }}>{k}</span>
                <span className="text-xs font-medium muted">{meta.label}</span>
              </div>
              <div className="text-[11px] muted mt-0.5 tabular-nums">
                {STATS_RANGE_LABELS[statsRange]} 중앙값 월 {formatPercent(overallMedianYield(k, statsRange), 2)}
              </div>
            </button>
          );
        })}
      </div>

      {/* 결과 하이라이트 */}
      <div
        className="grid grid-cols-2 md:grid-cols-4 gap-3 sticky top-20 z-10 py-2 -mx-2 px-2 rounded-xl"
        style={{ backgroundColor: 'color-mix(in srgb, var(--color-bg) 92%, transparent)', backdropFilter: 'blur(4px)' }}
      >
        <ResultCard
          label={
            result.isLiquidated
              ? `누적 펀딩비 (청산까지 ${scenario.fundedMonths.toFixed(1)}개월)`
              : `${months}개월 누적 펀딩비`
          }
          value={formatManwonDetail(result.fundingIncome)}
          accent={result.fundingIncome >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}
          highlight
        />
        <ResultCard
          label="월평균 수익"
          value={formatManwonDetail(result.monthlyIncome)}
          accent={result.monthlyIncome >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}
        />
        <ResultCard
          label="최종 순손익"
          value={formatManwonDetail(result.netPnl)}
          accent={result.netPnl >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}
        />
        <ResultCard
          label="연 환산 수익률"
          value={formatSignedPercent(result.annualizedRoi)}
          accent={result.annualizedRoi >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 items-start">
        {/* 시나리오 설정 */}
        <div className="card-lg space-y-5">
          <h2 className="text-base font-bold">시나리오 설정</h2>

          <MoneyInput
            label="총 투입금 (만원)"
            value={totalCapital}
            onChange={setTotalCapital}
            hint={`${formatManwonDetail(totalCapital)} → 현물 ${formatManwonDetail(result.spotCapital)} + 1배 숏 ${formatManwonDetail(result.shortCapital)}`}
          />

          <div>
            <div className="text-sm font-semibold mb-2">장세</div>
            <div className="grid grid-cols-3 gap-2">
              {REGIMES.map((r) => {
                const selected = regime === r;
                const s = summary[r];
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => applyRegime(r)}
                    className="px-3 py-3 rounded-lg border text-left transition-colors cursor-pointer"
                    style={{
                      borderColor: selected ? REGIME_COLORS[r] : 'var(--color-border)',
                      backgroundColor: selected
                        ? `color-mix(in srgb, ${REGIME_COLORS[r]} 10%, transparent)`
                        : 'var(--color-surface)',
                    }}
                  >
                    <div className="text-sm font-bold flex items-center gap-1.5">
                      <span aria-hidden="true">{REGIME_ICONS[r]}</span>
                      <span style={{ color: selected ? REGIME_COLORS[r] : undefined }}>{REGIME_LABELS[r]}</span>
                    </div>
                    <div className="text-xs muted mt-1 tabular-nums">
                      월 {formatPercent(s.medianFundingYield, 2)}
                    </div>
                    <div className="text-[11px] muted tabular-nums">{s.monthCount}개월 중앙값</div>
                  </button>
                );
              })}
            </div>
            <div className="text-xs muted mt-2">
              장세를 고르면 아래 월 펀딩비율과 가격 변동률이 그 장세의 실제 대표값으로 채워집니다. 이후 직접 조정할 수
              있습니다.
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-x-6 gap-y-5">
            <NumberInput
              label="월 펀딩비율 (%)"
              value={monthlyYieldPct}
              onChange={setMonthlyYieldPct}
              min={-5}
              max={25}
              hint={`숏 명목가 대비 · 연 환산 ${(monthlyYieldPct * 12).toFixed(1)}%`}
            />
            <NumberInput
              label="보유 기간 (개월)"
              value={months}
              onChange={(n) => setMonths(Math.round(n))}
              min={1}
              max={120}
              hint={months >= 12 ? `${(months / 12).toFixed(1)}년` : undefined}
            />
            <NumberInput
              label="기간 중 가격 변동률 (%)"
              value={priceChangePct}
              onChange={setPriceChangePct}
              min={-95}
              max={500}
              hint={
                result.isLiquidated
                  ? '숏이 청산되는 구간이라 상쇄가 깨집니다 (아래 경고 참고)'
                  : '현물 이익과 숏 손실이 상쇄되므로 순손익에는 거의 영향이 없습니다'
              }
            />
          </div>

          {result.isLiquidated && (
            <div
              className="rounded-lg px-3 py-2.5 text-xs leading-relaxed"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-danger) 10%, transparent)',
                color: 'var(--color-danger)',
              }}
            >
              ⚠ 가격이 {formatSignedPercent(LIQUIDATION_CHANGE)} 이상 오르면 1배 숏도 증거금이 모두 소진되어
              청산됩니다. 청산 이후에는 현물만 남아 헤지가 풀리므로, 실제로는 그 전에 증거금을 추가하거나 포지션을
              줄여야 합니다.
            </div>
          )}
        </div>

        {/* 손익 분해 */}
        <div className="card-lg space-y-4">
          <h2 className="text-base font-bold">손익 분해</h2>
          <p className="text-xs muted">
            현물 수량과 숏 수량이 같아 가격 손익이 서로 상쇄되고, 남는 것은 펀딩비뿐입니다.
          </p>

          <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
            <table className="w-full text-sm">
              <tbody>
                <BreakdownRow label={`현물 ${formatManwonDetail(result.spotCapital)}`} value={result.spotPnl} />
                <BreakdownRow
                  label={`1배 숏 ${formatManwonDetail(result.shortCapital)}`}
                  value={result.shortPnl}
                  note={result.isLiquidated ? '청산 (증거금 전액 손실)' : undefined}
                />
                <BreakdownRow label="가격 손익 소계" value={result.spotPnl + result.shortPnl} subtotal />
                <BreakdownRow
                  label={`펀딩비 ${result.isLiquidated ? `${scenario.fundedMonths.toFixed(1)}` : months}개월 누적`}
                  value={result.fundingIncome}
                  note={result.isLiquidated ? '청산 시점에 수취 중단' : undefined}
                />
                <BreakdownRow label="최종 순손익" value={result.netPnl} total />
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <ResultCard label="총 수익률" value={formatSignedPercent(result.netRoi)} compact />
            <ResultCard label="연 환산" value={formatSignedPercent(result.annualizedRoi)} compact />
          </div>
        </div>
      </div>

      {/* 장세별 실제 통계 */}
      <div className="card-lg space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-base font-bold">장세별 실제 펀딩비 통계 · {coin}</h2>
          <div className="flex items-center gap-1">
            {(['recent2y', 'all'] as StatsRange[]).map((r) => {
              const selected = statsRange === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setStatsRange(r)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer"
                  style={{
                    borderColor: selected ? 'var(--color-schd)' : 'var(--color-border)',
                    color: selected ? 'var(--color-schd)' : 'var(--color-text-secondary)',
                    backgroundColor: selected
                      ? 'color-mix(in srgb, var(--color-schd) 10%, transparent)'
                      : 'transparent',
                  }}
                >
                  {STATS_RANGE_LABELS[r]}
                </button>
              );
            })}
          </div>
        </div>

        <p className="text-xs muted leading-relaxed">
          월 수익률이 +10% 초과면 상승장, -10% 미만이면 하락장, 그 사이는 횡보장으로 나눴습니다. 수치는 모두 숏 명목가
          대비 월 펀딩비 수익률이며, 양수는 수취·음수는 지불입니다.
        </p>

        <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
          <table className="w-full text-sm">
            <thead
              className="text-xs uppercase tracking-wider"
              style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)' }}
            >
              <tr>
                <th className="px-3 py-2 text-left whitespace-nowrap">장세</th>
                <th className="px-3 py-2 text-right whitespace-nowrap">해당 개월</th>
                <th className="px-3 py-2 text-right whitespace-nowrap">중앙값</th>
                <th className="px-3 py-2 text-right whitespace-nowrap">평균</th>
                <th className="px-3 py-2 text-right whitespace-nowrap">최저</th>
                <th className="px-3 py-2 text-right whitespace-nowrap">최고</th>
                <th className="px-3 py-2 text-right whitespace-nowrap">수취한 달</th>
                <th className="px-3 py-2 text-right whitespace-nowrap">중앙값 기준 월 수익</th>
              </tr>
            </thead>
            <tbody>
              {REGIMES.map((r) => {
                const s = summary[r];
                return (
                  <tr key={r} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                    <td className="px-3 py-2 font-semibold whitespace-nowrap">
                      <span aria-hidden="true" className="mr-1.5">
                        {REGIME_ICONS[r]}
                      </span>
                      <span style={{ color: REGIME_COLORS[r] }}>{REGIME_LABELS[r]}</span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums muted">{s.monthCount}개월</td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold">
                      {formatPercent(s.medianFundingYield, 2)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums muted">{formatPercent(s.avgFundingYield, 2)}</td>
                    <td className="px-3 py-2 text-right tabular-nums" style={{ color: 'var(--color-danger)' }}>
                      {formatPercent(s.minFundingYield, 2)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums" style={{ color: 'var(--color-success)' }}>
                      {formatPercent(s.maxFundingYield, 2)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums muted">{formatPercent(s.positiveRatio, 0)}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold whitespace-nowrap">
                      {formatManwonDetail((totalCapital / 2) * s.medianFundingYield)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="text-xs muted leading-relaxed">
          펀딩비는 <strong>롱이 몰릴수록 높아지므로 상승장에서 가장 많이 벌고, 하락장에서는 거의 0에 수렴하거나 오히려
          지불</strong>하게 됩니다. {coin} 은 {STATS_RANGE_LABELS[statsRange]} 기준 상승장 중앙값{' '}
          {formatPercent(summary.bull.medianFundingYield, 2)} · 하락장 중앙값{' '}
          {formatPercent(summary.bear.medianFundingYield, 2)} 입니다. 2020~21년의 과열 구간이 섞인 "전체 기간"보다 "최근
          2년"이 지금 기대할 수 있는 현실적인 수치이며, 변동성이 큰 알트일수록 펀딩비도 높지만 그만큼 1배 숏이 청산될
          위험도 커집니다.
        </p>
      </div>

      {/* 과거 구간 백테스트 */}
      <div className="card-lg space-y-4">
        <h2 className="text-base font-bold">과거 실제 구간 백테스트 · {coin}</h2>

        <div className="flex flex-wrap gap-2">
          {presets.map((p) => {
            const selected = presetKey === p.key;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => setPresetKey(p.key)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer"
                style={{
                  borderColor: selected ? 'var(--color-schd)' : 'var(--color-border)',
                  color: selected ? 'var(--color-schd)' : 'var(--color-text-secondary)',
                  backgroundColor: selected ? 'color-mix(in srgb, var(--color-schd) 10%, transparent)' : 'transparent',
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        <p className="text-xs muted">
          {preset.description} · {preset.from} ~ {preset.to}
        </p>

        {bt && btResult && (
          <>
            {bt.liquidatedMonth && (
              <div
                className="rounded-lg px-3 py-2.5 text-xs leading-relaxed"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-danger) 10%, transparent)',
                  color: 'var(--color-danger)',
                }}
              >
                ⚠ <strong>{bt.liquidatedMonth}에 1배 숏이 청산되어 전략이 깨진 구간입니다.</strong> 가격이 진입가 대비
                최고 {formatSignedPercent(bt.maxPriceChange)}까지 올라 숏 증거금{' '}
                {formatManwonDetail(btResult.shortCapital)}이 전액 사라졌고, 펀딩비도 그 시점에 멈춥니다. 이후로는 헤지
                없는 현물 단독 포지션이므로 아래 순손익은 <strong>펀딩비 전략의 성과가 아니라 현물이 홀로 오른
                결과</strong>입니다.
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <ResultCard
                label="구간 가격 변동"
                value={formatSignedPercent(bt.priceChange)}
                accent={REGIME_COLORS[bt.regime]}
                compact
              />
              <ResultCard
                label={`누적 펀딩비 (${bt.fundedMonths}개월)`}
                value={formatManwonDetail(btResult.fundingIncome)}
                accent={btResult.fundingIncome >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}
                compact
              />
              <ResultCard
                label={bt.liquidatedMonth ? '최종 순손익 (청산 후 현물 단독)' : '최종 순손익'}
                value={formatManwonDetail(btResult.netPnl)}
                accent={btResult.netPnl >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}
                compact
              />
              <ResultCard
                label={bt.liquidatedMonth ? '연 환산 (참고용)' : '연 환산 수익률'}
                value={formatSignedPercent(btResult.annualizedRoi)}
                accent={btResult.annualizedRoi >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}
                compact
              />
            </div>

            <div className="text-xs muted">
              투입금 {formatManwonDetail(totalCapital)} 기준 · 월평균 펀딩비 {formatPercent(bt.avgMonthlyYield, 2)} ·
              최고 {bt.bestMonth?.month} ({formatPercent(bt.bestMonth?.fundingYield ?? 0, 2)}) · 최저{' '}
              {bt.worstMonth?.month} ({formatPercent(bt.worstMonth?.fundingYield ?? 0, 2)})
              {bt.liquidatedMonth && ` · 청산으로 ${bt.monthCount}개월 중 ${bt.fundedMonths}개월만 펀딩비 수취`}
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }}
                    stroke="var(--color-border)"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }}
                    stroke="var(--color-border)"
                    // 월 펀딩비는 1% 미만인 구간이 많아 정수로 반올림하면 눈금이 전부 0% 로 뭉개진다.
                    tickFormatter={(v: number) => `${Number(v.toFixed(1))}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => [`${v.toFixed(2)}%`, '월 펀딩비']}
                  />
                  <ReferenceLine y={0} stroke="var(--color-text-tertiary)" />
                  <Bar dataKey="yieldPct" radius={[3, 3, 0, 0]}>
                    {chartData.map((d) => (
                      <Cell key={d.month} fill={REGIME_COLORS[d.regime as MarketRegime]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="text-xs muted text-center">
              막대 색은 그 달의 장세 (초록 상승장 · 노랑 횡보장 · 빨강 하락장)
            </div>
          </>
        )}
      </div>

      <div
        className="rounded-xl px-4 py-3 text-xs border leading-relaxed"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}
      >
        <strong>주의:</strong> 바이낸스 {COIN_META[coin].symbol} 무기한 선물의 실제 펀딩비 이력({dataFrom} ~{' '}
        {dataTo}, {FUNDING_DATA_UPDATED_AT} 기준)을 월 단위로 집계한 단순 근사 모델입니다. 거래
        수수료·현물과 선물의 가격 괴리(베이시스)·리밸런싱·세금·거래소 리스크는 반영되지 않았고, 펀딩비는 8시간마다
        변하므로 실제 결과와 다를 수 있습니다. 과거 펀딩비가 미래를 보장하지 않으며, 투자 판단은 본인 책임하에 신중히
        결정하세요.
      </div>
    </div>
  );
}

function BreakdownRow({
  label,
  value,
  note,
  subtotal,
  total,
}: {
  label: string;
  value: number;
  note?: string;
  subtotal?: boolean;
  total?: boolean;
}) {
  return (
    <tr
      className="border-t"
      style={{
        borderColor: 'var(--color-border)',
        backgroundColor: total || subtotal ? 'var(--color-bg-secondary)' : undefined,
      }}
    >
      <td className={`px-3 py-2.5 ${total ? 'font-bold' : subtotal ? 'font-semibold' : ''}`}>
        {label}
        {note && (
          <span className="text-xs ml-2" style={{ color: 'var(--color-danger)' }}>
            {note}
          </span>
        )}
      </td>
      <td
        className={`px-3 py-2.5 text-right tabular-nums whitespace-nowrap ${total ? 'text-base font-bold' : 'font-semibold'}`}
        style={{
          color: value > 0 ? 'var(--color-success)' : value < 0 ? 'var(--color-danger)' : 'var(--color-text-secondary)',
        }}
      >
        {value > 0 ? '+' : ''}
        {formatManwonDetail(value)}
      </td>
    </tr>
  );
}

function ResultCard({
  label,
  value,
  accent,
  highlight,
  compact,
}: {
  label: string;
  value: string;
  accent?: string;
  highlight?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className="card min-w-0"
      style={
        highlight
          ? {
              borderColor: accent ?? 'var(--color-schd)',
              backgroundColor: `color-mix(in srgb, ${accent ?? 'var(--color-schd)'} 6%, var(--color-surface))`,
            }
          : undefined
      }
    >
      <div className="text-xs muted mb-1 truncate">{label}</div>
      <div
        className={`font-bold tabular-nums break-words ${compact ? 'text-base md:text-lg' : 'text-lg md:text-xl'}`}
        style={{ color: accent }}
      >
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
          const n = Number(e.target.value.replace(/,/g, '').trim());
          setText(e.target.value);
          onChange(Number.isFinite(n) ? Math.max(0, n) : 0);
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
