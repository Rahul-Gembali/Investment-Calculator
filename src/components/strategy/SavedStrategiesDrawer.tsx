import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Check,
  Download,
  FolderOpen,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { formatCompactCurrency } from '../../lib/currency';
import { SavedStrategy } from '../../lib/strategyStore';

interface SavedStrategiesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  strategies: SavedStrategy[];
  onLoadStrategy: (strategy: SavedStrategy) => void;
  onDeleteStrategy: (id: string) => void;
  onRenameStrategy: (id: string, newName: string) => void;
  onImportJson: (jsonText: string) => { count: number; error?: string };
  onOpenSaveModal: () => void;
}

export function SavedStrategiesDrawer({
  isOpen,
  onClose,
  strategies,
  onLoadStrategy,
  onDeleteStrategy,
  onRenameStrategy,
  onImportJson,
  onOpenSaveModal,
}: SavedStrategiesDrawerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setEditingId(null);
      setImportNotice(null);
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const handleExportAll = () => {
    if (strategies.length === 0) return;
    const blob = new Blob([JSON.stringify(strategies, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meridian-strategies-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const res = onImportJson(text);
      if (res.error) {
        setImportNotice(res.error);
      } else {
        setImportNotice(`Imported ${res.count} ${res.count === 1 ? 'strategy' : 'strategies'}.`);
      }
    } catch {
      setImportNotice('Could not read JSON file.');
    } finally {
      e.target.value = '';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/45"
          role="dialog"
          aria-modal="true"
          aria-labelledby="saved-strategies-title"
          onClick={onClose}
        >
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 360, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md h-full bg-white dark:bg-[#111622] border-l border-black/[0.08] dark:border-white/[0.08] flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#5367F5]/12 text-[#5367F5] dark:text-[#7C8CFF] shrink-0">
                  <FolderOpen className="w-4 h-4" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h2
                    id="saved-strategies-title"
                    className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate"
                  >
                    Saved strategies
                  </h2>
                  <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    {strategies.length} {strategies.length === 1 ? 'plan' : 'plans'} in localStorage
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close saved strategies drawer"
                className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-[8px] text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            {/* Action Toolbar */}
            <div className="px-4 sm:px-5 py-3 border-b border-black/[0.06] dark:border-white/[0.08] bg-[#F8FAFC] dark:bg-[#080A11] flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSaveModal();
                }}
                className="min-h-[36px] inline-flex items-center gap-1.5 rounded-[8px] bg-[#5367F5] hover:bg-[#4255E0] px-3 py-1.5 text-xs font-medium text-white transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                Save current
              </button>

              <div className="flex items-center gap-1.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json,.json"
                  onChange={handleFileImport}
                  className="hidden"
                  aria-label="Import strategies JSON file"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="min-h-[36px] inline-flex items-center gap-1.5 rounded-[8px] border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#111622] px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:border-[#5367F5] transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                  Import
                </button>
                <button
                  type="button"
                  onClick={handleExportAll}
                  disabled={strategies.length === 0}
                  className="min-h-[36px] inline-flex items-center gap-1.5 rounded-[8px] border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#111622] px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:border-[#5367F5] disabled:opacity-40 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" aria-hidden="true" />
                  Export
                </button>
              </div>
            </div>

            {importNotice && (
              <div className="px-4 sm:px-5 py-2 bg-[#08F6B6]/12 border-b border-[#08F6B6]/25 text-xs font-medium text-[#065F46] dark:text-[#08F6B6]">
                {importNotice}
              </div>
            )}

            {/* Strategy List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
              {strategies.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-4 py-12 space-y-3">
                  <div className="h-12 w-12 rounded-[12px] bg-slate-100 dark:bg-white/[0.05] text-slate-400 flex items-center justify-center">
                    <FolderOpen className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div className="space-y-1 max-w-xs">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      No saved strategies yet
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Save your current calculator parameters or multi-asset portfolio streams to recall them anytime.
                    </p>
                  </div>
                </div>
              ) : (
                strategies.map((strat) => {
                  const isEditing = editingId === strat.id;
                  const createdLabel = new Date(strat.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });

                  return (
                    <div
                      key={strat.id}
                      className="rounded-[12px] border border-black/[0.08] dark:border-white/[0.08] bg-[#F8FAFC] dark:bg-[#080A11] p-3.5 space-y-2.5 hover:border-[#5367F5]/55 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        {isEditing ? (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              if (editingName.trim()) {
                                onRenameStrategy(strat.id, editingName.trim());
                              }
                              setEditingId(null);
                            }}
                            className="flex-1 flex items-center gap-1.5"
                          >
                            <input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              autoFocus
                              aria-label="Rename strategy"
                              className="flex-1 min-h-[34px] rounded-[6px] border border-[#5367F5] bg-white dark:bg-[#111622] px-2.5 py-1 text-xs font-medium text-slate-900 dark:text-slate-100 outline-none"
                            />
                            <button
                              type="submit"
                              aria-label="Confirm rename"
                              className="min-h-[34px] min-w-[34px] inline-flex items-center justify-center rounded-[6px] bg-[#08F6B6] text-[#080A11] cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                          </form>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              onLoadStrategy(strat);
                              onClose();
                            }}
                            className="flex-1 text-left min-w-0 cursor-pointer group"
                          >
                            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-[#5367F5] dark:group-hover:text-[#7C8CFF] truncate transition-colors">
                              {strat.name}
                            </div>
                            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                              <span>{strat.calculatorName}</span>
                              <span>·</span>
                              <span>{createdLabel}</span>
                            </div>
                          </button>
                        )}

                        {!isEditing && (
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(strat.id);
                                setEditingName(strat.name);
                              }}
                              aria-label={`Rename ${strat.name}`}
                              className="min-h-[34px] min-w-[34px] inline-flex items-center justify-center rounded-[6px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteStrategy(strat.id)}
                              aria-label={`Delete ${strat.name}`}
                              className="min-h-[34px] min-w-[34px] inline-flex items-center justify-center rounded-[6px] text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between gap-2">
                        <div className="flex items-center gap-4 text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 block">Invested</span>
                            <span className="font-mono font-medium tabular-nums text-[#5367F5] dark:text-[#7C8CFF]">
                              {formatCompactCurrency(strat.investedPreview, strat.currency)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">Projected</span>
                            <span className="font-mono font-semibold tabular-nums text-[#059669] dark:text-[#08F6B6]">
                              {formatCompactCurrency(strat.maturityPreview, strat.currency)}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            onLoadStrategy(strat);
                            onClose();
                          }}
                          className="min-h-[34px] px-3 py-1 rounded-[6px] bg-white dark:bg-[#111622] border border-black/[0.08] dark:border-white/[0.08] text-xs font-medium text-slate-800 dark:text-slate-200 hover:border-[#5367F5] hover:text-[#5367F5] dark:hover:text-[#7C8CFF] transition-colors cursor-pointer"
                        >
                          Load plan
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
