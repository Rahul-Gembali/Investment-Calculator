import { useMemo } from 'react';
import { CurrencyCode, CURRENCIES, formatCompactCurrency } from '../../lib/currency';
import { calculateRd } from '../../lib/financeMath';
import { AnalysisSnapshot } from '../../lib/aiAdvisor';
import { AppStrategyState } from '../../lib/strategyStore';
import { CalculatorLayout, MobileSummaryPayload } from '../ui/CalculatorLayout';
import { DualSliderInput } from '../ui/DualSliderInput';
import { WealthDonutChart } from '../charts/WealthDonutChart';
import { TrajectoryChart } from '../charts/TrajectoryAreaChart';

interface RdCalculatorProps {
  values: AppStrategyState['rd'];
  onChange: (next: AppStrategyState['rd']) => void;
  currency: CurrencyCode;
  isDark: boolean;
  onAnalyzeAi?: (snapshot: AnalysisSnapshot) => void;
  onReportSummary?: (summary: MobileSummaryPayload) => void;
}

export function RdCalculator({
  values,
  onChange,
  currency,
  isDark,
  onAnalyzeAi,
  onReportSummary,
}: RdCalculatorProps) {
  const { monthly, rate, tenureMonths } = values;

  const sym = CURRENCIES[currency].symbol;
  const result = useMemo(
    () => calculateRd(monthly, rate, tenureMonths),
    [monthly, rate, tenureMonths]
  );

  const principalColor = '#5367F5';
  const gainsColor = '#08F6B6';
  const quarters = Math.round(tenureMonths / 3);
  const yearsText = (tenureMonths / 12).toFixed(tenureMonths % 12 === 0 ? 0 : 1);

  const analysisSnapshot: AnalysisSnapshot = {
    calculatorName: 'Recurring Deposit (RD)',
    currency,
    investedAmount: result.totalDeposited,
    maturityAmount: result.maturityValue,
    estimatedGain: result.totalInterest,
    details: {
      'Monthly Installment': monthly,
      'Interest Rate': `${rate}% p.a.`,
      Tenure: `${tenureMonths} months (${quarters} quarters)`,
    },
  };

  return (
    <CalculatorLayout
      title="Recurring deposit"
      subtitle="Project bank recurring deposit maturity with quarterly interest compounding"
      currency={currency}
      analysisSnapshot={analysisSnapshot}
      onAnalyzeAi={onAnalyzeAi}
      onReportSummary={onReportSummary}
      kpis={[
        {
          label: 'Total deposited',
          value: result.totalDeposited,
          tone: 'neutral',
          sublabel: `${tenureMonths} monthly installments`,
        },
        {
          label: 'Total interest earned',
          value: result.totalInterest,
          tone: 'gain',
          sublabel: `Compounded across ${quarters} quarters`,
        },
        {
          label: 'Maturity value',
          value: result.maturityValue,
          tone: 'primary',
          sublabel: `${yearsText} ${Number(yearsText) === 1 ? 'year' : 'years'} tenure`,
        },
      ]}
      controls={
        <>
          <DualSliderInput
            label="Monthly installment"
            value={monthly}
            onChange={(val) => onChange({ ...values, monthly: val })}
            min={500}
            max={250000}
            step={500}
            prefix={sym}
            minLabel={formatCompactCurrency(500, currency)}
            maxLabel={formatCompactCurrency(250000, currency)}
          />
          <DualSliderInput
            label="Interest rate (p.a.)"
            value={rate}
            onChange={(val) => onChange({ ...values, rate: val })}
            min={2}
            max={12}
            step={0.1}
            suffix="%"
            minLabel="2%"
            maxLabel="12%"
          />
          <DualSliderInput
            label="Tenure (months / quarters)"
            value={tenureMonths}
            onChange={(val) => onChange({ ...values, tenureMonths: val })}
            min={6}
            max={120}
            step={3}
            suffix="mos"
            hint={`${quarters} quarters · ${yearsText} yrs`}
            minLabel="6 mos"
            maxLabel="120 mos"
          />
        </>
      }
      donutSection={
        <WealthDonutChart
          currency={currency}
          isDark={isDark}
          centerLabel="Maturity value"
          centerValue={result.maturityValue}
          slices={[
            { name: 'Total deposited', value: result.totalDeposited, color: principalColor },
            { name: 'Quarterly interest', value: result.totalInterest, color: gainsColor },
          ]}
        />
      }
      chartTitle="Yearly deposit buildup"
      chartSubtitle="Cumulative installments vs compounded interest"
      chartSection={
        <TrajectoryChart
          data={result.schedule as unknown as Array<Record<string, unknown>>}
          xKey="label"
          variant="bar"
          currency={currency}
          isDark={isDark}
          series={[
            {
              key: 'invested',
              label: 'Deposits paid',
              color: principalColor,
              stackId: 'rd',
            },
            {
              key: 'gains',
              label: 'Interest accrued',
              color: gainsColor,
              stackId: 'rd',
            },
          ]}
        />
      }
      milestoneInsight={`Interest contributes ${((result.totalInterest / Math.max(1, result.maturityValue)) * 100).toFixed(1)}% of maturity value over ${quarters} quarters`}
    />
  );
}
