import { Window } from 'happy-dom';
import jqueryFactory from 'jquery';
import 'fake-indexeddb/auto';

const window = new Window({ url: 'http://localhost:8000/' });
const document = window.document;
Object.assign(globalThis, {
  window, document, navigator: window.navigator,
  localStorage: window.localStorage, sessionStorage: window.sessionStorage,
  MutationObserver: window.MutationObserver, ResizeObserver: window.ResizeObserver,
  XMLHttpRequest: window.XMLHttpRequest, WebSocket: window.WebSocket,
  HTMLMediaElement: window.HTMLMediaElement, HTMLAudioElement: window.HTMLAudioElement,
  HTMLImageElement: window.HTMLImageElement, HTMLVideoElement: window.HTMLVideoElement,
  HTMLCanvasElement: window.HTMLCanvasElement, Audio: window.Audio, Image: window.Image,
  File: window.File, FileReader: window.FileReader, Blob: window.Blob, URL: window.URL,
  HTMLElement: window.HTMLElement, HTMLInputElement: window.HTMLInputElement,
  CustomEvent: window.CustomEvent, Event: window.Event, Node: window.Node,
  indexedDB: globalThis.indexedDB, IDBKeyRange: globalThis.IDBKeyRange,
});
const $ = jqueryFactory(window);
globalThis.$ = globalThis.jQuery = window.$ = window.jQuery = $;
const stContext = {
  name1: 'Tester', name2: 'Test Character', chatId: 'audit-chat', characterId: 0,
  characters: [{ name: 'Test Character' }], chat: [],
  eventSource: { on() {}, off() {}, emit() {} },
};
window.SillyTavern = globalThis.SillyTavern = {
  getContext: () => stContext,
  getCurrentChatId: () => 'audit-chat',
};
window.toastr = globalThis.toastr = { success() {}, info() {}, warning() {}, error() {} };
window.callPopup = globalThis.callPopup = async () => null;
window.fetch = globalThis.fetch = async () => ({ ok: true, json: async () => ({}), text: async () => '', blob: async () => new Blob() });
window.TavernHelper = globalThis.TavernHelper = {
  async generateRaw() { return '{}'; }, async generate() { return '{}'; },
  getCharWorldbookNames() { return { primary: null, additional: [] }; },
  async getWorldbook() { return []; }, async updateWorldbookWith(_name, updater) { return updater([]); },
};
window.__TSP_IMAGE_TEST_API__ = { GeneratorManager: { async generate() { return { url: 'https://example.test/x.png' }; } } };

const report = [];
const emit = (...items) => report.push(items.map(item => typeof item === 'string' ? item : JSON.stringify(item, null, 2)).join(' '));
function safeKeys(value) {
  try { return Object.keys(value || {}); } catch { return []; }
}
function protoMethods(value) {
  try { return Object.getOwnPropertyNames(Object.getPrototypeOf(value) || {}).filter(k => k !== 'constructor'); } catch { return []; }
}
function summary(value) {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object' && typeof value !== 'function') return value;
  return { type: value.constructor?.name || typeof value, keys: safeKeys(value), methods: protoMethods(value) };
}
function scan(root, maxDepth = 5) {
  const found = [];
  const queue = [{ value: root, path: 'root', depth: 0 }];
  const seen = new Set();
  while (queue.length) {
    const { value, path, depth } = queue.shift();
    if (!value || (typeof value !== 'object' && typeof value !== 'function') || seen.has(value)) continue;
    seen.add(value);
    const methods = new Set(protoMethods(value));
    const keys = safeKeys(value);
    const interesting = ['request','getSettings','updateSettings','saveSettings','renderFeaturePresetView','sendChatRequest','_getFeatureConfig','_buildRequest'];
    if (interesting.some(name => methods.has(name) || typeof value[name] === 'function')) {
      found.push({ path, ...summary(value), interesting: interesting.filter(name => methods.has(name) || typeof value[name] === 'function') });
    }
    if (depth >= maxDepth || value instanceof window.Node) continue;
    for (const key of keys.slice(0, 100)) {
      try {
        const child = value[key];
        if (child && (typeof child === 'object' || typeof child === 'function')) queue.push({ value: child, path: `${path}.${key}`, depth: depth + 1 });
      } catch {}
    }
  }
  return found;
}
async function waitFor(predicate, timeout = 15000) {
  const end = Date.now() + timeout;
  while (!predicate() && Date.now() < end) await new Promise(resolve => setTimeout(resolve, 50));
  if (!predicate()) throw new Error('timeout');
}

await import('../phone-plugin.js');
await waitFor(() => window.ChamiPhoneEmulator?.instance && document.querySelector('[data-character-profile-app]'));
const plugin = window.ChamiPhoneEmulator;
emit('PLUGIN', summary(plugin));
emit('INSTANCE', summary(plugin.instance));
emit('CONTEXT', summary(plugin.context));
emit('SCAN_INSTANCE', scan(plugin.instance));
emit('SCAN_CONTEXT', scan(plugin.context));

const aiModule = await import('../Phone_emulator/api/ai-request.js');
emit('AI_EXPORTS', Object.keys(aiModule));
if (aiModule.PhoneAIRequest && plugin.context) {
  try {
    const ai = new aiModule.PhoneAIRequest(plugin.context);
    emit('NEW_AI', summary(ai));
    if (typeof ai.init === 'function') await ai.init();
    emit('NEW_AI_AFTER_INIT', summary(ai));
    if (typeof ai.getSettings === 'function') emit('AI_SETTINGS', await ai.getSettings());
    for (const key of safeKeys(ai)) {
      if (/setting|preset|config|api/i.test(key)) {
        try { emit(`AI_FIELD_${key}`, ai[key]); } catch {}
      }
    }
  } catch (error) {
    emit('NEW_AI_ERROR', error?.stack || String(error));
  }
}

plugin.open();
await waitFor(() => document.querySelector('.tsp-phone-app-grid'));
const settingsIcon = document.querySelector('[data-app="settings"], [data-app="setting"], [data-app="phone-settings"]');
emit('HOME_APPS', [...document.querySelectorAll('[data-app]')].map(node => ({ app: node.getAttribute('data-app'), text: node.textContent.trim() })));
if (settingsIcon) {
  settingsIcon.click();
  await new Promise(resolve => setTimeout(resolve, 300));
  emit('SETTINGS_TEXT', document.querySelector('.tsp-phone-screen')?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 5000));
  emit('SETTINGS_BUTTONS', [...document.querySelectorAll('.tsp-phone-screen button, .tsp-phone-screen [data-action]')].map(node => ({ text: node.textContent.trim(), action: node.getAttribute('data-action'), cls: node.className })).slice(0, 100));
  const presetControl = [...document.querySelectorAll('.tsp-phone-screen button, .tsp-phone-screen [data-action], .tsp-phone-screen .setting-item')].find(node => /预设/.test(node.textContent));
  if (presetControl) {
    presetControl.click();
    await new Promise(resolve => setTimeout(resolve, 300));
    emit('PRESET_VIEW_TEXT', document.querySelector('.tsp-phone-screen')?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 10000));
    emit('PRESET_SELECTS', [...document.querySelectorAll('.tsp-phone-screen select')].map(select => ({ id: select.id, name: select.name, value: select.value, options: [...select.options].map(o => ({ value: o.value, text: o.textContent })) })));
    emit('PRESET_INPUTS', [...document.querySelectorAll('.tsp-phone-screen input, .tsp-phone-screen textarea')].map(input => ({ id: input.id, name: input.name, type: input.type, value: String(input.value).slice(0, 1000), placeholder: input.placeholder })));
  }
}

emit('LOCAL_STORAGE', Object.fromEntries(Array.from({ length: localStorage.length }, (_, i) => { const k = localStorage.key(i); return [k, localStorage.getItem(k)]; })));
process.stdout.write(`${report.join('\n')}\n`);
window.close();
