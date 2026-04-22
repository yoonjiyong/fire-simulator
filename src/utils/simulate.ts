import type { SimulationParams, SimulationResult, YearResult } from '../types';
import { ACCOUNT_RULES, DEFAULTS } from './constants';

function computeTax(
  gross: number,
  accountType: SimulationParams['accountType'],
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

export function simulate(params: SimulationParams): SimulationResult {
  const {
    schdRatio,
    totalInvestment,
    schdGrowthRate,
    jepiGrowthRate,
    schdDividendYield,
    jepiDividendYield,
    taxRate,
    inflationRate,
    monthlyExpense,
    startAge,
    years,
    accountType,
    exchangeRateShock,
  } = params;

  const schdInitial = Math.round((totalInvestment * schdRatio) / 100);
  const jepiInitial = Math.round(totalInvestment - schdInitial);
  const rows: YearResult[] = [];
  let cumulativeNet = 0;
  let thresholdEnteredYear: number | null = null;
  let totalEffectiveRateSum = 0;
  let effectiveRateCount = 0;

  for (let y = 0; y <= years; y++) {
    const schdValue = schdInitial * Math.pow(1 + schdGrowthRate, y);
    const jepiValue = jepiInitial * Math.pow(1 + jepiGrowthRate, y);
    const totalValue = schdValue + jepiValue;

    const schdDividend = schdValue * schdDividendYield;
    const jepiDividend = jepiValue * jepiDividendYield;
    const grossDividend = schdDividend + jepiDividend;

    const { tax, effectiveRate } = computeTax(grossDividend, accountType, taxRate);
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
      schdValue,
      jepiValue,
      totalValue,
      schdDividend,
      jepiDividend,
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
    schdInitial,
    jepiInitial,
    thresholdEnteredYear,
    effectiveTaxRate: effectiveRateCount > 0 ? totalEffectiveRateSum / effectiveRateCount : taxRate,
  };
}
