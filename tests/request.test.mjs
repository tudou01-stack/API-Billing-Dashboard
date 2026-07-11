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
