import { useState, useEffect } from 'react';
import { CurrencyCode, formatCompactCurrency } from '../../lib/currency';

interface InflationBenchmarkControlProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  inflationRate: number;
  onRateChange: (rate: number) => void;
  realValue: number;
  currency: CurrencyCode;
}

export function InflationBenchmarkControl({
  enabled,
  onToggle,
  inflationRate,
  onRateChange,
  realValue,
  currency,
}: InflationBenchmarkControlProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [draft, setDraft] = useState(inflationRate.toFixed(1));

  useEffect(() => {
    if (!isFocused) {
      setDraft(inflationRate.toFixed(1));
    }
  }, [inflationRate, isFocused]);

  const pct = Math.min(100, Math.max(0, (inflationRate / 15) * 100));

  return (
    <div className="mb-4 rounded-[10px] border border-black/[0.06] dark:border-white/[0.08] bg-[#F8FAFC] dark:bg-[#080A11] px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => onToggle(!enabled)}
          className={`min-h-[36px] inline-flex items-center gap-2 rounded-[8px] px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
            enabled
              ? 'bg-[#F59E0B]/12 text-[#B45309] dark:text-[#FBBF24] border border-[#F59E0B]/30'
              : 'bg-white dark:bg-[#111622] text-slate-600 dark:text-slate-400 border border-black/[0.08] dark:border-white/[0.08]'
          }`}
        >
          <span
            className="inline-block w-4 border-t-2 border-dashed border-[#F59E0B]"
            aria-hidden="true"
          />
          <span>Inflation benchmark</span>
        </button>

        {enabled && (
          <div className="flex items-center gap-2.5">
            <div className="flex items-center min-h-[32px]">
              <input
                type="range"
                min={0}
                max={15}
                step={0.5}
                value={inflationRate}
                onChange={(e) => onRateChange(Number(e.target.value))}
                aria-label="Annual inflation benchmark percentage"
                className="inflation-slider w-24 sm:w-28 bg-slate-200 dark:bg-slate-700/80 border border-black/[0.08] dark:border-white/10"
                style={{
                  background: `linear-gradient(to right, #5367F5 0%, #5367F5 ${pct}%, var(--slider-track-bg) ${pct}%, var(--slider-track-bg) 100%)`,
                }}
              />
            </div>

            <div className="inline-flex items-center rounded-[6px] border border-black/[0.1] dark:border-white/[0.12] bg-white dark:bg-[#111622] px-2 py-1 focus-within:border-[#5367F5]">
              <input
                type="number"
                inputMode="decimal"
                min={0}
                max={15}
                step={0.5}
                value={isFocused ? draft : inflationRate.toFixed(1)}
                onFocus={() => {
                  setIsFocused(true);
                  setDraft(String(inflationRate));
                }}
                onChange={(e) => {
                  const raw = e.target.value;
                  setDraft(raw);
                  const val = Number(raw);
                  if (raw !== '' && !Number.isNaN(val)) {
                    onRateChange(Math.min(15, Math.max(0, val)));
                  }
                }}
                onBlur={() => {
                  setIsFocused(false);
                  const val = Number(draft);
                  if (draft === '' || Number.isNaN(val)) {
                    setDraft(inflationRate.toFixed(1));
                  } else {
                    const clamped = Math.min(15, Math.max(0, val));
                    onRateChange(clamped);
                    setDraft(clamped.toFixed(1));
                  }
                }}
                aria-label="Inflation rate value"
                className="no-spinner w-10 bg-transparent font-mono text-xs font-semibold tabular-nums text-right text-slate-900 dark:text-slate-100 outline-none"
              />
              <span className="font-mono text-xs font-medium text-slate-500 dark:text-slate-400 ml-0.5 select-none">
                %
              </span>
            </div>
          </div>
        )}
      </div>

      {enabled && (
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-500 dark:text-slate-400">Real purchasing power:</span>
          <span className="font-mono font-semibold tabular-nums text-[#B45309] dark:text-[#FBBF24]">
            {formatCompactCurrency(realValue, currency)}
          </span>
        </div>
      )}
    </div>
  );
}
