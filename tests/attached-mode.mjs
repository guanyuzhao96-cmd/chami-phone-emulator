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
window.SillyTavern = globalThis.SillyTavern = {
  getContext: () => ({
    name1: 'Tester', name2: 'Existing Character', chatId: 'attached-chat',
    characterId: 0, characters: [{ name: 'Existing Character' }], chat: [], eventSource,
  }),
  getCurrentChatId: () => 'attached-chat',
};
window.toastr = globalThis.toastr = { success() {}, info() {}, warning() {}, error() {} };
window.callPopup = globalThis.callPopup = async () => null;
window.fetch = globalThis.fetch = async () => ({
  ok: true,
  json: async () => ({}),
  text: async () => '',
  blob: async () => new Blob(),
});

let originalFabClicks = 0;
const originalFab = document.createElement('button');
originalFab.className = 'tsp-phone-fab';
originalFab.addEventListener('click', () => { originalFabClicks += 1; });
document.body.appendChild(originalFab);

const originalPhone = document.createElement('div');
originalPhone.className = 'tsp-phone-container';
originalPhone.innerHTML = `
  <div class="tsp-phone-screen">
    <div class="tsp-phone-moments-view">
      <div class="tsp-phone-nav-bar">
        <span class="tsp-phone-nav-title">朋友圈</span>
        <div class="tsp-phone-nav-actions"></div>
      </div>
      <div class="tsp-phone-moments-content">已有朋友圈页面</div>
    </div>
  </div>`;
document.body.appendChild(originalPhone);

const generationCalls = [];
window.__TSP_IMAGE_TEST_API__ = {
  GeneratorManager: {
    async generate(prompt, batching) {
      generationCalls.push({ prompt, batching });
      return { images: ['https://example.test/attached-generated.png'] };
    },
  },
};

async function waitFor(predicate, message, timeoutMs = 12000) {
  const deadline = Date.now() + timeoutMs;
  while (!predicate() && Date.now() < deadline) {
    if (window.__CHAMI_PHONE_STATUS__?.stage === 'failed') break;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  if (!predicate()) throw new Error(`${message}\nStatus: ${JSON.stringify(window.__CHAMI_PHONE_STATUS__ || null, null, 2)}`);
}

await import('../phone-plugin.js');

await waitFor(
  () => window.ChamiPhoneEmulator?.mode === 'attached-to-existing-phone',
  'Attached-mode test failed: plugin did not attach to the existing Tavern Scene phone.',
);
await waitFor(
  () => document.querySelector('[data-character-profile-app]'),
  'Attached-mode test failed: character profile launcher was not attached.',
);
await waitFor(
  () => document.querySelector('[data-chami-image-generate="moments"]'),
  'Attached-mode test failed: Moments image button was not attached.',
);

if (document.querySelectorAll('.tsp-phone-fab').length !== 1) {
  throw new Error('Attached-mode test failed: a duplicate phone floating button was created.');
}
if (window.ChamiPhoneEmulator.instance !== null) {
  throw new Error('Attached-mode test failed: standalone phone instance should not be created.');
}

window.ChamiPhoneEmulator.open();
if (originalFabClicks !== 1) {
  throw new Error('Attached-mode test failed: open() did not delegate to the original phone button.');
}

document.querySelector('[data-chami-image-generate="moments"]').click();
await waitFor(() => document.querySelector('[data-chami-image-dialog]'), 'Attached-mode test failed: prompt dialog did not open.');
document.querySelector('[data-image-prompt]').value = '朋友圈测试配图';
document.querySelector('[data-image-dialog-submit]').click();
await waitFor(() => generationCalls.length === 1, 'Attached-mode test failed: original generator was not called.');
if (generationCalls[0].prompt !== '朋友圈测试配图' || generationCalls[0].batching !== false) {
  throw new Error(`Attached-mode test failed: unexpected generator call ${JSON.stringify(generationCalls[0])}`);
}
await waitFor(() => document.querySelector('[data-chami-image-preview] img'), 'Attached-mode test failed: generated preview did not render.');

console.log('Attached-mode test passed: add-ons attached to the existing Tavern Scene phone without duplication.');
window.close();
