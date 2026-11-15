import { useMemo } from 'react';
import { CurrencyCode, CURRENCIES, formatCompactCurrency } from '../../lib/currency';
import { calculateSwp } from '../../lib/financeMath';
import { AnalysisSnapshot } from '../../lib/aiAdvisor';
import { AppStrategyState } from '../../lib/strategyStore';
import { CalculatorLayout, MobileSummaryPayload } from '../ui/CalculatorLayout';
import { DualSliderInput } from '../ui/DualSliderInput';
import { WealthDonutChart } from '../charts/WealthDonutChart';
import { TrajectoryChart } from '../charts/TrajectoryAreaChart';

interface SwpCalculatorProps {
  values: AppStrategyState['swp'];
  onChange: (next: AppStrategyState['swp']) => void;
  currency: CurrencyCode;
  isDark: boolean;
  onAnalyzeAi?: (snapshot: AnalysisSnapshot) => void;
  onReportSummary?: (summary: MobileSummaryPayload) => void;
}

export function SwpCalculator({
  values,
  onChange,
  currency,
  isDark,
  onAnalyzeAi,
  onReportSummary,
}: SwpCalculatorProps) {
  const { corpus, withdrawal, rate, years } = values;

  const sym = CURRENCIES[currency].symbol;
  const result = useMemo(
    () => calculateSwp(corpus, withdrawal, rate, years),
    [corpus, withdrawal, rate, years]
  );

  const principalColor = '#5367F5';
  const gainsColor = '#08F6B6';
  const warningColor = '#F59E0B';

  const sustains = result.depletedYear === null;

  const analysisSnapshot: AnalysisSnapshot = {
    calculatorName: 'SWP (Systematic Withdrawal Plan)',
    currency,
    investedAmount: corpus,
    maturityAmount: result.finalBalance,
    estimatedGain: result.totalInterestEarned,
    details: {
      'Initial Corpus': corpus,
      'Monthly Withdrawal': withdrawal,
      'Total Withdrawn': Math.round(result.totalWithdrawn),
      'Expected Return Rate': `${rate}% p.a.`,
      Duration: `${years} years`,
      'Sustainable Monthly Limit': Math.round(result.sustainableMonthlyWithdrawal),
      'Corpus Longevity': sustains ? 'Sustains full duration' : `Depletes at year ${result.depletedYear}`,
    },
  };

  return (
    <CalculatorLayout
      title="Systematic withdrawal plan"
      subtitle="Simulate monthly retirement or passive cash flows and test long-term corpus longevity"
      currency={currency}
      analysisSnapshot={analysisSnapshot}
      onAnalyzeAi={onAnalyzeAi}
      onReportSummary={onReportSummary}
      kpis={[
        {
          label: 'Total withdrawn',
          value: result.totalWithdrawn,
          tone: 'neutral',
          sublabel: sustains ? `Across ${years} years` : `Depleted at Yr ${result.depletedYear}`,
        },
        {
          label: 'Final balance remaining',
          value: result.finalBalance,
          tone: sustains ? 'gain' : 'neutral',
          sublabel: sustains ? 'Corpus sustains full tenure' : 'Exhausted before end',
        },
        {
          label: 'Sustainable monthly limit',
          value: result.sustainableMonthlyWithdrawal,
          tone: 'primary',
          sublabel: `Perpetual: ${formatCompactCurrency(result.perpetualMonthlyWithdrawal, currency)}/mo`,
        },
      ]}
      controls={
        <>
          <DualSliderInput
            label="Total initial corpus"
            value={corpus}
            onChange={(val) => onChange({ ...values, corpus: val })}
            min={100000}
            max={50000000}
            step={50000}
            prefix={sym}
            minLabel={formatCompactCurrency(100000, currency)}
            maxLabel={formatCompactCurrency(50000000, currency)}
          />
          <DualSliderInput
            label="Monthly withdrawal amount"
            value={withdrawal}
            onChange={(val) => onChange({ ...values, withdrawal: val })}
            min={1000}
            max={500000}
            step={1000}
            prefix={sym}
            minLabel={formatCompactCurrency(1000, currency)}
            maxLabel={formatCompactCurrency(500000, currency)}
          />
          <DualSliderInput
            label="Expected annual return"
            value={rate}
            onChange={(val) => onChange({ ...values, rate: val })}
            min={1}
            max={20}
            step={0.5}
            suffix="%"
            minLabel="1%"
            maxLabel="20%"
          />
          <DualSliderInput
            label="Withdrawal duration"
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
          centerLabel="Total value"
          centerValue={result.totalWithdrawn + result.finalBalance}
          slices={[
            { name: 'Total withdrawn', value: result.totalWithdrawn, color: principalColor },
            {
              name: 'Remaining balance',
              value: result.finalBalance,
              color: sustains ? gainsColor : warningColor,
            },
          ]}
        />
      }
      chartTitle="Corpus balance vs cumulative withdrawals"
      chartSubtitle={
        sustains
          ? 'Corpus sustains through target duration'
          : `Corpus depletes in year ${result.depletedYear}`
      }
      chartSection={
        <TrajectoryChart
          data={result.schedule as unknown as Array<Record<string, unknown>>}
          xKey="label"
          variant="area"
          currency={currency}
          isDark={isDark}
          series={[
            {
              key: 'balance',
              label: 'Remaining corpus',
              color: sustains ? gainsColor : warningColor,
              fillOpacity: 0.25,
            },
            {
              key: 'cumulativeWithdrawn',
              label: 'Cumulative withdrawn',
              color: principalColor,
              dashed: true,
              fillOpacity: 0.08,
            },
          ]}
        />
      }
      milestoneInsight={
        sustains
          ? `Max withdrawal for ${years}-yr zero balance is ${formatCompactCurrency(result.sustainableMonthlyWithdrawal, currency)}/mo`
          : `Reduce withdrawal to ${formatCompactCurrency(result.sustainableMonthlyWithdrawal, currency)}/mo to sustain ${years} years`
      }
    />
  );
}
