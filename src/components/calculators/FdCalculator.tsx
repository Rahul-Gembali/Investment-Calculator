import { useMemo } from 'react';
import { CurrencyCode, CURRENCIES, formatCompactCurrency, formatCurrency } from '../../lib/currency';
import { calculateFd, FdPayoutOption } from '../../lib/financeMath';
import { AnalysisSnapshot } from '../../lib/aiAdvisor';
import { AppStrategyState } from '../../lib/strategyStore';
import { CalculatorLayout, MobileSummaryPayload } from '../ui/CalculatorLayout';
import { DualSliderInput } from '../ui/DualSliderInput';
import { WealthDonutChart } from '../charts/WealthDonutChart';
import { TrajectoryChart } from '../charts/TrajectoryAreaChart';

interface FdCalculatorProps {
  values: AppStrategyState['fd'];
  onChange: (next: AppStrategyState['fd']) => void;
  currency: CurrencyCode;
  isDark: boolean;
  onAnalyzeAi?: (snapshot: AnalysisSnapshot) => void;
  onReportSummary?: (summary: MobileSummaryPayload) => void;
}

const PAYOUT_OPTIONS: Array<{ label: string; value: FdPayoutOption }> = [
  { label: 'Cumulative (Quarterly)', value: 'cumulative' },
  { label: 'Monthly payout', value: 'monthly' },
  { label: 'Quarterly payout', value: 'quarterly' },
];

export function FdCalculator({
  values,
  onChange,
  currency,
  isDark,
  onAnalyzeAi,
  onReportSummary,
}: FdCalculatorProps) {
  const { principal, rate, years, months, payoutOption } = values;

  const sym = CURRENCIES[currency].symbol;
  const result = useMemo(
    () => calculateFd(principal, rate, years, months, payoutOption),
    [principal, rate, years, months, payoutOption]
  );

  const maturityDateStr = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + years);
    d.setMonth(d.getMonth() + months);
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }, [years, months]);

  const principalColor = '#5367F5';
  const gainsColor = '#08F6B6';

  const analysisSnapshot: AnalysisSnapshot = {
    calculatorName: 'Fixed Deposit (FD)',
    currency,
    investedAmount: result.principal,
    maturityAmount: payoutOption === 'cumulative' ? result.maturityValue : result.principal + result.totalInterest,
    estimatedGain: result.totalInterest,
    details: {
      'Principal Deposit': principal,
      'Interest Rate': `${rate}% p.a.`,
      Tenure: `${years} years, ${months} months`,
      'Payout Option': payoutOption,
      'Effective Annual Yield': `${result.effectiveYieldPct.toFixed(2)}%`,
    },
  };

  return (
    <CalculatorLayout
      title="Fixed deposit"
      subtitle="Calculate guaranteed term deposit interest across cumulative quarterly compounding or periodic payouts"
      currency={currency}
      analysisSnapshot={analysisSnapshot}
      onAnalyzeAi={onAnalyzeAi}
      onReportSummary={onReportSummary}
      kpis={[
        {
          label: 'Principal deposit',
          value: result.principal,
          tone: 'neutral',
          sublabel: `Effective yield ${result.effectiveYieldPct.toFixed(2)}%`,
        },
        {
          label: 'Guaranteed interest',
          value: result.totalInterest,
          tone: 'gain',
          sublabel:
            payoutOption === 'cumulative'
              ? 'Compounded quarterly'
              : `${formatCurrency(result.periodicPayout, currency)} per ${payoutOption === 'monthly' ? 'month' : 'quarter'}`,
        },
        {
          label: payoutOption === 'cumulative' ? 'Total maturity value' : 'Total value received',
          value: payoutOption === 'cumulative' ? result.maturityValue : result.principal + result.totalInterest,
          tone: 'primary',
          sublabel: `Matures ${maturityDateStr}`,
        },
      ]}
      controls={
        <>
          <DualSliderInput
            label="Principal deposit"
            value={principal}
            onChange={(val) => onChange({ ...values, principal: val })}
            min={5000}
            max={10000000}
            step={5000}
            prefix={sym}
            minLabel={formatCompactCurrency(5000, currency)}
            maxLabel={formatCompactCurrency(10000000, currency)}
          />
          <DualSliderInput
            label="Interest rate (p.a.)"
            value={rate}
            onChange={(val) => onChange({ ...values, rate: val })}
            min={2}
            max={14}
            step={0.1}
            suffix="%"
            minLabel="2%"
            maxLabel="14%"
          />
          <DualSliderInput
            label="Tenure (years)"
            value={years}
            onChange={(val) => onChange({ ...values, years: val })}
            min={0}
            max={20}
            step={1}
            suffix="yrs"
            minLabel="0 yrs"
            maxLabel="20 yrs"
          />
          <DualSliderInput
            label="Additional months"
            value={months}
            onChange={(val) => onChange({ ...values, months: val })}
            min={years === 0 ? 1 : 0}
            max={11}
            step={1}
            suffix="mos"
            minLabel={years === 0 ? '1 mo' : '0 mos'}
            maxLabel="11 mos"
          />

          <div className="space-y-2">
            <span className="block text-[13px] font-medium text-slate-700 dark:text-slate-300">
              Interest payout option
            </span>
            <div
              role="group"
              aria-label="Interest payout option"
              className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 p-1 rounded-[8px] bg-[#F8FAFC] dark:bg-[#080A11] border border-black/[0.06] dark:border-white/[0.08]"
            >
              {PAYOUT_OPTIONS.map((opt) => {
                const active = payoutOption === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onChange({ ...values, payoutOption: opt.value })}
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
          centerLabel="Maturity total"
          centerValue={result.principal + result.totalInterest}
          slices={[
            { name: 'Principal deposit', value: result.principal, color: principalColor },
            { name: 'Guaranteed interest', value: result.totalInterest, color: gainsColor },
          ]}
        />
      }
      chartTitle="Maturity timeline"
      chartSubtitle={`Deposit matures in ${maturityDateStr}`}
      chartSection={
        <TrajectoryChart
          data={result.schedule as unknown as Array<Record<string, unknown>>}
          xKey="label"
          variant="area"
          currency={currency}
          isDark={isDark}
          series={[
            {
              key: 'invested',
              label: 'Principal deposit',
              color: principalColor,
              stackId: 'fd',
              fillOpacity: 0.25,
            },
            {
              key: 'gains',
              label: 'Accrued interest',
              color: gainsColor,
              stackId: 'fd',
              fillOpacity: 0.3,
            },
          ]}
        />
      }
      milestoneInsight={`Maturity scheduled ${maturityDateStr} · Effective annual yield ${result.effectiveYieldPct.toFixed(2)}%`}
    />
  );
}
