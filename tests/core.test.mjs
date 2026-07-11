import test from 'node:test';
import assert from 'node:assert/strict';
import { loadApp } from './helpers/load-app.mjs';

test('default state has stable version and settings', () => {
  const state = loadApp().createDefaultState();
  assert.equal(state.version, 1);
  assert.equal(state.settings.autoRefreshIntervalMinutes, 30);
  assert.equal(state.settings.defaultCurrency, 'USD');
  assert.deepEqual(Array.from(state.channels), []);
});

test('normalization enforces minimum refresh interval and array fields', () => {
  const state = loadApp().normalizeState({
    version: 1,
    settings: { autoRefreshIntervalMinutes: 1 },
    channels: 'invalid'
  });
  assert.equal(state.settings.autoRefreshIntervalMinutes, 5);
  assert.deepEqual(Array.from(state.channels), []);
  assert.deepEqual(Array.from(state.logs), []);
});

test('DeepSeek parser prefers USD and preserves availability metadata', () => {
  const api = loadApp();
  const result = api.parsePlatformBalance(
    { platformType: 'deepseek' },
    { is_available: false, balance_infos: [
      { currency: 'CNY', total_balance: '50.00' },
      { currency: 'USD', total_balance: '7.25' }
    ] }
  );
  assert.equal(result.balance, 7.25);
  assert.equal(result.currency, 'USD');
  assert.equal(result.isAvailable, false);
  assert.deepEqual(Array.from(result.additionalBalances, item => ({ ...item })), [{ currency: 'CNY', balance: 50 }]);
});

test('OneAPI parser converts quota by configured ratio', () => {
  const result = loadApp().parsePlatformBalance(
    { platformType: 'oneapi', quotaPerUsd: 500000 },
    { success: true, data: { quota: 250000 } }
  );
  assert.equal(result.balance, 0.5);
  assert.equal(result.currency, 'USD');
});

test('custom parser resolves object and array JSON path', () => {
  const api = loadApp();
  const payload = { data: { balances: [{ total: '12.40' }] } };
  assert.equal(api.resolveJsonPath(payload, 'data.balances[0].total'), '12.40');
  assert.equal(api.parsePlatformBalance(
    { platformType: 'custom', customJsonPath: 'data.balances[0].total', customCurrency: 'CNY' },
    payload
  ).balance, 12.4);
});

test('first balance creates only a snapshot and a decrease creates spend', () => {
  const api = loadApp();
  const state = api.createDefaultState();
  const channel = { id: 'c1', name: 'Main' };
  state.channels.push(channel);
  api.recordSuccessfulBalance(state, channel, { balance: 10, currency: 'USD', isAvailable: true, additionalBalances: [] }, 1000);
  assert.equal(state.balanceSnapshots.length, 1);
  assert.equal(state.spendingRecords.length, 0);
  api.recordSuccessfulBalance(state, channel, { balance: 7.5, currency: 'USD', isAvailable: true, additionalBalances: [] }, 2000);
  assert.equal(state.spendingRecords[0].amount, 2.5);
  assert.equal(state.spendingRecords[0].type, 'auto_diff');
});

test('balance increase is recorded as recharge and excluded from spending', () => {
  const api = loadApp();
  const state = api.createDefaultState();
  const channel = { id: 'c1', name: 'Main' };
  state.channels.push(channel);
  api.recordSuccessfulBalance(state, channel, { balance: 5, currency: 'CNY', isAvailable: true, additionalBalances: [] }, 1000);
  api.recordSuccessfulBalance(state, channel, { balance: 8, currency: 'CNY', isAvailable: true, additionalBalances: [] }, 2000);
  assert.equal(state.spendingRecords[0].type, 'manual_recharge');
  assert.equal(state.spendingRecords[0].amount, 3);
  assert.equal(api.summarize(state, 2000).totalSpend, 0);
});

test('snapshot history keeps the latest 200 entries per channel', () => {
  const api = loadApp();
  const state = api.createDefaultState();
  const channel = { id: 'c1', name: 'Main' };
  state.channels.push(channel);
  for (let index = 0; index < 205; index += 1) {
    api.recordSuccessfulBalance(state, channel, { balance: 300 - index, currency: 'USD', isAvailable: true, additionalBalances: [] }, index + 1);
  }
  assert.equal(state.balanceSnapshots.length, 200);
  assert.equal(state.balanceSnapshots[0].timestamp, 6);
});

test('logs are redacted and capped at 1000 newest entries', () => {
  const api = loadApp();
  const state = api.createDefaultState();
  for (let index = 0; index < 1005; index += 1) {
    api.appendLog(state, {
      timestamp: index,
      level: 'info', category: 'balance_refresh', channelId: 'c1',
      message: `Bearer secret-token sk-sensitive-${index}`,
      detail: { errorText: 'my-exact-secret' }
    }, ['my-exact-secret']);
  }
  assert.equal(state.logs.length, 1000);
  assert.equal(state.logs[0].timestamp, 5);
  assert.equal(JSON.stringify(state.logs).includes('secret-token'), false);
  assert.equal(JSON.stringify(state.logs).includes('my-exact-secret'), false);
});

test('currency conversion is reversible and unknown currencies are excluded', () => {
  const api = loadApp();
  assert.equal(api.convertCurrency(10, 'USD', 'CNY', 7.2), 72);
  assert.equal(api.convertCurrency(72, 'CNY', 'USD', 7.2), 10);
  assert.equal(api.convertCurrency(10, 'EUR', 'USD', 7.2), null);
});

test('summary separates today and month spend in target currency', () => {
  const api = loadApp();
  const now = new Date(2026, 6, 11, 15, 0).getTime();
  const yesterday = new Date(2026, 6, 10, 15, 0).getTime();
  const state = api.createDefaultState();
  state.settings.defaultCurrency = 'USD';
  state.settings.cnyPerUsd = 7.2;
  state.spendingRecords.push(
    { id: '1', channelId: 'a', type: 'auto_diff', amount: 7.2, currency: 'CNY', timestamp: now },
    { id: '2', channelId: 'a', type: 'manual_adjust', amount: 2, currency: 'USD', timestamp: yesterday },
    { id: '3', channelId: 'a', type: 'manual_recharge', amount: 50, currency: 'USD', timestamp: now }
  );
  const summary = api.summarize(state, now);
  assert.equal(summary.todaySpend, 1);
  assert.equal(summary.monthSpend, 3);
  assert.equal(summary.totalSpend, 3);
});

test('invalid import is rejected and never mutates the input state', () => {
  const api = loadApp();
  const before = api.createDefaultState();
  before.settings.lowBalanceThreshold = 99;
  assert.throws(() => api.validateImport({ version: 2, channels: [] }), /版本/);
  assert.equal(before.settings.lowBalanceThreshold, 99);
});
