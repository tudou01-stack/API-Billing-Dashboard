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
