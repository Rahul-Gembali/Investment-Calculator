import { useMemo } from 'react';
import { CurrencyCode, CURRENCIES, formatCompactCurrency } from '../../lib/currency';
import { calculateSip } from '../../lib/financeMath';
import { AnalysisSnapshot } from '../../lib/aiAdvisor';
import { AppStrategyState } from '../../lib/strategyStore';
import { CalculatorLayout, MobileSummaryPayload } from '../ui/CalculatorLayout';
import { DualSliderInput } from '../ui/DualSliderInput';
import { WealthDonutChart } from '../charts/WealthDonutChart';
import { SeriesConfig, TrajectoryChart } from '../charts/TrajectoryAreaChart';
import { InflationBenchmarkControl } from '../charts/InflationBenchmarkControl';

interface SipCalculatorProps {
  values: AppStrategyState['sip'];
  onChange: (next: AppStrategyState['sip']) => void;
  showInflation: boolean;
  onToggleInflation: (enabled: boolean) => void;
  inflationRate: number;
  onInflationRateChange: (rate: number) => void;
  currency: CurrencyCode;
  isDark: boolean;
  onAnalyzeAi?: (snapshot: AnalysisSnapshot) => void;
  onReportSummary?: (summary: MobileSummaryPayload) => void;
}

export function SipCalculator({
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
}: SipCalculatorProps) {
  const { monthly, rate, years } = values;

  const sym = CURRENCIES[currency].symbol;
  const result = useMemo(
    () => calculateSip(monthly, rate, years, inflationRate),
    [monthly, rate, years, inflationRate]
  );

  const principalColor = '#5367F5';
  const gainsColor = '#08F6B6';
  const gainShare = result.totalValue > 0 ? (result.estimatedReturns / result.totalValue) * 100 : 0;

  const chartSeries: SeriesConfig[] = [
    {
      key: 'invested',
      label: 'Invested capital',
      color: principalColor,
      stackId: 'sip',
      kind: 'bar',
    },
    {
      key: 'gains',
      label: 'Nominal wealth gains',
      color: gainsColor,
      stackId: 'sip',
      kind: 'bar',
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
    calculatorName: 'SIP (Systematic Investment Plan)',
    currency,
    investedAmount: result.totalInvested,
    maturityAmount: result.totalValue,
    estimatedGain: result.estimatedReturns,
    details: {
      'Monthly SIP': monthly,
      'Expected Return Rate': `${rate}% p.a.`,
      Tenure: `${years} years (${years * 12} installments)`,
      'Wealth Multiplier': `${result.wealthMultiplier.toFixed(2)}x`,
      'Inflation Benchmark': showInflation ? `${inflationRate}% p.a.` : 'Disabled',
      'Real Purchasing Power': Math.round(result.realTotalValue),
    },
  };

  return (
    <CalculatorLayout
      title="Systematic investment plan"
      subtitle="Calculate compounded wealth from disciplined monthly investments using annuity due timing"
      currency={currency}
      analysisSnapshot={analysisSnapshot}
      onAnalyzeAi={onAnalyzeAi}
      onReportSummary={onReportSummary}
      kpis={[
        {
          label: 'Total invested',
          value: result.totalInvested,
          tone: 'neutral',
          sublabel: `${years * 12} monthly installments`,
        },
        {
          label: 'Estimated returns',
          value: result.estimatedReturns,
          tone: 'gain',
          sublabel: `${gainShare.toFixed(1)}% of final wealth`,
        },
        {
          label: 'Total maturity value',
          value: result.totalValue,
          tone: 'primary',
          sublabel: showInflation
            ? `Real value: ${formatCompactCurrency(result.realTotalValue, currency)}`
            : `${result.wealthMultiplier.toFixed(2)}x wealth multiplier`,
        },
      ]}
      controls={
        <>
          <DualSliderInput
            label="Monthly investment"
            value={monthly}
            onChange={(val) => onChange({ ...values, monthly: val })}
            min={500}
            max={500000}
            step={500}
            prefix={sym}
            minLabel={formatCompactCurrency(500, currency)}
            maxLabel={formatCompactCurrency(500000, currency)}
          />
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
          centerLabel="Maturity value"
          centerValue={result.totalValue}
          slices={[
            { name: 'Total invested', value: result.totalInvested, color: principalColor },
            { name: 'Wealth gained', value: result.estimatedReturns, color: gainsColor },
          ]}
        />
      }
      chartTitle="Year-over-year capital buildup vs inflation"
      chartSubtitle="Cumulative invested capital, accrued returns, and real purchasing power"
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
            variant="bar"
            currency={currency}
            isDark={isDark}
            series={chartSeries}
          />
        </>
      }
      milestoneInsight={`Returns account for ${gainShare.toFixed(1)}% of your ${formatCompactCurrency(result.totalValue, currency)} corpus (${formatCompactCurrency(result.realTotalValue, currency)} in today's money)`}
    />
  );
}
