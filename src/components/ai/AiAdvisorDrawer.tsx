import { Fragment, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  CheckCircle2,
  KeyRound,
  RotateCcw,
  SendHorizontal,
  Settings,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react';
import {
  AnalysisSnapshot,
  ChatMessage,
  getActiveAiConfiguration,
  sendAgenticChat,
  ToolExecutionHandler,
} from '../../lib/aiAdvisor';
import { CURRENCIES, formatCompactCurrency } from '../../lib/currency';
import { ActionCardData } from '../../lib/strategyStore';

interface AiAdvisorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  getLatestSnapshot: () => AnalysisSnapshot;
  snapshot: AnalysisSnapshot;
  onExecuteToolCall: ToolExecutionHandler;
  onOpenSettings: () => void;
  settingsVersion: number;
}

function renderInlineBold(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-slate-900 dark:text-slate-100">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

function FormattedMarkdown({ content }: { content: string }) {
  const lines = content.split('\n');
  return (
    <div className="space-y-2 text-[13px] leading-relaxed text-slate-700 dark:text-slate-300">
      {lines.map((raw, idx) => {
        const line = raw.trim();
        if (!line) return null;
        if (line.startsWith('### ')) {
          return (
            <h3
              key={idx}
              className="pt-2 first:pt-0 text-[13px] font-semibold text-slate-900 dark:text-slate-100"
            >
              {line.slice(4)}
            </h3>
          );
        }
        if (line.startsWith('## ')) {
          return (
            <h2
              key={idx}
              className="pt-2 first:pt-0 text-sm font-semibold text-slate-900 dark:text-slate-100"
            >
              {line.slice(3)}
            </h2>
          );
        }
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-0.5">
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#08F6B6] shrink-0" />
              <span>{renderInlineBold(line.slice(2))}</span>
            </div>
          );
        }
        return <p key={idx}>{renderInlineBold(line)}</p>;
      })}
    </div>
  );
}

function ActionCard({ action }: { action: ActionCardData }) {
  return (
    <div
      data-testid="ai-action-card"
      className="rounded-[10px] border border-[#08F6B6]/35 bg-[#08F6B6]/10 dark:bg-[#08F6B6]/12 p-3 space-y-2"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#065F46] dark:text-[#08F6B6]">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{action.title}</span>
        </div>
        <SlidersHorizontal className="w-3 h-3 text-[#059669] dark:text-[#08F6B6] shrink-0" aria-hidden="true" />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {action.changes.map((c, idx) => (
          <span
            key={`${c.label}-${idx}`}
            className="inline-flex items-center gap-1 rounded-[6px] bg-white/80 dark:bg-[#111622]/90 border border-black/[0.06] dark:border-white/[0.08] px-2 py-0.5 text-[11px]"
          >
            <span className="text-slate-500 dark:text-slate-400">{c.label}:</span>
            <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
              {c.value}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function AiAdvisorDrawer({
  isOpen,
  onClose,
  getLatestSnapshot,
  snapshot,
  onExecuteToolCall,
  onOpenSettings,
  settingsVersion,
}: AiAdvisorDrawerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const initializedRef = useRef(false);

  const aiConfig = getActiveAiConfiguration();
  const { provider, apiKey, model: activeModel, isConfigured } = aiConfig;
  const providerLabel = provider === 'gemini' ? 'Gemini' : 'OpenRouter';
  const sym = CURRENCIES[snapshot.currency].symbol;

  const actionChips = [
    'What if I step up by 10%?',
    `Add a ${sym}5,000 SIP and ${sym}1,00,000 FD`,
    'Stress-test with 8% inflation',
  ];

  // Seed a clean welcome message when drawer opens first time
  useEffect(() => {
    if (!isOpen) {
      abortRef.current?.abort();
      return;
    }
    if (!initializedRef.current && messages.length === 0 && isConfigured) {
      initializedRef.current = true;
      setMessages([
        {
          id: 'welcome-copilot',
          role: 'assistant',
          content: `I'm connected via **${providerLabel}** (\`${activeModel}\`) to your live **${snapshot.calculatorName}** workspace. Ask for an analysis or tell me how to adjust your sliders, step-ups, portfolio streams, or inflation benchmark.`,
        },
      ]);
    }
  }, [isOpen, isConfigured, providerLabel, activeModel, settingsVersion]);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [input]);

  const dispatchMessage = async (userText: string) => {
    const latestConfig = getActiveAiConfiguration();
    if (!latestConfig.isConfigured) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role: 'user',
      content: userText,
    };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setError(null);
    setLoading(true);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const result = await sendAgenticChat(
        getLatestSnapshot,
        nextHistory
          .filter((m) => m.id !== 'welcome-copilot')
          .map((m) => ({ role: m.role, content: m.content })),
        latestConfig,
        onExecuteToolCall,
        controller.signal
      );

      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        role: 'assistant',
        content: result.reply,
        actions: result.actions.length > 0 ? result.actions : undefined,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError(
          (err as Error).message ||
            `Unable to reach ${latestConfig.provider === 'gemini' ? 'Gemini' : 'OpenRouter'}.`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading || !isConfigured) return;
    setInput('');
    void dispatchMessage(trimmed);
  };

  const handleResetChat = () => {
    abortRef.current?.abort();
    setError(null);
    setMessages([
      {
        id: 'welcome-copilot',
        role: 'assistant',
        content: `Started a fresh session on **${snapshot.calculatorName}**. Ask me to analyze your numbers or directly modify your inputs, portfolio streams, or inflation rate.`,
      },
    ]);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-stretch justify-end bg-black/45"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ai-drawer-title"
          onClick={onClose}
        >
          <motion.aside
            initial={{ y: 24 }}
            animate={{ y: 0 }}
            exit={{ y: 24 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-lg h-[86dvh] sm:h-full rounded-t-[20px] sm:rounded-none bg-white dark:bg-[#111622] border-t sm:border-t-0 sm:border-l border-black/[0.08] dark:border-white/[0.08] flex flex-col shadow-2xl overflow-hidden"
          >
            {/* Mobile Drag Handle */}
            <div className="sm:hidden flex justify-center pt-2.5 pb-1">
              <span className="h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-700" />
            </div>

            {/* Header */}
            <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#08F6B6]/15 text-[#059669] dark:text-[#08F6B6] shrink-0">
                  <Sparkles className="w-4 h-4" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2
                      id="ai-drawer-title"
                      className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate"
                    >
                      AI Wealth Copilot
                    </h2>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#5367F5]/12 text-[#5367F5] dark:text-[#8E9BFF] shrink-0">
                      Tool Control
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                    {providerLabel} · {activeModel || 'No model set'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {isConfigured && (
                  <button
                    type="button"
                    onClick={handleResetChat}
                    disabled={loading}
                    aria-label="Reset copilot chat"
                    title="New chat"
                    className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-[8px] text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/[0.05] disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" aria-hidden="true" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={onOpenSettings}
                  aria-label="Open AI key settings"
                  className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-[8px] text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors cursor-pointer"
                >
                  <Settings className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close AI Advisor drawer"
                  className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-[8px] text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Live Synced Context Summary Strip */}
            <div className="px-4 sm:px-5 py-3 bg-[#F8FAFC] dark:bg-[#080A11] border-b border-black/[0.06] dark:border-white/[0.08] grid grid-cols-3 gap-3 text-xs">
              <div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Active view</div>
                <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
                  {snapshot.calculatorName}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Invested</div>
                <div className="font-mono font-medium tabular-nums text-[#5367F5] dark:text-[#7C8CFF]">
                  {formatCompactCurrency(snapshot.investedAmount, snapshot.currency)}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Projected</div>
                <div className="font-mono font-medium tabular-nums text-[#059669] dark:text-[#08F6B6]">
                  {formatCompactCurrency(snapshot.maturityAmount, snapshot.currency)}
                </div>
              </div>
            </div>

            {/* Chat Message Thread */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {!isConfigured ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-4 space-y-4">
                  <div className="h-12 w-12 rounded-[12px] bg-[#5367F5]/12 text-[#5367F5] dark:text-[#7C8CFF] flex items-center justify-center">
                    <KeyRound className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div className="space-y-1.5 max-w-xs">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {!apiKey
                        ? 'Configure your Gemini or OpenRouter API key'
                        : `Enter an ${providerLabel} model name`}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {!apiKey
                        ? 'Add a Google Gemini or OpenRouter key locally in browser storage so the Copilot can read your workspace and adjust sliders, portfolio streams, and inflation in real time.'
                        : `Add your target ${providerLabel} model name (for example nvidia/nemotron-...) in AI settings to activate the Copilot.`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenSettings}
                    className="min-h-[44px] px-4 py-2 rounded-[8px] bg-[#5367F5] hover:bg-[#4255E0] text-xs font-medium text-white transition-colors cursor-pointer"
                  >
                    Open AI settings
                  </button>
                </div>
              ) : (
                <>
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.role === 'user' ? (
                        <div className="max-w-[85%] rounded-[12px] rounded-br-[4px] bg-[#5367F5] text-white px-3.5 py-2.5 text-[13px] leading-relaxed">
                          {msg.content}
                        </div>
                      ) : (
                        <div className="max-w-[96%] space-y-2.5">
                          {msg.actions && msg.actions.length > 0 && (
                            <div className="space-y-2">
                              {msg.actions.map((act) => (
                                <ActionCard key={act.id} action={act} />
                              ))}
                            </div>
                          )}
                          <div className="rounded-[12px] rounded-bl-[4px] border border-black/[0.06] dark:border-white/[0.08] bg-[#F8FAFC] dark:bg-[#080A11] px-4 py-3">
                            <FormattedMarkdown content={msg.content} />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {loading && (
                    <div
                      className="max-w-[85%] rounded-[12px] border border-black/[0.06] dark:border-white/[0.08] bg-[#F8FAFC] dark:bg-[#080A11] p-4 space-y-2.5"
                      aria-busy="true"
                      aria-label="AI Copilot is thinking"
                    >
                      <div className="h-3.5 w-2/3 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
                      <div className="h-3 w-full rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
                      <div className="h-3 w-4/5 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
                    </div>
                  )}

                  {error && (
                    <div className="rounded-[12px] border border-red-500/20 bg-red-500/5 p-3.5 space-y-2.5">
                      <p className="text-xs font-medium text-red-600 dark:text-red-400">
                        {error}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={onOpenSettings}
                          className="min-h-[36px] px-3 py-1.5 rounded-[8px] border border-black/[0.08] dark:border-white/[0.08] text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
                        >
                          Check API key
                        </button>
                      </div>
                    </div>
                  )}
                  <div ref={scrollEndRef} />
                </>
              )}
            </div>

            {/* Bottom Interactive Auto-Resizing Chat Input & Action Chips */}
            <div className="p-4 border-t border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#111622] space-y-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                {actionChips.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    disabled={!isConfigured || loading}
                    onClick={() => void dispatchMessage(chip)}
                    className="min-h-[32px] px-2.5 py-1 rounded-[6px] border border-black/[0.08] dark:border-white/[0.08] bg-[#F8FAFC] dark:bg-[#080A11] text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:border-[#5367F5] hover:text-[#5367F5] dark:hover:text-[#7C8CFF] disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="flex items-end gap-2">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                  disabled={!isConfigured || loading}
                  placeholder={
                    isConfigured
                      ? `Ask ${providerLabel} to analyze or adjust sliders, streams, or inflation...`
                      : 'Configure your Gemini or OpenRouter API key & model in AI settings'
                  }
                  aria-label="Ask AI Advisor a follow-up question"
                  className="flex-1 min-h-[44px] max-h-[120px] resize-none rounded-[10px] border border-black/[0.08] dark:border-white/[0.08] bg-[#F8FAFC] dark:bg-[#080A11] px-3.5 py-2.5 text-xs sm:text-[13px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-[#5367F5] disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={!isConfigured || loading || !input.trim()}
                  aria-label="Send message"
                  className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-[10px] bg-[#5367F5] hover:bg-[#4255E0] disabled:opacity-40 text-white transition-colors shrink-0 cursor-pointer"
                >
                  <SendHorizontal className="w-4 h-4" aria-hidden="true" />
                </button>
              </form>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
