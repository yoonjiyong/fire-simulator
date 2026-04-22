import { useMemo, useState } from 'react';
import type { AccountType, SimulationParams, StrategyConfig } from '../types';
import { DEFAULTS } from '../utils/constants';
import { simulate } from '../utils/simulate';

function buildParams(overrides: Partial<SimulationParams>): SimulationParams {
  return {
    schdRatio: DEFAULTS.SCHD_RATIO,
    totalInvestment: DEFAULTS.TOTAL_INVESTMENT,
    schdGrowthRate: DEFAULTS.SCHD_GROWTH_RATE,
    jepiGrowthRate: DEFAULTS.JEPI_GROWTH_RATE,
    schdDividendYield: DEFAULTS.SCHD_DIVIDEND_YIELD,
    jepiDividendYield: DEFAULTS.JEPI_DIVIDEND_YIELD,
    taxRate: DEFAULTS.TAX_RATE,
    inflationRate: DEFAULTS.INFLATION_RATE,
    monthlyExpense: DEFAULTS.MONTHLY_EXPENSE,
    startAge: DEFAULTS.START_AGE,
    years: DEFAULTS.SIMULATION_YEARS,
    accountType: 'general',
    exchangeRateShock: DEFAULTS.EXCHANGE_RATE_SHOCK,
    ...overrides,
  };
}

export function useSimulation() {
  const [schdRatio, setSchdRatio] = useState<number>(DEFAULTS.SCHD_RATIO);
  const [totalInvestment, setTotalInvestment] = useState<number>(DEFAULTS.TOTAL_INVESTMENT);
  const [schdGrowthRate, setSchdGrowthRate] = useState<number>(DEFAULTS.SCHD_GROWTH_RATE);
  const [inflationRate, setInflationRate] = useState<number>(DEFAULTS.INFLATION_RATE);
  const [monthlyExpense, setMonthlyExpense] = useState<number>(DEFAULTS.MONTHLY_EXPENSE);
  const [startAge, setStartAge] = useState<number>(DEFAULTS.START_AGE);
  const [accountType, setAccountType] = useState<AccountType>('general');
  const [exchangeRateShock, setExchangeRateShock] = useState<number>(DEFAULTS.EXCHANGE_RATE_SHOCK);

  const [compareEnabled, setCompareEnabled] = useState(false);
  const [strategyB, setStrategyB] = useState<StrategyConfig>({
    label: '전략 B',
    schdRatio: 50,
    schdGrowthRate: 0.06,
  });

  const baseParams = useMemo(
    () =>
      buildParams({
        schdRatio,
        totalInvestment,
        schdGrowthRate,
        inflationRate,
        monthlyExpense,
        startAge,
        accountType,
        exchangeRateShock,
      }),
    [
      schdRatio,
      totalInvestment,
      schdGrowthRate,
      inflationRate,
      monthlyExpense,
      startAge,
      accountType,
      exchangeRateShock,
    ],
  );

  const resultA = useMemo(() => simulate(baseParams), [baseParams]);

  const resultB = useMemo(() => {
    if (!compareEnabled) return null;
    return simulate({
      ...baseParams,
      schdRatio: strategyB.schdRatio,
      schdGrowthRate: strategyB.schdGrowthRate,
    });
  }, [baseParams, compareEnabled, strategyB]);

  return {
    schdRatio,
    setSchdRatio,
    totalInvestment,
    setTotalInvestment,
    schdGrowthRate,
    setSchdGrowthRate,
    inflationRate,
    setInflationRate,
    monthlyExpense,
    setMonthlyExpense,
    startAge,
    setStartAge,
    accountType,
    setAccountType,
    exchangeRateShock,
    setExchangeRateShock,
    compareEnabled,
    setCompareEnabled,
    strategyB,
    setStrategyB,
    result: resultA,
    resultB,
    params: baseParams,
  };
}

export type SimulationState = ReturnType<typeof useSimulation>;
