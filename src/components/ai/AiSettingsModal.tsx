import { useEffect, useState } from 'react';
import { Eye, EyeOff, KeyRound, X } from 'lucide-react';
import {
  getSavedOpenRouterKey,
  getSavedOpenRouterModel,
  OPENROUTER_MODELS,
  OpenRouterModelId,
  saveOpenRouterKey,
  saveOpenRouterModel,
} from '../../lib/aiAdvisor';

interface AiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function AiSettingsModal({ isOpen, onClose, onSaved }: AiSettingsModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState<OpenRouterModelId>(OPENROUTER_MODELS[0].id);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setApiKey(getSavedOpenRouterKey());
      setModel(getSavedOpenRouterModel());
      setShowKey(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveOpenRouterKey(apiKey);
    saveOpenRouterModel(model);
    onSaved?.();
    onClose();
  };

  const handleClear = () => {
    setApiKey('');
    saveOpenRouterKey('');
    onSaved?.();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-settings-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-[16px] border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#111622] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-black/[0.06] dark:border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#5367F5]/12 text-[#5367F5] dark:text-[#7C8CFF]">
              <KeyRound className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="ai-settings-title"
                className="text-base font-semibold text-slate-900 dark:text-slate-100"
              >
                OpenRouter AI settings
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Stored locally in your browser via localStorage
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings modal"
            className="min-h-[44px] min-w-[44px] -mr-2 -mt-2 inline-flex items-center justify-center rounded-[8px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSave} className="pt-5 space-y-5">
          <div className="space-y-2">
            <label
              htmlFor="openrouter-api-key"
              className="block text-[13px] font-medium text-slate-700 dark:text-slate-300"
            >
              OpenRouter API key
            </label>
            <div className="relative flex items-center">
              <input
                id="openrouter-api-key"
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-or-v1-..."
                autoComplete="off"
                className="w-full min-h-[44px] rounded-[8px] border border-black/[0.08] dark:border-white/[0.08] bg-slate-50 dark:bg-[#080A11] pl-3 pr-11 py-2 font-mono text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-[#5367F5] dark:focus:border-[#5367F5]"
              />
              <button
                type="button"
                onClick={() => setShowKey((prev) => !prev)}
                aria-label={showKey ? 'Hide API key' : 'Show API key'}
                className="absolute right-1 min-h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-[6px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                {showKey ? (
                  <EyeOff className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Eye className="w-4 h-4" aria-hidden="true" />
                )}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Your key never leaves your browser except for direct HTTPS requests to OpenRouter.
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="openrouter-model"
              className="block text-[13px] font-medium text-slate-700 dark:text-slate-300"
            >
              Advisor model
            </label>
            <select
              id="openrouter-model"
              value={model}
              onChange={(e) => setModel(e.target.value as OpenRouterModelId)}
              className="w-full min-h-[44px] rounded-[8px] border border-black/[0.08] dark:border-white/[0.08] bg-slate-50 dark:bg-[#080A11] px-3 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 outline-none focus:border-[#5367F5] dark:focus:border-[#5367F5]"
            >
              {OPENROUTER_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label} ({m.id})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={handleClear}
              className="min-h-[44px] px-3.5 py-2 rounded-[8px] border border-black/[0.08] dark:border-white/[0.08] text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
            >
              Clear key
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] px-4 py-2 rounded-[8px] text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="min-h-[44px] px-4 py-2 rounded-[8px] bg-[#5367F5] hover:bg-[#4255E0] text-xs font-medium text-white transition-colors cursor-pointer"
              >
                Save configuration
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
