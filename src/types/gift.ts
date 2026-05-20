export type Relationship =
  | 'spouse'
  | 'adultChild'
  | 'minorChild'
  | 'parent'
  | 'relative'
  | 'other';

export interface GiftTaxInput {
  amount: number;
  relationship: Relationship;
  previousGifts: number;
  isMarriageOrBirth: boolean;
  isGenerationSkip: boolean;
  isMinorOver20eok: boolean;
  applyReportingCredit: boolean;
}

export interface GiftTaxResult {
  amount: number;
  previousGifts: number;
  combinedAmount: number;
  baseDeduction: number;
  marriageBirthDeduction: number;
  totalDeduction: number;
  taxableBase: number;
  rate: number;
  progressiveDeduction: number;
  calculatedTax: number;
  generationSkipSurcharge: number;
  taxAfterSurcharge: number;
  reportingCreditAmount: number;
  finalTax: number;
  effectiveRate: number;
}
