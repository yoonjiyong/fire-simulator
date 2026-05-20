import type { ThemeMode } from '../hooks/useTheme';
import { useSimulation } from '../hooks/useSimulation';
import { ACCOUNT_RULES } from '../utils/constants';
import { AlertBox } from './AlertBox';
import { BottomSummary } from './BottomSummary';
import { ControlPanel } from './ControlPanel';
import { FxInsight } from './FxInsight';
import { IncomeChart } from './IncomeChart';
import { IncomeTable } from './IncomeTable';
import { StrategyCompare } from './StrategyCompare';
import { SummaryCards } from './SummaryCards';

interface FireCalculatorProps {
  theme: ThemeMode;
}

export function FireCalculator({ theme }: FireCalculatorProps) {
  const state = useSimulation();

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
          FIRE 포트폴리오 시뮬레이터
        </h1>
        <p className="text-sm muted">
          SCHD + JEPI 배당 조합으로 30년간 세후 월 수입과 실질 구매력을 시뮬레이션합니다.
          {' · '}
          현재 계좌:{' '}
          <span style={{ color: 'var(--color-schd)' }}>
            {ACCOUNT_RULES[state.accountType].label}
          </span>
        </p>
      </header>

      <SummaryCards result={state.result} />

      <ControlPanel state={state} />

      <AlertBox result={state.result} monthlyExpense={state.monthlyExpense} />

      <FxInsight result={state.result} shock={state.exchangeRateShock} />

      <IncomeChart
        result={state.result}
        resultB={state.resultB}
        strategyBLabel={state.strategyB.label}
        theme={theme}
      />

      <StrategyCompare state={state} />

      <IncomeTable
        result={state.result}
        monthlyExpense={state.monthlyExpense}
        inflationRate={state.inflationRate}
      />

      <BottomSummary result={state.result} startAge={state.startAge} />
    </div>
  );
}
