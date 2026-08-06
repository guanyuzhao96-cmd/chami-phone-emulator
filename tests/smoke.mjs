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
  name1: 'Tester', name2: 'Test Character', chatId: 'smoke-chat',
  characterId: 0, characters: [{ name: 'Test Character' }], chat: [], eventSource,
};
window.SillyTavern = globalThis.SillyTavern = {
  getContext: () => stContext,
  getCurrentChatId: () => 'smoke-chat',
};
window.toastr = globalThis.toastr = { success() {}, info() {}, warning() {}, error() {} };
window.callPopup = globalThis.callPopup = async () => null;
window.fetch = globalThis.fetch = async () => ({
  ok: true,
  json: async () => ({}),
  text: async () => '',
  blob: async () => new Blob(),
});

await import('../phone-plugin.js');

const deadline = Date.now() + 12000;
while ((!window.ChamiPhoneEmulator?.instance || !document.querySelector('[data-character-profile-app]')) && Date.now() < deadline) {
  if (window.__CHAMI_PHONE_STATUS__?.stage === 'failed') break;
  await new Promise(resolve => setTimeout(resolve, 100));
}

if (!document.querySelector('.tsp-phone-fab')) {
  const status = JSON.stringify(window.__CHAMI_PHONE_STATUS__ || null, null, 2);
  throw new Error(`Smoke test failed: phone floating button was not created.\nStatus: ${status}`);
}
if (!window.ChamiPhoneEmulator?.instance) {
  throw new Error(`Smoke test failed: global phone instance was not exposed.\nStatus: ${JSON.stringify(window.__CHAMI_PHONE_STATUS__ || null, null, 2)}`);
}
if (window.__CHAMI_PHONE_STATUS__?.stage !== 'ready') {
  throw new Error(`Smoke test failed: initialization did not reach ready.\nStatus: ${JSON.stringify(window.__CHAMI_PHONE_STATUS__ || null, null, 2)}`);
}
if (!document.querySelector('[data-character-profile-app]')) {
  throw new Error('Smoke test failed: character profile launcher was not created.');
}

console.log('Smoke test passed: phone and character profile launcher initialized.');
window.close();
