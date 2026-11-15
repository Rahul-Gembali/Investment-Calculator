import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Calculator, Search, X } from 'lucide-react';
import type { CalculatorTabId } from '../../App';

export interface SpotlightCalculatorItem {
  id: CalculatorTabId;
  label: string;
  description: string;
  categoryLabel: string;
  keywords: string[];
}

interface SearchSpotlightModalProps {
  isOpen: boolean;
  onClose: () => void;
  calculators: SpotlightCalculatorItem[];
  activeTab: CalculatorTabId;
  onSelectCalculator: (id: CalculatorTabId) => void;
}

export function SearchSpotlightModal({
  isOpen,
  onClose,
  calculators,
  activeTab,
  onSelectCalculator,
}: SearchSpotlightModalProps) {
  const [query, setQuery] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return calculators;
    return calculators.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.categoryLabel.toLowerCase().includes(q) ||
        item.keywords.some((kw) => kw.includes(q))
    );
  }, [calculators, query]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setHighlightIndex(0);
      const timer = window.setTimeout(() => {
        inputRef.current?.focus();
      }, 40);
      return () => window.clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightIndex((prev) => (filtered.length > 0 ? (prev + 1) % filtered.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightIndex((prev) =>
          filtered.length > 0 ? (prev - 1 + filtered.length) % filtered.length : 0
        );
      } else if (e.key === 'Enter' && filtered.length > 0) {
        e.preventDefault();
        const chosen = filtered[highlightIndex] ?? filtered[0];
        if (chosen) {
          onSelectCalculator(chosen.id);
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, filtered, highlightIndex, onSelectCalculator, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-16 sm:pt-24 bg-black/45 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="spotlight-title"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl rounded-[16px] border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-[#111622] shadow-2xl overflow-hidden"
          >
            {/* Search Input Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-black/[0.06] dark:border-white/[0.08]">
              <Search className="w-4 h-4 text-[#5367F5] dark:text-[#7C8CFF] shrink-0" aria-hidden="true" />
              <h2 id="spotlight-title" className="sr-only">
                Search calculators
              </h2>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Jump to calculator (e.g., SIP, Step-Up, SWP, FD, Portfolio)..."
                aria-label="Search calculators"
                className="w-full min-h-[38px] bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Clear search query"
                  className="min-h-[32px] min-w-[32px] inline-flex items-center justify-center rounded-[6px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close search spotlight"
                className="hidden sm:inline-flex items-center px-2 py-1 rounded-[6px] border border-black/[0.08] dark:border-white/[0.08] font-mono text-[10px] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                ESC
              </button>
            </div>

            {/* Results List */}
            <div
              role="listbox"
              aria-label="Calculator results"
              className="max-h-[60vh] overflow-y-auto p-2 space-y-1"
            >
              {filtered.length === 0 ? (
                <div className="py-10 px-4 text-center space-y-1">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    No matching calculators found
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Try searching for SIP, Step-Up, SWP, FD, PPF, CAGR, FIRE, or Portfolio
                  </p>
                </div>
              ) : (
                filtered.map((item, idx) => {
                  const isHighlighted = idx === highlightIndex;
                  const isCurrent = item.id === activeTab;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="option"
                      aria-selected={isHighlighted}
                      onMouseEnter={() => setHighlightIndex(idx)}
                      onClick={() => {
                        onSelectCalculator(item.id);
                        onClose();
                      }}
                      className={`w-full min-h-[52px] flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-[10px] text-left transition-colors cursor-pointer ${
                        isHighlighted
                          ? 'bg-[#5367F5]/10 dark:bg-[#5367F5]/20'
                          : 'hover:bg-slate-50 dark:hover:bg-white/[0.03]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`h-8 w-8 rounded-[8px] flex items-center justify-center shrink-0 ${
                            isHighlighted
                              ? 'bg-[#5367F5] text-white'
                              : 'bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          <Calculator className="w-4 h-4" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                              {item.label}
                            </span>
                            {isCurrent && (
                              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#08F6B6]/18 text-[#047857] dark:text-[#08F6B6] shrink-0">
                                Active
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {item.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="hidden sm:inline font-mono text-[10px] text-slate-400 dark:text-slate-500">
                          {item.categoryLabel}
                        </span>
                        <ArrowRight
                          className={`w-3.5 h-3.5 transition-transform ${
                            isHighlighted
                              ? 'text-[#5367F5] dark:text-[#7C8CFF] translate-x-0.5'
                              : 'text-slate-400'
                          }`}
                          aria-hidden="true"
                        />
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer Hints */}
            <div className="px-4 py-2.5 border-t border-black/[0.06] dark:border-white/[0.08] bg-[#F8FAFC] dark:bg-[#080A11] flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
              <span>{filtered.length} calculators available</span>
              <span className="hidden sm:inline">↑↓ navigate · ↵ jump · esc close</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
