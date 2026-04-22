import type { AccountType } from '../types';

export const DEFAULTS = {
  SCHD_DIVIDEND_YIELD: 0.035,
  JEPI_DIVIDEND_YIELD: 0.075,
  SCHD_GROWTH_RATE: 0.06,
  JEPI_GROWTH_RATE: 0,
  TAX_RATE: 0.154,
  INFLATION_RATE: 0.025,
  MONTHLY_EXPENSE: 120,
  START_AGE: 46,
  SIMULATION_YEARS: 30,
  COMPREHENSIVE_TAX_THRESHOLD: 2000,
  TOTAL_INVESTMENT: 40000,
  SCHD_RATIO: 80,
  EXCHANGE_RATE_SHOCK: 0,
} as const;

export const LIMITS = {
  SCHD_RATIO: { min: 0, max: 100, step: 5 },
  TOTAL_INVESTMENT: { min: 10000, max: 100000, step: 5000 },
  SCHD_GROWTH_RATE: { min: 0.02, max: 0.1, step: 0.005 },
  INFLATION_RATE: { min: 0.01, max: 0.05, step: 0.005 },
  MONTHLY_EXPENSE: { min: 50, max: 300, step: 10 },
  START_AGE: { min: 30, max: 60, step: 1 },
  EXCHANGE_RATE_SHOCK: { min: -0.3, max: 0.3, step: 0.01 },
} as const;

export interface AccountRule {
  key: AccountType;
  label: string;
  description: string;
  taxRate: number;
  annualDeduction: number;
  excessTaxRate: number;
  deferred: boolean;
}

export const ACCOUNT_RULES: Record<AccountType, AccountRule> = {
  general: {
    key: 'general',
    label: '일반 과세',
    description: '배당소득세 15.4% 분리과세',
    taxRate: 0.154,
    annualDeduction: 0,
    excessTaxRate: 0.154,
    deferred: false,
  },
  isa: {
    key: 'isa',
    label: 'ISA (비과세)',
    description: '연 200만원까지 비과세 · 초과분 9.9% 분리과세',
    taxRate: 0,
    annualDeduction: 200,
    excessTaxRate: 0.099,
    deferred: false,
  },
  pension: {
    key: 'pension',
    label: '연금저축',
    description: '과세이연 · 인출 시 5.5% (단순화)',
    taxRate: 0.055,
    annualDeduction: 0,
    excessTaxRate: 0.055,
    deferred: true,
  },
  irp: {
    key: 'irp',
    label: 'IRP',
    description: '과세이연 · 인출 시 3.3% (단순화)',
    taxRate: 0.033,
    annualDeduction: 0,
    excessTaxRate: 0.033,
    deferred: true,
  },
};
