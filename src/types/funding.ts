export type MarketRegime = 'bull' | 'bear' | 'sideways';

/** 펀비 계산기가 지원하는 코인. data/coinFunding.ts 의 키와 1:1 대응. */
export type CoinKey = 'BTC' | 'ETH' | 'XRP' | 'SOL';

/** 바이낸스 무기한 선물 펀딩비 이력의 월별 집계 (scripts/fetchFundingHistory.mjs 생성) */
export interface FundingMonth {
  month: string; // 'YYYY-MM' (UTC)
  firstPrice: number; // 월 첫 정산 시점 마크가 (USD)
  lastPrice: number; // 월 마지막 정산 시점 마크가 (USD)
  highPrice: number; // 월중 최고가 (USD) — 숏 청산 판정에 쓴다
  priceChange: number; // decimal, 0.1 = +10%
  fundingCount: number; // 이 달의 정산 횟수 (보통 90회 전후)
  avgRate: number; // 8시간당 평균 펀딩비율 (decimal)
  fundingYield: number; // 숏 명목가 대비 월 펀딩비 수익률 (decimal, 양수 = 수취)
  regime: MarketRegime;
}

export interface FundingRegimeSummary {
  monthCount: number;
  avgFundingYield: number;
  medianFundingYield: number;
  minFundingYield: number;
  maxFundingYield: number;
  positiveRatio: number; // 펀딩비를 수취한 달의 비율 (0~1)
}

export interface FundingParams {
  totalCapital: number; // 총 투입금 (만원)
  // 기간 전체 누적 펀딩비 수익률 (decimal, 진입 시점 숏 명목가 대비).
  // 기간 중 명목가 변화는 이 값에 이미 반영되어 있어야 한다.
  totalFundingYield: number;
  months: number; // 보유 기간 (개월) — 월평균·연 환산 표시에만 사용
  priceChange: number; // 기간 전체(진입 → 종료) 가격 변동률 (decimal)
  // 기간 중 고점의 진입가 대비 변동률. 숏 청산은 종료가가 아니라 고점으로 판정해야 하므로
  // 중간에 급등했다 되돌아온 구간도 잡아낸다. 생략하면 종료가 기준으로 본다.
  maxPriceChange?: number;
}

export interface FundingResult {
  spotCapital: number; // 현물 투입금 (만원)
  shortCapital: number; // 숏 증거금 = 숏 명목가 (1배) (만원)
  spotPnl: number; // 현물 평가손익 (만원)
  shortPnl: number; // 숏 평가손익 (만원)
  fundingIncome: number; // 기간 누적 펀딩비 (만원)
  netPnl: number; // 최종 순손익 (만원)
  netRoi: number; // 총 투입금 대비 수익률 (decimal)
  monthlyIncome: number; // 월평균 펀딩비 (만원)
  annualizedRoi: number; // 연 환산 수익률 (decimal)
  isLiquidated: boolean; // 1배 숏 청산(가격 2배) 도달 여부
}
