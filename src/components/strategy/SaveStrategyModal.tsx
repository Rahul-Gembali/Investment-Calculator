import { useEffect, useRef, useState } from 'react';
import { BookmarkPlus, X } from 'lucide-react';
import { CurrencyCode, formatCompactCurrency } from '../../lib/currency';

interface SaveStrategyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  calculatorName: string;
  currency: CurrencyCode;
  investedPreview: number;
  maturityPreview: number;
}

const SUGGESTED_NAMES = [
  'Aggressive Wealth 2035',
  'Conservative Emergency Plan',
  'College Fund SIP',
  'Early Retirement FIRE',
];

export function SaveStrategyModal({
  isOpen,
  onClose,
  onSave,
  calculatorName,
  currency,
  investedPreview,
  maturityPreview,
}: SaveStrategyModalProps) {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName(`${calculatorName} Plan`);
      const timer = window.setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 30);
      return () => window.clearTimeout(timer);
    }
  }, [isOpen, calculatorName]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(name.trim());
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-strategy-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-[16px] border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#111622] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-black/[0.06] dark:border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#08F6B6]/15 text-[#059669] dark:text-[#08F6B6]">
              <BookmarkPlus className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="save-strategy-title"
                className="text-base font-semibold text-slate-900 dark:text-slate-100"
              >
                Save financial strategy
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Snapshot all inputs, streams, and inflation settings locally
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close save strategy modal"
            className="min-h-[40px] min-w-[40px] -mr-2 -mt-2 inline-flex items-center justify-center rounded-[8px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="pt-5 space-y-4">
          {/* Preview strip */}
          <div className="rounded-[10px] border border-black/[0.06] dark:border-white/[0.08] bg-[#F8FAFC] dark:bg-[#080A11] p-3 grid grid-cols-3 gap-2 text-xs">
            <div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Mode</div>
              <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
                {calculatorName}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Invested</div>
              <div className="font-mono font-medium tabular-nums text-[#5367F5] dark:text-[#7C8CFF]">
                {formatCompactCurrency(investedPreview, currency)}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Maturity</div>
              <div className="font-mono font-medium tabular-nums text-[#059669] dark:text-[#08F6B6]">
                {formatCompactCurrency(maturityPreview, currency)}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="strategy-name-input"
              className="block text-[13px] font-medium text-slate-700 dark:text-slate-300"
            >
              Strategy name
            </label>
            <input
              ref={inputRef}
              id="strategy-name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Aggressive Wealth 2035"
              required
              className="w-full min-h-[44px] rounded-[8px] border border-black/[0.08] dark:border-white/[0.08] bg-[#F8FAFC] dark:bg-[#080A11] px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-[#5367F5]"
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {SUGGESTED_NAMES.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setName(preset)}
                  className="px-2 py-1 rounded-[6px] border border-black/[0.06] dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.03] text-[11px] text-slate-600 dark:text-slate-300 hover:border-[#5367F5] hover:text-[#5367F5] dark:hover:text-[#7C8CFF] transition-colors cursor-pointer"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 rounded-[8px] text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="min-h-[44px] px-4 py-2 rounded-[8px] bg-[#5367F5] hover:bg-[#4255E0] disabled:opacity-50 text-xs font-medium text-white transition-colors cursor-pointer"
            >
              Save strategy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
