import { useMemo } from 'react';
import { CurrencyCode, CURRENCIES, formatCompactCurrency } from '../../lib/currency';
import { calculateLumpSum, CompoundingFrequency } from '../../lib/financeMath';
import { AnalysisSnapshot } from '../../lib/aiAdvisor';
import { AppStrategyState } from '../../lib/strategyStore';
import { CalculatorLayout, MobileSummaryPayload } from '../ui/CalculatorLayout';
import { DualSliderInput } from '../ui/DualSliderInput';
import { WealthDonutChart } from '../charts/WealthDonutChart';
import { SeriesConfig, TrajectoryChart } from '../charts/TrajectoryAreaChart';
import { InflationBenchmarkControl } from '../charts/InflationBenchmarkControl';

interface LumpsumCalculatorProps {
  values: AppStrategyState['lumpsum'];
  onChange: (next: AppStrategyState['lumpsum']) => void;
  showInflation: boolean;
  onToggleInflation: (enabled: boolean) => void;
  inflationRate: number;
  onInflationRateChange: (rate: number) => void;
  currency: CurrencyCode;
  isDark: boolean;
  onAnalyzeAi?: (snapshot: AnalysisSnapshot) => void;
  onReportSummary?: (summary: MobileSummaryPayload) => void;
}

const COMPOUNDING_OPTIONS: Array<{ label: string; value: CompoundingFrequency }> = [
  { label: 'Annual', value: 1 },
  { label: 'Semi-Annual', value: 2 },
  { label: 'Quarterly', value: 4 },
  { label: 'Monthly', value: 12 },
];

export function LumpsumCalculator({
  values,
  onChange,
  showInflation,
  onToggleInflation,
  inflationRate,
  onInflationRateChange,
  currency,
  isDark,
  onAnalyzeAi,
  onReportSummary,
}: LumpsumCalculatorProps) {
  const { principal, rate, years, compounding } = values;

  const sym = CURRENCIES[currency].symbol;
  const result = useMemo(
    () => calculateLumpSum(principal, rate, years, compounding, inflationRate),
    [principal, rate, years, compounding, inflationRate]
  );

  const principalColor = '#5367F5';
  const gainsColor = '#08F6B6';

  const chartSeries: SeriesConfig[] = [
    {
      key: 'invested',
      label: 'Invested capital',
      color: principalColor,
      stackId: 'lumpsum',
      kind: 'area',
      fillOpacity: 0.25,
    },
    {
      key: 'gains',
      label: 'Nominal future value',
      color: gainsColor,
      stackId: 'lumpsum',
      kind: 'area',
      fillOpacity: 0.28,
    },
    ...(showInflation
      ? [
          {
            key: 'realValue',
            label: `Real purchasing power (${inflationRate}% inf.)`,
            color: '#F59E0B',
            kind: 'line' as const,
            dashed: true,
            dashPattern: '6 4',
            strokeWidth: 2.3,
          },
        ]
      : []),
  ];

  const analysisSnapshot: AnalysisSnapshot = {
    calculatorName: 'Lump Sum Investment',
    currency,
    investedAmount: result.principal,
    maturityAmount: result.totalValue,
    estimatedGain: result.estimatedReturns,
    details: {
      'Initial Principal': principal,
      'Expected Return Rate': `${rate}% p.a.`,
      Tenure: `${years} years`,
      'Compounding Frequency':
        COMPOUNDING_OPTIONS.find((o) => o.value === compounding)?.label ?? 'Annual',
      'Wealth Multiplier': `${result.wealthMultiplier.toFixed(2)}x`,
      'Inflation Benchmark': showInflation ? `${inflationRate}% p.a.` : 'Disabled',
      'Real Purchasing Power': Math.round(result.realTotalValue),
    },
  };

  return (
    <CalculatorLayout
      title="Lump sum investment"
      subtitle="Project the future value of a single capital deployment across compounding frequencies"
      currency={currency}
      analysisSnapshot={analysisSnapshot}
      onAnalyzeAi={onAnalyzeAi}
      onReportSummary={onReportSummary}
      kpis={[
        {
          label: 'Total investment',
          value: result.principal,
          tone: 'neutral',
          sublabel: 'Initial capital',
        },
        {
          label: 'Estimated returns',
          value: result.estimatedReturns,
          tone: 'gain',
          sublabel: `${result.wealthMultiplier.toFixed(2)}x wealth multiplier`,
        },
        {
          label: 'Total maturity value',
          value: result.totalValue,
          tone: 'primary',
          sublabel: showInflation
            ? `Real value: ${formatCompactCurrency(result.realTotalValue, currency)}`
            : `After ${years} ${years === 1 ? 'year' : 'years'}`,
        },
      ]}
      controls={
        <>
          <DualSliderInput
            label="Initial investment"
            value={principal}
            onChange={(val) => onChange({ ...values, principal: val })}
            min={1000}
            max={10000000}
            step={1000}
            prefix={sym}
            minLabel={formatCompactCurrency(1000, currency)}
            maxLabel={formatCompactCurrency(10000000, currency)}
          />
          <DualSliderInput
            label="Expected return rate (p.a.)"
            value={rate}
            onChange={(val) => onChange({ ...values, rate: val })}
            min={1}
            max={30}
            step={0.5}
            suffix="%"
            minLabel="1%"
            maxLabel="30%"
          />
          <DualSliderInput
            label="Investment tenure"
            value={years}
            onChange={(val) => onChange({ ...values, years: val })}
            min={1}
            max={40}
            step={1}
            suffix="yrs"
            minLabel="1 yr"
            maxLabel="40 yrs"
          />

          <div className="space-y-2">
            <span className="block text-[13px] font-medium text-slate-700 dark:text-slate-300">
              Compounding frequency
            </span>
            <div
              role="group"
              aria-label="Compounding frequency"
              className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-[8px] bg-[#F8FAFC] dark:bg-[#080A11] border border-black/[0.06] dark:border-white/[0.08]"
            >
              {COMPOUNDING_OPTIONS.map((opt) => {
                const active = compounding === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onChange({ ...values, compounding: opt.value })}
                    className={`min-h-[44px] sm:min-h-[36px] px-2.5 py-2 text-xs font-medium rounded-[6px] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'bg-[#5367F5] text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      }
      donutSection={
        <WealthDonutChart
          currency={currency}
          isDark={isDark}
          centerLabel="Maturity value"
          centerValue={result.totalValue}
          slices={[
            { name: 'Invested principal', value: result.principal, color: principalColor },
            { name: 'Capital gains', value: result.estimatedReturns, color: gainsColor },
          ]}
        />
      }
      chartTitle="Compounding trajectory vs inflation"
      chartSubtitle="Nominal future value, invested capital, and real purchasing power"
      chartSection={
        <>
          <InflationBenchmarkControl
            enabled={showInflation}
            onToggle={onToggleInflation}
            inflationRate={inflationRate}
            onRateChange={onInflationRateChange}
            realValue={result.realTotalValue}
            currency={currency}
          />
          <TrajectoryChart
            data={result.schedule as unknown as Array<Record<string, unknown>>}
            xKey="label"
            variant="area"
            currency={currency}
            isDark={isDark}
            series={chartSeries}
          />
        </>
      }
      milestoneInsight={
        Number.isFinite(result.ruleOf72Years)
          ? `Money doubles every ${result.ruleOf72Years.toFixed(1)} years at ${rate}% return · Real value ${formatCompactCurrency(result.realTotalValue, currency)}`
          : 'Enter a positive return rate to compute doubling period'
      }
    />
  );
}
