import { useEffect, useId, useState } from 'react';
import { CurrencyCode, formatCompactCurrency, formatCurrency } from '../../lib/currency';

export interface DonutSlice {
  name: string;
  value: number;
  color: string;
}

interface WealthDonutChartProps {
  slices: DonutSlice[];
  currency: CurrencyCode;
  centerLabel: string;
  centerValue: number;
  isDark: boolean;
}

export function WealthDonutChart({
  slices,
  currency,
  centerLabel,
  centerValue,
  isDark,
}: WealthDonutChartProps) {
  const maskId = useId();
  const [sweepReady, setSweepReady] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  useEffect(() => {
    setSweepReady(false);
    const raf = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        setSweepReady(true);
      });
    });
    return () => window.cancelAnimationFrame(raf);
  }, []);

  const validSlices = slices.filter((s) => s.value > 0);
  const total = validSlices.reduce((acc, s) => acc + s.value, 0);

  const size = 176;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 67;
  const strokeWidth = 22;
  const circumference = 2 * Math.PI * radius;
  const gapPx = validSlices.length > 1 ? 3 : 0;

  let cumulative = 0;
  const segments = validSlices.map((slice, idx) => {
    const rawLen = total > 0 ? (slice.value / total) * circumference : 0;
    const segLen = Math.max(0, rawLen - gapPx);
    const offset = -cumulative;
    cumulative += rawLen;
    return {
      ...slice,
      idx,
      segLen,
      offset,
      pct: total > 0 ? (slice.value / total) * 100 : 0,
    };
  });

  const activeSlice = hoveredIdx !== null ? segments[hoveredIdx] ?? null : null;
  const trackStroke = isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0';

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative w-44 h-44 shrink-0" data-testid="wealth-donut-chart">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="w-full h-full overflow-visible"
          role="img"
          aria-label={`${centerLabel}: ${formatCompactCurrency(centerValue, currency)}`}
        >
          <defs>
            <mask id={maskId}>
              <circle
                cx={cx}
                cy={cy}
                r={radius}
                fill="none"
                stroke="white"
                strokeWidth={strokeWidth + 4}
                strokeDasharray={circumference}
                strokeDashoffset={sweepReady ? 0 : circumference}
                transform={`rotate(-90 ${cx} ${cy})`}
                style={{
                  transition: 'stroke-dashoffset 1.1s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              />
            </mask>
          </defs>

          {/* Subtle empty circular track rendered immediately on load */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={trackStroke}
            strokeWidth={strokeWidth}
          />

          {/* Sweeping animated slices */}
          {segments.length > 0 && (
            <g mask={`url(#${maskId})`}>
              {segments.map((seg) => (
                <circle
                  key={`slice-${seg.name}-${seg.idx}`}
                  cx={cx}
                  cy={cy}
                  r={radius}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={hoveredIdx === seg.idx ? strokeWidth + 3 : strokeWidth}
                  strokeDasharray={`${seg.segLen} ${circumference}`}
                  strokeDashoffset={seg.offset}
                  transform={`rotate(-90 ${cx} ${cy})`}
                  onMouseEnter={() => setHoveredIdx(seg.idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className="cursor-pointer transition-[stroke-width] duration-150"
                />
              ))}
            </g>
          )}
        </svg>

        {/* Center KPI readout */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-3">
          <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
            {centerLabel}
          </span>
          <span className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
            {formatCompactCurrency(centerValue, currency)}
          </span>
        </div>

        {/* Hover Tooltip */}
        {activeSlice && (
          <div className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full z-20 whitespace-nowrap rounded-[8px] border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#111622] px-3 py-2 text-xs shadow-md">
            <div className="flex items-center gap-1.5 font-medium text-neutral-900 dark:text-neutral-100">
              <span
                className="h-2 w-2 rounded-[2px] shrink-0"
                style={{ backgroundColor: activeSlice.color }}
              />
              <span>{activeSlice.name}</span>
            </div>
            <div className="mt-0.5 font-mono tabular-nums text-neutral-600 dark:text-neutral-300">
              {formatCurrency(activeSlice.value, currency)} ({activeSlice.pct.toFixed(1)}%)
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 w-full space-y-2.5">
        {slices.map((slice) => {
          const pct = total > 0 ? (slice.value / total) * 100 : 0;
          return (
            <div
              key={slice.name}
              className="flex items-center justify-between gap-3 py-1 border-b border-black/[0.05] dark:border-white/[0.05] last:border-b-0"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="h-2.5 w-2.5 rounded-[3px] shrink-0"
                  style={{ backgroundColor: slice.color }}
                  aria-hidden="true"
                />
                <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300 truncate">
                  {slice.name}
                </span>
              </div>
              <div className="flex items-center gap-2.5 shrink-0 font-mono text-xs tabular-nums">
                <span className="text-neutral-900 dark:text-neutral-100 font-medium">
                  {formatCompactCurrency(slice.value, currency)}
                </span>
                <span className="w-11 text-right text-neutral-500 dark:text-neutral-400">
                  {pct.toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
