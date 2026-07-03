import type { AccountType, AssetHolding, SimulationResult, YearResult } from '../types';
import type { EtfSelection } from '../types/dividend';
import { DIVIDEND_ETFS } from './dividendEtfs';
import { ACCOUNT_RULES, DEFAULTS } from './constants';

function computeTax(
  gross: number,
  accountType: AccountType,
  defaultRate: number,
): { tax: number; effectiveRate: number } {
  const rule = ACCOUNT_RULES[accountType];
  if (accountType === 'general') {
    return { tax: gross * defaultRate, effectiveRate: defaultRate };
  }
  if (accountType === 'isa') {
    const taxable = Math.max(0, gross - rule.annualDeduction);
    const tax = taxable * rule.excessTaxRate;
    return { tax, effectiveRate: gross > 0 ? tax / gross : 0 };
  }
  const tax = gross * rule.taxRate;
  return { tax, effectiveRate: rule.taxRate };
}

export interface DividendSimParams {
  totalInvestment: number; // 만원
  selections: EtfSelection[];
  inflationRate: number;
  monthlyExpense: number;
  startAge: number;
  years: number;
  accountType: AccountType;
  exchangeRateShock: number;
}

export function simulateDividend(params: DividendSimParams): SimulationResult {
  const {
    totalInvestment,
    selections,
    inflationRate,
    monthlyExpense,
    startAge,
    years,
    accountType,
    exchangeRateShock,
  } = params;

  const active = selections.filter((s) => s.enabled && s.ratio > 0);

  const holdings: AssetHolding[] = active.map((s) => {
    const etf = DIVIDEND_ETFS.find((e) => e.ticker === s.ticker);
    return {
      ticker: s.ticker,
      name: etf?.name ?? s.ticker,
      accent: etf?.accent ?? 'var(--color-schd)',
      ratio: s.ratio,
      initialValue: Math.round((totalInvestment * s.ratio) / 100),
    };
  });

  const rows: YearResult[] = [];
  let cumulativeNet = 0;
  let thresholdEnteredYear: number | null = null;
  let totalEffectiveRateSum = 0;
  let effectiveRateCount = 0;

  for (let y = 0; y <= years; y++) {
    let totalValue = 0;
    let grossDividend = 0;

    for (const holding of holdings) {
      const selection = active.find((s) => s.ticker === holding.ticker)!;
      const value = holding.initialValue * Math.pow(1 + selection.growthRate, y);
      totalValue += value;
      grossDividend += value * selection.yieldRate;
    }

    const { tax, effectiveRate } = computeTax(grossDividend, accountType, DEFAULTS.TAX_RATE);
    totalEffectiveRateSum += effectiveRate;
    effectiveRateCount += 1;

    const netDividend = grossDividend - tax;
    const monthlyIncome = netDividend / 12;
    const realMonthlyIncome = monthlyIncome / Math.pow(1 + inflationRate, y);
    const monthlyExpenseNominal = monthlyExpense * Math.pow(1 + inflationRate, y);

    cumulativeNet += netDividend;

    const overThreshold = grossDividend > DEFAULTS.COMPREHENSIVE_TAX_THRESHOLD;
    if (overThreshold && thresholdEnteredYear === null) {
      thresholdEnteredYear = y;
    }

    const fxAdjustedMonthly = monthlyIncome * (1 + exchangeRateShock);

    rows.push({
      year: y,
      age: startAge + y,
      totalValue,
      grossDividend,
      tax,
      netDividend,
      monthlyIncome,
      realMonthlyIncome,
      monthlyExpenseNominal,
      cumulativeNet,
      isOverThreshold: overThreshold,
      fxAdjustedMonthly,
    });
  }

  return {
    rows,
    holdings,
    thresholdEnteredYear,
    effectiveTaxRate: effectiveRateCount > 0 ? totalEffectiveRateSum / effectiveRateCount : DEFAULTS.TAX_RATE,
  };
}
