export type AccountType = 'general' | 'isa' | 'pension' | 'irp';

export interface AssetHolding {
  ticker: string;
  name: string;
  accent: string;
  ratio: number;
  initialValue: number;
}

export interface YearResult {
  year: number;
  age: number;
  totalValue: number;
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
  holdings: AssetHolding[];
  thresholdEnteredYear: number | null;
  effectiveTaxRate: number;
}
