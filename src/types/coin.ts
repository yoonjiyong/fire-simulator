export type PositionSide = 'long' | 'short';

export interface LadderEntryInput {
  id: string;
  price: number;
  ratio: number; // 총 자금 대비 투입 비율 (%)
}

export interface LadderRowResult {
  id: string;
  price: number;
  ratio: number;
  margin: number; // 이 단계 투입 증거금 (USD)
  qty: number; // 이 단계 매수 수량
  cumMargin: number; // 누적 증거금 (USD)
  cumQty: number; // 누적 수량
  avgPrice: number; // 누적 평단가
  liqPrice: number; // 누적 기준 청산가
  changeFromFirst: number; // 최초 진입가 대비 변동률 (-0.1 = -10%)
  stagePnl: number; // 이 단계 가격 기준 평가손익 (USD)
  stageRoe: number; // 이 단계 기준 수익률 (누적 증거금 대비)
}

export interface CoinLeverageParams {
  totalCapital: number;
  leverage: number;
  side: PositionSide;
  maintenanceMarginRate: number; // decimal, e.g. 0.005 = 0.5%
  entries: LadderEntryInput[];
}

export interface PnlRow {
  changePct: number; // decimal, e.g. 0.1 = +10%
  price: number;
  pnl: number; // USD
  roe: number; // decimal, relative to invested margin
}
