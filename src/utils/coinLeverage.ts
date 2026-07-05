import type {
  CoinLeverageParams,
  LadderEntryInput,
  LadderRowResult,
  PnlRow,
  PositionSide,
} from '../types/coin';

/**
 * 청산가 계산 (크로스 마진 모델, 수수료·펀딩비 미반영)
 * 계좌 총 자금(equity) 전체가 이 포지션의 증거금으로 사용된다고 가정 (다른 동시 포지션 없음 전제).
 * 청산 조건: equity + 미실현손익 = 유지증거금(수량 × 가격 × MMR)
 */
export function calcLiquidationPrice(
  avgPrice: number,
  cumQty: number,
  equity: number,
  maintenanceMarginRate: number,
  side: PositionSide,
): number {
  if (cumQty <= 0 || avgPrice <= 0) return 0;
  if (side === 'long') {
    const denom = cumQty * (1 - maintenanceMarginRate);
    if (denom <= 0) return 0;
    return Math.max(0, (cumQty * avgPrice - equity) / denom);
  }
  const denom = cumQty * (1 + maintenanceMarginRate);
  if (denom <= 0) return 0;
  return (equity + cumQty * avgPrice) / denom;
}

export function buildLadder(params: CoinLeverageParams): LadderRowResult[] {
  const { totalCapital, leverage, side, maintenanceMarginRate, entries } = params;
  const firstPrice = entries[0]?.price ?? 0;

  let cumMargin = 0;
  let cumQty = 0;

  return entries.map((entry: LadderEntryInput) => {
    const margin = (totalCapital * entry.ratio) / 100;
    const qty = entry.price > 0 ? (margin * leverage) / entry.price : 0;

    cumMargin += margin;
    cumQty += qty;

    const avgPrice = cumQty > 0 ? (cumMargin * leverage) / cumQty : 0;
    const liqPrice = calcLiquidationPrice(avgPrice, cumQty, totalCapital, maintenanceMarginRate, side);
    const changeFromFirst = firstPrice > 0 ? (entry.price - firstPrice) / firstPrice : 0;

    const stagePnl = side === 'long' ? cumQty * (entry.price - avgPrice) : cumQty * (avgPrice - entry.price);
    const stageRoe = cumMargin > 0 ? stagePnl / cumMargin : 0;

    return {
      id: entry.id,
      price: entry.price,
      ratio: entry.ratio,
      margin,
      qty,
      cumMargin,
      cumQty,
      avgPrice,
      liqPrice,
      changeFromFirst,
      stagePnl,
      stageRoe,
    };
  });
}

/**
 * 평단가 대비 "유리한 방향"으로 움직였을 때의 수익 시뮬레이션.
 * moves 는 항상 양수(변동폭)이며, 롱은 상승/숏은 하락 방향으로 적용된다.
 * 손실·청산 위험은 청산가로 별도 확인하므로 이 표는 수익 구간만 다룬다.
 */
export function buildPnlTable(
  avgPrice: number,
  cumQty: number,
  cumMargin: number,
  side: PositionSide,
  moves: number[],
): PnlRow[] {
  return moves.map((movePct) => {
    const directional = side === 'long' ? movePct : -movePct;
    const price = avgPrice * (1 + directional);
    const pnl = side === 'long' ? cumQty * (price - avgPrice) : cumQty * (avgPrice - price);
    const roe = cumMargin > 0 ? pnl / cumMargin : 0;
    return { changePct: movePct, price, pnl, roe };
  });
}

// 0.3% ~ 10.0% 구간은 0.1%p 단위(98개), 10% ~ 200% 구간은 1%p 단위(190개)로 생성
const FINE_PNL_CHANGES = Array.from({ length: 98 }, (_, i) => (i + 3) / 1000);
const COARSE_PNL_CHANGES = Array.from({ length: 190 }, (_, i) => (i + 11) / 100);
export const DEFAULT_PNL_CHANGES = [...FINE_PNL_CHANGES, ...COARSE_PNL_CHANGES];
