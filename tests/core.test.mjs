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
