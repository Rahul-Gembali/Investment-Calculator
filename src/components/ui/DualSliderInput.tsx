import { useId, useState, useEffect } from 'react';

interface DualSliderInputProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  min: number;
  max: number;
  step?: number;
  prefix?: string;
  suffix?: string;
  hint?: string;
  minLabel?: string;
  maxLabel?: string;
}

export function DualSliderInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  prefix,
  suffix,
  hint,
  minLabel,
  maxLabel,
}: DualSliderInputProps) {
  const inputId = useId();
  const sliderId = useId();
  const [isFocused, setIsFocused] = useState(false);
  const [draft, setDraft] = useState<string>(String(value));

  useEffect(() => {
    if (!isFocused) {
      setDraft(String(value));
    }
  }, [value, isFocused]);

  const pct = max > min ? Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100)) : 0;

  const handleInputChange = (raw: string) => {
    setDraft(raw);
    const cleaned = raw.replace(/,/g, '').trim();
    if (cleaned === '' || cleaned === '-') return;
    const parsed = Number(cleaned);
    if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
      const clamped = Math.min(max * 10, Math.max(0, parsed));
      onChange(clamped);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const cleaned = draft.replace(/,/g, '').trim();
    const parsed = Number(cleaned);
    if (cleaned === '' || Number.isNaN(parsed)) {
      setDraft(String(value));
    } else {
      const clamped = Math.min(max, Math.max(min, parsed));
      onChange(clamped);
      setDraft(String(clamped));
    }
  };

  const isShortUnit = !prefix && Boolean(suffix);

  return (
    <div className="space-y-2.5 min-w-0">
      <div className="flex items-center justify-between gap-2 min-w-0">
        <label
          htmlFor={inputId}
          className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300 leading-tight truncate"
        >
          {label}
        </label>

        <div className="flex items-center shrink-0 min-h-[44px] sm:min-h-[36px] rounded-[8px] border border-black/[0.08] dark:border-white/[0.08] bg-[#F8FAFC] dark:bg-[#080A11] px-2.5 py-1.5 focus-within:border-[#5367F5] dark:focus-within:border-[#5367F5] transition-colors">
          {prefix && (
            <span className="font-mono text-xs text-slate-500 dark:text-slate-400 mr-1 select-none">
              {prefix}
            </span>
          )}
          <input
            id={inputId}
            type="number"
            inputMode="decimal"
            step={step}
            min={min}
            max={max}
            value={isFocused ? draft : value}
            onFocus={() => {
              setIsFocused(true);
              setDraft(String(value));
            }}
            onChange={(e) => handleInputChange(e.target.value)}
            onBlur={handleBlur}
            aria-label={label}
            className={`no-spinner ${isShortUnit ? 'w-12' : 'w-24'} bg-transparent text-right font-mono text-[13px] font-medium text-slate-900 dark:text-slate-100 outline-none tabular-nums`}
          />
          {suffix && (
            <span className="font-mono text-xs text-slate-500 dark:text-slate-400 ml-1 select-none">
              {suffix}
            </span>
          )}
        </div>
      </div>

      <div className="relative flex items-center min-h-[44px] sm:min-h-[28px]">
        <input
          id={sliderId}
          type="range"
          min={min}
          max={max}
          step={step}
          value={Math.min(max, Math.max(min, value))}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={`${label} slider`}
          className="precision-slider"
          style={{
            background: `linear-gradient(to right, #5367F5 0%, #5367F5 ${pct}%, rgba(100, 116, 139, 0.22) ${pct}%, rgba(100, 116, 139, 0.22) 100%)`,
          }}
        />
      </div>

      {(minLabel || maxLabel || hint) && (
        <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-neutral-400 dark:text-neutral-500">
          <span>{minLabel ?? ''}</span>
          {hint && <span className="font-sans text-neutral-500 dark:text-neutral-400">{hint}</span>}
          <span>{maxLabel ?? ''}</span>
        </div>
      )}
    </div>
  );
}
