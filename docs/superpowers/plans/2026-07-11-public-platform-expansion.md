# Public Platform Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the built-in platform selector from four to eight verified options while keeping every fixed provider safe and zero-configuration.

**Architecture:** Add a fixed-endpoint registry for first-party adapters, retain the existing request/error/persistence pipeline, and add narrowly scoped parser branches for Moonshot, SiliconFlow regions, and OpenRouter key quota. Group the native select options without adding dependencies or changing the storage schema.

**Tech Stack:** HTML5, native JavaScript, Node.js built-in test runner, in-app browser QA.

## Global Constraints

- Runtime remains the single zero-dependency `index.html`.
- Fixed providers must ignore imported `endpoint` values.
- API keys remain in Bearer headers and never enter URLs, logs, fixtures, screenshots, or Git.
- Existing DeepSeek, YaiRouter, OneAPI/NewAPI, custom, proxy, refresh, snapshot, and aggregation behavior must remain compatible.
- Kimi and SiliconFlow China use CNY; SiliconFlow Global and OpenRouter use USD.

---

### Task 1: Request and Parser Adapters

**Files:**
- Modify: `tests/request.test.mjs`
- Modify: `tests/core.test.mjs`
- Modify: `index.html`

**Interfaces:**
- Produces fixed request targets for `moonshot`, `siliconflow_cn`, `siliconflow_global`, and `openrouter`.
- Produces normalized balance results through the existing `parsePlatformBalance(channel, payload)` interface.

- [ ] **Step 1: Add failing fixed-endpoint tests**

Use an attacker-controlled persisted endpoint for every new platform and assert that `buildRequest()` still returns the corresponding official URL and keeps the Key in the Bearer header.

- [ ] **Step 2: Add failing parser tests**

Cover Kimi `data.available_balance`, SiliconFlow `data.totalBalance` in both regions, OpenRouter `data.limit_remaining`, numeric strings, platform failure status, missing fields, and OpenRouter unlimited/null quota.

- [ ] **Step 3: Verify RED**

Run: `node --test tests/request.test.mjs tests/core.test.mjs`

Expected: new tests fail because the platform branches do not exist.

- [ ] **Step 4: Implement minimal adapters**

Add a fixed endpoint map used by `buildRequest()` and the form. Add parser branches that return the existing `{ balance, currency, isAvailable, additionalBalances }` shape and explicit platform-specific errors.

- [ ] **Step 5: Verify GREEN**

Run: `node --test tests/request.test.mjs tests/core.test.mjs`

Expected: all focused tests pass.

### Task 2: Grouped Platform Form and Documentation

**Files:**
- Modify: `tests/ui-structure.test.mjs`
- Modify: `index.html`
- Modify: `README.md`

**Interfaces:**
- Produces three `<optgroup>` sections and eight platform options.
- Reuses the fixed endpoint map for disabled endpoint display and saved channel values.

- [ ] **Step 1: Add failing UI structure tests**

Assert all three group labels, all four new option values, and platform-specific help text are present.

- [ ] **Step 2: Verify UI RED**

Run: `node --test tests/ui-structure.test.mjs`

Expected: FAIL because the grouped options are absent.

- [ ] **Step 3: Implement grouped options and form state**

Group options, lock fixed endpoints, show provider-specific endpoint/field/currency help, and preserve OneAPI/custom conditional fields.

- [ ] **Step 4: Update README**

Document the eight options, exact meaning of OpenRouter Key quota, fixed adapters, official source links, and the reason admin/cloud-billing platforms remain custom-only.

- [ ] **Step 5: Full verification**

Run all Node tests, app and Worker syntax checks, diff checks, secret scans, then verify desktop and mobile rendering, dropdown groups, endpoint switching, hidden conditional fields, and console health in the in-app browser.

- [ ] **Step 6: Commit and push**

Commit the design, plan, source, tests, and README; push `main`; verify the remote commit matches local HEAD.

