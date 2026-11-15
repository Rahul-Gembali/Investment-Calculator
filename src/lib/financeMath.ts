export type CompoundingFrequency = 1 | 2 | 4 | 12;

export function adjustForInflation(
  nominalValue: number,
  annualInflationPct: number,
  years: number
): number {
  const inf = Math.max(0, annualInflationPct) / 100;
  return nominalValue / Math.pow(1 + inf, Math.max(0, years));
}

export interface YearPoint {
  year: number;
  label: string;
  invested: number;
  gains: number;
  total: number;
  realValue: number;
}

export interface LumpSumResult {
  principal: number;
  totalValue: number;
  realTotalValue: number;
  estimatedReturns: number;
  wealthMultiplier: number;
  ruleOf72Years: number;
  schedule: YearPoint[];
}

export function calculateLumpSum(
  principal: number,
  annualRatePct: number,
  years: number,
  compoundingPerYear: CompoundingFrequency = 1,
  inflationPct = 6
): LumpSumResult {
  const P = Math.max(0, principal);
  const r = Math.max(0, annualRatePct) / 100;
  const t = Math.max(1, Math.round(years));
  const m = compoundingPerYear;

  const schedule: YearPoint[] = [];
  for (let y = 0; y <= t; y++) {
    const val = P * Math.pow(1 + r / m, m * y);
    schedule.push({
      year: y,
      label: `Yr ${y}`,
      invested: P,
      gains: Math.max(0, val - P),
      total: val,
      realValue: adjustForInflation(val, inflationPct, y),
    });
  }

  const last = schedule[schedule.length - 1];
  const totalValue = last.total;
  const estimatedReturns = Math.max(0, totalValue - P);
  const wealthMultiplier = P > 0 ? totalValue / P : 1;
  const ruleOf72Years = annualRatePct > 0 ? 72 / annualRatePct : Infinity;

  return {
    principal: P,
    totalValue,
    realTotalValue: last.realValue,
    estimatedReturns,
    wealthMultiplier,
    ruleOf72Years,
    schedule,
  };
}

export interface SipResult {
  totalInvested: number;
  totalValue: number;
  realTotalValue: number;
  estimatedReturns: number;
  wealthMultiplier: number;
  schedule: YearPoint[];
}

export function calculateSipValue(
  monthlyAmount: number,
  annualRatePct: number,
  years: number
): number {
  const P = Math.max(0, monthlyAmount);
  const n = Math.max(0, Math.round(years * 12));
  if (n === 0) return 0;
  const i = Math.max(0, annualRatePct) / 100 / 12;
  if (i === 0) return P * n;
  return P * ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
}

export function calculateSip(
  monthlyAmount: number,
  annualRatePct: number,
  years: number,
  inflationPct = 6
): SipResult {
  const P = Math.max(0, monthlyAmount);
  const t = Math.max(1, Math.round(years));

  const schedule: YearPoint[] = [];
  for (let y = 1; y <= t; y++) {
    const invested = P * y * 12;
    const total = calculateSipValue(P, annualRatePct, y);
    schedule.push({
      year: y,
      label: `Yr ${y}`,
      invested,
      gains: Math.max(0, total - invested),
      total,
      realValue: adjustForInflation(total, inflationPct, y),
    });
  }

  const last = schedule[schedule.length - 1];
  const wealthMultiplier = last.invested > 0 ? last.total / last.invested : 1;

  return {
    totalInvested: last.invested,
    totalValue: last.total,
    realTotalValue: last.realValue,
    estimatedReturns: last.gains,
    wealthMultiplier,
    schedule,
  };
}

export type StepUpMode = 'percent' | 'amount';
export type StepUpFrequency = 'annual' | 'monthly';

export interface StepUpYearPoint extends YearPoint {
  standardTotal: number;
  standardInvested: number;
  monthlyContribution: number;
}

export interface StepUpSipResult {
  totalInvested: number;
  totalValue: number;
  realTotalValue: number;
  estimatedReturns: number;
  standardTotalValue: number;
  standardTotalInvested: number;
  stepUpAdvantage: number;
  finalMonthlySip: number;
  schedule: StepUpYearPoint[];
}

export function calculateStepUpSip(
  initialMonthly: number,
  stepUpMode: StepUpMode,
  stepUpValue: number,
  annualRatePct: number,
  years: number,
  stepUpFrequency: StepUpFrequency = 'annual',
  inflationPct = 6
): StepUpSipResult {
  const P0 = Math.max(0, initialMonthly);
  const t = Math.max(1, Math.round(years));
  const i = Math.max(0, annualRatePct) / 100 / 12;

  let balance = 0;
  let invested = 0;
  let currentMonthly = P0;
  const schedule: StepUpYearPoint[] = [];

  for (let y = 1; y <= t; y++) {
    if (stepUpFrequency === 'annual' && y > 1) {
      if (stepUpMode === 'percent') {
        currentMonthly = currentMonthly * (1 + Math.max(0, stepUpValue) / 100);
      } else {
        currentMonthly = currentMonthly + Math.max(0, stepUpValue);
      }
    }

    for (let m = 0; m < 12; m++) {
      if (stepUpFrequency === 'monthly' && !(y === 1 && m === 0)) {
        if (stepUpMode === 'percent') {
          currentMonthly = currentMonthly * (1 + Math.max(0, stepUpValue) / 100);
        } else {
          currentMonthly = currentMonthly + Math.max(0, stepUpValue);
        }
      }
      balance = (balance + currentMonthly) * (1 + i);
      invested += currentMonthly;
    }

    const standardTotal = calculateSipValue(P0, annualRatePct, y);
    const standardInvested = P0 * y * 12;

    schedule.push({
      year: y,
      label: `Yr ${y}`,
      invested,
      gains: Math.max(0, balance - invested),
      total: balance,
      realValue: adjustForInflation(balance, inflationPct, y),
      standardTotal,
      standardInvested,
      monthlyContribution: currentMonthly,
    });
  }

  const last = schedule[schedule.length - 1];
  return {
    totalInvested: last.invested,
    totalValue: last.total,
    realTotalValue: last.realValue,
    estimatedReturns: last.gains,
    standardTotalValue: last.standardTotal,
    standardTotalInvested: last.standardInvested,
    stepUpAdvantage: Math.max(0, last.total - last.standardTotal),
    finalMonthlySip: currentMonthly,
    schedule,
  };
}

export interface SwpYearPoint {
  year: number;
  label: string;
  balance: number;
  cumulativeWithdrawn: number;
  interestEarned: number;
}

export interface SwpResult {
  initialCorpus: number;
  totalWithdrawn: number;
  finalBalance: number;
  totalInterestEarned: number;
  sustainableMonthlyWithdrawal: number;
  perpetualMonthlyWithdrawal: number;
  depletedYear: number | null;
  schedule: SwpYearPoint[];
}

export function calculateSwp(
  initialCorpus: number,
  monthlyWithdrawal: number,
  annualRatePct: number,
  years: number
): SwpResult {
  const PV = Math.max(0, initialCorpus);
  const W = Math.max(0, monthlyWithdrawal);
  const i = Math.max(0, annualRatePct) / 100 / 12;
  const t = Math.max(1, Math.round(years));
  const totalMonths = t * 12;

  let balance = PV;
  let totalWithdrawn = 0;
  let totalInterestEarned = 0;
  let depletedYear: number | null = null;

  const schedule: SwpYearPoint[] = [
    {
      year: 0,
      label: 'Yr 0',
      balance: PV,
      cumulativeWithdrawn: 0,
      interestEarned: 0,
    },
  ];

  for (let y = 1; y <= t; y++) {
    for (let m = 0; m < 12; m++) {
      if (balance <= 0) break;
      const interest = balance * i;
      totalInterestEarned += interest;
      const grown = balance + interest;
      if (grown <= W) {
        totalWithdrawn += grown;
        balance = 0;
        if (depletedYear === null) {
          depletedYear = Number((y - 1 + (m + 1) / 12).toFixed(1));
        }
      } else {
        balance = grown - W;
        totalWithdrawn += W;
      }
    }

    schedule.push({
      year: y,
      label: `Yr ${y}`,
      balance,
      cumulativeWithdrawn: totalWithdrawn,
      interestEarned: totalInterestEarned,
    });
  }

  const sustainableMonthlyWithdrawal =
    i === 0
      ? PV / totalMonths
      : (PV * i) / (1 - Math.pow(1 + i, -totalMonths));

  const perpetualMonthlyWithdrawal = PV * i;

  return {
    initialCorpus: PV,
    totalWithdrawn,
    finalBalance: balance,
    totalInterestEarned,
    sustainableMonthlyWithdrawal,
    perpetualMonthlyWithdrawal,
    depletedYear,
    schedule,
  };
}

export type FdPayoutOption = 'cumulative' | 'monthly' | 'quarterly';

export interface FdResult {
  principal: number;
  totalInterest: number;
  maturityValue: number;
  periodicPayout: number;
  effectiveYieldPct: number;
  schedule: YearPoint[];
}

export function calculateFd(
  principal: number,
  annualRatePct: number,
  years: number,
  months: number,
  payoutOption: FdPayoutOption = 'cumulative'
): FdResult {
  const P = Math.max(0, principal);
  const r = Math.max(0, annualRatePct) / 100;
  const totalYears = Math.max(1 / 12, years + months / 12);

  if (payoutOption === 'cumulative') {
    const maturityValue = P * Math.pow(1 + r / 4, 4 * totalYears);
    const totalInterest = Math.max(0, maturityValue - P);
    const effectiveYieldPct = (Math.pow(1 + r / 4, 4) - 1) * 100;

    const wholeYears = Math.ceil(totalYears);
    const schedule: YearPoint[] = [];
    for (let y = 0; y <= wholeYears; y++) {
      const tPoint = Math.min(y, totalYears);
      const val = P * Math.pow(1 + r / 4, 4 * tPoint);
      schedule.push({
        year: y,
        label: y === wholeYears && totalYears % 1 !== 0 ? `${totalYears.toFixed(1)}Y` : `Yr ${y}`,
        invested: P,
        gains: Math.max(0, val - P),
        total: val,
        realValue: adjustForInflation(val, 6, tPoint),
      });
    }

    return {
      principal: P,
      totalInterest,
      maturityValue,
      periodicPayout: 0,
      effectiveYieldPct,
      schedule,
    };
  }

  // Non-cumulative payouts: principal returned at maturity, interest paid out periodically
  const totalInterest = P * r * totalYears;
  const periodicPayout = payoutOption === 'monthly' ? (P * r) / 12 : (P * r) / 4;
  const wholeYears = Math.ceil(totalYears);
  const schedule: YearPoint[] = [];
  for (let y = 0; y <= wholeYears; y++) {
    const tPoint = Math.min(y, totalYears);
    const earned = P * r * tPoint;
    schedule.push({
      year: y,
      label: y === wholeYears && totalYears % 1 !== 0 ? `${totalYears.toFixed(1)}Y` : `Yr ${y}`,
      invested: P,
      gains: earned,
      total: P + earned,
      realValue: adjustForInflation(P + earned, 6, tPoint),
    });
  }

  return {
    principal: P,
    totalInterest,
    maturityValue: P,
    periodicPayout,
    effectiveYieldPct: annualRatePct,
    schedule,
  };
}

export interface RdResult {
  monthlyInstallment: number;
  totalDeposited: number;
  totalInterest: number;
  maturityValue: number;
  schedule: YearPoint[];
}

export function calculateRd(
  monthlyInstallment: number,
  annualRatePct: number,
  tenureMonths: number
): RdResult {
  const P = Math.max(0, monthlyInstallment);
  const r = Math.max(0, annualRatePct) / 100;
  const N = Math.max(3, Math.round(tenureMonths));

  const maturityForMonths = (monthsCount: number): number => {
    let total = 0;
    for (let k = 1; k <= monthsCount; k++) {
      const remainingMonths = monthsCount - k + 1;
      total += P * Math.pow(1 + r / 4, remainingMonths / 3);
    }
    return total;
  };

  const schedule: YearPoint[] = [];
  const totalYears = Math.ceil(N / 12);
  for (let y = 1; y <= totalYears; y++) {
    const mPoint = Math.min(y * 12, N);
    const deposited = P * mPoint;
    const total = maturityForMonths(mPoint);
    schedule.push({
      year: y,
      label: mPoint < y * 12 ? `${(mPoint / 12).toFixed(1)}Y` : `Yr ${y}`,
      invested: deposited,
      gains: Math.max(0, total - deposited),
      total,
      realValue: adjustForInflation(total, 6, mPoint / 12),
    });
  }

  const last = schedule[schedule.length - 1];
  return {
    monthlyInstallment: P,
    totalDeposited: last.invested,
    totalInterest: last.gains,
    maturityValue: last.total,
    schedule,
  };
}

export interface PpfYearPoint extends YearPoint {
  yearlyInterest: number;
  phase: 'Lock-in' | 'Extension';
}

export interface PpfResult {
  totalDeposited: number;
  totalInterest: number;
  maturityValue: number;
  schedule: PpfYearPoint[];
}

export function calculatePpf(
  annualDeposit: number,
  annualRatePct: number,
  extensionBlocks = 0
): PpfResult {
  const deposit = Math.max(0, annualDeposit);
  const r = Math.max(0, annualRatePct) / 100;
  const totalYears = 15 + Math.max(0, Math.round(extensionBlocks)) * 5;

  let balance = 0;
  let totalDeposited = 0;
  const schedule: PpfYearPoint[] = [];

  for (let y = 1; y <= totalYears; y++) {
    const openingPlusDeposit = balance + deposit;
    const yearlyInterest = openingPlusDeposit * r;
    balance = openingPlusDeposit + yearlyInterest;
    totalDeposited += deposit;

    schedule.push({
      year: y,
      label: `Yr ${y}`,
      invested: totalDeposited,
      gains: Math.max(0, balance - totalDeposited),
      total: balance,
      realValue: adjustForInflation(balance, 6, y),
      yearlyInterest,
      phase: y <= 15 ? 'Lock-in' : 'Extension',
    });
  }

  return {
    totalDeposited,
    totalInterest: Math.max(0, balance - totalDeposited),
    maturityValue: balance,
    schedule,
  };
}

export interface CagrResult {
  initialValue: number;
  finalValue: number;
  years: number;
  cagrPct: number;
  absoluteReturnPct: number;
  totalGain: number;
  realCagrPct: number;
  inflationAdjustedFinalValue: number;
  schedule: Array<{
    year: number;
    label: string;
    portfolioValue: number;
    inflationBenchmark: number;
  }>;
}

export function calculateCagr(
  initialValue: number,
  finalValue: number,
  years: number,
  inflationBenchmarkPct = 6
): CagrResult {
  const BV = Math.max(1, initialValue);
  const EV = Math.max(0, finalValue);
  const t = Math.max(1, years);
  const inf = Math.max(0, inflationBenchmarkPct) / 100;

  const cagr = EV > 0 ? Math.pow(EV / BV, 1 / t) - 1 : -1;
  const cagrPct = cagr * 100;
  const absoluteReturnPct = ((EV - BV) / BV) * 100;
  const totalGain = EV - BV;
  const realCagrPct = ((1 + cagr) / (1 + inf) - 1) * 100;
  const inflationAdjustedFinalValue = EV / Math.pow(1 + inf, t);

  const steps = Math.max(1, Math.round(t));
  const schedule = [];
  for (let y = 0; y <= steps; y++) {
    const tPoint = (y / steps) * t;
    schedule.push({
      year: y,
      label: `Yr ${y}`,
      portfolioValue: BV * Math.pow(1 + cagr, tPoint),
      inflationBenchmark: BV * Math.pow(1 + inf, tPoint),
    });
  }

  return {
    initialValue: BV,
    finalValue: EV,
    years: t,
    cagrPct,
    absoluteReturnPct,
    totalGain,
    realCagrPct,
    inflationAdjustedFinalValue,
    schedule,
  };
}

export interface RetirementInputs {
  currentAge: number;
  retirementAge: number;
  lifeExpectancy: number;
  currentMonthlyExpense: number;
  inflationPct: number;
  preRetirementReturnPct: number;
  postRetirementReturnPct: number;
  currentSavings: number;
}

export interface RetirementYearPoint {
  age: number;
  label: string;
  phase: 'Accumulation' | 'Distribution';
  corpus: number;
  investedOrWithdrawn: number;
}

export interface RetirementResult {
  yearsToRetirement: number;
  yearsInRetirement: number;
  monthlyExpenseAtRetirement: number;
  targetCorpusAtRetirement: number;
  requiredMonthlySip: number;
  projectedCurrentSavingsAtRetirement: number;
  totalContributedDuringAccumulation: number;
  schedule: RetirementYearPoint[];
}

export function calculateRetirementFire(inputs: RetirementInputs): RetirementResult {
  const currentAge = Math.max(18, Math.round(inputs.currentAge));
  const retirementAge = Math.max(currentAge + 1, Math.round(inputs.retirementAge));
  const lifeExpectancy = Math.max(retirementAge + 1, Math.round(inputs.lifeExpectancy));
  const yearsToRetirement = retirementAge - currentAge;
  const yearsInRetirement = lifeExpectancy - retirementAge;

  const inf = Math.max(0, inputs.inflationPct) / 100;
  const preRet = Math.max(0, inputs.preRetirementReturnPct) / 100;
  const postRet = Math.max(0, inputs.postRetirementReturnPct) / 100;
  const currentSavings = Math.max(0, inputs.currentSavings);

  const monthlyExpenseAtRetirement =
    inputs.currentMonthlyExpense * Math.pow(1 + inf, yearsToRetirement);

  // Exact monthly real rate during retirement
  const realAnnualRate = (1 + postRet) / (1 + inf) - 1;
  const realMonthlyRate = Math.pow(1 + realAnnualRate, 1 / 12) - 1;
  const distMonths = yearsInRetirement * 12;

  let targetCorpusAtRetirement = 0;
  if (Math.abs(realMonthlyRate) < 1e-7) {
    targetCorpusAtRetirement = monthlyExpenseAtRetirement * distMonths;
  } else {
    targetCorpusAtRetirement =
      monthlyExpenseAtRetirement *
      ((1 - Math.pow(1 + realMonthlyRate, -distMonths)) / realMonthlyRate) *
      (1 + realMonthlyRate);
  }

  const preMonthlyRate = preRet / 12;
  const accMonths = yearsToRetirement * 12;
  const projectedCurrentSavingsAtRetirement =
    currentSavings * Math.pow(1 + preMonthlyRate, accMonths);

  const shortfall = Math.max(0, targetCorpusAtRetirement - projectedCurrentSavingsAtRetirement);
  let requiredMonthlySip = 0;
  if (shortfall > 0) {
    if (preMonthlyRate === 0) {
      requiredMonthlySip = shortfall / accMonths;
    } else {
      const sipFactor =
        ((Math.pow(1 + preMonthlyRate, accMonths) - 1) / preMonthlyRate) *
        (1 + preMonthlyRate);
      requiredMonthlySip = shortfall / sipFactor;
    }
  }

  const schedule: RetirementYearPoint[] = [];
  let corpus = currentSavings;
  let cumulativeContributed = currentSavings;

  schedule.push({
    age: currentAge,
    label: `Age ${currentAge}`,
    phase: 'Accumulation',
    corpus,
    investedOrWithdrawn: cumulativeContributed,
  });

  // Accumulation phase
  for (let y = 1; y <= yearsToRetirement; y++) {
    for (let m = 0; m < 12; m++) {
      corpus = (corpus + requiredMonthlySip) * (1 + preMonthlyRate);
      cumulativeContributed += requiredMonthlySip;
    }
    schedule.push({
      age: currentAge + y,
      label: `Age ${currentAge + y}`,
      phase: 'Accumulation',
      corpus,
      investedOrWithdrawn: cumulativeContributed,
    });
  }

  // Distribution phase (simulate nominal postRet return and inflation-growing monthly withdrawals)
  const postMonthlyRate = Math.pow(1 + postRet, 1 / 12) - 1;
  const infMonthlyRate = Math.pow(1 + inf, 1 / 12) - 1;
  let activeMonthlyExpense = monthlyExpenseAtRetirement;
  let cumulativeWithdrawn = 0;

  for (let y = 1; y <= yearsInRetirement; y++) {
    for (let m = 0; m < 12; m++) {
      const withdrawal = Math.min(corpus, activeMonthlyExpense);
      corpus = Math.max(0, (corpus - withdrawal) * (1 + postMonthlyRate));
      cumulativeWithdrawn += withdrawal;
      activeMonthlyExpense *= 1 + infMonthlyRate;
    }
    schedule.push({
      age: retirementAge + y,
      label: `Age ${retirementAge + y}`,
      phase: 'Distribution',
      corpus,
      investedOrWithdrawn: cumulativeWithdrawn,
    });
  }

  return {
    yearsToRetirement,
    yearsInRetirement,
    monthlyExpenseAtRetirement,
    targetCorpusAtRetirement,
    requiredMonthlySip,
    projectedCurrentSavingsAtRetirement,
    totalContributedDuringAccumulation: cumulativeContributed,
    schedule,
  };
}

// ============================================================================
// MULTI-ASSET PORTFOLIO AGGREGATOR
// ============================================================================

export type StreamType = 'sip' | 'lumpsum' | 'fd' | 'rd' | 'dividend';

export interface InvestmentStream {
  id: string;
  name: string;
  type: StreamType;
  amount: number; // Monthly for sip/rd/dividend, Principal for lumpsum/fd
  ratePct: number;
  stepUpPct: number; // Annual step-up % for sip / dividend
  startYear: number; // Offset in years (0 = starts immediately)
  tenureYears: number;
  color: string;
}

export interface PortfolioLedgerRow {
  year: number;
  depositedThisYear: number;
  interestEarnedThisYear: number;
  cumulativeInvested: number;
  cumulativeInterest: number;
  netWorth: number;
  realNetWorth: number;
  streamBalances: Record<string, number>;
}

export interface StreamSummary {
  id: string;
  name: string;
  type: StreamType;
  color: string;
  totalInvested: number;
  finalValue: number;
  totalGains: number;
  allocationPct: number;
  activeMonthlyOutflowAtStart: number;
}

export interface PortfolioResult {
  horizonYears: number;
  currentMonthlyOutflow: number;
  totalInvested: number;
  totalNetWorth: number;
  realTotalNetWorth: number;
  totalGains: number;
  blendedXirrPct: number;
  streamSummaries: StreamSummary[];
  ledger: PortfolioLedgerRow[];
}

export function solveIrrMonthly(monthlyCashFlows: number[]): number {
  // monthlyCashFlows[t] > 0 for inflows (final payout), < 0 for outflows (investments)
  const hasPositive = monthlyCashFlows.some((v) => v > 0);
  const hasNegative = monthlyCashFlows.some((v) => v < 0);
  if (!hasPositive || !hasNegative) return 0;

  const npv = (monthlyRate: number): number => {
    let sum = 0;
    const base = 1 + monthlyRate;
    if (base <= 0) return Number.POSITIVE_INFINITY;
    for (let t = 0; t < monthlyCashFlows.length; t++) {
      sum += monthlyCashFlows[t] / Math.pow(base, t);
    }
    return sum;
  };

  // Bisection on monthly rate between -0.05 (-46% annual) and 0.10 (213% annual)
  let low = -0.05;
  let high = 0.1;
  let fLow = npv(low);
  let fHigh = npv(high);

  if (fLow * fHigh > 0) {
    // Expand search range gently
    low = -0.08;
    high = 0.2;
    fLow = npv(low);
    fHigh = npv(high);
    if (fLow * fHigh > 0) return 0;
  }

  for (let iter = 0; iter < 60; iter++) {
    const mid = (low + high) / 2;
    const fMid = npv(mid);
    if (Math.abs(fMid) < 1e-6) {
      return (Math.pow(1 + mid, 12) - 1) * 100;
    }
    if (fLow * fMid <= 0) {
      high = mid;
      fHigh = fMid;
    } else {
      low = mid;
      fLow = fMid;
    }
  }

  const finalMid = (low + high) / 2;
  return (Math.pow(1 + finalMid, 12) - 1) * 100;
}

export function calculatePortfolio(
  streams: InvestmentStream[],
  inflationPct = 6
): PortfolioResult {
  if (streams.length === 0) {
    return {
      horizonYears: 0,
      currentMonthlyOutflow: 0,
      totalInvested: 0,
      totalNetWorth: 0,
      realTotalNetWorth: 0,
      totalGains: 0,
      blendedXirrPct: 0,
      streamSummaries: [],
      ledger: [],
    };
  }

  const horizonYears = Math.max(
    1,
    ...streams.map((s) => Math.max(0, Math.round(s.startYear)) + Math.max(1, Math.round(s.tenureYears)))
  );
  const totalMonths = horizonYears * 12;

  const streamStates = streams.map((s) => ({
    stream: s,
    balance: 0,
    invested: 0,
    startMonth: Math.max(0, Math.round(s.startYear)) * 12,
    endMonth: (Math.max(0, Math.round(s.startYear)) + Math.max(1, Math.round(s.tenureYears))) * 12,
    monthlyRate: Math.max(0, s.ratePct) / 100 / 12,
    quarterlyEquivalentMonthlyRate: Math.pow(1 + Math.max(0, s.ratePct) / 100 / 4, 1 / 3) - 1,
  }));

  const cashFlowsForIrr: number[] = new Array(totalMonths + 1).fill(0);
  const ledger: PortfolioLedgerRow[] = [];

  let cumulativeInvested = 0;
  let prevTotalNetWorth = 0;

  for (let year = 1; year <= horizonYears; year++) {
    let depositedThisYear = 0;
    const yearStartMonth = (year - 1) * 12;

    for (let mOffset = 0; mOffset < 12; mOffset++) {
      const mIndex = yearStartMonth + mOffset;

      for (const st of streamStates) {
        const s = st.stream;
        if (mIndex < st.startMonth || mIndex >= st.endMonth) {
          continue;
        }

        const activeYearIdx = Math.floor((mIndex - st.startMonth) / 12);

        if (s.type === 'lumpsum' || s.type === 'fd') {
          if (mIndex === st.startMonth) {
            const amt = Math.max(0, s.amount);
            st.balance += amt;
            st.invested += amt;
            depositedThisYear += amt;
            cumulativeInvested += amt;
            cashFlowsForIrr[mIndex] -= amt;
          }
          const rate = s.type === 'fd' ? st.quarterlyEquivalentMonthlyRate : st.monthlyRate;
          st.balance = st.balance * (1 + rate);
        } else if (s.type === 'sip' || s.type === 'dividend') {
          const stepFactor = Math.pow(1 + Math.max(0, s.stepUpPct) / 100, activeYearIdx);
          const monthlyContribution = Math.max(0, s.amount) * stepFactor;
          st.balance = (st.balance + monthlyContribution) * (1 + st.monthlyRate);
          st.invested += monthlyContribution;
          depositedThisYear += monthlyContribution;
          cumulativeInvested += monthlyContribution;
          cashFlowsForIrr[mIndex] -= monthlyContribution;
        } else if (s.type === 'rd') {
          const monthlyContribution = Math.max(0, s.amount);
          st.balance = (st.balance + monthlyContribution) * (1 + st.quarterlyEquivalentMonthlyRate);
          st.invested += monthlyContribution;
          depositedThisYear += monthlyContribution;
          cumulativeInvested += monthlyContribution;
          cashFlowsForIrr[mIndex] -= monthlyContribution;
        }
      }
    }

    const streamBalances: Record<string, number> = {};
    let netWorth = 0;
    for (const st of streamStates) {
      streamBalances[st.stream.id] = st.balance;
      netWorth += st.balance;
    }

    const interestEarnedThisYear = Math.max(0, netWorth - prevTotalNetWorth - depositedThisYear);
    prevTotalNetWorth = netWorth;

    ledger.push({
      year,
      depositedThisYear,
      interestEarnedThisYear,
      cumulativeInvested,
      cumulativeInterest: Math.max(0, netWorth - cumulativeInvested),
      netWorth,
      realNetWorth: adjustForInflation(netWorth, inflationPct, year),
      streamBalances,
    });
  }

  const finalNetWorth = prevTotalNetWorth;
  cashFlowsForIrr[totalMonths] += finalNetWorth;
  const blendedXirrPct = solveIrrMonthly(cashFlowsForIrr);

  const currentMonthlyOutflow = streams.reduce((acc, s) => {
    if (s.startYear === 0 && (s.type === 'sip' || s.type === 'rd' || s.type === 'dividend')) {
      return acc + Math.max(0, s.amount);
    }
    return acc;
  }, 0);

  const streamSummaries: StreamSummary[] = streamStates.map((st) => ({
    id: st.stream.id,
    name: st.stream.name,
    type: st.stream.type,
    color: st.stream.color,
    totalInvested: st.invested,
    finalValue: st.balance,
    totalGains: Math.max(0, st.balance - st.invested),
    allocationPct: finalNetWorth > 0 ? (st.balance / finalNetWorth) * 100 : 0,
    activeMonthlyOutflowAtStart:
      st.stream.startYear === 0 &&
      (st.stream.type === 'sip' || st.stream.type === 'rd' || st.stream.type === 'dividend')
        ? st.stream.amount
        : 0,
  }));

  return {
    horizonYears,
    currentMonthlyOutflow,
    totalInvested: cumulativeInvested,
    totalNetWorth: finalNetWorth,
    realTotalNetWorth: adjustForInflation(finalNetWorth, inflationPct, horizonYears),
    totalGains: Math.max(0, finalNetWorth - cumulativeInvested),
    blendedXirrPct,
    streamSummaries,
    ledger,
  };
}
