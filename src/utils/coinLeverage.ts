import type {
  CoinLeverageParams,
  LadderEntryInput,
  LadderRowResult,
  PnlRow,
  PositionSide,
} from '../types/coin';

/**
 * 청산가 계산 (격리 마진 단순 모델, 수수료·펀딩비 미반영)
 * 거래소들이 공통적으로 안내하는 근사식: entry × (1 ∓ 1/leverage ± MMR)
 */
export function calcLiquidationPrice(
  avgPrice: number,
  leverage: number,
  maintenanceMarginRate: number,
  side: PositionSide,
): number {
  if (leverage <= 0 || avgPrice <= 0) return 0;
  const initialMarginRate = 1 / leverage;
  if (side === 'long') {
    return avgPrice * (1 - initialMarginRate + maintenanceMarginRate);
  }
  return avgPrice * (1 + initialMarginRate - maintenanceMarginRate);
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
    const liqPrice = calcLiquidationPrice(avgPrice, leverage, maintenanceMarginRate, side);
    const changeFromFirst = firstPrice > 0 ? (entry.price - firstPrice) / firstPrice : 0;

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
    };
  });
}

export function buildPnlTable(
  avgPrice: number,
  cumQty: number,
  cumMargin: number,
  side: PositionSide,
  changes: number[],
): PnlRow[] {
  return changes.map((changePct) => {
    const price = avgPrice * (1 + changePct);
    const pnl = side === 'long' ? cumQty * (price - avgPrice) : cumQty * (avgPrice - price);
    const roe = cumMargin > 0 ? pnl / cumMargin : 0;
    return { changePct, price, pnl, roe };
  });
}

export const DEFAULT_PNL_CHANGES = [-0.3, -0.2, -0.15, -0.1, -0.05, -0.02, 0, 0.02, 0.05, 0.1, 0.15, 0.2, 0.3];
