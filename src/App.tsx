import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import {
  BarChart3,
  BookmarkPlus,
  FolderOpen,
  Moon,
  Search,
  Settings,
  Sun,
} from 'lucide-react';
import { CURRENCIES, CurrencyCode, formatCompactCurrency } from './lib/currency';
import { ToolExecutionHandler } from './lib/aiAdvisor';
import {
  AddPortfolioStreamArgs,
  applyAddPortfolioStream,
  applySetInflationRate,
  applyUpdateCalculatorInputs,
  AppStrategyState,
  computeStrategySnapshot,
  createSavedStrategyRecord,
  INITIAL_STRATEGY_STATE,
  loadSavedStrategies,
  parseStrategiesJson,
  persistSavedStrategies,
  SavedStrategy,
  SetInflationRateArgs,
  UpdateCalculatorInputsArgs,
} from './lib/strategyStore';
import { HeroSection } from './components/ui/HeroSection';
import { MobileSummaryPayload } from './components/ui/CalculatorLayout';
import {
  SearchSpotlightModal,
  SpotlightCalculatorItem,
} from './components/ui/SearchSpotlightModal';
import { AiSettingsModal } from './components/ai/AiSettingsModal';
import { AiAdvisorDrawer } from './components/ai/AiAdvisorDrawer';
import { SaveStrategyModal } from './components/strategy/SaveStrategyModal';
import { SavedStrategiesDrawer } from './components/strategy/SavedStrategiesDrawer';
import { LumpsumCalculator } from './components/calculators/LumpsumCalculator';
import { SipCalculator } from './components/calculators/SipCalculator';
import { StepUpSipCalculator } from './components/calculators/StepUpSipCalculator';
import { SwpCalculator } from './components/calculators/SwpCalculator';
import { FdCalculator } from './components/calculators/FdCalculator';
import { RdCalculator } from './components/calculators/RdCalculator';
import { PpfCalculator } from './components/calculators/PpfCalculator';
import { CagrCalculator } from './components/calculators/CagrCalculator';
import { RetirementFireCalculator } from './components/calculators/RetirementFireCalculator';
import { PortfolioAggregator } from './components/calculators/PortfolioAggregator';

export type CalculatorTabId =
  | 'lumpsum'
  | 'sip'
  | 'stepup-sip'
  | 'swp'
  | 'fd'
  | 'rd'
  | 'ppf'
  | 'cagr'
  | 'fire'
  | 'portfolio';

interface TabDefinition extends SpotlightCalculatorItem {}

const CALCULATOR_TABS: TabDefinition[] = [
  {
    id: 'lumpsum',
    label: 'Lump sum',
    categoryLabel: 'Lump Sum',
    description: 'Single capital deployment across annual, quarterly, and monthly compounding',
    keywords: ['lump', 'lumpsum', 'one time', 'compound', 'fv', 'future value'],
  },
  {
    id: 'sip',
    label: 'SIP',
    categoryLabel: 'SIP & Step-Up',
    description: 'Systematic monthly mutual fund investments with inflation benchmark',
    keywords: ['sip', 'systematic investment', 'monthly investment', 'mutual fund'],
  },
  {
    id: 'stepup-sip',
    label: 'Step-up SIP',
    categoryLabel: 'SIP & Step-Up',
    description: 'Annual or monthly step-up SIP by percentage or fixed increment',
    keywords: ['step up', 'step-up', 'top up', 'top-up', 'increment', 'monthly step'],
  },
  {
    id: 'swp',
    label: 'SWP',
    categoryLabel: 'Withdrawals / SWP',
    description: 'Systematic monthly withdrawal planner with sustainability & depletion curve',
    keywords: ['swp', 'withdrawal', 'withdrawals', 'income', 'pension'],
  },
  {
    id: 'fd',
    label: 'Fixed deposit',
    categoryLabel: 'Deposits',
    description: 'Cumulative quarterly compounding vs regular payout fixed deposit',
    keywords: ['fd', 'fixed deposit', 'term deposit', 'bank'],
  },
  {
    id: 'rd',
    label: 'Recurring deposit',
    categoryLabel: 'Deposits',
    description: 'Monthly recurring deposit with quarterly compounding schedule',
    keywords: ['rd', 'recurring deposit', 'monthly deposit'],
  },
  {
    id: 'ppf',
    label: 'PPF',
    categoryLabel: 'Deposits',
    description: '15-year statutory Public Provident Fund with 5-year extension blocks',
    keywords: ['ppf', 'public provident', 'provident fund', 'tax free', 'lock-in'],
  },
  {
    id: 'cagr',
    label: 'CAGR & Return',
    categoryLabel: 'Lump Sum',
    description: 'Compound annual growth rate, absolute return, and real inflation-adjusted yield',
    keywords: ['cagr', 'absolute return', 'annualized', 'xirr', 'inflation'],
  },
  {
    id: 'fire',
    label: 'Retirement & FIRE',
    categoryLabel: 'Withdrawals / SWP',
    description: 'Inflation-adjusted retirement corpus target and monthly SIP shortfall planner',
    keywords: ['fire', 'retirement', 'retire', 'corpus', 'financial independence'],
  },
  {
    id: 'portfolio',
    label: 'Portfolio master engine',
    categoryLabel: 'Portfolio Aggregator',
    description: 'Multi-stream wealth aggregator with blended XIRR and cash flow ledger',
    keywords: ['portfolio', 'multi-asset', 'multi asset', 'aggregator', 'streams', 'xirr', 'master'],
  },
];

export default function App() {
  const [strategyState, setStrategyState] = useState<AppStrategyState>(INITIAL_STRATEGY_STATE);
  const strategyRef = useRef<AppStrategyState>(strategyState);
  strategyRef.current = strategyState;

  const [isDark, setIsDark] = useState<boolean>(false);

  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState<boolean>(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState<boolean>(false);
  const [isSavedDrawerOpen, setIsSavedDrawerOpen] = useState<boolean>(false);
  const [settingsVersion, setSettingsVersion] = useState<number>(0);

  const [savedStrategies, setSavedStrategies] = useState<SavedStrategy[]>(() =>
    loadSavedStrategies()
  );
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const [mobileSummary, setMobileSummary] = useState<MobileSummaryPayload>({
    investedLabel: 'Total investment',
    invested: 100000,
    maturityLabel: 'Total maturity value',
    maturity: 310585,
  });

  const workbenchRef = useRef<HTMLDivElement>(null);

  const { activeTab, currency, showInflation, inflationRate } = strategyState;

  const currentSnapshot = useMemo(
    () => computeStrategySnapshot(strategyState),
    [strategyState]
  );

  const showNotice = useCallback((msg: string) => {
    setStatusNotice(msg);
    window.setTimeout(() => {
      setStatusNotice((prev) => (prev === msg ? null : prev));
    }, 2600);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDark]);

  useEffect(() => {
    const onGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onGlobalKeyDown);
    return () => window.removeEventListener('keydown', onGlobalKeyDown);
  }, []);

  const setActiveTab = useCallback((tab: CalculatorTabId) => {
    setStrategyState((prev) => ({ ...prev, activeTab: tab }));
  }, []);

  const setCurrency = useCallback((nextCurrency: CurrencyCode) => {
    setStrategyState((prev) => ({ ...prev, currency: nextCurrency }));
  }, []);

  const handleSpotlightSelect = useCallback((id: CalculatorTabId) => {
    setActiveTab(id);
    window.requestAnimationFrame(() => {
      workbenchRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [setActiveTab]);

  // Bidirectional Agentic AI Tool Execution
  const getLatestSnapshot = useCallback(
    () => computeStrategySnapshot(strategyRef.current),
    []
  );

  const handleExecuteToolCall: ToolExecutionHandler = useCallback(
    (toolName, args) => {
      const current = strategyRef.current;

      if (toolName === 'update_calculator_inputs') {
        const res = applyUpdateCalculatorInputs(
          current,
          args as unknown as UpdateCalculatorInputsArgs
        );
        strategyRef.current = res.nextState;
        setStrategyState(res.nextState);
        return { summary: res.summary, actionCard: res.actionCard };
      }

      if (toolName === 'add_portfolio_stream') {
        const res = applyAddPortfolioStream(
          current,
          args as unknown as AddPortfolioStreamArgs
        );
        strategyRef.current = res.nextState;
        setStrategyState(res.nextState);
        return { summary: res.summary, actionCard: res.actionCard };
      }

      if (toolName === 'set_inflation_rate') {
        const res = applySetInflationRate(
          current,
          args as unknown as SetInflationRateArgs
        );
        strategyRef.current = res.nextState;
        setStrategyState(res.nextState);
        return { summary: res.summary, actionCard: res.actionCard };
      }

      return { summary: `Unknown tool ${toolName}` };
    },
    []
  );

  // Strategy Save / Load / Rename / Delete / Import
  const handleSaveStrategy = useCallback(
    (name: string) => {
      const record = createSavedStrategyRecord(name, strategyRef.current);
      setSavedStrategies((prev) => {
        const next = [record, ...prev];
        persistSavedStrategies(next);
        return next;
      });
      showNotice(`Saved strategy "${record.name}"`);
    },
    [showNotice]
  );

  const handleLoadStrategy = useCallback(
    (strat: SavedStrategy) => {
      const cloned = JSON.parse(JSON.stringify(strat.state)) as AppStrategyState;
      strategyRef.current = cloned;
      setStrategyState(cloned);
      showNotice(`Loaded strategy "${strat.name}"`);
    },
    [showNotice]
  );

  const handleDeleteStrategy = useCallback((id: string) => {
    setSavedStrategies((prev) => {
      const next = prev.filter((s) => s.id !== id);
      persistSavedStrategies(next);
      return next;
    });
  }, []);

  const handleRenameStrategy = useCallback((id: string, newName: string) => {
    setSavedStrategies((prev) => {
      const next = prev.map((s) =>
        s.id === id ? { ...s, name: newName, updatedAt: new Date().toISOString() } : s
      );
      persistSavedStrategies(next);
      return next;
    });
  }, []);

  const handleImportStrategiesJson = useCallback((jsonText: string) => {
    try {
      const imported = parseStrategiesJson(jsonText);
      if (imported.length === 0) {
        return { count: 0, error: 'No valid strategy entries found in JSON.' };
      }
      setSavedStrategies((prev) => {
        const next = [...imported, ...prev];
        persistSavedStrategies(next);
        return next;
      });
      return { count: imported.length };
    } catch {
      return { count: 0, error: 'Invalid JSON file format.' };
    }
  }, []);

  const handleAnalyzeAi = useCallback(() => {
    setIsAiDrawerOpen(true);
  }, []);

  const handleReportSummary = useCallback((summary: MobileSummaryPayload) => {
    setMobileSummary(summary);
  }, []);

  const handleViewChartMobile = () => {
    const el = document.getElementById('calculator-chart-anchor');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-[100dvh] bg-[#F8FAFC] dark:bg-[#080A11] text-slate-900 dark:text-slate-50 transition-colors duration-200 pb-20 md:pb-8">
        {/* Top Bar */}
        <header className="border-b border-black/[0.06] dark:border-white/[0.08] bg-white/85 dark:bg-[#111622]/85 backdrop-blur-sm sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-1.5 sm:gap-3">
            <span className="text-[13px] sm:text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0">
              Meridian Wealth
            </span>

            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              {/* Mobile Compact Currency Select (< sm) */}
              <select
                aria-label="Currency selector"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                className="sm:hidden h-9 rounded-[8px] border border-black/[0.08] dark:border-white/[0.08] bg-[#F8FAFC] dark:bg-[#080A11] px-1.5 text-xs font-mono font-medium text-slate-800 dark:text-slate-100 outline-none cursor-pointer"
              >
                {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => (
                  <option key={code} value={code}>
                    {CURRENCIES[code].symbol} {code}
                  </option>
                ))}
              </select>

              {/* Desktop Persistent Global Currency Switcher (>= sm) */}
              <div
                role="group"
                aria-label="Currency selector"
                className="hidden sm:inline-flex items-center p-0.5 rounded-[8px] border border-black/[0.08] dark:border-white/[0.08] bg-[#F8FAFC] dark:bg-[#080A11]"
              >
                {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => {
                  const active = currency === code;
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setCurrency(code)}
                      aria-pressed={active}
                      aria-label={`${CURRENCIES[code].symbol} ${code}`}
                      className={`min-h-[32px] px-2.5 py-1 text-xs font-mono font-medium rounded-[6px] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        active
                          ? 'bg-[#5367F5] text-white shadow-xs'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      <span>{CURRENCIES[code].symbol}</span>
                      <span className="ml-1">{code}</span>
                    </button>
                  );
                })}
              </div>

              {/* Save Strategy Button */}
              <button
                type="button"
                onClick={() => setIsSaveModalOpen(true)}
                aria-label="Save strategy"
                title="Save current strategy"
                className="inline-flex items-center justify-center gap-1.5 h-9 w-9 sm:w-auto sm:h-10 sm:px-3 rounded-[8px] border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#111622] text-slate-700 dark:text-slate-200 hover:border-[#5367F5]/60 hover:text-[#5367F5] dark:hover:text-[#7C8CFF] text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <BookmarkPlus className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span className="hidden md:inline">Save Strategy</span>
              </button>

              {/* Saved Strategies Drawer Trigger */}
              <button
                type="button"
                onClick={() => setIsSavedDrawerOpen(true)}
                aria-label={`Saved strategies (${savedStrategies.length})`}
                title="Load saved strategies"
                className="relative inline-flex items-center justify-center gap-1.5 h-9 w-9 sm:w-auto sm:h-10 sm:px-2.5 rounded-[8px] border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#111622] text-slate-700 dark:text-slate-200 hover:border-[#5367F5]/60 hover:text-[#5367F5] dark:hover:text-[#7C8CFF] text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <FolderOpen className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span className="hidden lg:inline">Strategies</span>
                {savedStrategies.length > 0 && (
                  <span className="font-mono text-[10px] px-1 rounded bg-[#5367F5]/12 text-[#5367F5] dark:text-[#8E9BFF] max-sm:absolute max-sm:-top-1 max-sm:-right-1 max-sm:bg-[#5367F5] max-sm:text-white">
                    {savedStrategies.length}
                  </span>
                )}
              </button>

              {/* Compact 1x1 Square Search Spotlight Button */}
              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                aria-label="Search calculators (Command K)"
                title="Search calculators (⌘K)"
                className="relative inline-flex flex-col items-center justify-center gap-0.5 h-9 w-9 sm:h-10 sm:w-10 aspect-square rounded-[8px] border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#111622] text-slate-700 dark:text-slate-300 hover:border-[#5367F5]/60 hover:text-[#5367F5] dark:hover:text-[#7C8CFF] transition-colors shrink-0 cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="font-mono text-[8.5px] leading-none tracking-tight text-slate-500 dark:text-slate-400">
                  ⌘K
                </span>
              </button>

              {/* Light / Dark Mode Switch */}
              <button
                type="button"
                onClick={() => setIsDark((prev) => !prev)}
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                className="inline-flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 aspect-square rounded-[8px] border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#111622] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-colors shrink-0 cursor-pointer"
              >
                {isDark ? (
                  <Sun className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Moon className="w-4 h-4" aria-hidden="true" />
                )}
              </button>

              {/* OpenRouter AI Settings Gear */}
              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                aria-label="Open AI settings"
                className="inline-flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 aspect-square rounded-[8px] border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#111622] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-colors shrink-0 cursor-pointer"
              >
                <Settings className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </header>

        {/* Subtle Strategy Status Toast */}
        <AnimatePresence>
          {statusNotice && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              role="status"
              className="fixed top-16 right-4 z-40 rounded-[10px] border border-[#08F6B6]/40 bg-white dark:bg-[#111622] px-3.5 py-2 text-xs font-medium text-[#065F46] dark:text-[#08F6B6] shadow-lg"
            >
              {statusNotice}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Container */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
          {/* Split-Screen Hero Section */}
          <HeroSection isDark={isDark} />

          {/* Calculator Tab Strip */}
          <div id="workbench" ref={workbenchRef} className="scroll-mt-16 space-y-6">
            <nav aria-label="Investment calculators">
              <div
                role="tablist"
                aria-label="Calculator modes"
                className="flex items-center gap-1 overflow-x-auto no-scrollbar p-1.5 rounded-[12px] border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#111622]"
              >
                {CALCULATOR_TABS.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setActiveTab(tab.id)}
                      className={`relative min-h-[44px] sm:min-h-[36px] px-3.5 py-2 text-xs font-medium rounded-[8px] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        isActive
                          ? 'text-white'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="active-pill"
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                          className="absolute inset-0 rounded-[8px] bg-[#5367F5]"
                        />
                      )}
                      <span className="relative z-10">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </nav>

            {/* Active Calculator Viewport */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              >
                {activeTab === 'lumpsum' && (
                  <LumpsumCalculator
                    values={strategyState.lumpsum}
                    onChange={(next) =>
                      setStrategyState((prev) => ({ ...prev, lumpsum: next }))
                    }
                    showInflation={showInflation}
                    onToggleInflation={(enabled) =>
                      setStrategyState((prev) => ({ ...prev, showInflation: enabled }))
                    }
                    inflationRate={inflationRate}
                    onInflationRateChange={(rate) =>
                      setStrategyState((prev) => ({ ...prev, inflationRate: rate }))
                    }
                    currency={currency}
                    isDark={isDark}
                    onAnalyzeAi={handleAnalyzeAi}
                    onReportSummary={handleReportSummary}
                  />
                )}
                {activeTab === 'sip' && (
                  <SipCalculator
                    values={strategyState.sip}
                    onChange={(next) =>
                      setStrategyState((prev) => ({ ...prev, sip: next }))
                    }
                    showInflation={showInflation}
                    onToggleInflation={(enabled) =>
                      setStrategyState((prev) => ({ ...prev, showInflation: enabled }))
                    }
                    inflationRate={inflationRate}
                    onInflationRateChange={(rate) =>
                      setStrategyState((prev) => ({ ...prev, inflationRate: rate }))
                    }
                    currency={currency}
                    isDark={isDark}
                    onAnalyzeAi={handleAnalyzeAi}
                    onReportSummary={handleReportSummary}
                  />
                )}
                {activeTab === 'stepup-sip' && (
                  <StepUpSipCalculator
                    values={strategyState.stepupSip}
                    onChange={(next) =>
                      setStrategyState((prev) => ({ ...prev, stepupSip: next }))
                    }
                    showInflation={showInflation}
                    onToggleInflation={(enabled) =>
                      setStrategyState((prev) => ({ ...prev, showInflation: enabled }))
                    }
                    inflationRate={inflationRate}
                    onInflationRateChange={(rate) =>
                      setStrategyState((prev) => ({ ...prev, inflationRate: rate }))
                    }
                    currency={currency}
                    isDark={isDark}
                    onAnalyzeAi={handleAnalyzeAi}
                    onReportSummary={handleReportSummary}
                  />
                )}
                {activeTab === 'swp' && (
                  <SwpCalculator
                    values={strategyState.swp}
                    onChange={(next) =>
                      setStrategyState((prev) => ({ ...prev, swp: next }))
                    }
                    currency={currency}
                    isDark={isDark}
                    onAnalyzeAi={handleAnalyzeAi}
                    onReportSummary={handleReportSummary}
                  />
                )}
                {activeTab === 'fd' && (
                  <FdCalculator
                    values={strategyState.fd}
                    onChange={(next) =>
                      setStrategyState((prev) => ({ ...prev, fd: next }))
                    }
                    currency={currency}
                    isDark={isDark}
                    onAnalyzeAi={handleAnalyzeAi}
                    onReportSummary={handleReportSummary}
                  />
                )}
                {activeTab === 'rd' && (
                  <RdCalculator
                    values={strategyState.rd}
                    onChange={(next) =>
                      setStrategyState((prev) => ({ ...prev, rd: next }))
                    }
                    currency={currency}
                    isDark={isDark}
                    onAnalyzeAi={handleAnalyzeAi}
                    onReportSummary={handleReportSummary}
                  />
                )}
                {activeTab === 'ppf' && (
                  <PpfCalculator
                    values={strategyState.ppf}
                    onChange={(next) =>
                      setStrategyState((prev) => ({ ...prev, ppf: next }))
                    }
                    currency={currency}
                    isDark={isDark}
                    onAnalyzeAi={handleAnalyzeAi}
                    onReportSummary={handleReportSummary}
                  />
                )}
                {activeTab === 'cagr' && (
                  <CagrCalculator
                    values={strategyState.cagr}
                    onChange={(next) =>
                      setStrategyState((prev) => ({ ...prev, cagr: next }))
                    }
                    inflationRate={inflationRate}
                    onInflationRateChange={(rate) =>
                      setStrategyState((prev) => ({ ...prev, inflationRate: rate }))
                    }
                    currency={currency}
                    isDark={isDark}
                    onAnalyzeAi={handleAnalyzeAi}
                    onReportSummary={handleReportSummary}
                  />
                )}
                {activeTab === 'fire' && (
                  <RetirementFireCalculator
                    values={strategyState.fire}
                    onChange={(next) =>
                      setStrategyState((prev) => ({ ...prev, fire: next }))
                    }
                    currency={currency}
                    isDark={isDark}
                    onAnalyzeAi={handleAnalyzeAi}
                    onReportSummary={handleReportSummary}
                  />
                )}
                {activeTab === 'portfolio' && (
                  <PortfolioAggregator
                    streams={strategyState.portfolio.streams}
                    onStreamsChange={(nextStreams) =>
                      setStrategyState((prev) => ({
                        ...prev,
                        portfolio: { streams: nextStreams },
                      }))
                    }
                    showInflation={showInflation}
                    onToggleInflation={(enabled) =>
                      setStrategyState((prev) => ({ ...prev, showInflation: enabled }))
                    }
                    inflationRate={inflationRate}
                    onInflationRateChange={(rate) =>
                      setStrategyState((prev) => ({ ...prev, inflationRate: rate }))
                    }
                    currency={currency}
                    isDark={isDark}
                    onAnalyzeAi={handleAnalyzeAi}
                    onSaveStrategy={() => setIsSaveModalOpen(true)}
                    onReportSummary={handleReportSummary}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {/* Sticky Mobile Summary Pill (< md) */}
        <div
          aria-label="Mobile summary bar"
          className="md:hidden fixed bottom-2.5 inset-x-3 z-40 rounded-[12px] border border-black/[0.08] dark:border-white/[0.10] bg-white/95 dark:bg-[#111622]/95 backdrop-blur-md px-3.5 py-2 shadow-lg flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-4 min-w-0">
            <div className="min-w-0">
              <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate">
                Invested
              </div>
              <div className="font-mono text-xs font-semibold tabular-nums text-[#5367F5] dark:text-[#7C8CFF]">
                {formatCompactCurrency(mobileSummary.invested, currency)}
              </div>
            </div>
            <div className="h-6 w-px bg-black/[0.08] dark:bg-white/[0.08]" aria-hidden="true" />
            <div className="min-w-0">
              <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate">
                Maturity
              </div>
              <div className="font-mono text-xs font-semibold tabular-nums text-[#059669] dark:text-[#08F6B6]">
                {formatCompactCurrency(mobileSummary.maturity, currency)}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleViewChartMobile}
            className="min-h-[40px] inline-flex items-center gap-1.5 rounded-[8px] bg-[#5367F5] px-3 py-1.5 text-xs font-medium text-white whitespace-nowrap shrink-0 cursor-pointer"
          >
            <BarChart3 className="w-3.5 h-3.5" aria-hidden="true" />
            View Chart
          </button>
        </div>

        {/* Search Spotlight Modal */}
        <SearchSpotlightModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          calculators={CALCULATOR_TABS}
          activeTab={activeTab}
          onSelectCalculator={handleSpotlightSelect}
        />

        {/* Save Strategy Modal & Saved Strategies Drawer */}
        <SaveStrategyModal
          isOpen={isSaveModalOpen}
          onClose={() => setIsSaveModalOpen(false)}
          onSave={handleSaveStrategy}
          calculatorName={currentSnapshot.calculatorName}
          currency={currency}
          investedPreview={currentSnapshot.investedAmount}
          maturityPreview={currentSnapshot.maturityAmount}
        />
        <SavedStrategiesDrawer
          isOpen={isSavedDrawerOpen}
          onClose={() => setIsSavedDrawerOpen(false)}
          strategies={savedStrategies}
          onLoadStrategy={handleLoadStrategy}
          onDeleteStrategy={handleDeleteStrategy}
          onRenameStrategy={handleRenameStrategy}
          onImportJson={handleImportStrategiesJson}
          onOpenSaveModal={() => setIsSaveModalOpen(true)}
        />

        {/* Client-Side OpenRouter AI Settings Modal & Agentic Copilot Drawer */}
        <AiSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          onSaved={() => setSettingsVersion((v) => v + 1)}
        />
        <AiAdvisorDrawer
          isOpen={isAiDrawerOpen}
          onClose={() => setIsAiDrawerOpen(false)}
          getLatestSnapshot={getLatestSnapshot}
          snapshot={currentSnapshot}
          onExecuteToolCall={handleExecuteToolCall}
          onOpenSettings={() => setIsSettingsOpen(true)}
          settingsVersion={settingsVersion}
        />
      </div>
    </MotionConfig>
  );
}
