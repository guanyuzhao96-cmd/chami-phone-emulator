import { Window } from 'happy-dom';
import jqueryFactory from 'jquery';
import 'fake-indexeddb/auto';

const window = new Window({ url: 'http://localhost:8000/' });
const document = window.document;
Object.assign(globalThis, {
  window,
  document,
  navigator: window.navigator,
  localStorage: window.localStorage,
  sessionStorage: window.sessionStorage,
  MutationObserver: window.MutationObserver,
  ResizeObserver: window.ResizeObserver,
  XMLHttpRequest: window.XMLHttpRequest,
  WebSocket: window.WebSocket,
  HTMLElement: window.HTMLElement,
  HTMLInputElement: window.HTMLInputElement,
  CustomEvent: window.CustomEvent,
  Event: window.Event,
  Node: window.Node,
  indexedDB: globalThis.indexedDB,
  IDBKeyRange: globalThis.IDBKeyRange,
});
const $ = jqueryFactory(window);
globalThis.$ = globalThis.jQuery = window.$ = window.jQuery = $;
window.toastr = globalThis.toastr = { success() {}, info() {}, warning() {}, error() {} };
window.SillyTavern = globalThis.SillyTavern = {
  getContext: () => ({
    name1: 'Tester', name2: 'Test Character', chatId: 'audit-chat',
    characterId: 0, characters: [{ name: 'Test Character' }], chat: [],
    eventSource: { on() {}, off() {}, emit() {} },
  }),
};
window.TavernHelper = globalThis.TavernHelper = {
  async generateRaw() { return '{}'; },
  async generate() { return '{}'; },
};

const report = [];
const emit = (...parts) => report.push(parts.map(part => (
  typeof part === 'string' ? part : JSON.stringify(part, null, 2)
)).join(' '));

function describe(value, depth = 0, seen = new Set()) {
  if (value === null) return null;
  if (value === undefined) return '[undefined]';
  if (typeof value === 'function') {
    return {
      kind: 'function',
      name: value.name,
      arity: value.length,
      prototype: value.prototype
        ? Object.getOwnPropertyNames(value.prototype).filter(name => name !== 'constructor')
        : [],
      staticKeys: Object.getOwnPropertyNames(value).filter(name => !['length', 'name', 'prototype', 'arguments', 'caller'].includes(name)),
    };
  }
  if (typeof value !== 'object') {
    return typeof value === 'string' && value.length > 1000 ? `${value.slice(0, 1000)}…` : value;
  }
  if (seen.has(value)) return '[circular]';
  if (depth > 5) return `[${Array.isArray(value) ? 'array' : 'object'}:${Object.keys(value).length}]`;
  seen.add(value);
  if (Array.isArray(value)) return value.slice(0, 30).map(item => describe(item, depth + 1, seen));
  const out = {};
  for (const key of Object.keys(value).slice(0, 120)) out[key] = describe(value[key], depth + 1, seen);
  return out;
}

async function inspectModule(label, specifier) {
  emit(`\n=== ${label} ===`);
  try {
    const mod = await import(specifier);
    emit('EXPORTS', Object.keys(mod));
    for (const [name, value] of Object.entries(mod)) emit(`EXPORT ${name}`, describe(value));
    return mod;
  } catch (error) {
    emit('IMPORT_FAILED', error?.stack || String(error));
    return null;
  }
}

const preset = await inspectModule('PHONE PRESET', '../Phone_emulator/resources/preset/phone-preset.js');
const config = await inspectModule('PHONE CONFIG', '../Phone_emulator/config.js');
const apiConfig = await inspectModule('API CONFIG SERVICE', '../Phone_emulator/services/api-config.js');
const enhancer = await inspectModule('SYSTEM PROMPT ENHANCER', '../Phone_emulator/utils/system-prompt-enhancer.js');
const ai = await inspectModule('AI REQUEST', '../Phone_emulator/api/ai-request.js');
const settings = await inspectModule('PHONE SETTINGS UI', '../Phone_emulator/ui/phone-settings.js');

if (ai) {
  for (const name of ['getDefaultGenerator', 'getOptionalGenerator', 'initializeGenerator']) {
    const fn = ai[name];
    if (typeof fn !== 'function') continue;
    emit(`\nCALL ${name} arity=${fn.length}`);
    for (const args of [[], ['characterProfile'], ['chat'], ['moments']]) {
      try {
        const result = await fn(...args);
        emit('ARGS', args, 'RESULT', describe(result));
      } catch (error) {
        emit('ARGS', args, 'ERROR', error?.stack || error?.message || String(error));
      }
    }
  }
}

emit('\n=== LOCAL STORAGE ===');
for (let i = 0; i < localStorage.length; i += 1) {
  const key = localStorage.key(i);
  emit(key, localStorage.getItem(key)?.slice(0, 4000));
}

emit('\n=== GLOBAL CANDIDATES ===');
for (const key of Object.keys(window).filter(key => /preset|generator|phone|api/i.test(key)).slice(0, 100)) {
  emit(key, describe(window[key]));
}

emit('\nAUDIT_COMPLETE');
process.stdout.write(`${report.join('\n')}\n`);
window.close();
