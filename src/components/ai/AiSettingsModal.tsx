import { useEffect, useState } from 'react';
import { Eye, EyeOff, KeyRound, X } from 'lucide-react';
import {
  AiProvider,
  DEFAULT_GEMINI_MODEL,
  getSavedAiProvider,
  getSavedGeminiKey,
  getSavedGeminiModel,
  getSavedOpenRouterKey,
  getSavedOpenRouterModel,
  saveAiProvider,
  saveGeminiKey,
  saveGeminiModel,
  saveOpenRouterKey,
  saveOpenRouterModel,
} from '../../lib/aiAdvisor';

interface AiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function AiSettingsModal({ isOpen, onClose, onSaved }: AiSettingsModalProps) {
  const [provider, setProvider] = useState<AiProvider>('openrouter');
  const [openRouterKey, setOpenRouterKey] = useState('');
  const [openRouterModel, setOpenRouterModel] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [geminiModel, setGeminiModel] = useState(DEFAULT_GEMINI_MODEL);
  const [showKey, setShowKey] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setProvider(getSavedAiProvider());
      setOpenRouterKey(getSavedOpenRouterKey());
      setOpenRouterModel(getSavedOpenRouterModel());
      setGeminiKey(getSavedGeminiKey());
      setGeminiModel(getSavedGeminiModel());
      setShowKey(false);
      setValidationError(null);
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

  const handleProviderChange = (nextProvider: AiProvider) => {
    setProvider(nextProvider);
    setShowKey(false);
    setValidationError(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (provider === 'openrouter' && openRouterKey.trim() && !openRouterModel.trim()) {
      setValidationError(
        'Enter an OpenRouter model name below the API key (for example nvidia/nemotron-3-nano-30b-a3b:free).'
      );
      return;
    }

    if (provider === 'gemini' && geminiKey.trim() && !geminiModel.trim()) {
      setValidationError(
        'Enter a Gemini model name below the API key (for example gemini-4-hydrogen or gemini-2.5-flash).'
      );
      return;
    }

    saveAiProvider(provider);
    saveOpenRouterKey(openRouterKey);
    saveOpenRouterModel(openRouterModel);
    saveGeminiKey(geminiKey);
    saveGeminiModel(geminiModel.trim() || DEFAULT_GEMINI_MODEL);
    onSaved?.();
    onClose();
  };

  const handleClear = () => {
    setValidationError(null);
    if (provider === 'gemini') {
      setGeminiKey('');
      saveGeminiKey('');
    } else {
      setOpenRouterKey('');
      saveOpenRouterKey('');
    }
    onSaved?.();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
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
                AI Copilot settings
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
          {/* Provider Switcher */}
          <div className="space-y-2">
            <span className="block text-[13px] font-medium text-slate-700 dark:text-slate-300">
              AI provider
            </span>
            <div
              role="tablist"
              aria-label="AI provider"
              className="grid grid-cols-2 gap-1 p-1 rounded-[10px] border border-black/[0.08] dark:border-white/[0.08] bg-slate-50 dark:bg-[#080A11]"
            >
              <button
                type="button"
                role="tab"
                aria-selected={provider === 'openrouter'}
                onClick={() => handleProviderChange('openrouter')}
                className={`min-h-[38px] rounded-[7px] text-xs font-medium transition-colors cursor-pointer ${
                  provider === 'openrouter'
                    ? 'bg-[#5367F5] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                OpenRouter
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={provider === 'gemini'}
                onClick={() => handleProviderChange('gemini')}
                className={`min-h-[38px] rounded-[7px] text-xs font-medium transition-colors cursor-pointer ${
                  provider === 'gemini'
                    ? 'bg-[#5367F5] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                Google Gemini
              </button>
            </div>
          </div>

          {provider === 'openrouter' ? (
            <>
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
                    value={openRouterKey}
                    onChange={(e) => {
                      setOpenRouterKey(e.target.value);
                      setValidationError(null);
                    }}
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
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="openrouter-model"
                  className="block text-[13px] font-medium text-slate-700 dark:text-slate-300"
                >
                  OpenRouter model name
                </label>
                <input
                  id="openrouter-model"
                  type="text"
                  value={openRouterModel}
                  onChange={(e) => {
                    setOpenRouterModel(e.target.value);
                    setValidationError(null);
                  }}
                  placeholder="e.g. nvidia/nemotron-3-nano-30b-a3b:free"
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full min-h-[44px] rounded-[8px] border border-black/[0.08] dark:border-white/[0.08] bg-slate-50 dark:bg-[#080A11] px-3 py-2 font-mono text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-[#5367F5] dark:focus:border-[#5367F5]"
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Type any OpenRouter model slug (for example nvidia/nemotron-..., deepseek/..., or anthropic/...).
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <label
                  htmlFor="gemini-api-key"
                  className="block text-[13px] font-medium text-slate-700 dark:text-slate-300"
                >
                  Gemini API key
                </label>
                <div className="relative flex items-center">
                  <input
                    id="gemini-api-key"
                    type={showKey ? 'text' : 'password'}
                    value={geminiKey}
                    onChange={(e) => {
                      setGeminiKey(e.target.value);
                      setValidationError(null);
                    }}
                    placeholder="AIza..."
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
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="gemini-model"
                  className="block text-[13px] font-medium text-slate-700 dark:text-slate-300"
                >
                  Gemini model name
                </label>
                <input
                  id="gemini-model"
                  type="text"
                  value={geminiModel}
                  onChange={(e) => {
                    setGeminiModel(e.target.value);
                    setValidationError(null);
                  }}
                  placeholder={DEFAULT_GEMINI_MODEL}
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full min-h-[44px] rounded-[8px] border border-black/[0.08] dark:border-white/[0.08] bg-slate-50 dark:bg-[#080A11] px-3 py-2 font-mono text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-[#5367F5] dark:focus:border-[#5367F5]"
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Paste your Google AI Studio Gemini API key and enter the target Gemini model name.
                </p>
              </div>
            </>
          )}

          {validationError && (
            <p
              role="alert"
              className="rounded-[8px] border border-red-500/25 bg-red-500/5 px-3 py-2 text-xs text-red-600 dark:text-red-400"
            >
              {validationError}
            </p>
          )}

          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Your API key stays in browser localStorage and is sent only via direct HTTPS requests to your chosen provider.
          </p>

          <div className="flex items-center justify-between gap-3 pt-1">
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
