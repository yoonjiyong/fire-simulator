import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ThemeMode } from '../hooks/useTheme';
import type { SimulationResult } from '../types';
import { formatMonthly } from '../utils/format';

interface IncomeChartProps {
  result: SimulationResult;
  theme: ThemeMode;
}

interface ChartPoint {
  year: number;
  age: number;
  net: number;
  real: number;
  expense: number;
}

const THEME_COLORS: Record<ThemeMode, {
  primary: string;
  warning: string;
  text: string;
  grid: string;
  tooltipBg: string;
  tooltipText: string;
}> = {
  light: {
    primary: '#378add',
    warning: '#ba7517',
    text: '#6b6b65',
    grid: '#e5e5e0',
    tooltipBg: '#ffffff',
    tooltipText: '#1a1a1a',
  },
  sepia: {
    primary: '#2c6fa3',
    warning: '#a26515',
    text: '#7a6644',
    grid: '#d8c9a3',
    tooltipBg: '#fbf2d9',
    tooltipText: '#4b3a24',
  },
  dark: {
    primary: '#85b7eb',
    warning: '#fac775',
    text: '#a0a098',
    grid: '#303030',
    tooltipBg: '#202020',
    tooltipText: '#e8e8e0',
  },
};

export function IncomeChart({ result, theme }: IncomeChartProps) {
  const colors = THEME_COLORS[theme];

  const data: ChartPoint[] = result.rows.map((row) => ({
    year: row.year,
    age: row.age,
    net: Math.round(row.monthlyIncome),
    real: Math.round(row.realMonthlyIncome),
    expense: Math.round(row.monthlyExpenseNominal),
  }));

  return (
    <div className="card-lg">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-base font-bold">세후 월 배당 수입 추이</h2>
        <span className="text-xs muted">단위: 만원 · 명목 금액 기준</span>
      </div>
      <div className="h-[260px] md:h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
            <XAxis
              dataKey="year"
              stroke={colors.text}
              tick={{ fontSize: 11 }}
              label={{ value: '연차', position: 'insideBottom', offset: -2, fill: colors.text, fontSize: 11 }}
            />
            <YAxis
              stroke={colors.text}
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => `${v}만`}
              width={56}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: colors.tooltipBg,
                borderColor: colors.grid,
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: colors.tooltipText, fontWeight: 600 }}
              formatter={(value: number, name: string) => [formatMonthly(value), name]}
              labelFormatter={(label) => {
                const row = result.rows.find((r) => r.year === label);
                return `${label}년차${row ? ` · ${row.age}세` : ''}`;
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="plainline" />
            <Line
              type="monotone"
              dataKey="net"
              name="세후 월 수입"
              stroke={colors.primary}
              strokeWidth={2.5}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="real"
              name="실질 구매력"
              stroke={colors.primary}
              strokeWidth={1.6}
              strokeDasharray="5 3"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="expense"
              name="필요 생활비"
              stroke={colors.warning}
              strokeWidth={1.2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
