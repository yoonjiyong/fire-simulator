import { FUNDING_MONTHS } from '../data/xrpFunding';
import type {
  FundingMonth,
  FundingParams,
  FundingRegimeSummary,
  FundingResult,
  MarketRegime,
} from '../types/funding';

/** 1배 숏은 유지증거금을 감안하면 가격이 약 2배가 될 때 청산된다. */
const MAINTENANCE_MARGIN_RATE = 0.005;
export const LIQUIDATION_PRICE_MULTIPLE = 2 / (1 + MAINTENANCE_MARGIN_RATE);
export const LIQUIDATION_CHANGE = LIQUIDATION_PRICE_MULTIPLE - 1;

export const REGIME_LABELS: Record<MarketRegime, string> = {
  bull: '상승장',
  bear: '하락장',
  sideways: '횡보장',
};

/** scripts/fetchFundingHistory.mjs 와 동일한 장세 구분 기준 (월 수익률 ±10%) */
export const REGIME_THRESHOLDS = { bull: 0.1, bear: -0.1 } as const;

export function classifyRegime(priceChange: number): MarketRegime {
  if (priceChange > REGIME_THRESHOLDS.bull) return 'bull';
  if (priceChange < REGIME_THRESHOLDS.bear) return 'bear';
  return 'sideways';
}

/** -0 이 "-0만원"으로 표시되는 것을 막는다. */
const normalizeZero = (n: number) => (n === 0 ? 0 : n);

/**
 * 월 펀딩비율로부터 기간 누적 펀딩비 수익률을 추정한다(시나리오 입력용).
 *
 * 숏 명목가는 가격을 따라 변하므로, 매달 같은 비율을 받더라도 실제 수취액은 그때의 명목가에 비례한다.
 * 가격이 기간 내내 선형으로 변한다고 보고 평균 명목가 배수 (1 + 변동률/2) 를 곱해 근사한다.
 * 변동률이 청산선을 넘으면 그 지점에서 숏이 사라지므로 펀딩비도 거기서 멈춘다.
 * (백테스트는 이 근사 대신 각 달의 실제 정산가로 계산된 값을 쓴다 — backtest 참고)
 */
export function scenarioFunding(
  monthlyFundingYield: number,
  months: number,
  priceChange: number,
): { totalFundingYield: number; fundedMonths: number } {
  if (priceChange >= LIQUIDATION_CHANGE) {
    // 선형 경로에서 가격이 청산선에 닿는 시점 (기간 대비 비율)
    const fraction = LIQUIDATION_CHANGE / priceChange;
    const fundedMonths = months * fraction;
    return {
      fundedMonths,
      totalFundingYield: monthlyFundingYield * fundedMonths * (1 + LIQUIDATION_CHANGE / 2),
    };
  }
  return {
    fundedMonths: months,
    totalFundingYield: monthlyFundingYield * months * (1 + priceChange / 2),
  };
}

/**
 * 현물 + 1배 숏 델타 뉴트럴(펀비 파밍) 시뮬레이션.
 *
 * 총 투입금을 현물과 숏 증거금에 1:1로 나누고, 숏은 1배이므로 숏 명목가 = 숏 증거금이 된다.
 * 현물 수량과 숏 수량이 같아져 가격 손익이 서로 상쇄되고, 남는 수익은 펀딩비뿐이다.
 */
export function simulateFunding(params: FundingParams): FundingResult {
  const { totalCapital, totalFundingYield, months, priceChange } = params;
  const maxPriceChange = params.maxPriceChange ?? priceChange;

  const spotCapital = totalCapital / 2;
  const shortCapital = totalCapital / 2;

  // 청산은 기간 중 고점으로 판정한다 — 한 번 청산되면 이후 가격이 되돌아와도 포지션은 돌아오지 않는다.
  const isLiquidated = maxPriceChange >= LIQUIDATION_CHANGE;

  const spotPnl = normalizeZero(spotCapital * priceChange);
  // 청산되면 숏 증거금은 전액 손실로 확정되고, 그렇지 않으면 가격 변동만큼만 손익이 난다.
  const shortPnl = isLiquidated ? -shortCapital : normalizeZero(-shortCapital * priceChange);

  const fundingIncome = shortCapital * totalFundingYield;

  const netPnl = spotPnl + shortPnl + fundingIncome;
  const netRoi = totalCapital > 0 ? netPnl / totalCapital : 0;
  const monthlyIncome = months > 0 ? fundingIncome / months : 0;
  const annualizedRoi = months > 0 ? netRoi * (12 / months) : 0;

  return {
    spotCapital,
    shortCapital,
    spotPnl,
    shortPnl,
    fundingIncome,
    netPnl,
    netRoi,
    monthlyIncome,
    annualizedRoi,
    isLiquidated,
  };
}

export interface BacktestPreset {
  key: string;
  label: string;
  description: string;
  from: string; // 'YYYY-MM'
  to: string; // 'YYYY-MM'
}

/** 프리셋 구간에 해당하는 월 데이터를 잘라낸다. */
export function sliceMonths(from: string, to: string): FundingMonth[] {
  return FUNDING_MONTHS.filter((m) => m.month >= from && m.month <= to);
}

export interface BacktestResult {
  months: FundingMonth[];
  monthCount: number;
  priceChange: number; // 구간 전체 가격 변동률
  maxPriceChange: number; // 구간 중 고점의 진입가 대비 변동률
  totalFundingYield: number; // 숏 명목가 대비 누적 펀딩비 수익률 (청산 시 그 시점까지만)
  avgMonthlyYield: number; // 펀딩비를 받은 개월 기준 월평균
  fundedMonths: number; // 실제로 펀딩비를 받은 개월 수 (청산 전까지)
  liquidatedMonth: string | null; // 숏이 청산된 달 ('YYYY-MM'), 청산되지 않았으면 null
  bestMonth: FundingMonth | null;
  worstMonth: FundingMonth | null;
  regime: MarketRegime;
}

/**
 * 실제 월별 데이터로 구간 백테스트.
 *
 * 각 달의 fundingYield 는 "그 달 시작가로 잡은 숏 명목가 대비 수익률"이므로,
 * 구간 누적은 각 달의 명목가 비중(월초 가격 / 구간 시작가)으로 가중해 더한다.
 * 가격이 진입가의 약 2배가 되면 1배 숏이 청산되며, 그 이후로는 숏이 없으므로 펀딩비도 멈춘다.
 */
export function backtest(months: FundingMonth[]): BacktestResult | null {
  if (months.length === 0) return null;

  const startPrice = months[0].firstPrice;
  const endPrice = months[months.length - 1].lastPrice;
  const priceChange = (endPrice - startPrice) / startPrice;

  let totalFundingYield = 0;
  let fundedMonths = 0;
  let maxPriceChange = 0;
  let liquidatedMonth: string | null = null;

  for (const m of months) {
    const monthHigh = (m.highPrice - startPrice) / startPrice;
    maxPriceChange = Math.max(maxPriceChange, monthHigh);

    if (liquidatedMonth === null) {
      totalFundingYield += m.fundingYield * (m.firstPrice / startPrice);
      fundedMonths += 1;
      // 월 단위 데이터라 청산 시점은 달 단위로만 잡힌다 — 그 달까지는 펀딩비를 받은 것으로 본다.
      if (monthHigh >= LIQUIDATION_CHANGE) liquidatedMonth = m.month;
    }
  }

  let best = months[0];
  let worst = months[0];
  for (const m of months) {
    if (m.fundingYield > best.fundingYield) best = m;
    if (m.fundingYield < worst.fundingYield) worst = m;
  }

  return {
    months,
    monthCount: months.length,
    priceChange,
    maxPriceChange,
    totalFundingYield,
    avgMonthlyYield: totalFundingYield / fundedMonths,
    fundedMonths,
    liquidatedMonth,
    bestMonth: best,
    worstMonth: worst,
    regime: classifyRegime(priceChange),
  };
}

/** 정산 횟수가 모자란 달(상장 첫 달, 아직 진행 중인 달)은 통계에서 제외한다. */
const MIN_FUNDING_COUNT = 60;

export type StatsRange = 'all' | 'recent2y';

export const STATS_RANGE_LABELS: Record<StatsRange, string> = {
  all: '전체 기간',
  recent2y: '최근 2년',
};

/** 통계 집계 대상 월. 최근 2년은 2020~21년의 이상 과열 구간을 제외한 현실적인 기준이 된다. */
export function statsMonths(range: StatsRange): FundingMonth[] {
  const complete = FUNDING_MONTHS.filter((m) => m.fundingCount >= MIN_FUNDING_COUNT);
  if (range === 'all') return complete;
  return complete.slice(-24);
}

function median(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function summarizeRegimes(months: FundingMonth[]): Record<MarketRegime, FundingRegimeSummary> {
  const build = (regime: MarketRegime): FundingRegimeSummary => {
    const yields = months
      .filter((m) => m.regime === regime)
      .map((m) => m.fundingYield)
      .sort((a, b) => a - b);

    if (yields.length === 0) {
      return {
        monthCount: 0,
        avgFundingYield: 0,
        medianFundingYield: 0,
        minFundingYield: 0,
        maxFundingYield: 0,
        positiveRatio: 0,
      };
    }

    return {
      monthCount: yields.length,
      avgFundingYield: yields.reduce((a, b) => a + b, 0) / yields.length,
      medianFundingYield: median(yields),
      minFundingYield: yields[0],
      maxFundingYield: yields[yields.length - 1],
      positiveRatio: yields.filter((y) => y > 0).length / yields.length,
    };
  };

  return { bull: build('bull'), bear: build('bear'), sideways: build('sideways') };
}

/** 장세별 기본 월 펀딩비율. 평균은 2021년 같은 극단적인 달에 크게 끌려가므로 중앙값을 쓴다. */
export function defaultYieldFor(regime: MarketRegime, range: StatsRange): number {
  return summarizeRegimes(statsMonths(range))[regime].medianFundingYield;
}

export const BACKTEST_PRESETS: BacktestPreset[] = [
  {
    key: 'bull2021',
    label: '2021 알트 불장',
    description: '펀딩비가 월 20%까지 치솟았지만, 그만큼 가격도 폭등해 1배 숏이 먼저 청산된 구간',
    from: '2020-11',
    to: '2021-04',
  },
  {
    key: 'bear2022',
    label: '2022 하락장',
    description: '루나·FTX 사태로 숏 쏠림이 이어져 펀딩비를 오히려 지불하던 구간',
    from: '2022-01',
    to: '2022-12',
  },
  {
    key: 'bull2024',
    label: '2024 대선 랠리',
    description: 'XRP가 한 달 만에 268% 올라 1배 숏이 청산된 구간',
    from: '2024-10',
    to: '2025-01',
  },
  {
    key: 'recent12m',
    label: '최근 12개월',
    description: '가장 최근 1년 — 지금 기대할 수 있는 현실적인 수준',
    from: FUNDING_MONTHS.at(-13)?.month ?? '2025-01',
    to: FUNDING_MONTHS.at(-2)?.month ?? '2025-12',
  },
  {
    key: 'all',
    label: '전체 기간',
    description: `${FUNDING_MONTHS[0]?.month} ~ ${FUNDING_MONTHS.at(-1)?.month} 전 구간`,
    from: FUNDING_MONTHS[0]?.month ?? '2020-01',
    to: FUNDING_MONTHS.at(-1)?.month ?? '2026-07',
  },
];
