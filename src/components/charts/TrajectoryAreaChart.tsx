import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CurrencyCode, formatAxisCurrency, formatCurrency } from '../../lib/currency';

export interface SeriesConfig {
  key: string;
  label: string;
  color: string;
  kind?: 'area' | 'bar' | 'line';
  stackId?: string;
  dashed?: boolean;
  dashPattern?: string;
  fillOpacity?: number;
  strokeWidth?: number;
}

interface TrajectoryChartProps {
  data: Array<Record<string, unknown>>;
  xKey: string;
  series: SeriesConfig[];
  variant: 'area' | 'bar';
  currency: CurrencyCode;
  isDark: boolean;
  height?: number;
  valueFormatter?: (val: number) => string;
  axisFormatter?: (val: number) => string;
  showLegend?: boolean;
}

interface BarShapeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fill?: string;
  index?: number;
  roundedTop?: boolean;
}

function AnimatedBarShape({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  fill = '#5367F5',
  index = 0,
  roundedTop = false,
}: BarShapeProps) {
  if (width <= 0 || height <= 0) {
    return <g />;
  }

  const r = roundedTop ? Math.min(4, width / 2, height) : 0;
  const path =
    r > 0
      ? `M ${x},${y + height} L ${x},${y + r} Q ${x},${y} ${x + r},${y} L ${x + width - r},${y} Q ${x + width},${y} ${x + width},${y + r} L ${x + width},${y + height} Z`
      : `M ${x},${y + height} L ${x},${y} L ${x + width},${y} L ${x + width},${y + height} Z`;

  return (
    <g
      className="animate-bar-rise"
      style={{
        transformOrigin: `${x}px ${y + height}px`,
        animationDelay: `${Math.min(index * 0.04, 0.8)}s`,
      }}
    >
      <path d={path} fill={fill} />
    </g>
  );
}

export function TrajectoryChart({
  data,
  xKey,
  series,
  variant,
  currency,
  isDark,
  height = 280,
  valueFormatter,
  axisFormatter,
  showLegend = true,
}: TrajectoryChartProps) {
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const tickColor = isDark ? '#a1a1aa' : '#71717a';

  const formatTip = (val: number) =>
    valueFormatter ? valueFormatter(val) : formatCurrency(val, currency);

  const formatAxis = (val: number) =>
    axisFormatter ? axisFormatter(val) : formatAxisCurrency(val, currency);

  const resolvedSeries = series.map((s) => ({
    ...s,
    resolvedKind: s.kind ?? (variant === 'bar' ? 'bar' : 'area'),
  }));

  const barSeriesKeys = resolvedSeries
    .filter((s) => s.resolvedKind === 'bar')
    .map((s) => s.key);
  const lastBarKey = barSeriesKeys[barSeriesKeys.length - 1];

  const renderTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: ReadonlyArray<{
      name?: string | number;
      value?: unknown;
      color?: string;
      dataKey?: unknown;
    }>;
    label?: string | number;
  }) => {
    if (!active || !payload || payload.length === 0) return null;
    return (
      <div className="rounded-[8px] border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#111622] px-3.5 py-2.5 text-xs shadow-sm">
        <div className="mb-1.5 font-medium text-slate-900 dark:text-slate-100">
          {String(label)}
        </div>
        <div className="space-y-1">
          {payload.map((entry, idx) => (
            <div
              key={`${String(entry.dataKey ?? idx)}-${idx}`}
              className="flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-[2px] shrink-0"
                  style={{ backgroundColor: entry.color }}
                  aria-hidden="true"
                />
                <span className="text-slate-600 dark:text-slate-300">{entry.name}</span>
              </div>
              <span className="font-mono font-medium tabular-nums text-slate-900 dark:text-slate-100">
                {formatTip(Number(entry.value ?? 0))}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-2.5" data-testid="trajectory-chart">
      <div
        style={{ height }}
        className={`w-full ${variant === 'area' ? 'trajectory-area-reveal' : 'trajectory-bar-reveal'}`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
            <defs>
              {resolvedSeries
                .filter((s) => s.resolvedKind === 'area')
                .map((s) => (
                  <linearGradient
                    key={`grad-${s.key}`}
                    id={`grad-${s.key}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor={s.color}
                      stopOpacity={s.fillOpacity ?? 0.24}
                    />
                    <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
                  </linearGradient>
                ))}
            </defs>
            <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey={xKey}
              tick={{ fill: tickColor, fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
              axisLine={{ stroke: gridColor }}
              tickLine={false}
              minTickGap={variant === 'bar' ? 16 : 22}
            />
            <YAxis
              tickFormatter={formatAxis}
              tick={{ fill: tickColor, fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
              axisLine={false}
              tickLine={false}
              width={64}
            />
            <Tooltip
              content={renderTooltip}
              cursor={
                variant === 'bar'
                  ? { fill: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }
                  : undefined
              }
            />
            {resolvedSeries.map((s) => {
              if (s.resolvedKind === 'bar') {
                const isRounded = !s.stackId || s.key === lastBarKey;
                return (
                  <Bar
                    key={s.key}
                    dataKey={s.key}
                    name={s.label}
                    stackId={s.stackId}
                    fill={s.color}
                    shape={(barProps: unknown) => {
                      const bp = barProps as BarShapeProps;
                      return <AnimatedBarShape {...bp} roundedTop={isRounded} />;
                    }}
                    isAnimationActive={false}
                  />
                );
              }
              if (s.resolvedKind === 'line') {
                return (
                  <Line
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={s.label}
                    stroke={s.color}
                    strokeWidth={s.strokeWidth ?? 2.25}
                    strokeDasharray={s.dashed ? s.dashPattern ?? '5 4' : undefined}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0, fill: s.color }}
                    isAnimationActive={false}
                  />
                );
              }
              return (
                <Area
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label}
                  stackId={s.stackId}
                  stroke={s.color}
                  strokeWidth={s.strokeWidth ?? 2}
                  strokeDasharray={s.dashed ? s.dashPattern ?? '4 4' : undefined}
                  fill={`url(#grad-${s.key})`}
                  isAnimationActive={false}
                />
              );
            })}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {showLegend && resolvedSeries.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-[11px] text-slate-600 dark:text-slate-400">
          {resolvedSeries.map((s) => (
            <div key={`legend-${s.key}`} className="inline-flex items-center gap-1.5">
              {s.resolvedKind === 'line' ? (
                <span
                  className="inline-block w-4 border-t-2"
                  style={{
                    borderColor: s.color,
                    borderStyle: s.dashed ? 'dashed' : 'solid',
                  }}
                  aria-hidden="true"
                />
              ) : (
                <span
                  className="h-2.5 w-2.5 rounded-[2px] shrink-0"
                  style={{ backgroundColor: s.color }}
                  aria-hidden="true"
                />
              )}
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
