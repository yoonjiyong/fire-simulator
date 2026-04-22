export type AccountType = 'general' | 'isa' | 'pension' | 'irp';

export interface SimulationParams {
  schdRatio: number;
  totalInvestment: number;
  schdGrowthRate: number;
  jepiGrowthRate: number;
  schdDividendYield: number;
  jepiDividendYield: number;
  taxRate: number;
  inflationRate: number;
  monthlyExpense: number;
  startAge: number;
  years: number;
  accountType: AccountType;
  exchangeRateShock: number;
}

export interface YearResult {
  year: number;
  age: number;
  schdValue: number;
  jepiValue: number;
  totalValue: number;
  schdDividend: number;
  jepiDividend: number;
  grossDividend: number;
  tax: number;
  netDividend: number;
  monthlyIncome: number;
  realMonthlyIncome: number;
  monthlyExpenseNominal: number;
  cumulativeNet: number;
  isOverThreshold: boolean;
  fxAdjustedMonthly: number;
}

export interface SimulationResult {
  rows: YearResult[];
  schdInitial: number;
  jepiInitial: number;
  thresholdEnteredYear: number | null;
  effectiveTaxRate: number;
}

export interface StrategyConfig {
  label: string;
  schdRatio: number;
  schdGrowthRate: number;
}
