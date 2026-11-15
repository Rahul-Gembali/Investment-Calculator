import type { CalculatorTabId } from '../App';
import { AnalysisSnapshot } from './aiAdvisor';
import { CurrencyCode, CURRENCIES, formatCompactCurrency } from './currency';
import {
  calculateCagr,
  calculateFd,
  calculateLumpSum,
  calculatePortfolio,
  calculatePpf,
  calculateRd,
  calculateRetirementFire,
  calculateSip,
  calculateStepUpSip,
  calculateSwp,
  CompoundingFrequency,
  FdPayoutOption,
  InvestmentStream,
  StepUpFrequency,
  StepUpMode,
  StreamType,
} from './financeMath';

export const PORTFOLIO_PALETTE = [
  '#5367F5', // Electric Indigo / Cobalt Blue
  '#08F6B6', // Vibrant Mint / Emerald Green
  '#F59E0B', // Amber
  '#8B5CF6', // Violet
  '#14B8A6', // Teal
  '#64748B', // Slate
];

export const INITIAL_PORTFOLIO_STREAMS: InvestmentStream[] = [
  {
    id: 'stream-1',
    name: 'Index Fund SIP',
    type: 'sip',
    amount: 15000,
    ratePct: 12,
    stepUpPct: 10,
    startYear: 0,
    tenureYears: 20,
    color: PORTFOLIO_PALETTE[0],
  },
  {
    id: 'stream-2',
    name: 'Tech Growth SIP',
    type: 'sip',
    amount: 10000,
    ratePct: 14,
    stepUpPct: 5,
    startYear: 0,
    tenureYears: 20,
    color: PORTFOLIO_PALETTE[1],
  },
  {
    id: 'stream-3',
    name: 'Emergency FD',
    type: 'fd',
    amount: 500000,
    ratePct: 7.25,
    stepUpPct: 0,
    startYear: 0,
    tenureYears: 10,
    color: PORTFOLIO_PALETTE[2],
  },
  {
    id: 'stream-4',
    name: 'Rental Yield Reinvest',
    type: 'dividend',
    amount: 12000,
    ratePct: 9.5,
    stepUpPct: 5,
    startYear: 2,
    tenureYears: 18,
    color: PORTFOLIO_PALETTE[3],
  },
];

export interface AppStrategyState {
  activeTab: CalculatorTabId;
  currency: CurrencyCode;
  showInflation: boolean;
  inflationRate: number;
  lumpsum: {
    principal: number;
    rate: number;
    years: number;
    compounding: CompoundingFrequency;
  };
  sip: {
    monthly: number;
    rate: number;
    years: number;
  };
  stepupSip: {
    initialMonthly: number;
    stepUpFrequency: StepUpFrequency;
    stepUpMode: StepUpMode;
    stepUpPct: number;
    stepUpAmount: number;
    rate: number;
    years: number;
  };
  swp: {
    corpus: number;
    withdrawal: number;
    rate: number;
    years: number;
  };
  fd: {
    principal: number;
    rate: number;
    years: number;
    months: number;
    payoutOption: FdPayoutOption;
  };
  rd: {
    monthly: number;
    rate: number;
    tenureMonths: number;
  };
  ppf: {
    annualDeposit: number;
    rate: number;
    extensionBlocks: number;
  };
  cagr: {
    initialValue: number;
    finalValue: number;
    years: number;
  };
  fire: {
    currentAge: number;
    retirementAge: number;
    lifeExpectancy: number;
    currentMonthlyExpense: number;
    currentSavings: number;
    inflationPct: number;
    preRetirementReturnPct: number;
    postRetirementReturnPct: number;
  };
  portfolio: {
    streams: InvestmentStream[];
  };
}

export const INITIAL_STRATEGY_STATE: AppStrategyState = {
  activeTab: 'lumpsum',
  currency: 'INR',
  showInflation: true,
  inflationRate: 6,
  lumpsum: {
    principal: 100000,
    rate: 12,
    years: 10,
    compounding: 1,
  },
  sip: {
    monthly: 5000,
    rate: 12,
    years: 10,
  },
  stepupSip: {
    initialMonthly: 10000,
    stepUpFrequency: 'annual',
    stepUpMode: 'percent',
    stepUpPct: 10,
    stepUpAmount: 1000,
    rate: 12,
    years: 15,
  },
  swp: {
    corpus: 5000000,
    withdrawal: 35000,
    rate: 8,
    years: 20,
  },
  fd: {
    principal: 500000,
    rate: 7.25,
    years: 5,
    months: 0,
    payoutOption: 'cumulative',
  },
  rd: {
    monthly: 5000,
    rate: 7.0,
    tenureMonths: 60,
  },
  ppf: {
    annualDeposit: 150000,
    rate: 7.1,
    extensionBlocks: 0,
  },
  cagr: {
    initialValue: 100000,
    finalValue: 250000,
    years: 5,
  },
  fire: {
    currentAge: 30,
    retirementAge: 50,
    lifeExpectancy: 85,
    currentMonthlyExpense: 60000,
    currentSavings: 500000,
    inflationPct: 6,
    preRetirementReturnPct: 12,
    postRetirementReturnPct: 7.5,
  },
  portfolio: {
    streams: INITIAL_PORTFOLIO_STREAMS,
  },
};

export function computeStrategySnapshot(state: AppStrategyState): AnalysisSnapshot {
  const { activeTab, currency, inflationRate, showInflation } = state;

  switch (activeTab) {
    case 'lumpsum': {
      const s = state.lumpsum;
      const res = calculateLumpSum(s.principal, s.rate, s.years, s.compounding, inflationRate);
      return {
        calculatorName: 'Lump Sum Investment',
        currency,
        investedAmount: res.principal,
        maturityAmount: res.totalValue,
        estimatedGain: res.estimatedReturns,
        details: {
          'Initial Principal': s.principal,
          'Expected Return Rate': `${s.rate}% p.a.`,
          Tenure: `${s.years} years`,
          'Compounding / Year': s.compounding,
          'Inflation Benchmark': showInflation ? `${inflationRate}% p.a.` : 'Disabled',
          'Real Purchasing Power': Math.round(res.realTotalValue),
        },
      };
    }
    case 'sip': {
      const s = state.sip;
      const res = calculateSip(s.monthly, s.rate, s.years, inflationRate);
      return {
        calculatorName: 'SIP (Systematic Investment Plan)',
        currency,
        investedAmount: res.totalInvested,
        maturityAmount: res.totalValue,
        estimatedGain: res.estimatedReturns,
        details: {
          'Monthly SIP': s.monthly,
          'Expected Return Rate': `${s.rate}% p.a.`,
          Tenure: `${s.years} years`,
          'Inflation Benchmark': showInflation ? `${inflationRate}% p.a.` : 'Disabled',
          'Real Purchasing Power': Math.round(res.realTotalValue),
        },
      };
    }
    case 'stepup-sip': {
      const s = state.stepupSip;
      const inc = s.stepUpMode === 'percent' ? s.stepUpPct : s.stepUpAmount;
      const res = calculateStepUpSip(
        s.initialMonthly,
        s.stepUpMode,
        inc,
        s.rate,
        s.years,
        s.stepUpFrequency,
        inflationRate
      );
      return {
        calculatorName: `Step-Up SIP (${s.stepUpFrequency === 'annual' ? 'Annual' : 'Monthly'})`,
        currency,
        investedAmount: res.totalInvested,
        maturityAmount: res.totalValue,
        estimatedGain: res.estimatedReturns,
        details: {
          'Initial Monthly SIP': s.initialMonthly,
          'Step-Up Frequency': s.stepUpFrequency,
          'Step-Up Increment': s.stepUpMode === 'percent' ? `${s.stepUpPct}%` : `${CURRENCIES[currency].symbol}${s.stepUpAmount}`,
          'Expected Return Rate': `${s.rate}% p.a.`,
          Tenure: `${s.years} years`,
          'Inflation Benchmark': showInflation ? `${inflationRate}% p.a.` : 'Disabled',
          'Real Purchasing Power': Math.round(res.realTotalValue),
        },
      };
    }
    case 'swp': {
      const s = state.swp;
      const res = calculateSwp(s.corpus, s.withdrawal, s.rate, s.years);
      return {
        calculatorName: 'SWP (Systematic Withdrawal Plan)',
        currency,
        investedAmount: s.corpus,
        maturityAmount: res.finalBalance,
        estimatedGain: res.totalInterestEarned,
        details: {
          'Initial Corpus': s.corpus,
          'Monthly Withdrawal': s.withdrawal,
          'Total Withdrawn': Math.round(res.totalWithdrawn),
          'Expected Return Rate': `${s.rate}% p.a.`,
          Duration: `${s.years} years`,
          'Sustainable Limit': Math.round(res.sustainableMonthlyWithdrawal),
        },
      };
    }
    case 'fd': {
      const s = state.fd;
      const res = calculateFd(s.principal, s.rate, s.years, s.months, s.payoutOption);
      return {
        calculatorName: 'Fixed Deposit (FD)',
        currency,
        investedAmount: res.principal,
        maturityAmount: s.payoutOption === 'cumulative' ? res.maturityValue : res.principal + res.totalInterest,
        estimatedGain: res.totalInterest,
        details: {
          'Principal Deposit': s.principal,
          'Interest Rate': `${s.rate}% p.a.`,
          Tenure: `${s.years} years, ${s.months} months`,
          'Payout Option': s.payoutOption,
        },
      };
    }
    case 'rd': {
      const s = state.rd;
      const res = calculateRd(s.monthly, s.rate, s.tenureMonths);
      return {
        calculatorName: 'Recurring Deposit (RD)',
        currency,
        investedAmount: res.totalDeposited,
        maturityAmount: res.maturityValue,
        estimatedGain: res.totalInterest,
        details: {
          'Monthly Installment': s.monthly,
          'Interest Rate': `${s.rate}% p.a.`,
          Tenure: `${s.tenureMonths} months`,
        },
      };
    }
    case 'ppf': {
      const s = state.ppf;
      const res = calculatePpf(s.annualDeposit, s.rate, s.extensionBlocks);
      return {
        calculatorName: 'PPF (Public Provident Fund)',
        currency,
        investedAmount: res.totalDeposited,
        maturityAmount: res.maturityValue,
        estimatedGain: res.totalInterest,
        details: {
          'Annual Deposit': s.annualDeposit,
          'Government Rate': `${s.rate}% p.a.`,
          Duration: `${15 + s.extensionBlocks * 5} years`,
        },
      };
    }
    case 'cagr': {
      const s = state.cagr;
      const res = calculateCagr(s.initialValue, s.finalValue, s.years, inflationRate);
      return {
        calculatorName: 'CAGR & Absolute Return',
        currency,
        investedAmount: s.initialValue,
        maturityAmount: s.finalValue,
        estimatedGain: res.totalGain,
        details: {
          'Beginning Value': s.initialValue,
          'Ending Value': s.finalValue,
          'Holding Period': `${s.years} years`,
          CAGR: `${res.cagrPct.toFixed(2)}%`,
          'Benchmark Inflation': `${inflationRate}%`,
        },
      };
    }
    case 'fire': {
      const s = state.fire;
      const safeRetire = Math.max(s.currentAge + 1, s.retirementAge);
      const safeLife = Math.max(safeRetire + 1, s.lifeExpectancy);
      const res = calculateRetirementFire({
        ...s,
        retirementAge: safeRetire,
        lifeExpectancy: safeLife,
      });
      return {
        calculatorName: 'Retirement & FIRE Planner',
        currency,
        investedAmount: res.totalContributedDuringAccumulation,
        maturityAmount: res.targetCorpusAtRetirement,
        estimatedGain: Math.max(0, res.targetCorpusAtRetirement - res.totalContributedDuringAccumulation),
        details: {
          'Current / Retire / Life': `${s.currentAge} / ${safeRetire} / ${safeLife}`,
          'Monthly Expense': s.currentMonthlyExpense,
          'Required Monthly SIP': Math.round(res.requiredMonthlySip),
          'Inflation / Pre / Post': `${s.inflationPct}% / ${s.preRetirementReturnPct}% / ${s.postRetirementReturnPct}%`,
        },
      };
    }
    case 'portfolio': {
      const res = calculatePortfolio(state.portfolio.streams, inflationRate);
      return {
        calculatorName: 'Multi-Asset Portfolio Aggregator',
        currency,
        investedAmount: res.totalInvested,
        maturityAmount: res.totalNetWorth,
        estimatedGain: res.totalGains,
        details: {
          'Active Streams': state.portfolio.streams.length,
          'Projection Horizon': `${res.horizonYears} years`,
          'Monthly Cash Outflow': res.currentMonthlyOutflow,
          'Blended Portfolio XIRR': `${res.blendedXirrPct.toFixed(2)}%`,
          'Inflation Benchmark': showInflation ? `${inflationRate}% p.a.` : 'Disabled',
          'Real Purchasing Power': Math.round(res.realTotalNetWorth),
        },
      };
    }
  }
}

// ============================================================================
// AGENTIC TOOL EXECUTION (PURE REDUCERS)
// ============================================================================

export interface ActionCardData {
  id: string;
  toolName: 'update_calculator_inputs' | 'add_portfolio_stream' | 'set_inflation_rate';
  title: string;
  targetTab?: CalculatorTabId;
  changes: Array<{ label: string; value: string }>;
}

function clamp(val: number, min: number, max: number): number {
  if (!Number.isFinite(val)) return min;
  return Math.min(max, Math.max(min, val));
}

export function normalizeCalculatorType(raw?: string): CalculatorTabId | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();
  if (s.includes('step') || s.includes('top-up') || s.includes('top up')) return 'stepup-sip';
  if (s === 'sip' || s.includes('systematic investment')) return 'sip';
  if (s.includes('lump')) return 'lumpsum';
  if (s.includes('swp') || s.includes('withdraw')) return 'swp';
  if (s === 'fd' || s.includes('fixed deposit')) return 'fd';
  if (s === 'rd' || s.includes('recurring deposit')) return 'rd';
  if (s.includes('ppf') || s.includes('provident')) return 'ppf';
  if (s.includes('cagr') || s.includes('absolute')) return 'cagr';
  if (s.includes('fire') || s.includes('retire')) return 'fire';
  if (s.includes('portfolio') || s.includes('multi') || s.includes('aggregator')) return 'portfolio';
  return null;
}

export function normalizeStreamType(raw?: string): StreamType {
  const s = (raw ?? 'sip').trim().toLowerCase();
  if (s === 'fd' || s.includes('fixed')) return 'fd';
  if (s === 'rd' || s.includes('recurring')) return 'rd';
  if (s.includes('lump')) return 'lumpsum';
  if (s.includes('div') || s.includes('rent') || s.includes('yield')) return 'dividend';
  return 'sip';
}

export interface UpdateCalculatorInputsArgs {
  calculatorType?: string;
  amount?: number;
  withdrawalAmount?: number;
  finalValue?: number;
  rate?: number;
  tenure?: number;
  compounding?: number;
  stepUpMonthly?: number;
  stepUpAnnual?: number;
  stepUpMode?: StepUpMode;
}

export function applyUpdateCalculatorInputs(
  prev: AppStrategyState,
  args: UpdateCalculatorInputsArgs
): { nextState: AppStrategyState; actionCard: ActionCardData; summary: string } {
  let targetTab = normalizeCalculatorType(args.calculatorType) ?? prev.activeTab;
  if (
    targetTab === 'sip' &&
    (typeof args.stepUpMonthly === 'number' || typeof args.stepUpAnnual === 'number')
  ) {
    targetTab = 'stepup-sip';
  }

  const next: AppStrategyState = {
    ...prev,
    activeTab: targetTab,
  };
  const changes: Array<{ label: string; value: string }> = [];
  const sym = CURRENCIES[prev.currency].symbol;

  if (targetTab === 'lumpsum') {
    const updated = { ...prev.lumpsum };
    if (typeof args.amount === 'number' && args.amount > 0) {
      updated.principal = clamp(args.amount, 1000, 10000000);
      changes.push({ label: 'Principal', value: formatCompactCurrency(updated.principal, prev.currency) });
    }
    if (typeof args.rate === 'number') {
      updated.rate = clamp(args.rate, 1, 30);
      changes.push({ label: 'Return rate', value: `${updated.rate}% p.a.` });
    }
    if (typeof args.tenure === 'number') {
      updated.years = clamp(Math.round(args.tenure), 1, 40);
      changes.push({ label: 'Tenure', value: `${updated.years} yrs` });
    }
    if (args.compounding === 1 || args.compounding === 2 || args.compounding === 4 || args.compounding === 12) {
      updated.compounding = args.compounding;
      changes.push({ label: 'Compounding', value: `${args.compounding}x/yr` });
    }
    next.lumpsum = updated;
  } else if (targetTab === 'sip') {
    const updated = { ...prev.sip };
    if (typeof args.amount === 'number' && args.amount > 0) {
      updated.monthly = clamp(args.amount, 500, 500000);
      changes.push({ label: 'Monthly SIP', value: formatCompactCurrency(updated.monthly, prev.currency) });
    }
    if (typeof args.rate === 'number') {
      updated.rate = clamp(args.rate, 1, 30);
      changes.push({ label: 'Return rate', value: `${updated.rate}% p.a.` });
    }
    if (typeof args.tenure === 'number') {
      updated.years = clamp(Math.round(args.tenure), 1, 40);
      changes.push({ label: 'Tenure', value: `${updated.years} yrs` });
    }
    next.sip = updated;
  } else if (targetTab === 'stepup-sip') {
    const updated = { ...prev.stepupSip };
    if (typeof args.amount === 'number' && args.amount > 0) {
      updated.initialMonthly = clamp(args.amount, 500, 500000);
      changes.push({ label: 'Initial SIP', value: formatCompactCurrency(updated.initialMonthly, prev.currency) });
    }
    if (typeof args.stepUpMonthly === 'number' && args.stepUpMonthly >= 0) {
      updated.stepUpFrequency = 'monthly';
      if (args.stepUpMode === 'amount' || args.stepUpMonthly > 25) {
        updated.stepUpMode = 'amount';
        updated.stepUpAmount = clamp(args.stepUpMonthly, 0, 5000);
        changes.push({ label: 'Monthly step-up', value: `+${sym}${updated.stepUpAmount}/mo` });
      } else {
        updated.stepUpMode = 'percent';
        updated.stepUpPct = clamp(args.stepUpMonthly, 0, 10);
        changes.push({ label: 'Monthly step-up', value: `+${updated.stepUpPct}%/mo` });
      }
    } else if (typeof args.stepUpAnnual === 'number' && args.stepUpAnnual >= 0) {
      updated.stepUpFrequency = 'annual';
      if (args.stepUpMode === 'amount' || args.stepUpAnnual > 30) {
        updated.stepUpMode = 'amount';
        updated.stepUpAmount = clamp(args.stepUpAnnual, 0, 50000);
        changes.push({ label: 'Annual step-up', value: `+${sym}${updated.stepUpAmount}/yr` });
      } else {
        updated.stepUpMode = 'percent';
        updated.stepUpPct = clamp(args.stepUpAnnual, 0, 30);
        changes.push({ label: 'Annual step-up', value: `+${updated.stepUpPct}%/yr` });
      }
    }
    if (typeof args.rate === 'number') {
      updated.rate = clamp(args.rate, 1, 30);
      changes.push({ label: 'Return rate', value: `${updated.rate}% p.a.` });
    }
    if (typeof args.tenure === 'number') {
      updated.years = clamp(Math.round(args.tenure), 1, 40);
      changes.push({ label: 'Tenure', value: `${updated.years} yrs` });
    }
    next.stepupSip = updated;
  } else if (targetTab === 'swp') {
    const updated = { ...prev.swp };
    if (typeof args.amount === 'number' && args.amount > 0) {
      updated.corpus = clamp(args.amount, 100000, 50000000);
      changes.push({ label: 'Initial corpus', value: formatCompactCurrency(updated.corpus, prev.currency) });
    }
    if (typeof args.withdrawalAmount === 'number' && args.withdrawalAmount > 0) {
      updated.withdrawal = clamp(args.withdrawalAmount, 1000, 500000);
      changes.push({ label: 'Monthly withdrawal', value: formatCompactCurrency(updated.withdrawal, prev.currency) });
    }
    if (typeof args.rate === 'number') {
      updated.rate = clamp(args.rate, 1, 20);
      changes.push({ label: 'Return rate', value: `${updated.rate}% p.a.` });
    }
    if (typeof args.tenure === 'number') {
      updated.years = clamp(Math.round(args.tenure), 1, 40);
      changes.push({ label: 'Duration', value: `${updated.years} yrs` });
    }
    next.swp = updated;
  } else if (targetTab === 'fd') {
    const updated = { ...prev.fd };
    if (typeof args.amount === 'number' && args.amount > 0) {
      updated.principal = clamp(args.amount, 5000, 10000000);
      changes.push({ label: 'FD principal', value: formatCompactCurrency(updated.principal, prev.currency) });
    }
    if (typeof args.rate === 'number') {
      updated.rate = clamp(args.rate, 2, 14);
      changes.push({ label: 'Interest rate', value: `${updated.rate}% p.a.` });
    }
    if (typeof args.tenure === 'number') {
      const wholeYrs = Math.floor(args.tenure);
      const remMos = Math.round((args.tenure - wholeYrs) * 12);
      updated.years = clamp(wholeYrs, 0, 20);
      updated.months = updated.years === 0 ? clamp(remMos, 1, 11) : clamp(remMos, 0, 11);
      changes.push({ label: 'Tenure', value: `${updated.years}y ${updated.months}m` });
    }
    next.fd = updated;
  } else if (targetTab === 'rd') {
    const updated = { ...prev.rd };
    if (typeof args.amount === 'number' && args.amount > 0) {
      updated.monthly = clamp(args.amount, 500, 250000);
      changes.push({ label: 'Monthly RD', value: formatCompactCurrency(updated.monthly, prev.currency) });
    }
    if (typeof args.rate === 'number') {
      updated.rate = clamp(args.rate, 2, 12);
      changes.push({ label: 'Interest rate', value: `${updated.rate}% p.a.` });
    }
    if (typeof args.tenure === 'number') {
      updated.tenureMonths = clamp(Math.round(args.tenure * 12), 6, 120);
      changes.push({ label: 'Tenure', value: `${updated.tenureMonths} mos` });
    }
    next.rd = updated;
  } else if (targetTab === 'ppf') {
    const updated = { ...prev.ppf };
    if (typeof args.amount === 'number' && args.amount > 0) {
      updated.annualDeposit = clamp(args.amount, 500, 150000);
      changes.push({ label: 'Annual PPF', value: formatCompactCurrency(updated.annualDeposit, prev.currency) });
    }
    if (typeof args.rate === 'number') {
      updated.rate = clamp(args.rate, 5, 10);
      changes.push({ label: 'Govt rate', value: `${updated.rate}% p.a.` });
    }
    if (typeof args.tenure === 'number') {
      const blocks = Math.max(0, Math.min(3, Math.round((args.tenure - 15) / 5)));
      updated.extensionBlocks = blocks;
      changes.push({ label: 'Duration', value: `${15 + blocks * 5} yrs` });
    }
    next.ppf = updated;
  } else if (targetTab === 'cagr') {
    const updated = { ...prev.cagr };
    if (typeof args.amount === 'number' && args.amount > 0) {
      updated.initialValue = clamp(args.amount, 1000, 10000000);
      changes.push({ label: 'Initial value', value: formatCompactCurrency(updated.initialValue, prev.currency) });
    }
    if (typeof args.finalValue === 'number' && args.finalValue > 0) {
      updated.finalValue = clamp(args.finalValue, 1000, 25000000);
      changes.push({ label: 'Final value', value: formatCompactCurrency(updated.finalValue, prev.currency) });
    }
    if (typeof args.tenure === 'number') {
      updated.years = clamp(Math.round(args.tenure), 1, 40);
      changes.push({ label: 'Period', value: `${updated.years} yrs` });
    }
    next.cagr = updated;
  } else if (targetTab === 'fire') {
    const updated = { ...prev.fire };
    if (typeof args.amount === 'number' && args.amount > 0) {
      updated.currentMonthlyExpense = clamp(args.amount, 5000, 500000);
      changes.push({ label: 'Monthly expense', value: formatCompactCurrency(updated.currentMonthlyExpense, prev.currency) });
    }
    if (typeof args.rate === 'number') {
      updated.preRetirementReturnPct = clamp(args.rate, 4, 20);
      changes.push({ label: 'Pre-retire return', value: `${updated.preRetirementReturnPct}% p.a.` });
    }
    if (typeof args.tenure === 'number') {
      updated.retirementAge = clamp(updated.currentAge + Math.round(args.tenure), updated.currentAge + 1, 75);
      changes.push({ label: 'Retirement age', value: `Age ${updated.retirementAge}` });
    }
    next.fire = updated;
  }

  if (changes.length === 0) {
    changes.push({ label: 'Active calculator', value: targetTab.toUpperCase() });
  }

  const snap = computeStrategySnapshot(next);
  const actionCard: ActionCardData = {
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    toolName: 'update_calculator_inputs',
    title: `Updated ${snap.calculatorName}`,
    targetTab,
    changes,
  };

  return {
    nextState: next,
    actionCard,
    summary: `Switched to ${snap.calculatorName}. Projected maturity: ${formatCompactCurrency(snap.maturityAmount, next.currency)}, Invested: ${formatCompactCurrency(snap.investedAmount, next.currency)}.`,
  };
}

export interface AddPortfolioStreamArgs {
  streamType?: string;
  name?: string;
  amount: number;
  rate?: number;
  tenure?: number;
  stepUpPct?: number;
  startYear?: number;
  replaceExisting?: boolean;
}

export function applyAddPortfolioStream(
  prev: AppStrategyState,
  args: AddPortfolioStreamArgs
): { nextState: AppStrategyState; actionCard: ActionCardData; summary: string } {
  const type = normalizeStreamType(args.streamType);
  const defaultRate = type === 'fd' ? 7 : type === 'rd' ? 7 : type === 'dividend' ? 9 : 12;
  const ratePct = clamp(typeof args.rate === 'number' ? args.rate : defaultRate, 0, 40);
  const tenureYears = clamp(Math.round(typeof args.tenure === 'number' ? args.tenure : 10), 1, 40);
  const amount = Math.max(500, Number(args.amount) || 5000);
  const stepUpPct = clamp(typeof args.stepUpPct === 'number' ? args.stepUpPct : 0, 0, 30);
  const startYear = clamp(Math.round(typeof args.startYear === 'number' ? args.startYear : 0), 0, 30);

  const baseStreams = args.replaceExisting ? [] : prev.portfolio.streams;
  const color = PORTFOLIO_PALETTE[baseStreams.length % PORTFOLIO_PALETTE.length];
  const labelDefault =
    type === 'sip'
      ? 'AI SIP Stream'
      : type === 'fd'
        ? 'AI Fixed Deposit'
        : type === 'lumpsum'
          ? 'AI Lump Sum'
          : type === 'rd'
            ? 'AI Recurring Deposit'
            : 'AI Yield Stream';

  const newStream: InvestmentStream = {
    id: `stream-ai-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: (args.name || labelDefault).trim(),
    type,
    amount,
    ratePct,
    stepUpPct,
    startYear,
    tenureYears,
    color,
  };

  const next: AppStrategyState = {
    ...prev,
    activeTab: 'portfolio',
    portfolio: {
      streams: [...baseStreams, newStream],
    },
  };

  const port = calculatePortfolio(next.portfolio.streams, next.inflationRate);
  const actionCard: ActionCardData = {
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    toolName: 'add_portfolio_stream',
    title: `Added ${newStream.name} (${type.toUpperCase()})`,
    targetTab: 'portfolio',
    changes: [
      {
        label: type === 'sip' || type === 'rd' || type === 'dividend' ? 'Monthly amount' : 'Principal',
        value: formatCompactCurrency(amount, next.currency),
      },
      { label: 'Rate / Tenure', value: `${ratePct}% · ${tenureYears} yrs` },
      { label: 'Portfolio net worth', value: formatCompactCurrency(port.totalNetWorth, next.currency) },
    ],
  };

  return {
    nextState: next,
    actionCard,
    summary: `Added ${newStream.name} (${type.toUpperCase()}, ${formatCompactCurrency(amount, next.currency)} at ${ratePct}% for ${tenureYears} yrs). Total portfolio streams: ${next.portfolio.streams.length}. Consolidated Net Worth: ${formatCompactCurrency(port.totalNetWorth, next.currency)} (XIRR ${port.blendedXirrPct.toFixed(2)}%).`,
  };
}

export interface SetInflationRateArgs {
  inflationPercentage: number;
  enabled?: boolean;
}

export function applySetInflationRate(
  prev: AppStrategyState,
  args: SetInflationRateArgs
): { nextState: AppStrategyState; actionCard: ActionCardData; summary: string } {
  const rate = clamp(Number(args.inflationPercentage), 0, 15);
  const enabled = args.enabled !== false;

  const next: AppStrategyState = {
    ...prev,
    showInflation: enabled,
    inflationRate: rate,
    fire: {
      ...prev.fire,
      inflationPct: clamp(rate, 2, 12),
    },
  };

  const snap = computeStrategySnapshot(next);
  const realVal = snap.details['Real Purchasing Power'];
  const realFormatted =
    typeof realVal === 'number'
      ? formatCompactCurrency(realVal, next.currency)
      : formatCompactCurrency(snap.maturityAmount, next.currency);

  const actionCard: ActionCardData = {
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    toolName: 'set_inflation_rate',
    title: `Set Inflation Benchmark to ${rate}%`,
    changes: [
      { label: 'Inflation baseline', value: enabled ? `${rate}% p.a.` : 'Hidden' },
      { label: 'Real purchasing power', value: realFormatted },
    ],
  };

  return {
    nextState: next,
    actionCard,
    summary: `Updated inflation benchmark to ${rate}% p.a. (${enabled ? 'enabled' : 'disabled'}). Real purchasing power for ${snap.calculatorName}: ${realFormatted}.`,
  };
}

// ============================================================================
// PERSISTENT STRATEGY SAVE / LOAD / IMPORT / EXPORT (localStorage)
// ============================================================================

export const SAVED_STRATEGIES_STORAGE_KEY = 'saved_strategies';

export interface SavedStrategy {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  activeTab: CalculatorTabId;
  calculatorName: string;
  currency: CurrencyCode;
  investedPreview: number;
  maturityPreview: number;
  state: AppStrategyState;
}

export function loadSavedStrategies(): SavedStrategy[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SAVED_STRATEGIES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is SavedStrategy =>
        Boolean(item && typeof item.id === 'string' && typeof item.name === 'string' && item.state)
    );
  } catch {
    return [];
  }
}

export function persistSavedStrategies(strategies: SavedStrategy[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SAVED_STRATEGIES_STORAGE_KEY, JSON.stringify(strategies));
}

export function createSavedStrategyRecord(
  name: string,
  state: AppStrategyState,
  existingId?: string
): SavedStrategy {
  const snap = computeStrategySnapshot(state);
  const now = new Date().toISOString();
  return {
    id: existingId ?? `strat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim() || `${snap.calculatorName} Plan`,
    createdAt: now,
    updatedAt: now,
    activeTab: state.activeTab,
    calculatorName: snap.calculatorName,
    currency: state.currency,
    investedPreview: snap.investedAmount,
    maturityPreview: snap.maturityAmount,
    state: JSON.parse(JSON.stringify(state)) as AppStrategyState,
  };
}

export function sanitizeImportedState(raw: Partial<AppStrategyState> | undefined): AppStrategyState {
  if (!raw || typeof raw !== 'object') {
    return JSON.parse(JSON.stringify(INITIAL_STRATEGY_STATE)) as AppStrategyState;
  }
  const base = INITIAL_STRATEGY_STATE;
  return {
    activeTab: normalizeCalculatorType(raw.activeTab) ?? base.activeTab,
    currency:
      raw.currency && ['INR', 'USD', 'EUR', 'GBP'].includes(raw.currency)
        ? raw.currency
        : base.currency,
    showInflation: typeof raw.showInflation === 'boolean' ? raw.showInflation : base.showInflation,
    inflationRate: typeof raw.inflationRate === 'number' ? clamp(raw.inflationRate, 0, 15) : base.inflationRate,
    lumpsum: { ...base.lumpsum, ...(raw.lumpsum ?? {}) },
    sip: { ...base.sip, ...(raw.sip ?? {}) },
    stepupSip: { ...base.stepupSip, ...(raw.stepupSip ?? {}) },
    swp: { ...base.swp, ...(raw.swp ?? {}) },
    fd: { ...base.fd, ...(raw.fd ?? {}) },
    rd: { ...base.rd, ...(raw.rd ?? {}) },
    ppf: { ...base.ppf, ...(raw.ppf ?? {}) },
    cagr: { ...base.cagr, ...(raw.cagr ?? {}) },
    fire: { ...base.fire, ...(raw.fire ?? {}) },
    portfolio: {
      streams: Array.isArray(raw.portfolio?.streams)
        ? raw.portfolio.streams.map((s, idx) => ({
            id: typeof s.id === 'string' ? s.id : `imported-${idx}`,
            name: typeof s.name === 'string' ? s.name : `Stream ${idx + 1}`,
            type: normalizeStreamType(s.type),
            amount: Math.max(0, Number(s.amount) || 0),
            ratePct: clamp(Number(s.ratePct) || 0, 0, 40),
            stepUpPct: clamp(Number(s.stepUpPct) || 0, 0, 30),
            startYear: clamp(Math.round(Number(s.startYear) || 0), 0, 30),
            tenureYears: clamp(Math.round(Number(s.tenureYears) || 1), 1, 40),
            color: typeof s.color === 'string' ? s.color : PORTFOLIO_PALETTE[idx % PORTFOLIO_PALETTE.length],
          }))
        : base.portfolio.streams,
    },
  };
}

export function parseStrategiesJson(jsonText: string): SavedStrategy[] {
  const parsed = JSON.parse(jsonText);
  const list = Array.isArray(parsed) ? parsed : [parsed];
  const valid: SavedStrategy[] = [];

  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const rawItem = item as Partial<SavedStrategy>;
    const sanitizedState = sanitizeImportedState(rawItem.state);
    const snap = computeStrategySnapshot(sanitizedState);
    const now = new Date().toISOString();
    valid.push({
      id: `strat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name:
        typeof rawItem.name === 'string' && rawItem.name.trim()
          ? rawItem.name.trim()
          : `${snap.calculatorName} (Imported)`,
      createdAt: typeof rawItem.createdAt === 'string' ? rawItem.createdAt : now,
      updatedAt: now,
      activeTab: sanitizedState.activeTab,
      calculatorName: snap.calculatorName,
      currency: sanitizedState.currency,
      investedPreview: snap.investedAmount,
      maturityPreview: snap.maturityAmount,
      state: sanitizedState,
    });
  }
  return valid;
}
