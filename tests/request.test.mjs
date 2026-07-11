import test from 'node:test';
import assert from 'node:assert/strict';
import { loadApp } from './helpers/load-app.mjs';

test('OneAPI request uses root endpoint and optional user header', () => {
  const request = loadApp().buildRequest({
    platformType: 'oneapi', endpoint: 'https://one.example/', apiKey: 'secret',
    newApiUserId: '7', corsMode: 'direct'
  });
  assert.equal(request.url, 'https://one.example/api/user/self');
  assert.equal(request.options.headers.Authorization, 'Bearer secret');
  assert.equal(request.options.headers['New-Api-User'], '7');
});

test('YaiRouter request always uses the official live dashboard endpoint', () => {
  const request = loadApp().buildRequest({
    platformType: 'yairouter', endpoint: 'https://attacker.invalid/collect',
    apiKey: 'test-key', corsMode: 'direct'
  });
  assert.equal(request.url, 'https://api.yairouter.com/dashboard/live');
  assert.equal(request.targetUrl, 'https://api.yairouter.com/dashboard/live');
  assert.equal(request.options.headers.Authorization, 'Bearer test-key');
  assert.equal(request.options.headers['New-Api-User'], undefined);
});

test('proxy URL template receives an encoded target URL', () => {
  const request = loadApp().buildRequest({
    platformType: 'custom', endpoint: 'https://api.example/balance?a=1', apiKey: 'key',
    customJsonPath: 'balance', corsMode: 'worker',
    proxyUrl: 'https://worker.example/?url={url}'
  });
  assert.equal(request.url, 'https://worker.example/?url=https%3A%2F%2Fapi.example%2Fbalance%3Fa%3D1');
});

test('HTTP 401 is classified without attempting balance parsing', async () => {
  const api = loadApp();
  const response = { ok: false, status: 401, text: async () => '{"message":"bad key"}' };
  await assert.rejects(
    api.fetchChannel({ platformType: 'deepseek', apiKey: 'bad', corsMode: 'direct' }, async () => response, 100),
    error => error.kind === 'http' && error.httpStatus === 401
  );
});

test('malformed JSON is classified as a parse failure', async () => {
  const api = loadApp();
  const response = { ok: true, status: 200, text: async () => '<html>no json</html>' };
  await assert.rejects(
    api.fetchChannel({ platformType: 'deepseek', apiKey: 'key', corsMode: 'direct' }, async () => response, 100),
    error => error.kind === 'parse'
  );
});

test('task pool never exceeds the requested concurrency and preserves order', async () => {
  const api = loadApp();
  let active = 0;
  let peak = 0;
  const results = await api.runPool([0, 1, 2, 3, 4, 5], async value => {
    active += 1;
    peak = Math.max(peak, active);
    await new Promise(resolve => setTimeout(resolve, 5));
    active -= 1;
    return value * 2;
  }, 3);
  assert.equal(peak, 3);
  assert.deepEqual(Array.from(results, item => item.value), [0, 2, 4, 6, 8, 10]);
});

test('failed refresh increments failures without creating a snapshot', async () => {
  const api = loadApp();
  const state = api.createDefaultState();
  const channel = { id: 'c1', name: 'Main', platformType: 'deepseek', apiKey: 'bad', corsMode: 'direct', status: 'idle', consecutiveFailCount: 0 };
  state.channels.push(channel);
  const response = { ok: false, status: 500, text: async () => '{"message":"server error"}' };
  const result = await api.performRefresh(state, channel, async () => response, 1000);
  assert.equal(result.ok, false);
  assert.equal(channel.consecutiveFailCount, 1);
  assert.equal(channel.status, 'error');
  assert.equal(state.balanceSnapshots.length, 0);
  assert.equal(state.logs.at(-1).category, 'balance_refresh');
});

test('connection test maps 401 to invalid key without replacing refresh status', async () => {
  const api = loadApp();
  const state = api.createDefaultState();
  const channel = { id: 'c1', name: 'Main', platformType: 'deepseek', apiKey: 'bad', corsMode: 'direct', status: 'ok', lastError: '' };
  state.channels.push(channel);
  const response = { ok: false, status: 401, text: async () => '{"message":"bad key"}' };
  const result = await api.performConnectionTest(state, channel, async () => response, 1000);
  assert.equal(result.ok, false);
  assert.equal(channel.lastTestResult, 'invalid_key');
  assert.equal(channel.status, 'ok');
  assert.equal(state.balanceSnapshots.length, 0);
});

test('successful refresh records balance and resets failure counter', async () => {
  const api = loadApp();
  const state = api.createDefaultState();
  const channel = { id: 'c1', name: 'Main', platformType: 'deepseek', apiKey: 'good', corsMode: 'direct', consecutiveFailCount: 3 };
  state.channels.push(channel);
  const response = { ok: true, status: 200, text: async () => JSON.stringify({ is_available: true, balance_infos: [{ currency: 'USD', total_balance: '9.50' }] }) };
  const result = await api.performRefresh(state, channel, async () => response, 1000);
  assert.equal(result.ok, true);
  assert.equal(channel.consecutiveFailCount, 0);
  assert.equal(channel.lastBalance, 9.5);
  assert.equal(api.shouldSkipAutoRefresh({ consecutiveFailCount: 3 }), true);
});
