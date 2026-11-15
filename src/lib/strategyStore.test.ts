import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyAddPortfolioStream,
  applySetInflationRate,
  applyUpdateCalculatorInputs,
  computeStrategySnapshot,
  createSavedStrategyRecord,
  INITIAL_STRATEGY_STATE,
  parseStrategiesJson,
} from './strategyStore';

test('AI tool update_calculator_inputs updates SIP, Step-Up SIP, and FD sliders accurately', () => {
  const sipRes = applyUpdateCalculatorInputs(INITIAL_STRATEGY_STATE, {
    calculatorType: 'SIP',
    amount: 25000,
    rate: 14,
    tenure: 15,
  });
  assert.equal(sipRes.nextState.activeTab, 'sip');
  assert.equal(sipRes.nextState.sip.monthly, 25000);
  assert.equal(sipRes.nextState.sip.rate, 14);
  assert.equal(sipRes.nextState.sip.years, 15);
  assert.ok(sipRes.actionCard.changes.length >= 3);

  const stepRes = applyUpdateCalculatorInputs(sipRes.nextState, {
    calculatorType: 'sip',
    amount: 10000,
    stepUpMonthly: 2,
    tenure: 12,
  });
  assert.equal(stepRes.nextState.activeTab, 'stepup-sip');
  assert.equal(stepRes.nextState.stepupSip.stepUpFrequency, 'monthly');
  assert.equal(stepRes.nextState.stepupSip.stepUpPct, 2);
  assert.equal(stepRes.nextState.stepupSip.years, 12);
});

test('AI tool add_portfolio_stream injects SIP and FD streams and updates consolidated net worth', () => {
  const step1 = applyAddPortfolioStream(INITIAL_STRATEGY_STATE, {
    streamType: 'SIP',
    name: 'Core Equity SIP',
    amount: 5000,
    rate: 12,
    tenure: 5,
    replaceExisting: true,
  });
  assert.equal(step1.nextState.activeTab, 'portfolio');
  assert.equal(step1.nextState.portfolio.streams.length, 1);

  const step2 = applyAddPortfolioStream(step1.nextState, {
    streamType: 'FD',
    name: '5Y Bank FD',
    amount: 10000,
    rate: 7,
    tenure: 5,
  });
  assert.equal(step2.nextState.portfolio.streams.length, 2);
  const snap = computeStrategySnapshot(step2.nextState);
  assert.equal(snap.investedAmount, 5000 * 60 + 10000);
  assert.ok(snap.maturityAmount > snap.investedAmount);
});

test('AI tool set_inflation_rate updates inflation benchmark and real purchasing power', () => {
  const beforeSnap = computeStrategySnapshot(INITIAL_STRATEGY_STATE);
  const res = applySetInflationRate(INITIAL_STRATEGY_STATE, {
    inflationPercentage: 8,
    enabled: true,
  });
  assert.equal(res.nextState.inflationRate, 8);
  assert.equal(res.nextState.showInflation, true);
  assert.equal(res.nextState.fire.inflationPct, 8);

  const afterSnap = computeStrategySnapshot(res.nextState);
  assert.ok(
    Number(afterSnap.details['Real Purchasing Power']) <
      Number(beforeSnap.details['Real Purchasing Power'])
  );
});

test('Strategy Save/Load JSON round-trip preserves full state, streams, and inflation settings', () => {
  const modified = applySetInflationRate(
    applyAddPortfolioStream(INITIAL_STRATEGY_STATE, {
      streamType: 'lumpsum',
      name: 'Gold ETF',
      amount: 250000,
      rate: 9,
      tenure: 12,
    }).nextState,
    { inflationPercentage: 7.5, enabled: true }
  ).nextState;

  const record = createSavedStrategyRecord('Aggressive Wealth 2035', modified);
  assert.equal(record.name, 'Aggressive Wealth 2035');
  assert.equal(record.activeTab, 'portfolio');
  assert.ok(record.maturityPreview > 0);

  const json = JSON.stringify([record]);
  const parsed = parseStrategiesJson(json);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].name, 'Aggressive Wealth 2035');
  assert.equal(parsed[0].state.inflationRate, 7.5);
  assert.equal(parsed[0].state.portfolio.streams.length, INITIAL_STRATEGY_STATE.portfolio.streams.length + 1);
});
