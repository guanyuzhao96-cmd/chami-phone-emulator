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

const eventSource = {
  on() {},
  off() {},
  emit() {},
};

const stContext = {
  name1: 'Tester',
  name2: 'Test Character',
  chatId: 'smoke-chat',
  characterId: 0,
  characters: [{ name: 'Test Character' }],
  chat: [],
  eventSource,
};

window.SillyTavern = globalThis.SillyTavern = {
  getContext: () => stContext,
  getCurrentChatId: () => 'smoke-chat',
};
window.toastr = globalThis.toastr = {
  success() {}, info() {}, warning() {}, error() {},
};
window.callPopup = globalThis.callPopup = async () => null;
window.fetch = globalThis.fetch = async () => ({
  ok: true,
  json: async () => ({}),
  text: async () => '',
  blob: async () => new Blob(),
});

await import('../phone-plugin.js');

const deadline = Date.now() + 8000;
while (!document.querySelector('.tsp-phone-fab') && Date.now() < deadline) {
  await new Promise(resolve => setTimeout(resolve, 100));
}

if (!document.querySelector('.tsp-phone-fab')) {
  throw new Error('Smoke test failed: phone floating button was not created.');
}
if (!window.ChamiPhoneEmulator?.instance) {
  throw new Error('Smoke test failed: global phone instance was not exposed.');
}

console.log('Smoke test passed: standalone phone initialized and floating button exists.');
window.close();
