import { writeFile } from 'node:fs/promises';
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
  HTMLSelectElement: window.HTMLSelectElement, CustomEvent: window.CustomEvent,
  Event: window.Event, Node: window.Node,
  indexedDB: globalThis.indexedDB, IDBKeyRange: globalThis.IDBKeyRange,
});
const $ = jqueryFactory(window);
globalThis.$ = globalThis.jQuery = window.$ = window.jQuery = $;

const eventSource = { on() {}, off() {}, emit() {} };
const stContext = {
  name1: 'Tester', name2: 'Test Character', chatId: 'audit-chat', characterId: 0,
  characters: [{ name: 'Test Character' }],
  chat: [{ is_user: false, name: 'Test Character', mes: '她站在窗边。' }],
  eventSource,
  getWorldInfoNames: () => ['Audit Worldbook'],
};
window.SillyTavern = globalThis.SillyTavern = {
  getContext: () => stContext,
  getCurrentChatId: () => 'audit-chat',
};
window.toastr = globalThis.toastr = { success() {}, info() {}, warning() {}, error() {} };
window.callPopup = globalThis.callPopup = async () => null;
window.fetch = globalThis.fetch = async () => ({
  ok: true, json: async () => ({}), text: async () => '', blob: async () => new Blob(),
});
window.__TSP_IMAGE_TEST_API__ = {
  GeneratorManager: { async generate() { return { url: 'https://example.test/generated.png' }; } },
};

async function waitFor(predicate, message, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (!predicate() && Date.now() < deadline) {
    if (window.__CHAMI_PHONE_STATUS__?.stage === 'failed') break;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  if (!predicate()) throw new Error(`${message}\n${JSON.stringify(window.__CHAMI_PHONE_STATUS__ || null, null, 2)}`);
}

function describe(value) {
  const proto = value ? Object.getPrototypeOf(value) : null;
  return {
    constructor: value?.constructor?.name || null,
    keys: value ? Object.keys(value) : [],
    methods: proto ? Object.getOwnPropertyNames(proto)
      .filter(name => name !== 'constructor')
      .map(name => ({
        name,
        arity: typeof value[name] === 'function' ? value[name].length : null,
        type: typeof value[name],
      })) : [],
  };
}

const report = { error: null };
try {
  await import('../phone-plugin.js');
  await waitFor(() => window.ChamiPhoneEmulator?.instance?.aiRequest, 'Phone instance did not initialize.');
  const phone = window.ChamiPhoneEmulator.instance;
  report.phone = describe(phone);
  report.aiRequest = describe(phone.aiRequest);
  report.aiPreset = describe(phone.aiRequest?.preset);
  report.chatStorage = describe(phone.chatStorage);
  report.settingsUI = describe(phone.settingsUI);
  report.minutesUI = describe(phone.minutesUI);
  report.aiValues = Object.fromEntries(Object.keys(phone.aiRequest || {}).map(key => {
    const value = phone.aiRequest[key];
    return [key, value === null || ['string', 'number', 'boolean'].includes(typeof value)
      ? value
      : { constructor: value?.constructor?.name || typeof value, keys: Object.keys(value || {}) }];
  }));

  window.ChamiPhoneEmulator.open();
  await waitFor(() => document.querySelector('[data-app="settings"]'), 'Settings app icon not found.');
  document.querySelector('[data-app="settings"]').click();
  await new Promise(resolve => setTimeout(resolve, 500));
  report.settingsText = (document.querySelector('.tsp-phone-screen')?.textContent || '')
    .replace(/\s+/g, ' ').trim().slice(0, 16000);
  report.selects = [...document.querySelectorAll('select')].map(select => ({
    id: select.id,
    name: select.name,
    className: select.className,
    dataset: { ...select.dataset },
    value: select.value,
    options: [...select.options].map(option => ({ value: option.value, text: option.textContent?.trim() })),
    parentText: select.parentElement?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 800),
  }));
} catch (error) {
  report.error = error?.stack || String(error);
}
await writeFile('tests/runtime-phone-ai-report.json', JSON.stringify(report, null, 2), 'utf8');
window.close();
