import { useMemo, useState } from 'react';
import type { Relationship } from '../types/gift';
import { formatManwonDetail, formatPercent } from '../utils/format';
import {
  RELATIONSHIP_OPTIONS,
  TAX_BRACKETS,
  calculateGiftTax,
} from '../utils/giftTax';

export function GiftTaxCalculator() {
  const [amount, setAmount] = useState<number>(40000);
  const [previousGifts, setPreviousGifts] = useState<number>(0);
  const [relationship, setRelationship] = useState<Relationship>('other');
  const [isMarriageOrBirth, setIsMarriageOrBirth] = useState(false);
  const [isGenerationSkip, setIsGenerationSkip] = useState(false);
  const [isMinorOver20eok, setIsMinorOver20eok] = useState(false);
  const [applyReportingCredit, setApplyReportingCredit] = useState(true);

  const result = useMemo(
    () =>
      calculateGiftTax({
        amount,
        relationship,
        previousGifts,
        isMarriageOrBirth,
        isGenerationSkip,
        isMinorOver20eok,
        applyReportingCredit,
      }),
    [
      amount,
      relationship,
      previousGifts,
      isMarriageOrBirth,
      isGenerationSkip,
      isMinorOver20eok,
      applyReportingCredit,
    ],
  );

  const comparison = useMemo(() => {
    return RELATIONSHIP_OPTIONS.map((opt) => {
      const r = calculateGiftTax({
        amount,
        relationship: opt.key,
        previousGifts,
        isMarriageOrBirth: false,
        isGenerationSkip: false,
        isMinorOver20eok: false,
        applyReportingCredit,
      });
      return { ...opt, result: r };
    });
  }, [amount, previousGifts, applyReportingCredit]);

  const isMarriageEligible = relationship === 'adultChild' || relationship === 'minorChild';
  const isGenerationSkipEligible = relationship === 'adultChild' || relationship === 'minorChild';

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">증여세 계산기</h1>
        <p className="text-sm muted">
          관계별 공제·누진세율·신고세액공제·세대생략 할증까지 반영한 한국 증여세 단순 계산기
        </p>
      </header>

      {/* 결과 하이라이트 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <ResultCard label="증여재산가액" value={formatManwonDetail(amount)} />
        <ResultCard label="과세표준" value={formatManwonDetail(result.taxableBase)} />
        <ResultCard
          label="최종 납부세액"
          value={formatManwonDetail(result.finalTax)}
          accent="var(--color-danger)"
          highlight
        />
        <ResultCard
          label="세후 수령액"
          value={formatManwonDetail(amount - result.finalTax)}
          accent="var(--color-success)"
          highlight
        />
        <ResultCard
          label="실효세율"
          value={amount > 0 ? formatPercent(result.effectiveRate, 2) : '—'}
          accent="var(--color-warning)"
        />
      </div>

      {/* 입력 */}
      <div className="card-lg space-y-5">
        <h2 className="text-base font-bold">증여 정보 입력</h2>

        <div className="grid md:grid-cols-2 gap-x-6 gap-y-5">
          <NumberInput
            label="증여재산가액 (만원)"
            value={amount}
            onChange={setAmount}
            step={1000}
            hint={amount > 0 ? formatManwonDetail(amount) : '금액을 입력하세요'}
          />
          <NumberInput
            label="동일인 10년 내 누적 증여액 (만원)"
            value={previousGifts}
            onChange={setPreviousGifts}
            step={1000}
            hint={
              previousGifts > 0
                ? `합산 ${formatManwonDetail(amount + previousGifts)}`
                : '10년 합산 = 이번 증여만'
            }
          />
        </div>

        <div>
          <div className="text-sm font-semibold mb-2">증여자 ↔ 수증자 관계</div>
          <div className="flex flex-wrap gap-2">
            {RELATIONSHIP_OPTIONS.map((opt) => {
              const selected = relationship === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setRelationship(opt.key)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border"
                  style={{
                    borderColor: selected ? 'var(--color-schd)' : 'var(--color-border)',
                    color: selected ? 'var(--color-schd)' : 'var(--color-text-secondary)',
                    backgroundColor: selected
                      ? 'color-mix(in srgb, var(--color-schd) 10%, transparent)'
                      : 'transparent',
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          <p className="text-xs muted mt-2">
            {RELATIONSHIP_OPTIONS.find((o) => o.key === relationship)?.description}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <CheckOption
            label="혼인·출산 공제 (1억 추가)"
            description="직계존속 → 직계비속 · 혼인 전후 2년 또는 출산 후 2년 내 · 2024년 신설"
            checked={isMarriageOrBirth}
            onChange={setIsMarriageOrBirth}
            disabled={!isMarriageEligible}
          />
          <CheckOption
            label="세대생략 할증 (+30%)"
            description="조부모 → 손주 등 · 미성년 + 20억 초과 시 +40%"
            checked={isGenerationSkip}
            onChange={setIsGenerationSkip}
            disabled={!isGenerationSkipEligible}
          />
          <CheckOption
            label="미성년 + 20억 초과 (할증 40%)"
            description="세대생략 할증이 활성화된 경우에만 적용"
            checked={isMinorOver20eok}
            onChange={setIsMinorOver20eok}
            disabled={!isGenerationSkip}
          />
          <CheckOption
            label="자진 신고세액공제 (-3%)"
            description="증여일 속하는 달 말일부터 3개월 내 자진신고 시 산출세액의 3% 공제"
            checked={applyReportingCredit}
            onChange={setApplyReportingCredit}
          />
        </div>
      </div>

      {/* 계산 단계 */}
      <div className="card-lg">
        <h2 className="text-base font-bold mb-3">계산 과정</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody>
              <CalcRow label="① 증여재산가액" value={formatManwonDetail(result.amount)} />
              <CalcRow
                label="② 10년 합산 (동일인 누적)"
                value={`+ ${formatManwonDetail(result.previousGifts)} = ${formatManwonDetail(result.combinedAmount)}`}
              />
              <CalcRow
                label="③ 관계 공제"
                value={`- ${formatManwonDetail(result.baseDeduction)}`}
                muted
              />
              {result.marriageBirthDeduction > 0 && (
                <CalcRow
                  label="④ 혼인·출산 공제"
                  value={`- ${formatManwonDetail(result.marriageBirthDeduction)}`}
                  muted
                />
              )}
              <CalcRow
                label="⑤ 과세표준"
                value={formatManwonDetail(result.taxableBase)}
                emphasize
              />
              <CalcRow
                label={`⑥ 세율 (${formatPercent(result.rate, 0)}, 누진공제 ${formatManwonDetail(result.progressiveDeduction)})`}
                value={`산출세액 ${formatManwonDetail(result.calculatedTax)}`}
              />
              {result.generationSkipSurcharge > 0 && (
                <CalcRow
                  label="⑦ 세대생략 할증"
                  value={`+ ${formatManwonDetail(result.generationSkipSurcharge)}`}
                  accent="var(--color-warning)"
                />
              )}
              {result.reportingCreditAmount > 0 && (
                <CalcRow
                  label="⑧ 신고세액공제 (3%)"
                  value={`- ${formatManwonDetail(result.reportingCreditAmount)}`}
                  accent="var(--color-success)"
                />
              )}
              <CalcRow
                label="⑨ 최종 납부세액"
                value={formatManwonDetail(result.finalTax)}
                emphasize
                accent="var(--color-danger)"
              />
              <CalcRow
                label="⑩ 세후 수증자 수령액"
                value={formatManwonDetail(result.amount - result.finalTax)}
                emphasize
                accent="var(--color-success)"
              />
            </tbody>
          </table>
        </div>
      </div>

      {/* 관계별 비교 */}
      <div className="card-lg">
        <h2 className="text-base font-bold mb-3">관계별 세액 비교 (동일 금액 기준)</h2>
        <p className="text-xs muted mb-3">
          현재 입력한 증여재산 {formatManwonDetail(amount)}을 같은 금액으로 다른 관계에게 증여 시
          납부세액 (옵션 미적용 · 신고세액공제만 동일 적용)
        </p>
        <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
          <table className="w-full text-sm">
            <thead
              className="text-xs uppercase tracking-wider"
              style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)' }}
            >
              <tr>
                <th className="px-3 py-2 text-left">관계</th>
                <th className="px-3 py-2 text-right">공제</th>
                <th className="px-3 py-2 text-right">과세표준</th>
                <th className="px-3 py-2 text-right">납부세액</th>
                <th className="px-3 py-2 text-right">세후 수령액</th>
                <th className="px-3 py-2 text-right">실효세율</th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((row) => {
                const isCurrent = row.key === relationship;
                return (
                  <tr
                    key={row.key}
                    className="border-t"
                    style={{
                      borderColor: 'var(--color-border)',
                      backgroundColor: isCurrent
                        ? 'color-mix(in srgb, var(--color-schd) 8%, transparent)'
                        : undefined,
                    }}
                  >
                    <td className="px-3 py-2 font-semibold">
                      {row.label}
                      {isCurrent && (
                        <span
                          className="chip ml-2"
                          style={{
                            backgroundColor: 'color-mix(in srgb, var(--color-schd) 18%, transparent)',
                            color: 'var(--color-schd)',
                          }}
                        >
                          현재
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums muted">
                      {formatManwonDetail(row.result.totalDeduction)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatManwonDetail(row.result.taxableBase)}
                    </td>
                    <td
                      className="px-3 py-2 text-right tabular-nums font-semibold"
                      style={{ color: 'var(--color-danger)' }}
                    >
                      {formatManwonDetail(row.result.finalTax)}
                    </td>
                    <td
                      className="px-3 py-2 text-right tabular-nums font-bold"
                      style={{ color: 'var(--color-success)' }}
                    >
                      {formatManwonDetail(amount - row.result.finalTax)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums muted">
                      {amount > 0 ? formatPercent(row.result.effectiveRate, 2) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 세율 표 */}
      <div className="card-lg">
        <h2 className="text-base font-bold mb-3">증여세 누진세율표 (상속세 및 증여세법)</h2>
        <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
          <table className="w-full text-sm">
            <thead
              className="text-xs uppercase tracking-wider"
              style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)' }}
            >
              <tr>
                <th className="px-3 py-2 text-left">과세표준</th>
                <th className="px-3 py-2 text-right">세율</th>
                <th className="px-3 py-2 text-right">누진공제</th>
              </tr>
            </thead>
            <tbody>
              {TAX_BRACKETS.map((b) => (
                <tr key={b.label} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                  <td className="px-3 py-2">{b.label}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatPercent(b.rate, 0)}</td>
                  <td className="px-3 py-2 text-right tabular-nums muted">
                    {b.progressive > 0 ? formatManwonDetail(b.progressive) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div
        className="rounded-xl px-4 py-3 text-xs border leading-relaxed"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}
      >
        <strong>주의:</strong> 본 계산기는 단순 모델입니다. 부동산·주식 시가평가, 부담부증여(채무인수),
        창업자금/가업승계 특례, 비거주자 과세, 외국납부세액공제 등 특수 사례는 반영되지 않습니다.
        실제 신고 전 세무사 상담을 권장합니다.
      </div>
    </div>
  );
}

function ResultCard({
  label,
  value,
  accent,
  highlight,
}: {
  label: string;
  value: string;
  accent?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className="card"
      style={
        highlight
          ? {
              borderColor: accent ?? 'var(--color-schd)',
              backgroundColor: 'color-mix(in srgb, var(--color-danger) 6%, var(--color-surface))',
            }
          : undefined
      }
    >
      <div className="text-xs muted mb-1">{label}</div>
      <div className="text-xl md:text-2xl font-bold tabular-nums" style={{ color: accent }}>
        {value}
      </div>
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  step,
  hint,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step: number;
  hint?: string;
}) {
  return (
    <div>
      <label className="text-sm font-semibold block mb-2">{label}</label>
      <input
        type="number"
        value={value}
        min={0}
        step={step}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        className="w-full px-3 py-2 rounded-lg border tabular-nums text-base font-semibold"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
          color: 'var(--color-text)',
        }}
      />
      {hint && <div className="text-xs muted mt-1.5">{hint}</div>}
    </div>
  );
}

function CheckOption({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (b: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors"
      style={{
        borderColor: checked && !disabled ? 'var(--color-schd)' : 'var(--color-border)',
        backgroundColor:
          checked && !disabled
            ? 'color-mix(in srgb, var(--color-schd) 8%, transparent)'
            : 'transparent',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <input
        type="checkbox"
        checked={checked && !disabled}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5"
      />
      <div className="flex-1">
        <div className="text-sm font-semibold">{label}</div>
        <div className="text-xs muted mt-0.5">{description}</div>
      </div>
    </label>
  );
}

function CalcRow({
  label,
  value,
  emphasize,
  muted,
  accent,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
  muted?: boolean;
  accent?: string;
}) {
  return (
    <tr className="border-t" style={{ borderColor: 'var(--color-border)' }}>
      <td
        className="px-3 py-2.5 text-sm"
        style={{ color: muted ? 'var(--color-text-secondary)' : undefined }}
      >
        {label}
      </td>
      <td
        className="px-3 py-2.5 text-right tabular-nums text-sm"
        style={{
          fontWeight: emphasize ? 700 : 500,
          color: accent ?? (muted ? 'var(--color-text-secondary)' : undefined),
          fontSize: emphasize ? '1rem' : undefined,
        }}
      >
        {value}
      </td>
    </tr>
  );
}
