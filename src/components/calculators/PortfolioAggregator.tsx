import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BookmarkPlus, ChevronDown, ChevronUp, Plus, Sparkles, Trash2 } from 'lucide-react';
import {
  CurrencyCode,
  CURRENCIES,
  formatCompactCurrency,
  formatCurrency,
} from '../../lib/currency';
import {
  calculatePortfolio,
  InvestmentStream,
  StreamType,
} from '../../lib/financeMath';
import { AnalysisSnapshot } from '../../lib/aiAdvisor';
import { PORTFOLIO_PALETTE } from '../../lib/strategyStore';
import { MobileSummaryPayload } from '../ui/CalculatorLayout';
import { OdometerMetric } from '../ui/OdometerMetric';
import { WealthDonutChart } from '../charts/WealthDonutChart';
import { SeriesConfig, TrajectoryChart } from '../charts/TrajectoryAreaChart';
import { InflationBenchmarkControl } from '../charts/InflationBenchmarkControl';

interface PortfolioAggregatorProps {
  streams: InvestmentStream[];
  onStreamsChange: (next: InvestmentStream[]) => void;
  showInflation: boolean;
  onToggleInflation: (enabled: boolean) => void;
  inflationRate: number;
  onInflationRateChange: (rate: number) => void;
  currency: CurrencyCode;
  isDark: boolean;
  onAnalyzeAi?: (snapshot: AnalysisSnapshot) => void;
  onSaveStrategy?: () => void;
  onReportSummary?: (summary: MobileSummaryPayload) => void;
}

const STREAM_TYPE_LABELS: Record<StreamType, string> = {
  sip: 'SIP',
  lumpsum: 'Lump sum',
  fd: 'Fixed deposit',
  rd: 'Recurring deposit',
  dividend: 'Rental / Dividend yield',
};

export function PortfolioAggregator({
  streams,
  onStreamsChange,
  showInflation,
  onToggleInflation,
  inflationRate,
  onInflationRateChange,
  currency,
  isDark,
  onAnalyzeAi,
  onSaveStrategy,
  onReportSummary,
}: PortfolioAggregatorProps) {
  const [chartHorizon, setChartHorizon] = useState<number | 'all'>('all');
  const [ledgerExpanded, setLedgerExpanded] = useState<boolean>(false);

  const sym = CURRENCIES[currency].symbol;
  const result = useMemo(
    () => calculatePortfolio(streams, inflationRate),
    [streams, inflationRate]
  );

  useEffect(() => {
    if (!onReportSummary) return;
    onReportSummary({
      investedLabel: 'Total invested',
      invested: result.totalInvested,
      maturityLabel: 'Consolidated net worth',
      maturity: result.totalNetWorth,
    });
  }, [result.totalInvested, result.totalNetWorth, onReportSummary]);

  const handleAddStream = () => {
    const idx = streams.length;
    const newStream: InvestmentStream = {
      id: `stream-${Date.now()}`,
      name: `Stream ${idx + 1}`,
      type: 'sip',
      amount: 10000,
      ratePct: 11,
      stepUpPct: 0,
      startYear: 0,
      tenureYears: 15,
      color: PORTFOLIO_PALETTE[idx % PORTFOLIO_PALETTE.length],
    };
    onStreamsChange([...streams, newStream]);
  };

  const handleUpdateStream = <K extends keyof InvestmentStream>(
    id: string,
    key: K,
    value: InvestmentStream[K]
  ) => {
    onStreamsChange(
      streams.map((s) => (s.id === id ? { ...s, [key]: value } : s))
    );
  };

  const handleRemoveStream = (id: string) => {
    onStreamsChange(streams.filter((s) => s.id !== id));
  };

  const stackedChartData = useMemo(() => {
    const limit =
      chartHorizon === 'all'
        ? result.ledger.length
        : Math.min(chartHorizon, result.ledger.length);
    return result.ledger.slice(0, limit).map((row) => {
      const entry: Record<string, unknown> = {
        label: `Yr ${row.year}`,
        cumulativeInvested: Math.round(row.cumulativeInvested),
        realNetWorth: Math.round(row.realNetWorth),
      };
      for (const s of streams) {
        entry[s.id] = Math.round(row.streamBalances[s.id] ?? 0);
      }
      return entry;
    });
  }, [result.ledger, streams, chartHorizon]);

  const portfolioChartSeries: SeriesConfig[] = [
    ...streams.map((s) => ({
      key: s.id,
      label: s.name,
      color: s.color,
      stackId: 'portfolio',
      kind: 'area' as const,
      fillOpacity: 0.32,
    })),
    {
      key: 'cumulativeInvested',
      label: 'Invested capital',
      color: '#5367F5',
      kind: 'line',
      strokeWidth: 2,
    },
    ...(showInflation
      ? [
          {
            key: 'realNetWorth',
            label: `Real purchasing power (${inflationRate}% inf.)`,
            color: '#F59E0B',
            kind: 'line' as const,
            dashed: true,
            dashPattern: '6 4',
            strokeWidth: 2.4,
          },
        ]
      : []),
  ];

  const visibleLedgerRows = ledgerExpanded
    ? result.ledger
    : result.ledger.slice(0, 6);

  const analysisSnapshot: AnalysisSnapshot = {
    calculatorName: 'Multi-Asset Portfolio Aggregator',
    currency,
    investedAmount: result.totalInvested,
    maturityAmount: result.totalNetWorth,
    estimatedGain: result.totalGains,
    details: {
      'Active Streams': streams.length,
      'Projection Horizon': `${result.horizonYears} years`,
      'Monthly Cash Outflow': result.currentMonthlyOutflow,
      'Blended Portfolio XIRR': `${result.blendedXirrPct.toFixed(2)}%`,
      'Inflation Benchmark': showInflation ? `${inflationRate}% p.a.` : 'Disabled',
      'Real Purchasing Power': Math.round(result.realTotalNetWorth),
      'Stream Breakdown': result.streamSummaries
        .map((s) => `${s.name} (${STREAM_TYPE_LABELS[s.type]}: ${s.allocationPct.toFixed(1)}%)`)
        .join(', '),
    },
  };

  return (
    <div className="space-y-6">
      {/* Top Consolidated KPI Strip */}
      <section
        aria-label="Consolidated portfolio metrics"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <div className="rounded-[16px] border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#111622] p-5">
          <div className="text-[12px] font-medium text-slate-500 dark:text-slate-400">
            Monthly cash outflow
          </div>
          <div className="mt-2 text-xl xl:text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            <OdometerMetric value={result.currentMonthlyOutflow} currency={currency} compactThreshold={1e7} />
          </div>
          <div className="mt-1.5 text-[11px] font-mono tabular-nums text-slate-400 dark:text-slate-500">
            Active recurring streams at Yr 0
          </div>
        </div>

        <div className="rounded-[16px] border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#111622] p-5">
          <div className="text-[12px] font-medium text-slate-500 dark:text-slate-400">
            Cumulative invested capital
          </div>
          <div className="mt-2 text-xl xl:text-2xl font-semibold tracking-tight text-[#5367F5] dark:text-[#7C8CFF]">
            <OdometerMetric value={result.totalInvested} currency={currency} compactThreshold={1e7} />
          </div>
          <div className="mt-1.5 text-[11px] font-mono tabular-nums text-slate-400 dark:text-slate-500">
            Across {streams.length} {streams.length === 1 ? 'stream' : 'streams'} · {result.horizonYears} yrs
          </div>
        </div>

        <div className="rounded-[16px] border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#111622] p-5">
          <div className="text-[12px] font-medium text-slate-500 dark:text-slate-400">
            Consolidated net worth
          </div>
          <div className="mt-2 text-xl xl:text-2xl font-semibold tracking-tight text-[#059669] dark:text-[#08F6B6]">
            <OdometerMetric value={result.totalNetWorth} currency={currency} compactThreshold={1e7} />
          </div>
          <div className="mt-1.5 text-[11px] font-mono tabular-nums text-slate-400 dark:text-slate-500">
            {showInflation
              ? `Real: ${formatCompactCurrency(result.realTotalNetWorth, currency)} · Gains: ${formatCompactCurrency(result.totalGains, currency)}`
              : `Gains: ${formatCompactCurrency(result.totalGains, currency)}`}
          </div>
        </div>

        <div className="rounded-[16px] border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#111622] p-5">
          <div className="text-[12px] font-medium text-slate-500 dark:text-slate-400">
            Blended portfolio XIRR
          </div>
          <div className="mt-2 text-xl xl:text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            <OdometerMetric
              value={result.blendedXirrPct}
              format="percent"
              decimals={2}
            />
          </div>
          <div className="mt-1.5 text-[11px] font-mono tabular-nums text-slate-400 dark:text-slate-500">
            Time-weighted annual IRR
          </div>
        </div>
      </section>

      {/* Main Workspace Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Dynamic Stream Builder */}
        <section
          aria-label="Investment stream builder"
          className="lg:col-span-5 rounded-[16px] border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#111622] p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-black/[0.06] dark:border-white/[0.08]">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                Investment streams
              </h2>
              <p className="mt-0.5 text-[13px] text-slate-500 dark:text-slate-400">
                Combine parallel SIPs, deposits, and yield streams
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {onSaveStrategy && (
                <button
                  type="button"
                  onClick={onSaveStrategy}
                  className="min-h-[40px] inline-flex items-center gap-1.5 rounded-[8px] border border-black/[0.08] dark:border-white/[0.08] bg-[#F8FAFC] dark:bg-[#080A11] px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-[#5367F5] hover:text-[#5367F5] dark:hover:text-[#7C8CFF] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <BookmarkPlus className="w-3.5 h-3.5" aria-hidden="true" />
                  Save Strategy
                </button>
              )}
              {onAnalyzeAi && (
                <button
                  type="button"
                  onClick={() => onAnalyzeAi(analysisSnapshot)}
                  className="min-h-[40px] inline-flex items-center gap-1.5 rounded-[8px] border border-[#5367F5]/30 bg-[#5367F5]/10 dark:bg-[#5367F5]/18 px-3 py-1.5 text-xs font-medium text-[#5367F5] dark:text-[#8E9BFF] hover:bg-[#5367F5]/18 dark:hover:bg-[#5367F5]/28 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                  Ask AI Advisor
                </button>
              )}
              <button
                type="button"
                onClick={handleAddStream}
                className="min-h-[40px] inline-flex items-center gap-1.5 rounded-[8px] bg-[#5367F5] hover:bg-[#4255E0] px-3.5 py-2 text-xs font-medium text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                Add investment stream
              </button>
            </div>
          </div>

          {streams.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No active investment streams configured
              </p>
              <button
                type="button"
                onClick={handleAddStream}
                className="min-h-[44px] inline-flex items-center gap-1.5 rounded-[8px] border border-black/[0.12] dark:border-white/[0.12] px-4 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                Add first stream
              </button>
            </div>
          ) : (
            <div className="divide-y divide-black/[0.06] dark:divide-white/[0.08]">
              <AnimatePresence initial={false}>
                {streams.map((stream, index) => {
                  const isPeriodic =
                    stream.type === 'sip' ||
                    stream.type === 'rd' ||
                    stream.type === 'dividend';
                  const supportsStepUp =
                    stream.type === 'sip' || stream.type === 'dividend';

                  return (
                    <motion.div
                      key={stream.id}
                      initial={{ y: 8 }}
                      animate={{ y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.16, ease: 'easeOut' }}
                      className="py-5 first:pt-5 last:pb-1 space-y-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <span
                            className="h-3 w-3 rounded-[4px] shrink-0"
                            style={{ backgroundColor: stream.color }}
                            aria-hidden="true"
                          />
                          <input
                            type="text"
                            value={stream.name}
                            onChange={(e) =>
                              handleUpdateStream(stream.id, 'name', e.target.value)
                            }
                            aria-label={`Stream ${index + 1} name`}
                            className="w-full min-h-[36px] bg-transparent text-sm font-semibold text-slate-900 dark:text-slate-100 outline-none border-b border-transparent focus:border-[#5367F5] py-0.5 truncate"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveStream(stream.id)}
                          aria-label={`Remove ${stream.name}`}
                          className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-[6px] text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors shrink-0 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div className="col-span-2 sm:col-span-1">
                          <label
                            htmlFor={`${stream.id}-type`}
                            className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1"
                          >
                            Instrument
                          </label>
                          <select
                            id={`${stream.id}-type`}
                            value={stream.type}
                            onChange={(e) =>
                              handleUpdateStream(
                                stream.id,
                                'type',
                                e.target.value as StreamType
                              )
                            }
                            className="w-full min-h-[44px] sm:min-h-[36px] rounded-[8px] border border-black/[0.08] dark:border-white/[0.08] bg-[#F8FAFC] dark:bg-[#080A11] px-2.5 py-1.5 text-xs font-medium text-slate-900 dark:text-slate-100 outline-none focus:border-[#5367F5]"
                          >
                            {(Object.keys(STREAM_TYPE_LABELS) as StreamType[]).map(
                              (t) => (
                                <option key={t} value={t}>
                                  {STREAM_TYPE_LABELS[t]}
                                </option>
                              )
                            )}
                          </select>
                        </div>

                        <div>
                          <label
                            htmlFor={`${stream.id}-amount`}
                            className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1"
                          >
                            {isPeriodic ? `Monthly (${sym})` : `Principal (${sym})`}
                          </label>
                          <input
                            id={`${stream.id}-amount`}
                            type="number"
                            inputMode="decimal"
                            min={0}
                            step={isPeriodic ? 500 : 10000}
                            value={stream.amount}
                            onChange={(e) =>
                              handleUpdateStream(
                                stream.id,
                                'amount',
                                Math.max(0, Number(e.target.value) || 0)
                              )
                            }
                            className="no-spinner w-full min-h-[44px] sm:min-h-[36px] rounded-[8px] border border-black/[0.08] dark:border-white/[0.08] bg-[#F8FAFC] dark:bg-[#080A11] px-2.5 py-1.5 font-mono text-xs font-medium text-slate-900 dark:text-slate-100 outline-none focus:border-[#5367F5] tabular-nums"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor={`${stream.id}-rate`}
                            className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1"
                          >
                            Return (% p.a.)
                          </label>
                          <input
                            id={`${stream.id}-rate`}
                            type="number"
                            inputMode="decimal"
                            min={0}
                            max={40}
                            step={0.25}
                            value={stream.ratePct}
                            onChange={(e) =>
                              handleUpdateStream(
                                stream.id,
                                'ratePct',
                                Math.min(40, Math.max(0, Number(e.target.value) || 0))
                              )
                            }
                            className="no-spinner w-full min-h-[44px] sm:min-h-[36px] rounded-[8px] border border-black/[0.08] dark:border-white/[0.08] bg-[#F8FAFC] dark:bg-[#080A11] px-2.5 py-1.5 font-mono text-xs font-medium text-slate-900 dark:text-slate-100 outline-none focus:border-[#5367F5] tabular-nums"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor={`${stream.id}-start`}
                            className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1"
                          >
                            Start year offset
                          </label>
                          <input
                            id={`${stream.id}-start`}
                            type="number"
                            inputMode="decimal"
                            min={0}
                            max={30}
                            step={1}
                            value={stream.startYear}
                            onChange={(e) =>
                              handleUpdateStream(
                                stream.id,
                                'startYear',
                                Math.min(30, Math.max(0, Math.round(Number(e.target.value) || 0)))
                              )
                            }
                            className="no-spinner w-full min-h-[44px] sm:min-h-[36px] rounded-[8px] border border-black/[0.08] dark:border-white/[0.08] bg-[#F8FAFC] dark:bg-[#080A11] px-2.5 py-1.5 font-mono text-xs font-medium text-slate-900 dark:text-slate-100 outline-none focus:border-[#5367F5] tabular-nums"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor={`${stream.id}-tenure`}
                            className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1"
                          >
                            Tenure (years)
                          </label>
                          <input
                            id={`${stream.id}-tenure`}
                            type="number"
                            inputMode="decimal"
                            min={1}
                            max={40}
                            step={1}
                            value={stream.tenureYears}
                            onChange={(e) =>
                              handleUpdateStream(
                                stream.id,
                                'tenureYears',
                                Math.min(40, Math.max(1, Math.round(Number(e.target.value) || 1)))
                              )
                            }
                            className="no-spinner w-full min-h-[44px] sm:min-h-[36px] rounded-[8px] border border-black/[0.08] dark:border-white/[0.08] bg-[#F8FAFC] dark:bg-[#080A11] px-2.5 py-1.5 font-mono text-xs font-medium text-slate-900 dark:text-slate-100 outline-none focus:border-[#5367F5] tabular-nums"
                          />
                        </div>

                        {supportsStepUp && (
                          <div>
                            <label
                              htmlFor={`${stream.id}-stepup`}
                              className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1"
                            >
                              Step-up (% / yr)
                            </label>
                            <input
                              id={`${stream.id}-stepup`}
                              type="number"
                              inputMode="decimal"
                              min={0}
                              max={30}
                              step={1}
                              value={stream.stepUpPct}
                              onChange={(e) =>
                                handleUpdateStream(
                                  stream.id,
                                  'stepUpPct',
                                  Math.min(30, Math.max(0, Number(e.target.value) || 0))
                                )
                              }
                              className="no-spinner w-full min-h-[44px] sm:min-h-[36px] rounded-[8px] border border-black/[0.08] dark:border-white/[0.08] bg-[#F8FAFC] dark:bg-[#080A11] px-2.5 py-1.5 font-mono text-xs font-medium text-slate-900 dark:text-slate-100 outline-none focus:border-[#5367F5] tabular-nums"
                            />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </section>

        {/* Consolidated Visualizations + Ledger */}
        <section
          aria-label="Portfolio projections and ledger"
          className="lg:col-span-7 space-y-6"
        >
          <div
            id="calculator-chart-anchor"
            className="rounded-[16px] border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#111622] p-6 space-y-6"
          >
            <div className="pb-6 border-b border-black/[0.06] dark:border-white/[0.08]">
              <div className="flex items-baseline justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Asset allocation breakdown
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Maturity share by stream
                </span>
              </div>
              <WealthDonutChart
                currency={currency}
                isDark={isDark}
                centerLabel="Portfolio total"
                centerValue={result.totalNetWorth}
                slices={result.streamSummaries.map((s) => ({
                  name: s.name,
                  value: s.finalValue,
                  color: s.color,
                }))}
              />
            </div>

            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Consolidated wealth trajectory
                  </h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Stacked stream contributions across projection horizon
                  </span>
                </div>

                <div
                  role="group"
                  aria-label="Projection horizon filter"
                  className="inline-flex items-center p-0.5 rounded-[8px] bg-[#F8FAFC] dark:bg-[#080A11] border border-black/[0.06] dark:border-white/[0.08] self-start sm:self-auto"
                >
                  {([5, 10, 20, 30] as const)
                    .filter((h) => h < result.horizonYears)
                    .map((h) => {
                      const active = chartHorizon === h;
                      return (
                        <button
                          key={String(h)}
                          type="button"
                          onClick={() => setChartHorizon(h)}
                          className={`min-h-[34px] px-2.5 py-1 text-[11px] font-mono font-medium rounded-[6px] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            active
                              ? 'bg-[#5367F5] text-white shadow-xs'
                              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                          }`}
                        >
                          {h}Y
                        </button>
                      );
                    })}
                  <button
                    type="button"
                    onClick={() => setChartHorizon('all')}
                    className={`min-h-[34px] px-2.5 py-1 text-[11px] font-mono font-medium rounded-[6px] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      chartHorizon === 'all' ||
                      (typeof chartHorizon === 'number' && chartHorizon >= result.horizonYears)
                        ? 'bg-[#5367F5] text-white shadow-xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    Full ({result.horizonYears}Y)
                  </button>
                </div>
              </div>

              <InflationBenchmarkControl
                enabled={showInflation}
                onToggle={onToggleInflation}
                inflationRate={inflationRate}
                onRateChange={onInflationRateChange}
                realValue={result.realTotalNetWorth}
                currency={currency}
              />

              <TrajectoryChart
                data={stackedChartData}
                xKey="label"
                variant="area"
                currency={currency}
                isDark={isDark}
                height={300}
                series={portfolioChartSeries}
              />
            </div>
          </div>

          {/* Year-by-Year Cash Flow & Balance Ledger Table */}
          <div className="rounded-[16px] border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#111622] p-6">
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-black/[0.06] dark:border-white/[0.08]">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Year-by-year cash flow ledger
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Annual capital inflows, interest accrued, and closing portfolio net worth
                </p>
              </div>
              {result.ledger.length > 6 && (
                <button
                  type="button"
                  onClick={() => setLedgerExpanded((prev) => !prev)}
                  aria-expanded={ledgerExpanded}
                  className="min-h-[40px] inline-flex items-center gap-1 rounded-[8px] border border-black/[0.08] dark:border-white/[0.08] px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {ledgerExpanded ? (
                    <>
                      Show less
                      <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
                    </>
                  ) : (
                    <>
                      Show all {result.ledger.length} years
                      <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="overflow-x-auto mt-2">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-black/[0.06] dark:border-white/[0.08] text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    <th className="py-2.5 pr-3">Year</th>
                    <th className="py-2.5 px-3 text-right">Deposited</th>
                    <th className="py-2.5 px-3 text-right">Interest earned</th>
                    <th className="py-2.5 pl-3 text-right">Year-end net worth</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.05] text-xs font-mono tabular-nums">
                  {visibleLedgerRows.map((row) => (
                    <tr
                      key={row.year}
                      className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-2.5 pr-3 font-sans font-medium text-slate-700 dark:text-slate-300">
                        Year {row.year}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400">
                        {formatCurrency(row.depositedThisYear, currency)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-[#059669] dark:text-[#08F6B6]">
                        +{formatCurrency(row.interestEarnedThisYear, currency)}
                      </td>
                      <td className="py-2.5 pl-3 text-right font-semibold text-slate-900 dark:text-slate-100">
                        {formatCurrency(row.netWorth, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
