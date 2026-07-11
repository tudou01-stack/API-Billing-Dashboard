import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export function loadApp(overrides = {}) {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const match = html.match(/<script id="app-script">([\s\S]*?)<\/script>/);
  if (!match) throw new Error('app-script not found');
  const storage = new Map();
  const context = {
    console,
    setTimeout,
    clearTimeout,
    AbortController,
    DOMException,
    URL,
    URLSearchParams,
    structuredClone,
    crypto: { randomUUID: () => '00000000-0000-4000-8000-000000000000' },
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: key => storage.delete(key)
    },
    document: {
      readyState: 'loading',
      addEventListener() {},
      querySelector() { return null; },
      querySelectorAll() { return []; },
      getElementById() { return null; },
      hidden: false
    },
    window: { addEventListener() {}, matchMedia: () => ({ matches: false }) },
    navigator: {},
    Blob: class {},
    ...overrides
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(match[1], context, { filename: 'index.html' });
  return context.__API_DASHBOARD_TEST__;
}
