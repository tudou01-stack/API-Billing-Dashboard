# API Billing Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a secure, responsive, zero-dependency single-file dashboard that tracks balances and estimated spending across DeepSeek, OneAPI/NewAPI, and custom APIs.

**Architecture:** `index.html` contains the complete runtime, separated into pure data/request/business functions and DOM controllers. Node's built-in test runner evaluates the application script through an explicit test hook, while browser verification exercises the rendered UI through a local static server.

**Tech Stack:** HTML5, CSS3, native JavaScript, SVG, LocalStorage, Node.js built-in test runner, browser automation for visual verification.

## Global Constraints

- The only runtime deliverable is `index.html`; no framework, build tool, CDN, or backend is allowed.
- LocalStorage key is exactly `api_dashboard_v1` with schema version `1`.
- Requests time out after 10 seconds; bulk concurrency is exactly 3; auto-refresh has a minimum interval of 5 minutes.
- Keep at most 200 snapshots per channel and 1000 logs globally.
- User-controlled strings must render through safe DOM APIs, never by concatenation into `innerHTML`.
- API keys may be stored locally and exported only in warned full backups; they must never appear in logs or statistics exports.
- Preserve original currencies; convert only for display by the configured CNY/USD reference rate.
- Do not overwrite pre-existing user files, use `sudo`, or perform bulk deletion.

## File Map

- `index.html`: complete application, styling, pure functions, request adapters, persistence, and DOM UI.
- `tests/helpers/load-app.mjs`: extracts the application script and loads its test API in a VM sandbox.
- `tests/core.test.mjs`: schema, parsing, snapshots, aggregation, URL, redaction, and limits.
- `tests/request.test.mjs`: request classification, timeout, headers, proxy URL, and concurrency.
- `tests/ui-structure.test.mjs`: static accessibility/security structure checks.
- `worker-example.js`: standalone Cloudflare Worker pure-forwarding example.
- `README.md`: local usage, security model, proxy deployment, backup, and GitHub Pages instructions.

---

### Task 1: Test Harness, Schema, and Safe Application Shell

**Files:**
- Create: `tests/helpers/load-app.mjs`
- Create: `tests/core.test.mjs`
- Create: `index.html`

**Interfaces:**
- Produces: `createDefaultState()`, `normalizeState(input)`, `safeNumber(value)`, and `globalThis.__API_DASHBOARD_TEST__`.

- [ ] **Step 1: Write the failing schema tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadApp } from './helpers/load-app.mjs';

test('default state has stable version and settings', () => {
  const api = loadApp();
  const state = api.createDefaultState();
  assert.equal(state.version, 1);
  assert.equal(state.settings.autoRefreshIntervalMinutes, 30);
  assert.deepEqual(state.channels, []);
});

test('normalization enforces minimum refresh interval', () => {
  const api = loadApp();
  const state = api.normalizeState({ version: 1, settings: { autoRefreshIntervalMinutes: 1 } });
  assert.equal(state.settings.autoRefreshIntervalMinutes, 5);
});
```

- [ ] **Step 2: Run the test and verify failure**

Run: `node --test tests/core.test.mjs`

Expected: FAIL because `index.html` or the exported functions do not exist.

- [ ] **Step 3: Create the semantic shell and minimal implementation**

Create the document with a fixed security banner, header, four-view navigation, `<main>`, reusable `<dialog>` elements, and one non-module application script. Define immutable defaults, clone them with `structuredClone` fallback, clamp refresh intervals to at least 5, and export the pure API:

```js
const STORAGE_KEY = 'api_dashboard_v1';
const DEFAULT_STATE = Object.freeze({
  version: 1,
  settings: { lowBalanceThreshold: 10, dailySpendAlertThreshold: 20,
    autoRefreshEnabled: false, autoRefreshIntervalMinutes: 30,
    defaultCurrency: 'USD', cnyPerUsd: 7.2 },
  channels: [], balanceSnapshots: [], spendingRecords: [], logs: []
});
function createDefaultState() { return JSON.parse(JSON.stringify(DEFAULT_STATE)); }
function safeNumber(value) { const number = Number(value); return Number.isFinite(number) ? number : null; }
function normalizeState(input) {
  const base = createDefaultState();
  const source = input && typeof input === 'object' ? input : {};
  const interval = Math.max(5, safeNumber(source.settings?.autoRefreshIntervalMinutes) ?? 30);
  return { ...base, ...source, version: 1,
    settings: { ...base.settings, ...(source.settings || {}), autoRefreshIntervalMinutes: interval },
    channels: Array.isArray(source.channels) ? source.channels : [],
    balanceSnapshots: Array.isArray(source.balanceSnapshots) ? source.balanceSnapshots : [],
    spendingRecords: Array.isArray(source.spendingRecords) ? source.spendingRecords : [],
    logs: Array.isArray(source.logs) ? source.logs : [] };
}
globalThis.__API_DASHBOARD_TEST__ = { createDefaultState, normalizeState, safeNumber };
```

- [ ] **Step 4: Run tests and verify success**

Run: `node --test tests/core.test.mjs`

Expected: 2 tests pass.

- [ ] **Step 5: Commit**

Run: `git add index.html tests/helpers/load-app.mjs tests/core.test.mjs && git commit -m "feat: add dashboard shell and schema"`

### Task 2: Platform Adapters and Request Safety

**Files:**
- Modify: `index.html`
- Create: `tests/request.test.mjs`
- Modify: `tests/core.test.mjs`

**Interfaces:**
- Consumes: `safeNumber(value)`.
- Produces: `resolveJsonPath(data, path)`, `buildRequest(channel)`, `parsePlatformBalance(channel, payload)`, `fetchChannel(channel, fetchImpl, timeoutMs)`, and `runPool(items, worker, concurrency)`.

- [ ] **Step 1: Write failing adapter and concurrency tests**

Test exact DeepSeek USD preference, CNY fallback, `is_available=false`, OneAPI root URL plus `/api/user/self`, quota division by `quotaPerUsd`, `New-Api-User`, array JSON paths, 401 classification, malformed JSON, timeout, proxy `{url}` substitution, and a six-item task pool whose measured peak is 3.

```js
test('OneAPI adapter builds URL and converts quota', () => {
  const api = loadApp();
  const channel = { platformType: 'oneapi', endpoint: 'https://one.example/', apiKey: 'secret', quotaPerUsd: 500000, newApiUserId: '7', corsMode: 'direct' };
  assert.equal(api.buildRequest(channel).url, 'https://one.example/api/user/self');
  assert.equal(api.parsePlatformBalance(channel, { success: true, data: { quota: 250000 } }).balance, 0.5);
});
```

- [ ] **Step 2: Verify the new tests fail**

Run: `node --test tests/core.test.mjs tests/request.test.mjs`

Expected: FAIL with missing adapter/request functions.

- [ ] **Step 3: Implement adapters, errors, timeout, proxy, and task pool**

Use a typed `DashboardError` with `kind`, `httpStatus`, and human-safe message. `fetchChannel` must abort after `timeoutMs`, parse response text as JSON, throw `http` before platform parsing, and always clear its timer. `runPool` must use three shared runners consuming a monotonically increasing index and preserve result order.

- [ ] **Step 4: Run request tests**

Run: `node --test tests/core.test.mjs tests/request.test.mjs`

Expected: all adapter and request tests pass, with measured peak concurrency exactly 3.

- [ ] **Step 5: Commit**

Run: `git add index.html tests/core.test.mjs tests/request.test.mjs && git commit -m "feat: add secure channel adapters"`

### Task 3: Persistence, Logs, Snapshots, and Aggregation

**Files:**
- Modify: `index.html`
- Modify: `tests/core.test.mjs`

**Interfaces:**
- Consumes: `normalizeState(input)`, `safeNumber(value)`.
- Produces: `redactSecrets(value, secrets)`, `appendLog(state, entry)`, `recordSuccessfulBalance(state, channel, result, now)`, `convertCurrency(amount, from, to, rate)`, `summarize(state, now)`, `validateImport(input)`.

- [ ] **Step 1: Write failing business tests**

Cover first snapshot without spend, decreasing balance with `auto_diff`, increasing balance with recharge, failed request leaving snapshots untouched, per-channel 200-item pruning, global 1000-log pruning, token redaction, USD/CNY conversion in both directions, unknown currency exclusion, today/month aggregation, and invalid import rejection without mutation.

```js
test('balance decrease creates an automatic spend record', () => {
  const api = loadApp();
  const state = api.createDefaultState();
  const channel = { id: 'c1' };
  api.recordSuccessfulBalance(state, channel, { balance: 10, currency: 'USD' }, 1000);
  api.recordSuccessfulBalance(state, channel, { balance: 7.5, currency: 'USD' }, 2000);
  assert.equal(state.spendingRecords[0].amount, 2.5);
  assert.equal(state.spendingRecords[0].type, 'auto_diff');
});
```

- [ ] **Step 2: Verify business tests fail**

Run: `node --test tests/core.test.mjs`

Expected: FAIL with missing business functions.

- [ ] **Step 3: Implement repository and business rules**

Load with guarded JSON parsing, normalize before use, and save after every state mutation. Snapshot comparisons must find the latest prior successful snapshot of the same channel and currency. Redaction must replace the exact configured key, `Bearer` tokens, and `sk-` patterns before log storage.

- [ ] **Step 4: Run all unit tests**

Run: `node --test tests/*.test.mjs`

Expected: all tests pass.

- [ ] **Step 5: Commit**

Run: `git add index.html tests/core.test.mjs && git commit -m "feat: add local statistics engine"`

### Task 4: Responsive Overview and Channel Management

**Files:**
- Modify: `index.html`
- Create: `tests/ui-structure.test.mjs`

**Interfaces:**
- Consumes: data repository and aggregation functions from Tasks 1-3.
- Produces: `renderApp()`, `renderOverview()`, `renderChannelCard(channel)`, validated channel form handlers.

- [ ] **Step 1: Write failing structure and security tests**

Read `index.html` as text and assert the presence of the fixed safety banner, four navigation targets, accessible dialog labels, password API-key input, reduced-motion media query, 44px touch target rule, empty state, summary regions, and absence of user-field interpolation into `innerHTML` assignments.

- [ ] **Step 2: Verify UI structure tests fail**

Run: `node --test tests/ui-structure.test.mjs`

Expected: FAIL until the complete overview structure and styles exist.

- [ ] **Step 3: Implement visual system and channel CRUD**

Build a polished dark-neutral dashboard with warm status accents, responsive summary grid, channel card grid, clear empty state, visible focus rings, and mobile navigation. Add/edit form validates name length, URL, duplicate-name warning, API key, custom JSON path, proxy mode, quota ratio, per-channel threshold, and public-proxy acknowledgement. Render all user strings with `textContent`.

- [ ] **Step 4: Run unit and static UI tests**

Run: `node --test tests/*.test.mjs`

Expected: all tests pass.

- [ ] **Step 5: Commit**

Run: `git add index.html tests/ui-structure.test.mjs && git commit -m "feat: add responsive channel dashboard"`

### Task 5: Refresh, Connection Tests, Scheduling, and Alerts

**Files:**
- Modify: `index.html`
- Modify: `tests/request.test.mjs`

**Interfaces:**
- Consumes: `fetchChannel`, `runPool`, `recordSuccessfulBalance`, `appendLog`, and repository save.
- Produces: `refreshChannel(id, trigger)`, `testConnection(id)`, `refreshAll()`, `testAll()`, `syncAutoRefreshTimer()`.

- [ ] **Step 1: Add failing orchestration tests**

Use mock fetch functions for 200, 401, 403, 500, malformed JSON, rejected fetch, and aborted timeout. Assert refresh status and connection-test status remain independent; 401/403 become `invalid_key`; failures do not create snapshots; three auto failures cause later automatic skips; manual success resets the counter.

- [ ] **Step 2: Verify tests fail**

Run: `node --test tests/request.test.mjs`

Expected: FAIL with missing orchestration behavior.

- [ ] **Step 3: Implement independent operations and timers**

Render per-card refresh and test spinners separately. Log every result with category, level, duration, status, and redacted error. Use the shared three-worker pool for both bulk actions. Stop timers while `document.hidden`, restart when visible, and clear them on unload. Trigger low-balance and daily-spend in-page alerts without requesting notification permission.

- [ ] **Step 4: Run all automated tests**

Run: `node --test tests/*.test.mjs`

Expected: all tests pass.

- [ ] **Step 5: Commit**

Run: `git add index.html tests/request.test.mjs && git commit -m "feat: add refresh and connection workflows"`

### Task 6: Transactions, SVG Charts, Logs, Settings, and Export

**Files:**
- Modify: `index.html`
- Modify: `tests/core.test.mjs`

**Interfaces:**
- Consumes: aggregation, conversion, storage, logs, and rendering.
- Produces: manual transaction handlers, `buildTrendSeries(state, days, now)`, `buildChannelShares(state)`, SVG rendering, filters, CSV/JSON/text serializers.

- [ ] **Step 1: Write failing chart/export tests**

Assert seven-day and thirty-day buckets include zero days, channel shares sum to total spend, CSV quotes commas and quotes correctly, statistics export excludes `apiKey`, log export contains only redacted text, and full-backup export retains keys only after warning flow.

- [ ] **Step 2: Verify tests fail**

Run: `node --test tests/core.test.mjs`

Expected: FAIL with missing series and serializer functions.

- [ ] **Step 3: Implement the remaining views**

Add manual spend adjustment and recharge dialogs; 7/30-day SVG line chart; accessible SVG donut with textual legend; transaction filters and export; log filters, clear confirmation, JSON/text export; settings persistence; backup warning and import validation; statistics reset confirmation. Show meaningful empty chart and table states.

- [ ] **Step 4: Run all tests**

Run: `node --test tests/*.test.mjs`

Expected: all tests pass.

- [ ] **Step 5: Commit**

Run: `git add index.html tests/core.test.mjs && git commit -m "feat: add analytics logs and backups"`

### Task 7: Worker Example and User Documentation

**Files:**
- Create: `worker-example.js`
- Create: `README.md`
- Modify: `index.html`

**Interfaces:**
- Produces: a no-secret pure-forwarding Worker and complete end-user instructions.

- [ ] **Step 1: Add the Worker example**

Implement OPTIONS preflight, validate the `url` query parameter as HTTP(S), reject forwarding back to the Worker host, forward method/body/allowed headers, strip hop-by-hop headers, and add explicit CORS response headers. Do not log requests or hard-code secrets.

- [ ] **Step 2: Document operation and security boundaries**

Explain direct mode first, user-owned Worker second, public proxy last; local double-click use; channel types; custom JSON paths; backup key warning; difference between refresh and connection test; approximate-spending caveat; GitHub Pages deployment; and Worker deployment/configuration using `https://worker.example/?url={url}`.

- [ ] **Step 3: Add an in-app help panel**

Add concise instructions matching README and the Worker proxy template, ensuring public proxies remain disabled by default.

- [ ] **Step 4: Run automated tests and syntax checks**

Run: `node --test tests/*.test.mjs`

Run: `node --check worker-example.js`

Expected: all tests pass and Worker syntax is valid.

- [ ] **Step 5: Commit**

Run: `git add index.html worker-example.js README.md && git commit -m "docs: add secure deployment guide"`

### Task 8: Browser, Security, and Delivery Verification

**Files:**
- Modify only files whose verification reveals defects.

**Interfaces:**
- Verifies the complete user journey and repository delivery.

- [ ] **Step 1: Run deterministic checks**

Run: `node --test tests/*.test.mjs`

Run: `node --check worker-example.js`

Extract the application script and run `node --check` against a temporary copy without writing into the repository.

Expected: zero failures and zero syntax errors.

- [ ] **Step 2: Run local browser verification**

Start `python3 -m http.server 4173 --bind 127.0.0.1`. At 1440x1000 and 390x844, verify: empty state, navigation, add/edit form variants, API key reveal toggle, public proxy warning, malicious channel name rendered as text, summary cards, channel actions, manual record, 7/30-day chart switch, log filters, settings validation, export warnings, responsive layout, and no console errors.

- [ ] **Step 3: Audit secrets and dangerous rendering**

Run: `rg -n "apiKey.*innerHTML|innerHTML.*apiKey|console\\.(log|debug).*apiKey|localStorage\\.clear|document\\.write|eval\\(" index.html worker-example.js tests README.md`

Expected: no unsafe match. Review every remaining `innerHTML` use and confirm its input is developer-controlled markup only.

- [ ] **Step 4: Confirm repository state and remote**

Run: `git status --short --branch`

Run: `git remote -v`

Expected: branch `main`, clean working tree, origin `git@github.com:tudou01-stack/API-Billing-Dashboard.git`.

- [ ] **Step 5: Push delivery**

Run: `git push -u origin main`

Expected: `main` is created or updated successfully on GitHub.
