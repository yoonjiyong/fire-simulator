import type { GiftTaxInput, GiftTaxResult, Relationship } from '../types/gift';

export const RELATIONSHIP_OPTIONS: Array<{
  key: Relationship;
  label: string;
  description: string;
  deduction: number;
}> = [
  { key: 'spouse', label: '배우자', description: '법률혼 배우자 · 10년 합산 6억', deduction: 60000 },
  { key: 'adultChild', label: '성년 자녀·손주', description: '직계비속 성년 · 10년 합산 5천만', deduction: 5000 },
  { key: 'minorChild', label: '미성년 자녀·손주', description: '직계비속 미성년 · 10년 합산 2천만', deduction: 2000 },
  { key: 'parent', label: '부모·조부모', description: '직계존속 (자녀가 부모에게) · 10년 합산 5천만', deduction: 5000 },
  { key: 'relative', label: '기타 친족', description: '6촌 이내 혈족, 4촌 이내 인척 · 10년 합산 1천만', deduction: 1000 },
  { key: 'other', label: '타인 (비친족)', description: '친족이 아닌 자 · 공제 없음', deduction: 0 },
];

export const RELATIONSHIP_LABELS: Record<Relationship, string> = Object.fromEntries(
  RELATIONSHIP_OPTIONS.map((o) => [o.key, o.label]),
) as Record<Relationship, string>;

export const RELATIONSHIP_DEDUCTION: Record<Relationship, number> = Object.fromEntries(
  RELATIONSHIP_OPTIONS.map((o) => [o.key, o.deduction]),
) as Record<Relationship, number>;

export const MARRIAGE_BIRTH_DEDUCTION = 10000;

export interface TaxBracket {
  upTo: number;
  rate: number;
  progressive: number;
  label: string;
}

export const TAX_BRACKETS: TaxBracket[] = [
  { upTo: 10000, rate: 0.1, progressive: 0, label: '1억 이하' },
  { upTo: 50000, rate: 0.2, progressive: 1000, label: '5억 이하' },
  { upTo: 100000, rate: 0.3, progressive: 6000, label: '10억 이하' },
  { upTo: 300000, rate: 0.4, progressive: 16000, label: '30억 이하' },
  { upTo: Number.POSITIVE_INFINITY, rate: 0.5, progressive: 46000, label: '30억 초과' },
];

export function findBracket(taxableBase: number): TaxBracket {
  return TAX_BRACKETS.find((b) => taxableBase <= b.upTo) ?? TAX_BRACKETS[TAX_BRACKETS.length - 1];
}

export function calculateGiftTax(input: GiftTaxInput): GiftTaxResult {
  const {
    amount,
    relationship,
    previousGifts,
    isMarriageOrBirth,
    isGenerationSkip,
    isMinorOver20eok,
    applyReportingCredit,
  } = input;

  const combinedAmount = amount + previousGifts;
  const baseDeduction = RELATIONSHIP_DEDUCTION[relationship];

  const eligibleForMarriage =
    isMarriageOrBirth && (relationship === 'adultChild' || relationship === 'minorChild');
  const marriageBirthDeduction = eligibleForMarriage ? MARRIAGE_BIRTH_DEDUCTION : 0;

  const totalDeduction = baseDeduction + marriageBirthDeduction;
  const taxableBase = Math.max(0, combinedAmount - totalDeduction);

  const bracket = findBracket(taxableBase);
  const calculatedTax =
    taxableBase > 0 ? Math.max(0, taxableBase * bracket.rate - bracket.progressive) : 0;

  let generationSkipSurcharge = 0;
  if (isGenerationSkip && calculatedTax > 0) {
    const surchargeRate = isMinorOver20eok ? 0.4 : 0.3;
    generationSkipSurcharge = calculatedTax * surchargeRate;
  }
  const taxAfterSurcharge = calculatedTax + generationSkipSurcharge;

  const reportingCreditAmount = applyReportingCredit ? taxAfterSurcharge * 0.03 : 0;
  const finalTax = Math.max(0, taxAfterSurcharge - reportingCreditAmount);

  const effectiveRate = amount > 0 ? finalTax / amount : 0;

  return {
    amount,
    previousGifts,
    combinedAmount,
    baseDeduction,
    marriageBirthDeduction,
    totalDeduction,
    taxableBase,
    rate: bracket.rate,
    progressiveDeduction: bracket.progressive,
    calculatedTax,
    generationSkipSurcharge,
    taxAfterSurcharge,
    reportingCreditAmount,
    finalTax,
    effectiveRate,
  };
}
