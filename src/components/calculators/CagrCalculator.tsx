import { useMemo } from 'react';
import { CurrencyCode, CURRENCIES, formatCompactCurrency } from '../../lib/currency';
import { calculateCagr } from '../../lib/financeMath';
import { AnalysisSnapshot } from '../../lib/aiAdvisor';
import { AppStrategyState } from '../../lib/strategyStore';
import { CalculatorLayout, MobileSummaryPayload } from '../ui/CalculatorLayout';
import { DualSliderInput } from '../ui/DualSliderInput';
import { TrajectoryChart } from '../charts/TrajectoryAreaChart';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface CagrCalculatorProps {
  values: AppStrategyState['cagr'];
  onChange: (next: AppStrategyState['cagr']) => void;
  inflationRate: number;
  onInflationRateChange: (rate: number) => void;
  currency: CurrencyCode;
  isDark: boolean;
  onAnalyzeAi?: (snapshot: AnalysisSnapshot) => void;
  onReportSummary?: (summary: MobileSummaryPayload) => void;
}

export function CagrCalculator({
  values,
  onChange,
  inflationRate,
  onInflationRateChange,
  currency,
  isDark,
  onAnalyzeAi,
  onReportSummary,
}: CagrCalculatorProps) {
  const { initialValue, finalValue, years } = values;

  const sym = CURRENCIES[currency].symbol;
  const result = useMemo(
    () => calculateCagr(initialValue, finalValue, years, inflationRate),
    [initialValue, finalValue, years, inflationRate]
  );

  const gainsColor = '#08F6B6';
  const cobaltColor = '#5367F5';
  const benchmarkColor = '#F59E0B';

  const rateComparisonData = [
    { name: 'Portfolio CAGR', rate: Number(result.cagrPct.toFixed(2)), color: result.cagrPct >= 0 ? gainsColor : '#dc2626' },
    { name: 'Benchmark inflation', rate: Number(inflationRate.toFixed(2)), color: benchmarkColor },
    { name: 'Real CAGR (net)', rate: Number(result.realCagrPct.toFixed(2)), color: cobaltColor },
  ];

  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const tickColor = isDark ? '#94a3b8' : '#64748b';

  const analysisSnapshot: AnalysisSnapshot = {
    calculatorName: 'CAGR & Absolute Return',
    currency,
    investedAmount: initialValue,
    maturityAmount: finalValue,
    estimatedGain: result.totalGain,
    details: {
      'Beginning Value': initialValue,
      'Ending Value': finalValue,
      'Holding Period': `${years} years`,
      CAGR: `${result.cagrPct.toFixed(2)}%`,
      'Absolute Return': `${result.absoluteReturnPct.toFixed(1)}%`,
      'Benchmark Inflation': `${inflationRate}%`,
      'Real CAGR': `${result.realCagrPct.toFixed(2)}%`,
    },
  };

  return (
    <CalculatorLayout
      title="CAGR & absolute return"
      subtitle="Measure annualized compound growth rate and inflation-adjusted purchasing power"
      currency={currency}
      analysisSnapshot={analysisSnapshot}
      onAnalyzeAi={onAnalyzeAi}
      onReportSummary={onReportSummary}
      kpis={[
        {
          label: 'Compound annual growth (CAGR)',
          value: result.cagrPct,
          format: 'percent',
          decimals: 2,
          tone: result.cagrPct >= inflationRate ? 'gain' : 'neutral',
          sublabel: `Real CAGR: ${result.realCagrPct.toFixed(2)}%`,
        },
        {
          label: 'Absolute return',
          value: result.absoluteReturnPct,
          format: 'percent',
          decimals: 1,
          tone: 'neutral',
          sublabel: `Net gain: ${formatCompactCurrency(result.totalGain, currency)}`,
        },
        {
          label: 'Inflation-adjusted final value',
          value: result.inflationAdjustedFinalValue,
          tone: 'primary',
          sublabel: `In today's purchasing power`,
        },
      ]}
      controls={
        <>
          <DualSliderInput
            label="Initial investment value"
            value={initialValue}
            onChange={(val) => onChange({ ...values, initialValue: val })}
            min={1000}
            max={10000000}
            step={1000}
            prefix={sym}
            minLabel={formatCompactCurrency(1000, currency)}
            maxLabel={formatCompactCurrency(10000000, currency)}
          />
          <DualSliderInput
            label="Final investment value"
            value={finalValue}
            onChange={(val) => onChange({ ...values, finalValue: val })}
            min={1000}
            max={25000000}
            step={1000}
            prefix={sym}
            minLabel={formatCompactCurrency(1000, currency)}
            maxLabel={formatCompactCurrency(25000000, currency)}
          />
          <DualSliderInput
            label="Holding period"
            value={years}
            onChange={(val) => onChange({ ...values, years: val })}
            min={1}
            max={40}
            step={1}
            suffix="yrs"
            minLabel="1 yr"
            maxLabel="40 yrs"
          />
          <DualSliderInput
            label="Benchmark inflation rate"
            value={inflationRate}
            onChange={onInflationRateChange}
            min={0}
            max={15}
            step={0.5}
            suffix="%"
            minLabel="0%"
            maxLabel="15%"
          />
        </>
      }
      donutSection={
        <div>
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              CAGR vs benchmark inflation
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Annualized rate comparison
            </span>
          </div>
          <div className="h-36 w-full trajectory-area-reveal" data-testid="cagr-comparison-bar">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={rateComparisonData}
                layout="vertical"
                margin={{ top: 4, right: 24, left: 10, bottom: 4 }}
              >
                <CartesianGrid stroke={gridColor} strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fill: tickColor, fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                  axisLine={{ stroke: gridColor }}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={132}
                  tick={{ fill: tickColor, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }}
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const item = payload[0].payload as { name: string; rate: number };
                    return (
                      <div className="rounded-[8px] border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#111622] px-3 py-2 text-xs shadow-sm">
                        <div className="font-medium text-slate-900 dark:text-slate-100">{item.name}</div>
                        <div className="font-mono tabular-nums text-slate-600 dark:text-slate-300">
                          {item.rate.toFixed(2)}% p.a.
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="rate" radius={[0, 4, 4, 0]} barSize={20} isAnimationActive={false}>
                  {rateComparisonData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      }
      chartTitle="Smoothed CAGR path vs inflation baseline"
      chartSubtitle="Nominal portfolio growth compared against purchasing power threshold"
      chartSection={
        <TrajectoryChart
          data={result.schedule as unknown as Array<Record<string, unknown>>}
          xKey="label"
          variant="area"
          currency={currency}
          isDark={isDark}
          series={[
            {
              key: 'portfolioValue',
              label: 'CAGR trajectory',
              color: gainsColor,
              fillOpacity: 0.22,
            },
            {
              key: 'inflationBenchmark',
              label: 'Inflation baseline',
              color: benchmarkColor,
              kind: 'line',
              dashed: true,
              strokeWidth: 2.2,
            },
          ]}
        />
      }
      milestoneInsight={`Outperforms inflation by ${(result.cagrPct - inflationRate).toFixed(2)}% p.a. (${result.realCagrPct.toFixed(2)}% real CAGR)`}
    />
  );
}
