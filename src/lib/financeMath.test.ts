import test from 'node:test';
import assert from 'node:assert/strict';
import {
  adjustForInflation,
  calculateLumpSum,
  calculateSip,
  calculateStepUpSip,
  calculateSwp,
  calculateFd,
  calculateRd,
  calculatePpf,
  calculateCagr,
  calculateRetirementFire,
  calculatePortfolio,
  type InvestmentStream,
} from './financeMath';

test('Lump Sum matches compound interest formula FV = P*(1+r/m)^(m*t)', () => {
  const annual = calculateLumpSum(100000, 12, 10, 1);
  assert.ok(Math.abs(annual.totalValue - 100000 * Math.pow(1.12, 10)) < 0.01);
  assert.ok(Math.abs(annual.ruleOf72Years - 6) < 0.01);

  const quarterly = calculateLumpSum(100000, 12, 10, 4);
  assert.ok(Math.abs(quarterly.totalValue - 100000 * Math.pow(1.03, 40)) < 0.01);
  assert.ok(quarterly.totalValue > annual.totalValue);
});

test('SIP matches annuity due formula', () => {
  const res = calculateSip(5000, 12, 10);
  // i = 0.01, n = 120: 5000 * ((1.01^120 - 1)/0.01) * 1.01 = 1161695.38
  assert.equal(res.totalInvested, 600000);
  assert.ok(Math.abs(res.totalValue - 1161695.38) < 1);
  assert.equal(res.schedule.length, 10);
});

test('Step-Up SIP outperforms standard SIP with annual and monthly step-up', () => {
  const res = calculateStepUpSip(10000, 'percent', 10, 12, 10, 'annual');
  assert.ok(res.totalValue > res.standardTotalValue);
  assert.ok(res.stepUpAdvantage > 0);
  assert.ok(res.totalInvested > res.standardTotalInvested);

  const fixed = calculateStepUpSip(10000, 'amount', 1000, 12, 10, 'annual');
  assert.equal(fixed.finalMonthlySip, 19000);
  assert.ok(fixed.totalValue > fixed.standardTotalValue);

  const monthlyFixed = calculateStepUpSip(10000, 'amount', 100, 12, 2, 'monthly');
  // 24 months: starts at 10000, +100 for 23 months => final = 12300
  assert.equal(monthlyFixed.finalMonthlySip, 12300);
  assert.ok(monthlyFixed.totalValue > monthlyFixed.standardTotalValue);

  const monthlyPct = calculateStepUpSip(10000, 'percent', 1, 12, 5, 'monthly');
  assert.ok(monthlyPct.totalValue > calculateStepUpSip(10000, 'percent', 1, 12, 5, 'annual').totalValue);
});

test('SWP tracks sustainable withdrawal and depletion accurately', () => {
  const sustainable = calculateSwp(5000000, 20000, 8, 20);
  assert.equal(sustainable.depletedYear, null);
  assert.ok(sustainable.finalBalance > 0);

  const depleting = calculateSwp(1000000, 30000, 6, 10);
  assert.ok(depleting.depletedYear !== null);
  assert.equal(depleting.finalBalance, 0);
});

test('Fixed Deposit quarterly compounding vs non-cumulative payout', () => {
  const cum = calculateFd(100000, 8, 5, 0, 'cumulative');
  assert.ok(Math.abs(cum.maturityValue - 100000 * Math.pow(1.02, 20)) < 0.01);

  const nonCum = calculateFd(100000, 8, 5, 0, 'monthly');
  assert.equal(nonCum.maturityValue, 100000);
  assert.ok(Math.abs(nonCum.totalInterest - 40000) < 0.01);
  assert.ok(Math.abs(nonCum.periodicPayout - (100000 * 0.08) / 12) < 0.01);
});

test('Recurring Deposit quarterly compounding produces expected maturity', () => {
  const rd = calculateRd(5000, 7, 60);
  assert.equal(rd.totalDeposited, 300000);
  assert.ok(rd.maturityValue > 350000 && rd.maturityValue < 370000);
});

test('PPF handles 15-year lock-in and 5-year extensions', () => {
  const base = calculatePpf(150000, 7.1, 0);
  assert.equal(base.schedule.length, 15);
  assert.equal(base.totalDeposited, 2250000);
  assert.ok(base.maturityValue > 4000000);

  const extended = calculatePpf(150000, 7.1, 1);
  assert.equal(extended.schedule.length, 20);
  assert.equal(extended.schedule[19].phase, 'Extension');
});

test('CAGR & Absolute Return calculate exact growth and real return', () => {
  const res = calculateCagr(100000, 200000, 6, 6);
  assert.ok(Math.abs(res.absoluteReturnPct - 100) < 0.01);
  assert.ok(Math.abs(res.cagrPct - 12.2462) < 0.01);
  assert.ok(res.realCagrPct < res.cagrPct);
});

test('Retirement & FIRE builds accumulation and distribution trajectory', () => {
  const res = calculateRetirementFire({
    currentAge: 30,
    retirementAge: 55,
    lifeExpectancy: 85,
    currentMonthlyExpense: 60000,
    inflationPct: 6,
    preRetirementReturnPct: 12,
    postRetirementReturnPct: 7,
    currentSavings: 500000,
  });
  assert.equal(res.yearsToRetirement, 25);
  assert.equal(res.yearsInRetirement, 30);
  assert.ok(res.targetCorpusAtRetirement > 0);
  assert.ok(res.requiredMonthlySip > 0);
  assert.equal(res.schedule.length, 56);
  // Distribution phase should draw down close to 0 at life expectancy
  const endCorpus = res.schedule[res.schedule.length - 1].corpus;
  assert.ok(endCorpus < res.targetCorpusAtRetirement * 0.02);
});

test('Portfolio Master Engine aggregates multiple streams and computes blended XIRR', () => {
  const streams: InvestmentStream[] = [
    {
      id: 's1',
      name: 'Index Fund SIP',
      type: 'sip',
      amount: 10000,
      ratePct: 12,
      stepUpPct: 0,
      startYear: 0,
      tenureYears: 10,
      color: '#3b82f6',
    },
    {
      id: 's2',
      name: 'Lump Sum Core',
      type: 'lumpsum',
      amount: 200000,
      ratePct: 10,
      stepUpPct: 0,
      startYear: 0,
      tenureYears: 10,
      color: '#f59e0b',
    },
  ];
  const port = calculatePortfolio(streams, 6);
  assert.equal(port.horizonYears, 10);
  assert.equal(port.currentMonthlyOutflow, 10000);
  assert.equal(port.totalInvested, 1200000 + 200000);
  assert.ok(port.totalNetWorth > 2800000);
  assert.ok(port.blendedXirrPct > 10 && port.blendedXirrPct < 13);
  assert.equal(port.ledger.length, 10);
  assert.ok(port.realTotalNetWorth < port.totalNetWorth);
  assert.ok(
    Math.abs(
      port.realTotalNetWorth - adjustForInflation(port.totalNetWorth, 6, 10)
    ) < 0.01
  );
});

test('Inflation adjustment discounts nominal future values accurately across calculators', () => {
  const discounted = adjustForInflation(1000000, 6, 10);
  assert.ok(Math.abs(discounted - 1000000 / Math.pow(1.06, 10)) < 0.01);

  const lump = calculateLumpSum(100000, 12, 10, 1, 6);
  assert.ok(lump.realTotalValue < lump.totalValue);
  assert.ok(Math.abs(lump.realTotalValue - adjustForInflation(lump.totalValue, 6, 10)) < 0.01);
  assert.equal(lump.schedule[0].realValue, 100000);

  const sip = calculateSip(10000, 12, 10, 6);
  assert.ok(sip.realTotalValue < sip.totalValue);
  assert.ok(Math.abs(sip.realTotalValue - adjustForInflation(sip.totalValue, 6, 10)) < 0.01);

  const stepUp = calculateStepUpSip(10000, 'percent', 10, 12, 10, 'annual', 6);
  assert.ok(stepUp.realTotalValue < stepUp.totalValue);
  assert.ok(
    Math.abs(stepUp.realTotalValue - adjustForInflation(stepUp.totalValue, 6, 10)) < 0.01
  );
});
