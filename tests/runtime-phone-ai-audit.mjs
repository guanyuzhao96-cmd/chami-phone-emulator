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

function safe(value, max = 12000) {
  try {
    const text = JSON.stringify(value, (_key, item) => typeof item === 'function' ? `[Function ${item.name || 'anonymous'}]` : item, 2);
    return text.length > max ? `${text.slice(0, max)}…` : text;
  } catch (error) {
    return `[unserializable: ${error.message}]`;
  }
}

async function attempt(label, task, target) {
  try {
    target[label] = safe(await task());
  } catch (error) {
    target[label] = `ERROR: ${error?.message || error}`;
  }
}

const report = { error: null, featureConfigs: {}, presetOutputs: {}, highLevelCaptures: [] };
try {
  await import('../phone-plugin.js');
  await waitFor(() => window.ChamiPhoneEmulator?.instance?.aiRequest, 'Phone instance did not initialize.');
  const phone = window.ChamiPhoneEmulator.instance;
  const ai = phone.aiRequest;
  const storage = phone.chatStorage;
  const preset = ai.preset;

  await attempt('featurePresetMapping', () => storage.getFeaturePresetMapping(), report);
  await attempt('apiConfigs', () => storage.getAllAPIConfigs(), report);
  for (const feature of ['chat', 'moments', 'forum', 'chatSummary', 'minutes', 'characterUpdate', 'characterProfile']) {
    await attempt(feature, () => ai._getFeatureConfig(feature), report.featureConfigs);
  }

  const presetCalls = {
    characterUpdate: () => preset._getCharacterUpdateMessages(
      { name: 'Test Character', currentStatus: '旧状态' },
      { chat: '最新聊天', fixed: '固定资料' },
    ),
    chatSummary: () => preset._getChatSummaryMessages(),
    mapGeneration: () => preset._getMapGenerationMessages(),
    newFriends: () => preset._getNewFriendsGenerationMessages(),
    moments: () => preset._getMomentsMessages(),
    forum: () => preset._getForumMessages(),
  };
  for (const [label, task] of Object.entries(presetCalls)) {
    await attempt(label, task, report.presetOutputs);
  }

  const originalRequest = ai.request.bind(ai);
  const originalSendRequest = ai.sendRequest.bind(ai);
  ai.request = async options => {
    report.highLevelCaptures.push({ method: 'request', options: safe(options) });
    return '{"ok":true,"characters":[],"relationships":[]}';
  };
  ai.sendRequest = async options => {
    report.highLevelCaptures.push({ method: 'sendRequest', options: safe(options) });
    return '{"ok":true,"characters":[],"relationships":[]}';
  };

  const calls = [
    ['sendCharacterUpdateRequest', () => ai.sendCharacterUpdateRequest(
      { name: 'Test Character', currentStatus: '旧状态' },
      { chat: '最新聊天', fixed: '固定资料' },
    )],
    ['sendChatSummaryRequest', () => ai.sendChatSummaryRequest([], { summary: '旧总结' })],
    ['sendMapRequest', () => ai.sendMapRequest({ text: '生成地图' })],
    ['sendNewFriendsRequest', () => ai.sendNewFriendsRequest({ text: '生成好友' })],
  ];
  report.highLevelErrors = {};
  for (const [label, task] of calls) {
    try { await task(); } catch (error) { report.highLevelErrors[label] = error?.message || String(error); }
  }
  ai.request = originalRequest;
  ai.sendRequest = originalSendRequest;

  window.ChamiPhoneEmulator.open();
  await waitFor(() => phone.settingsUI?.renderFeaturePresetView, 'Settings UI unavailable.');
  await phone.settingsUI.renderFeaturePresetView();
  await new Promise(resolve => setTimeout(resolve, 300));
  report.featurePresetText = (document.querySelector('.tsp-phone-screen')?.textContent || '')
    .replace(/\s+/g, ' ').trim().slice(0, 16000);
  report.featurePresetHtml = (document.querySelector('.tsp-phone-screen')?.innerHTML || '').slice(0, 30000);
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
