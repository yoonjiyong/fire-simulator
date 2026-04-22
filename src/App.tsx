import { AlertBox } from './components/AlertBox';
import { BottomSummary } from './components/BottomSummary';
import { ControlPanel } from './components/ControlPanel';
import { Footer } from './components/Footer';
import { FxInsight } from './components/FxInsight';
import { IncomeChart } from './components/IncomeChart';
import { IncomeTable } from './components/IncomeTable';
import { StrategyCompare } from './components/StrategyCompare';
import { SummaryCards } from './components/SummaryCards';
import { ThemeToggle } from './components/ThemeToggle';
import { useSimulation } from './hooks/useSimulation';
import { useTheme } from './hooks/useTheme';
import { ACCOUNT_RULES } from './utils/constants';

export default function App() {
  const state = useSimulation();
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-full" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-10 space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              FIRE 포트폴리오 시뮬레이터
            </h1>
            <p className="text-sm muted">
              SCHD + JEPI 배당 조합으로 30년간 세후 월 수입과 실질 구매력을 시뮬레이션합니다.
              {' · '}
              현재 계좌: <span style={{ color: 'var(--color-schd)' }}>{ACCOUNT_RULES[state.accountType].label}</span>
            </p>
          </div>
          <ThemeToggle theme={theme} onChange={setTheme} />
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

        <Footer />
      </div>
    </div>
  );
}
