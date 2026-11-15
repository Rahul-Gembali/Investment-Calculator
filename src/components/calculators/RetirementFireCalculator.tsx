import { useMemo } from 'react';
import { CurrencyCode, CURRENCIES, formatCompactCurrency, formatAxisCurrency, formatCurrency } from '../../lib/currency';
import { calculateRetirementFire } from '../../lib/financeMath';
import { AnalysisSnapshot } from '../../lib/aiAdvisor';
import { AppStrategyState } from '../../lib/strategyStore';
import { CalculatorLayout, MobileSummaryPayload } from '../ui/CalculatorLayout';
import { DualSliderInput } from '../ui/DualSliderInput';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface RetirementFireCalculatorProps {
  values: AppStrategyState['fire'];
  onChange: (next: AppStrategyState['fire']) => void;
  currency: CurrencyCode;
  isDark: boolean;
  onAnalyzeAi?: (snapshot: AnalysisSnapshot) => void;
  onReportSummary?: (summary: MobileSummaryPayload) => void;
}

export function RetirementFireCalculator({
  values,
  onChange,
  currency,
  isDark,
  onAnalyzeAi,
  onReportSummary,
}: RetirementFireCalculatorProps) {
  const {
    currentAge,
    retirementAge,
    lifeExpectancy,
    currentMonthlyExpense,
    currentSavings,
    inflationPct,
    preRetirementReturnPct,
    postRetirementReturnPct,
  } = values;

  const sym = CURRENCIES[currency].symbol;

  const safeRetirementAge = Math.max(currentAge + 1, retirementAge);
  const safeLifeExpectancy = Math.max(safeRetirementAge + 1, lifeExpectancy);

  const result = useMemo(
    () =>
      calculateRetirementFire({
        currentAge,
        retirementAge: safeRetirementAge,
        lifeExpectancy: safeLifeExpectancy,
        currentMonthlyExpense,
        inflationPct,
        preRetirementReturnPct,
        postRetirementReturnPct,
        currentSavings,
      }),
    [
      currentAge,
      safeRetirementAge,
      safeLifeExpectancy,
      currentMonthlyExpense,
      inflationPct,
      preRetirementReturnPct,
      postRetirementReturnPct,
      currentSavings,
    ]
  );

  const chartData = useMemo(
    () =>
      result.schedule.map((pt) => ({
        ageLabel: `Age ${pt.age}`,
        accumulationCorpus: pt.phase === 'Accumulation' ? pt.corpus : null,
        distributionCorpus: pt.age >= safeRetirementAge ? pt.corpus : null,
        phase: pt.phase,
      })),
    [result.schedule, safeRetirementAge]
  );

  const gainsColor = '#08F6B6';
  const distColor = '#5367F5';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const tickColor = isDark ? '#94a3b8' : '#64748b';

  const analysisSnapshot: AnalysisSnapshot = {
    calculatorName: 'Retirement & FIRE Planner',
    currency,
    investedAmount: result.totalContributedDuringAccumulation,
    maturityAmount: result.targetCorpusAtRetirement,
    estimatedGain: Math.max(0, result.targetCorpusAtRetirement - result.totalContributedDuringAccumulation),
    details: {
      'Current Age': currentAge,
      'Target Retirement Age': safeRetirementAge,
      'Life Expectancy': safeLifeExpectancy,
      'Current Monthly Expense': currentMonthlyExpense,
      'Monthly Expense at Retirement': Math.round(result.monthlyExpenseAtRetirement),
      'Required Monthly SIP': Math.round(result.requiredMonthlySip),
      'Inflation / Pre / Post Returns': `${inflationPct}% / ${preRetirementReturnPct}% / ${postRetirementReturnPct}%`,
    },
  };

  return (
    <CalculatorLayout
      title="Retirement & FIRE planner"
      subtitle="Calculate your inflation-adjusted retirement target corpus and required monthly accumulation SIP"
      currency={currency}
      analysisSnapshot={analysisSnapshot}
      onAnalyzeAi={onAnalyzeAi}
      onReportSummary={onReportSummary}
      kpis={[
        {
          label: 'Target FIRE corpus',
          value: result.targetCorpusAtRetirement,
          tone: 'primary',
          sublabel: `At age ${safeRetirementAge} (${result.yearsToRetirement} yrs)`,
        },
        {
          label: 'Required monthly SIP',
          value: result.requiredMonthlySip,
          tone: 'gain',
          sublabel: `To bridge shortfall at ${preRetirementReturnPct}%`,
        },
        {
          label: 'Monthly expense at retirement',
          value: result.monthlyExpenseAtRetirement,
          tone: 'neutral',
          sublabel: `Inflation-adjusted (${inflationPct}% p.a.)`,
        },
      ]}
      controls={
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <DualSliderInput
              label="Current age"
              value={currentAge}
              onChange={(val) => {
                const nextRetire = retirementAge <= val ? val + 1 : retirementAge;
                const nextLife = lifeExpectancy <= nextRetire ? nextRetire + 1 : lifeExpectancy;
                onChange({
                  ...values,
                  currentAge: val,
                  retirementAge: nextRetire,
                  lifeExpectancy: nextLife,
                });
              }}
              min={18}
              max={65}
              step={1}
              suffix="yrs"
            />
            <DualSliderInput
              label="Retirement age"
              value={safeRetirementAge}
              onChange={(val) => {
                const clamped = Math.max(currentAge + 1, val);
                const nextLife = lifeExpectancy <= clamped ? clamped + 1 : lifeExpectancy;
                onChange({
                  ...values,
                  retirementAge: clamped,
                  lifeExpectancy: nextLife,
                });
              }}
              min={currentAge + 1}
              max={75}
              step={1}
              suffix="yrs"
            />
          </div>

          <DualSliderInput
            label="Life expectancy"
            value={safeLifeExpectancy}
            onChange={(val) =>
              onChange({ ...values, lifeExpectancy: Math.max(safeRetirementAge + 1, val) })
            }
            min={safeRetirementAge + 1}
            max={100}
            step={1}
            suffix="yrs"
            hint={`${result.yearsInRetirement} years in retirement`}
          />

          <DualSliderInput
            label="Current monthly expenses"
            value={currentMonthlyExpense}
            onChange={(val) => onChange({ ...values, currentMonthlyExpense: val })}
            min={5000}
            max={500000}
            step={5000}
            prefix={sym}
            minLabel={formatCompactCurrency(5000, currency)}
            maxLabel={formatCompactCurrency(500000, currency)}
          />

          <DualSliderInput
            label="Existing retirement savings"
            value={currentSavings}
            onChange={(val) => onChange({ ...values, currentSavings: val })}
            min={0}
            max={20000000}
            step={50000}
            prefix={sym}
            minLabel={formatCompactCurrency(0, currency)}
            maxLabel={formatCompactCurrency(20000000, currency)}
          />

          <DualSliderInput
            label="Expected inflation rate"
            value={inflationPct}
            onChange={(val) => onChange({ ...values, inflationPct: val })}
            min={2}
            max={12}
            step={0.5}
            suffix="%"
            minLabel="2%"
            maxLabel="12%"
          />
          <DualSliderInput
            label="Pre-retirement return rate"
            value={preRetirementReturnPct}
            onChange={(val) => onChange({ ...values, preRetirementReturnPct: val })}
            min={4}
            max={20}
            step={0.5}
            suffix="%"
            minLabel="4%"
            maxLabel="20%"
          />
          <DualSliderInput
            label="Post-retirement return rate"
            value={postRetirementReturnPct}
            onChange={(val) => onChange({ ...values, postRetirementReturnPct: val })}
            min={3}
            max={14}
            step={0.5}
            suffix="%"
            minLabel="3%"
            maxLabel="14%"
          />
        </>
      }
      chartTitle="Accumulation vs distribution phase"
      chartSubtitle={`Build corpus to age ${safeRetirementAge}, fund inflation-indexed expenses to age ${safeLifeExpectancy}`}
      chartSection={
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-5 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: gainsColor }} />
              <span>Accumulation phase (Age {currentAge}–{safeRetirementAge})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: distColor }} />
              <span>Distribution phase (Age {safeRetirementAge}–{safeLifeExpectancy})</span>
            </div>
          </div>

          <div className="h-72 w-full trajectory-area-reveal" data-testid="retirement-phase-chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 12, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad-acc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={gainsColor} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={gainsColor} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="grad-dist" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={distColor} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={distColor} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="ageLabel"
                  tick={{ fill: tickColor, fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                  axisLine={{ stroke: gridColor }}
                  tickLine={false}
                  minTickGap={24}
                />
                <YAxis
                  tickFormatter={(v) => formatAxisCurrency(v, currency)}
                  tick={{ fill: tickColor, fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                  axisLine={false}
                  tickLine={false}
                  width={68}
                />
                <ReferenceLine
                  x={`Age ${safeRetirementAge}`}
                  stroke={isDark ? '#64748b' : '#94a3b8'}
                  strokeDasharray="4 4"
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const valid = payload.find((p) => p.value !== null && p.value !== undefined);
                    if (!valid) return null;
                    return (
                      <div className="rounded-[8px] border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#111622] px-3.5 py-2.5 text-xs shadow-sm">
                        <div className="font-medium text-slate-900 dark:text-slate-100">{String(label)}</div>
                        <div className="mt-1 flex items-center justify-between gap-4">
                          <span className="text-slate-500 dark:text-slate-400">{valid.name}</span>
                          <span className="font-mono font-medium tabular-nums text-slate-900 dark:text-slate-100">
                            {formatCurrency(Number(valid.value ?? 0), currency)}
                          </span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="accumulationCorpus"
                  name="Accumulation corpus"
                  stroke={gainsColor}
                  strokeWidth={2}
                  fill="url(#grad-acc)"
                  connectNulls={false}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="distributionCorpus"
                  name="Retirement corpus"
                  stroke={distColor}
                  strokeWidth={2}
                  fill="url(#grad-dist)"
                  connectNulls={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      }
      milestoneInsight={`Existing savings grow to ${formatCompactCurrency(result.projectedCurrentSavingsAtRetirement, currency)} by age ${safeRetirementAge}`}
    />
  );
}
