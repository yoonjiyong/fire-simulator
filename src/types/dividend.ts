export type EtfRegion = 'US' | 'KR';
export type EtfCurrency = 'USD' | 'KRW';
export type PayoutFrequency = 'monthly' | 'quarterly';

export interface DividendEtf {
  ticker: string;
  name: string;
  region: EtfRegion;
  currency: EtfCurrency;
  category: string;
  payoutFrequency: PayoutFrequency;
  defaultYield: number; // decimal, e.g. 0.038 = 3.8%
  defaultGrowthRate: number; // decimal annual price growth assumption
  accent: string;
}

export interface EtfSelection {
  ticker: string;
  enabled: boolean;
  ratio: number; // percent of total capital, 0-100
  yieldRate: number; // decimal, editable override of defaultYield
  growthRate: number; // decimal, editable override of defaultGrowthRate
}

export interface AssetHolding {
  ticker: string;
  name: string;
  accent: string;
  ratio: number;
  initialValue: number;
}
