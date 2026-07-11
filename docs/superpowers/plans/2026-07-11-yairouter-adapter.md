# YaiRouter Adapter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a first-party YaiRouter / XAI adapter that requires only an API key and automatically reads the verified USD balance.

**Architecture:** Extend the existing platform dispatch in the single-file application. Reuse the common request, Bearer authorization, proxy, timeout, persistence, and refresh orchestration; only the platform URL construction, payload parsing, form metadata, and documentation change.

**Tech Stack:** HTML5, native JavaScript, Node.js built-in test runner, local browser QA.

## Global Constraints

- Runtime remains the zero-dependency single `index.html` file.
- The YaiRouter root is exactly `https://api.yairouter.com`; requests append `/dashboard/live`.
- The JSON balance field is exactly top-level `balance`, interpreted as USD.
- No real API key or account response may enter files, logs, screenshots, commits, or test fixtures.
- Existing OneAPI/NewAPI, DeepSeek, custom interface, CORS, Worker, and persistence behavior must remain unchanged.

---

### Task 1: YaiRouter Request and Balance Adapter

**Files:**
- Modify: `tests/request.test.mjs`
- Modify: `tests/core.test.mjs`
- Modify: `tests/ui-structure.test.mjs`
- Modify: `index.html`
- Modify: `README.md`

**Interfaces:**
- Consumes: `requireHttpUrl(value, label)`, `safeNumber(value)`, and the existing channel request pipeline.
- Produces: `buildRequest({ platformType: 'yairouter', ... })` targeting `/dashboard/live` and `parsePlatformBalance()` returning `{ balance, currency: 'USD', isAvailable: true, additionalBalances: [] }`.

- [ ] **Step 1: Write failing adapter tests**

Add a request assertion proving that even an untrusted imported endpoint cannot redirect the YaiRouter Bearer token:

```js
const request = loadApp().buildRequest({
  platformType: 'yairouter',
  endpoint: 'https://attacker.invalid/collect',
  apiKey: 'test-key',
  corsMode: 'direct'
});
assert.equal(request.url, 'https://api.yairouter.com/dashboard/live');
assert.equal(request.options.headers.Authorization, 'Bearer test-key');
```

Add parser assertions for numeric and numeric-string balances, USD currency, and rejection of missing/non-numeric balance. Add a static UI assertion for the `yairouter` option and visible label.

- [ ] **Step 2: Verify RED**

Run: `node --test tests/request.test.mjs tests/core.test.mjs tests/ui-structure.test.mjs`

Expected: FAIL because `yairouter` currently falls through to the custom URL/parser behavior and the platform option does not exist.

- [ ] **Step 3: Implement the minimal adapter and UI behavior**

Add the platform option and dispatch branches. When selected, lock the endpoint input to `https://api.yairouter.com`, explain that `/dashboard/live` and `balance` are automatic, and keep unrelated conditional fields hidden. Save the root endpoint in the channel record and label channel cards as `YaiRouter / XAI`.

- [ ] **Step 4: Document user operation**

Update README support and direct-use sections to state that YaiRouter only needs the root address and API Key and that its balance endpoint/path are automatic.

- [ ] **Step 5: Verify GREEN and regressions**

Run: `node --test tests/*.test.mjs`

Expected: all tests pass with no warnings or failures.

- [ ] **Step 6: Verify runtime and security**

Run syntax checks for the extracted app script and Worker, scan tracked files for credential patterns, then exercise the add-channel dialog at desktop and mobile sizes. Confirm page identity, meaningful content, no error overlay, no relevant console errors, the YaiRouter option interaction, fixed endpoint, hidden JSON-path fields, and screenshot evidence.

- [ ] **Step 7: Commit and push**

Stage only the design, plan, source, tests, and README changes; commit with `feat: add YaiRouter balance adapter`; push `main` to `origin`; confirm the remote branch points to the new commit.
