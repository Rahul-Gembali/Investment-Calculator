import { useMemo } from 'react';
import { CurrencyCode, CURRENCIES, formatCompactCurrency } from '../../lib/currency';
import { calculateStepUpSip } from '../../lib/financeMath';
import { AnalysisSnapshot } from '../../lib/aiAdvisor';
import { AppStrategyState } from '../../lib/strategyStore';
import { CalculatorLayout, MobileSummaryPayload } from '../ui/CalculatorLayout';
import { DualSliderInput } from '../ui/DualSliderInput';
import { WealthDonutChart } from '../charts/WealthDonutChart';
import { SeriesConfig, TrajectoryChart } from '../charts/TrajectoryAreaChart';
import { InflationBenchmarkControl } from '../charts/InflationBenchmarkControl';

interface StepUpSipCalculatorProps {
  values: AppStrategyState['stepupSip'];
  onChange: (next: AppStrategyState['stepupSip']) => void;
  showInflation: boolean;
  onToggleInflation: (enabled: boolean) => void;
  inflationRate: number;
  onInflationRateChange: (rate: number) => void;
  currency: CurrencyCode;
  isDark: boolean;
  onAnalyzeAi?: (snapshot: AnalysisSnapshot) => void;
  onReportSummary?: (summary: MobileSummaryPayload) => void;
}

export function StepUpSipCalculator({
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
}: StepUpSipCalculatorProps) {
  const {
    initialMonthly,
    stepUpFrequency,
    stepUpMode,
    stepUpPct,
    stepUpAmount,
    rate,
    years,
  } = values;

  const sym = CURRENCIES[currency].symbol;
  const activeStepVal = stepUpMode === 'percent' ? stepUpPct : stepUpAmount;

  const result = useMemo(
    () =>
      calculateStepUpSip(
        initialMonthly,
        stepUpMode,
        activeStepVal,
        rate,
        years,
        stepUpFrequency,
        inflationRate
      ),
    [initialMonthly, stepUpMode, activeStepVal, rate, years, stepUpFrequency, inflationRate]
  );

  const principalColor = '#5367F5';
  const gainsColor = '#08F6B6';
  const standardLineColor = isDark ? '#64748b' : '#94a3b8';

  const chartSeries: SeriesConfig[] = [
    {
      key: 'total',
      label: 'Step-up nominal future value',
      color: gainsColor,
      kind: 'area',
      fillOpacity: 0.24,
    },
    {
      key: 'invested',
      label: 'Invested capital',
      color: principalColor,
      kind: 'line',
      strokeWidth: 2,
    },
    {
      key: 'standardTotal',
      label: 'Standard fixed SIP',
      color: standardLineColor,
      kind: 'line',
      dashed: true,
      dashPattern: '2 3',
      strokeWidth: 1.75,
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
            strokeWidth: 2.35,
          },
        ]
      : []),
  ];

  const analysisSnapshot: AnalysisSnapshot = {
    calculatorName: `Step-Up SIP (${stepUpFrequency === 'annual' ? 'Annual' : 'Monthly'})`,
    currency,
    investedAmount: result.totalInvested,
    maturityAmount: result.totalValue,
    estimatedGain: result.estimatedReturns,
    details: {
      'Initial Monthly SIP': initialMonthly,
      'Step-Up Frequency': stepUpFrequency,
      'Step-Up Increment': stepUpMode === 'percent' ? `${stepUpPct}%` : `${sym}${stepUpAmount}`,
      'Expected Return Rate': `${rate}% p.a.`,
      Tenure: `${years} years`,
      'Final Monthly SIP': Math.round(result.finalMonthlySip),
      'Advantage over Flat SIP': Math.round(result.stepUpAdvantage),
      'Inflation Benchmark': showInflation ? `${inflationRate}% p.a.` : 'Disabled',
      'Real Purchasing Power': Math.round(result.realTotalValue),
    },
  };

  return (
    <CalculatorLayout
      title="Step-up SIP"
      subtitle="Model the exponential compounding advantage of stepping up your SIP annually or every month"
      currency={currency}
      analysisSnapshot={analysisSnapshot}
      onAnalyzeAi={onAnalyzeAi}
      onReportSummary={onReportSummary}
      kpis={[
        {
          label: 'Total invested',
          value: result.totalInvested,
          tone: 'neutral',
          sublabel: `Final SIP ${formatCompactCurrency(result.finalMonthlySip, currency)}/mo`,
        },
        {
          label: 'Step-up advantage',
          value: result.stepUpAdvantage,
          tone: 'gain',
          sublabel: 'Extra wealth vs fixed SIP',
        },
        {
          label: 'Step-up maturity value',
          value: result.totalValue,
          tone: 'primary',
          sublabel: showInflation
            ? `Real value: ${formatCompactCurrency(result.realTotalValue, currency)}`
            : `Fixed SIP: ${formatCompactCurrency(result.standardTotalValue, currency)}`,
        },
      ]}
      controls={
        <>
          <DualSliderInput
            label="Initial monthly investment"
            value={initialMonthly}
            onChange={(val) => onChange({ ...values, initialMonthly: val })}
            min={500}
            max={500000}
            step={500}
            prefix={sym}
            minLabel={formatCompactCurrency(500, currency)}
            maxLabel={formatCompactCurrency(500000, currency)}
          />

          {/* Step-Up Frequency Toggle: Annual vs Monthly */}
          <div className="space-y-2">
            <span className="block text-[13px] font-medium text-slate-700 dark:text-slate-300">
              Step-up frequency
            </span>
            <div
              role="group"
              aria-label="Step-up frequency"
              className="grid grid-cols-2 gap-1.5 p-1 rounded-[8px] bg-[#F8FAFC] dark:bg-[#080A11] border border-black/[0.06] dark:border-white/[0.08]"
            >
              <button
                type="button"
                onClick={() => {
                  const nextPct = stepUpMode === 'percent' && stepUpPct < 5 ? 10 : stepUpPct;
                  onChange({ ...values, stepUpFrequency: 'annual', stepUpPct: nextPct });
                }}
                aria-pressed={stepUpFrequency === 'annual'}
                className={`min-h-[44px] sm:min-h-[36px] px-3 py-1.5 text-xs font-medium rounded-[6px] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  stepUpFrequency === 'annual'
                    ? 'bg-[#5367F5] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Annual step-up
              </button>
              <button
                type="button"
                onClick={() => {
                  const nextPct = stepUpMode === 'percent' && stepUpPct > 5 ? 1 : stepUpPct;
                  onChange({ ...values, stepUpFrequency: 'monthly', stepUpPct: nextPct });
                }}
                aria-pressed={stepUpFrequency === 'monthly'}
                className={`min-h-[44px] sm:min-h-[36px] px-3 py-1.5 text-xs font-medium rounded-[6px] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  stepUpFrequency === 'monthly'
                    ? 'bg-[#5367F5] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Monthly step-up
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300">
                {stepUpFrequency === 'annual' ? 'Annual increment type' : 'Monthly increment type'}
              </span>
              <div
                role="group"
                aria-label="Increment type"
                className="inline-flex p-0.5 rounded-[8px] bg-[#F8FAFC] dark:bg-[#080A11] border border-black/[0.06] dark:border-white/[0.08]"
              >
                <button
                  type="button"
                  onClick={() => onChange({ ...values, stepUpMode: 'percent' })}
                  className={`min-h-[36px] px-3 py-1 text-xs font-medium rounded-[6px] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    stepUpMode === 'percent'
                      ? 'bg-white dark:bg-[#1E293B] text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Percentage
                </button>
                <button
                  type="button"
                  onClick={() => onChange({ ...values, stepUpMode: 'amount' })}
                  className={`min-h-[36px] px-3 py-1 text-xs font-medium rounded-[6px] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    stepUpMode === 'amount'
                      ? 'bg-white dark:bg-[#1E293B] text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Fixed amount
                </button>
              </div>
            </div>

            {stepUpMode === 'percent' ? (
              <DualSliderInput
                label={stepUpFrequency === 'annual' ? 'Annual step-up rate' : 'Monthly step-up rate'}
                value={stepUpPct}
                onChange={(val) => onChange({ ...values, stepUpPct: val })}
                min={0}
                max={stepUpFrequency === 'annual' ? 30 : 10}
                step={stepUpFrequency === 'annual' ? 1 : 0.25}
                suffix="%"
                minLabel="0%"
                maxLabel={stepUpFrequency === 'annual' ? '30%' : '10%'}
              />
            ) : (
              <DualSliderInput
                label={stepUpFrequency === 'annual' ? 'Annual fixed increase' : 'Monthly fixed increase'}
                value={stepUpAmount}
                onChange={(val) => onChange({ ...values, stepUpAmount: val })}
                min={0}
                max={stepUpFrequency === 'annual' ? 50000 : 5000}
                step={stepUpFrequency === 'annual' ? 500 : 100}
                prefix={sym}
                minLabel={formatCompactCurrency(0, currency)}
                maxLabel={formatCompactCurrency(stepUpFrequency === 'annual' ? 50000 : 5000, currency)}
              />
            )}
          </div>

          <DualSliderInput
            label="Expected annual return"
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
        </>
      }
      donutSection={
        <WealthDonutChart
          currency={currency}
          isDark={isDark}
          centerLabel="Step-up corpus"
          centerValue={result.totalValue}
          slices={[
            { name: 'Total invested', value: result.totalInvested, color: principalColor },
            { name: 'Estimated returns', value: result.estimatedReturns, color: gainsColor },
          ]}
        />
      }
      chartTitle="Step-up SIP vs inflation & flat SIP"
      chartSubtitle={`Comparing ${stepUpFrequency} step-up compounding, invested capital, and real purchasing power`}
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
      milestoneInsight={`${stepUpFrequency === 'annual' ? 'Annual' : 'Monthly'} step-up generates ${formatCompactCurrency(result.stepUpAdvantage, currency)} extra wealth · Real value ${formatCompactCurrency(result.realTotalValue, currency)}`}
    />
  );
}
