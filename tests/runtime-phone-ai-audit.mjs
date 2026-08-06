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
  HTMLMediaElement: window.HTMLMediaElement,
  HTMLAudioElement: window.HTMLAudioElement,
  HTMLImageElement: window.HTMLImageElement,
  HTMLVideoElement: window.HTMLVideoElement,
  HTMLCanvasElement: window.HTMLCanvasElement,
  Audio: window.Audio,
  Image: window.Image,
  File: window.File,
  FileReader: window.FileReader,
  Blob: window.Blob,
  URL: window.URL,
  HTMLElement: window.HTMLElement,
  HTMLInputElement: window.HTMLInputElement,
  HTMLSelectElement: window.HTMLSelectElement,
  CustomEvent: window.CustomEvent,
  Event: window.Event,
  Node: window.Node,
  indexedDB: globalThis.indexedDB,
  IDBKeyRange: globalThis.IDBKeyRange,
});
const $ = jqueryFactory(window);
globalThis.$ = globalThis.jQuery = window.$ = window.jQuery = $;

const eventSource = { on() {}, off() {}, emit() {} };
const stContext = {
  name1: 'Tester',
  name2: 'Test Character',
  chatId: 'audit-chat',
  characterId: 0,
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
  ok: true,
  json: async () => ({}),
  text: async () => '',
  blob: async () => new Blob(),
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

function describe(label, value) {
  const proto = value ? Object.getPrototypeOf(value) : null;
  const methods = proto
    ? Object.getOwnPropertyNames(proto)
      .filter(name => name !== 'constructor')
      .map(name => ({ name, arity: typeof value[name] === 'function' ? value[name].length : null, type: typeof value[name] }))
    : [];
  console.log(`\n@@ ${label}`);
  console.log(JSON.stringify({
    constructor: value?.constructor?.name || null,
    keys: value ? Object.keys(value) : [],
    methods,
  }, null, 2));
}

await import('../phone-plugin.js');
await waitFor(
  () => window.ChamiPhoneEmulator?.instance?.aiRequest,
  'Phone instance did not initialize.',
);

const phone = window.ChamiPhoneEmulator.instance;
describe('PHONE', phone);
describe('AI_REQUEST', phone.aiRequest);
describe('AI_PRESET', phone.aiRequest?.preset);
describe('CHAT_STORAGE', phone.chatStorage);
describe('SETTINGS_UI', phone.settingsUI);
describe('MINUTES_UI', phone.minutesUI);

console.log('\n@@ AI_INSTANCE_VALUES');
for (const key of Object.keys(phone.aiRequest || {})) {
  const value = phone.aiRequest[key];
  if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) {
    console.log(key, JSON.stringify(value));
  } else {
    console.log(key, value?.constructor?.name || typeof value);
  }
}

window.ChamiPhoneEmulator.open();
await waitFor(() => document.querySelector('[data-app="settings"]'), 'Settings app icon not found.');
document.querySelector('[data-app="settings"]').click();
await new Promise(resolve => setTimeout(resolve, 300));

console.log('\n@@ SETTINGS_DOM_TEXT');
console.log((document.querySelector('.tsp-phone-screen')?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 12000));
console.log('\n@@ SETTINGS_SELECTS');
for (const select of document.querySelectorAll('select')) {
  console.log(JSON.stringify({
    id: select.id,
    name: select.name,
    className: select.className,
    dataset: { ...select.dataset },
    value: select.value,
    options: [...select.options].map(option => ({ value: option.value, text: option.textContent?.trim() })),
    parentText: select.parentElement?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 500),
  }));
}

console.log('\nRUNTIME_PHONE_AI_AUDIT_COMPLETE');
window.close();
