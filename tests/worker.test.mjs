import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Worker example validates targets and handles CORS without embedded secrets', () => {
  const source = fs.readFileSync(new URL('../worker-example.js', import.meta.url), 'utf8');
  assert.match(source, /OPTIONS/);
  assert.match(source, /Access-Control-Allow-Origin/);
  assert.match(source, /\['http:', 'https:'\]/);
  assert.match(source, /target\.host === requestUrl\.host/);
  assert.doesNotMatch(source, /sk-[A-Za-z0-9_-]{8,}/);
  assert.doesNotMatch(source, /console\.(log|debug)/);
});

test('README documents the three proxy priorities and backup risk', () => {
  const readme = fs.readFileSync(new URL('../README.md', import.meta.url), 'utf8');
  assert.match(readme, /直连/);
  assert.match(readme, /Cloudflare Worker/);
  assert.match(readme, /公共代理/);
  assert.match(readme, /明文 API Key/);
  assert.match(readme, /GitHub Pages/);
});
