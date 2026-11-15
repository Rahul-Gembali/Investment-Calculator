import { ReactNode, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { CurrencyCode } from '../../lib/currency';
import { AnalysisSnapshot } from '../../lib/aiAdvisor';
import { MetricFormat, OdometerMetric } from './OdometerMetric';

export interface KpiItem {
  label: string;
  value: number;
  format?: MetricFormat;
  decimals?: number;
  tone?: 'neutral' | 'gain' | 'primary';
  sublabel?: string;
}

export interface MobileSummaryPayload {
  investedLabel: string;
  invested: number;
  maturityLabel: string;
  maturity: number;
}

interface CalculatorLayoutProps {
  title: string;
  subtitle: string;
  controls: ReactNode;
  kpis: [KpiItem, KpiItem, KpiItem];
  currency: CurrencyCode;
  donutSection?: ReactNode;
  chartTitle: string;
  chartSubtitle?: string;
  chartSection: ReactNode;
  milestoneInsight: string;
  analysisSnapshot?: AnalysisSnapshot;
  onAnalyzeAi?: (snapshot: AnalysisSnapshot) => void;
  onReportSummary?: (summary: MobileSummaryPayload) => void;
}

export function CalculatorLayout({
  title,
  subtitle,
  controls,
  kpis,
  currency,
  donutSection,
  chartTitle,
  chartSubtitle,
  chartSection,
  milestoneInsight,
  analysisSnapshot,
  onAnalyzeAi,
  onReportSummary,
}: CalculatorLayoutProps) {
  useEffect(() => {
    if (!onReportSummary) return;
    onReportSummary({
      investedLabel: kpis[0].label,
      invested: kpis[0].format === 'percent' ? 0 : kpis[0].value,
      maturityLabel: kpis[2].label,
      maturity: kpis[2].format === 'percent' ? 0 : kpis[2].value,
    });
  }, [kpis[0].label, kpis[0].value, kpis[0].format, kpis[2].label, kpis[2].value, kpis[2].format, onReportSummary]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Column: Input Controls */}
      <section
        aria-label={`${title} inputs`}
        className="lg:col-span-5 rounded-[16px] border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#111622] p-6"
      >
        <div className="pb-5 border-b border-black/[0.06] dark:border-white/[0.08] flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              {title}
            </h2>
            <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed">
              {subtitle}
            </p>
          </div>
          {onAnalyzeAi && analysisSnapshot && (
            <button
              type="button"
              onClick={() => onAnalyzeAi(analysisSnapshot)}
              className="min-h-[40px] inline-flex items-center gap-1.5 rounded-[8px] border border-[#5367F5]/30 bg-[#5367F5]/10 dark:bg-[#5367F5]/18 px-3 py-1.5 text-xs font-medium text-[#5367F5] dark:text-[#8E9BFF] hover:bg-[#5367F5]/18 dark:hover:bg-[#5367F5]/28 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              Ask AI Advisor
            </button>
          )}
        </div>

        <div className="pt-5 space-y-6">{controls}</div>
      </section>

      {/* Right Column: Output Summary Bento */}
      <section
        aria-label={`${title} results`}
        className="lg:col-span-7 space-y-5"
      >
        {/* 3 Key Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {kpis.map((kpi, idx) => {
            const valueColor =
              kpi.tone === 'gain'
                ? 'text-[#059669] dark:text-[#08F6B6]'
                : kpi.tone === 'primary'
                  ? 'text-slate-900 dark:text-slate-50'
                  : 'text-[#5367F5] dark:text-[#7C8CFF]';

            return (
              <div
                key={`${kpi.label}-${idx}`}
                className="rounded-[16px] border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#111622] p-5"
              >
                <div className="text-[12px] font-medium text-slate-500 dark:text-slate-400">
                  {kpi.label}
                </div>
                <div className={`mt-2 text-xl xl:text-2xl font-semibold tracking-tight ${valueColor}`}>
                  <OdometerMetric
                    value={kpi.value}
                    currency={currency}
                    format={kpi.format ?? 'currency'}
                    decimals={kpi.decimals ?? 0}
                  />
                </div>
                {kpi.sublabel && (
                  <div className="mt-1.5 text-[11px] font-mono tabular-nums text-slate-400 dark:text-slate-500">
                    {kpi.sublabel}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Trajectory & Ratio Visualizations */}
        <div
          id="calculator-chart-anchor"
          className="rounded-[16px] border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#111622] p-6 space-y-6"
        >
          {donutSection && (
            <div className="pb-6 border-b border-black/[0.06] dark:border-white/[0.08]">
              {donutSection}
            </div>
          )}

          <div>
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 mb-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {chartTitle}
              </h3>
              {chartSubtitle && (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {chartSubtitle}
                </span>
              )}
            </div>
            {chartSection}
          </div>

          <div className="pt-4 border-t border-black/[0.06] dark:border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <span className="font-medium text-[#F59E0B] shrink-0">
              Milestone flag
            </span>
            <span className="font-mono tabular-nums sm:text-right text-slate-800 dark:text-slate-200">
              {milestoneInsight}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
