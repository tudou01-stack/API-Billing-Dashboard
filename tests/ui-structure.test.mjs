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

test('channel form offers first-party YaiRouter configuration', () => {
  assert.match(html, /<option value="yairouter">YaiRouter \/ XAI<\/option>/);
  assert.match(html, /YaiRouter.*dashboard\/live.*balance/s);
});

test('channel form groups eight verified platform options', () => {
  for (const group of ['官方模型平台', '模型与聚合平台', '通用接入']) {
    assert.match(html, new RegExp(`<optgroup label="${group}">`));
  }
  for (const [value, label] of [
    ['moonshot', 'Kimi / Moonshot 官方'],
    ['siliconflow_cn', 'SiliconFlow 中国站'],
    ['siliconflow_global', 'SiliconFlow 国际站'],
    ['openrouter', 'OpenRouter（Key 额度）']
  ]) {
    assert.match(html, new RegExp(`<option value="${value}">${label}</option>`));
  }
  assert.equal((html.match(/<option value="(?:deepseek|moonshot|siliconflow_cn|siliconflow_global|yairouter|openrouter|oneapi|custom)">/g) || []).length, 8);
  assert.match(html, /OpenRouter.*limit_remaining.*Key.*额度/s);
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

test('in-app help explains refresh semantics and Worker URL template', () => {
  assert.match(html, /刷新余额.*写入余额快照/s);
  assert.match(html, /测试连接.*不会写入快照/s);
  assert.match(html, /\?url=\{url\}/);
});

test('brand and primary navigation use a consistent inline SVG icon family', () => {
  assert.match(html, /class="brand-mark"/);
  assert.equal((html.match(/class="nav-icon"/g) || []).length, 4);
});
