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
  characterId: 0, characters: [{ name: 'Test Character' }],
  chat: [{ is_user: false, name: 'Test Character', mes: '她站在窗边微笑。' }],
  eventSource,
  getWorldInfoNames: () => ['Bound Lorebook', 'Unbound Lorebook'],
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

const generationCalls = [];
window.__TSP_IMAGE_TEST_API__ = {
  GeneratorManager: {
    async generate(prompt, batching) {
      generationCalls.push({ prompt, batching });
      return { url: 'https://example.test/generated.png' };
    },
  },
};

async function waitFor(predicate, message, timeoutMs = 12000) {
  const deadline = Date.now() + timeoutMs;
  while (!predicate() && Date.now() < deadline) {
    if (window.__CHAMI_PHONE_STATUS__?.stage === 'failed') break;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  if (!predicate()) {
    throw new Error(`${message}\nStatus: ${JSON.stringify(window.__CHAMI_PHONE_STATUS__ || null, null, 2)}`);
  }
}

await import('../phone-plugin.js');

await waitFor(
  () => window.ChamiPhoneEmulator?.instance && document.querySelector('[data-character-profile-app]'),
  'Smoke test failed: phone or character profile launcher did not initialize.',
);

if (!document.querySelector('.tsp-phone-fab')) {
  throw new Error('Smoke test failed: phone floating button was not created.');
}
if (window.__CHAMI_PHONE_STATUS__?.stage !== 'ready') {
  throw new Error(`Smoke test failed: initialization did not reach ready.\nStatus: ${JSON.stringify(window.__CHAMI_PHONE_STATUS__ || null, null, 2)}`);
}
if (!window.ChamiPhoneImageBridge) {
  throw new Error('Smoke test failed: Tavern Scene image bridge was not exposed.');
}

window.ChamiPhoneEmulator.open();
await waitFor(() => document.querySelector('[data-app="chat"]'), 'Smoke test failed: phone home screen did not render.');
document.querySelector('[data-app="chat"]').click();
await waitFor(
  () => document.querySelector('[data-chami-image-generate="chat"]'),
  'Smoke test failed: chat image generation button was not injected.',
);

document.querySelector('[data-chami-image-generate="chat"]').click();
await waitFor(() => document.querySelector('[data-chami-image-dialog]'), 'Smoke test failed: image prompt dialog did not open.');
const promptInput = document.querySelector('[data-image-prompt]');
promptInput.value = '一名角色站在窗边，电影感光影';
document.querySelector('[data-image-dialog-submit]').click();
await waitFor(() => generationCalls.length === 1, 'Smoke test failed: original Tavern Scene generator was not called.');
if (generationCalls[0].prompt !== '一名角色站在窗边，电影感光影') {
  throw new Error(`Smoke test failed: unexpected prompt: ${generationCalls[0].prompt}`);
}
if (generationCalls[0].batching !== false) {
  throw new Error(`Smoke test failed: expected GeneratorManager.generate(prompt, false), got ${generationCalls[0].batching}`);
}
await waitFor(() => document.querySelector('[data-chami-image-preview] img'), 'Smoke test failed: generated image preview was not rendered.');

document.querySelector('[data-chami-image-preview] button')?.click();
document.querySelector('.tsp-phone-nav-back')?.click();
await waitFor(() => document.querySelector('[data-app="moments"]'), 'Smoke test failed: could not return to phone home screen.');
document.querySelector('[data-app="moments"]').click();
await waitFor(
  () => document.querySelector('[data-chami-image-generate="moments"]'),
  'Smoke test failed: Moments image generation button was not injected.',
);

document.querySelector('.tsp-phone-nav-back')?.click();
await waitFor(() => document.querySelector('[data-app="forum"]'), 'Smoke test failed: could not return from Moments.');
document.querySelector('[data-app="forum"]').click();
await waitFor(
  () => document.querySelector('[data-chami-image-generate="forum"]'),
  'Smoke test failed: forum image generation button was not injected.',
);

const worldbookReads = [];
const aiCalls = [];
const worldbooks = {
  'Bound Lorebook': [
    { uid: 1, name: '公共设定', content: '这是当前角色卡绑定的主世界书。', enabled: true },
  ],
  'Unbound Lorebook': [
    { uid: 101, name: 'Test Character', content: 'Test Character 是一名冷静的调查员，黑发，擅长观察。', enabled: true },
  ],
};
window.TavernHelper = globalThis.TavernHelper = {
  getCharWorldbookNames() {
    return { primary: 'Bound Lorebook', additional: [] };
  },
  async getWorldbook(name) {
    worldbookReads.push(name);
    return (worldbooks[name] || []).map(entry => ({ ...entry }));
  },
  async updateWorldbookWith(name, updater) {
    worldbooks[name] = updater((worldbooks[name] || []).map(entry => ({ ...entry })));
    return worldbooks[name];
  },
  async generateRaw(options) {
    aiCalls.push(options);
    const promptText = JSON.stringify(options?.ordered_prompts || []);
    if (promptText.includes('profile_sources')) {
      return '<profile_sources>{"aliases":["调查员"],"entryIndexes":[0]}</profile_sources>';
    }
    return '<profile_data>{"currentStatus":"正在调查","currentLocation":"窗边","currentMood":"冷静","relationshipWithUser":"合作关系","attitudeTowardUser":"信任","currentGoal":"查明真相","currentConflict":"","recentEvents":["观察窗外"],"importantPromises":[],"secretsRevealed":[],"currentAppearance":"黑发，穿深色外套","currentRelationships":[],"plotProgress":"调查开始"}</profile_data>';
  },
};

document.querySelector('.tsp-phone-nav-back')?.click();
await waitFor(() => document.querySelector('.tsp-phone-app-grid'), 'Smoke test failed: could not return from forum.');
const profileLauncher = document.querySelector('.tsp-phone-app-icon[data-character-profile-app]')
  || document.querySelector('[data-character-profile-app]');
profileLauncher.click();
await waitFor(
  () => document.querySelector('[data-auto-generate-profile]'),
  'Smoke test failed: automatic character profile button was not rendered.',
);
document.querySelector('[data-auto-generate-profile]').click();
await waitFor(() => document.querySelector('#cp-auto-book'), 'Smoke test failed: worldbook selection page did not open.');

const bookSelect = document.querySelector('#cp-auto-book');
const optionValues = [...bookSelect.options].map(option => option.value);
if (!optionValues.includes('Unbound Lorebook')) {
  throw new Error(`Smoke test failed: unbound worldbook was not selectable: ${JSON.stringify(optionValues)}`);
}
bookSelect.value = 'Unbound Lorebook';
document.querySelector('[data-auto-submit]').click();

await waitFor(
  () => document.querySelector('.tsp-character-profile-entry-info')?.textContent.includes('Unbound Lorebook'),
  'Smoke test failed: automatic profile was not generated from the selected unbound worldbook.',
);
if (!worldbookReads.includes('Unbound Lorebook')) {
  throw new Error(`Smoke test failed: selected unbound worldbook was not read: ${JSON.stringify(worldbookReads)}`);
}
if (aiCalls.length < 2) {
  throw new Error(`Smoke test failed: expected source selection and dynamic profile generation calls, got ${aiCalls.length}.`);
}

console.log('Smoke test passed: image bridge and selectable-worldbook automatic character profile generation work.');
window.close();
