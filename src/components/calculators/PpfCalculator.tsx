import { useMemo } from 'react';
import { CurrencyCode, CURRENCIES, formatCompactCurrency } from '../../lib/currency';
import { calculatePpf } from '../../lib/financeMath';
import { AnalysisSnapshot } from '../../lib/aiAdvisor';
import { AppStrategyState } from '../../lib/strategyStore';
import { CalculatorLayout, MobileSummaryPayload } from '../ui/CalculatorLayout';
import { DualSliderInput } from '../ui/DualSliderInput';
import { WealthDonutChart } from '../charts/WealthDonutChart';
import { TrajectoryChart } from '../charts/TrajectoryAreaChart';

interface PpfCalculatorProps {
  values: AppStrategyState['ppf'];
  onChange: (next: AppStrategyState['ppf']) => void;
  currency: CurrencyCode;
  isDark: boolean;
  onAnalyzeAi?: (snapshot: AnalysisSnapshot) => void;
  onReportSummary?: (summary: MobileSummaryPayload) => void;
}

const EXTENSION_OPTIONS = [
  { label: '15 yrs (Base)', value: 0 },
  { label: '20 yrs (+1 block)', value: 1 },
  { label: '25 yrs (+2 blocks)', value: 2 },
  { label: '30 yrs (+3 blocks)', value: 3 },
];

export function PpfCalculator({
  values,
  onChange,
  currency,
  isDark,
  onAnalyzeAi,
  onReportSummary,
}: PpfCalculatorProps) {
  const { annualDeposit, rate, extensionBlocks } = values;

  const sym = CURRENCIES[currency].symbol;
  const result = useMemo(
    () => calculatePpf(annualDeposit, rate, extensionBlocks),
    [annualDeposit, rate, extensionBlocks]
  );

  const totalYears = 15 + extensionBlocks * 5;
  const principalColor = '#5367F5';
  const gainsColor = '#08F6B6';
  const taxFreeShare = result.maturityValue > 0 ? (result.totalInterest / result.maturityValue) * 100 : 0;

  const analysisSnapshot: AnalysisSnapshot = {
    calculatorName: 'PPF (Public Provident Fund)',
    currency,
    investedAmount: result.totalDeposited,
    maturityAmount: result.maturityValue,
    estimatedGain: result.totalInterest,
    details: {
      'Annual Deposit': annualDeposit,
      'Government Rate': `${rate}% p.a.`,
      Duration: `${totalYears} years (15-yr lock-in + ${extensionBlocks} extension blocks)`,
      'Tax Status': 'Exempt-Exempt-Exempt (EEE)',
    },
  };

  return (
    <CalculatorLayout
      title="Public provident fund"
      subtitle="Project sovereign tax-free EEE returns across the 15-year lock-in and optional 5-year extension blocks"
      currency={currency}
      analysisSnapshot={analysisSnapshot}
      onAnalyzeAi={onAnalyzeAi}
      onReportSummary={onReportSummary}
      kpis={[
        {
          label: 'Total deposited',
          value: result.totalDeposited,
          tone: 'neutral',
          sublabel: `${totalYears} annual contributions`,
        },
        {
          label: 'Tax-free interest',
          value: result.totalInterest,
          tone: 'gain',
          sublabel: `${taxFreeShare.toFixed(1)}% of corpus`,
        },
        {
          label: 'Maturity balance',
          value: result.maturityValue,
          tone: 'primary',
          sublabel: 'Exempt-Exempt-Exempt status',
        },
      ]}
      controls={
        <>
          <DualSliderInput
            label="Annual deposit"
            value={annualDeposit}
            onChange={(val) => onChange({ ...values, annualDeposit: val })}
            min={500}
            max={150000}
            step={500}
            prefix={sym}
            hint="Standard annual cap: 1.5L"
            minLabel={formatCompactCurrency(500, currency)}
            maxLabel={formatCompactCurrency(150000, currency)}
          />
          <DualSliderInput
            label="Government interest rate"
            value={rate}
            onChange={(val) => onChange({ ...values, rate: val })}
            min={5}
            max={10}
            step={0.1}
            suffix="%"
            minLabel="5%"
            maxLabel="10%"
          />

          <div className="space-y-2">
            <span className="block text-[13px] font-medium text-slate-700 dark:text-slate-300">
              Lock-in & 5-year extension blocks
            </span>
            <div
              role="group"
              aria-label="PPF duration"
              className="grid grid-cols-2 gap-1.5 p-1 rounded-[8px] bg-[#F8FAFC] dark:bg-[#080A11] border border-black/[0.06] dark:border-white/[0.08]"
            >
              {EXTENSION_OPTIONS.map((opt) => {
                const active = extensionBlocks === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onChange({ ...values, extensionBlocks: opt.value })}
                    className={`min-h-[44px] sm:min-h-[36px] px-3 py-2 text-xs font-medium rounded-[6px] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
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
          centerLabel="Tax-free maturity"
          centerValue={result.maturityValue}
          slices={[
            { name: 'Annual deposits', value: result.totalDeposited, color: principalColor },
            { name: 'Tax-free interest', value: result.totalInterest, color: gainsColor },
          ]}
        />
      }
      chartTitle={`${totalYears}-year PPF step ladder`}
      chartSubtitle="Annual compounding trajectory with lock-in and extension buildup"
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
              label: 'Cumulative deposits',
              color: principalColor,
              stackId: 'ppf',
            },
            {
              key: 'gains',
              label: 'Tax-free interest',
              color: gainsColor,
              stackId: 'ppf',
            },
          ]}
        />
      }
      milestoneInsight={`Year ${totalYears} annual interest alone earns ${formatCompactCurrency(result.schedule[result.schedule.length - 1]?.yearlyInterest ?? 0, currency)} tax-free`}
    />
  );
}
