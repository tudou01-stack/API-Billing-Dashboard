import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('application exposes required navigation and safety structure', () => {
  for (const label of ['所有密钥与数据仅保存在当前浏览器中', '总览', '流水与趋势', '日志', '设置']) {
    assert.match(html, new RegExp(label));
  }
  assert.match(html, /role="note"/);
  assert.match(html, /aria-live="polite"/);
});

test('channel form uses accessible native dialog and masked API key', () => {
  assert.match(html, /<dialog[^>]+id="channel-dialog"/);
  assert.match(html, /<form[^>]+id="channel-form"/);
  assert.match(html, /<label[^>]+for="channel-api-key"/);
  assert.match(html, /id="channel-api-key"[^>]+type="password"/);
  assert.match(html, /id="channel-custom-path"/);
  assert.match(html, /id="channel-user-id"/);
  assert.match(html, /id="channel-quota-ratio"/);
});

test('responsive and motion accessibility rules are present', () => {
  assert.match(html, /@media\(max-width:620px\)/);
  assert.match(html, /prefers-reduced-motion:reduce/);
  assert.match(html, /min-height:44px/);
  assert.match(html, /:focus-visible/);
});

test('empty state and dashboard summary are real UI regions', () => {
  assert.match(html, /id="summary-band"/);
  assert.match(html, /id="channel-grid"/);
  assert.match(html, /暂无渠道/);
  assert.match(html, /添加第一个 API 渠道/);
});

test('production script never assigns dynamic content through innerHTML', () => {
  assert.doesNotMatch(html, /\.innerHTML\s*=/);
  assert.doesNotMatch(html, /document\.write\s*\(/);
  assert.doesNotMatch(html, /\beval\s*\(/);
});
