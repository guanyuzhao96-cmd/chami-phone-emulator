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
  ok: true,
  json: async () => ({ choices: [{ message: { content: '{"boot":true}' } }] }),
  text: async () => '{"boot":true}',
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

function simplify(value, depth = 0) {
  if (depth > 5) return '[depth]';
  if (typeof value === 'function') return `[Function ${value.name || 'anonymous'}]`;
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.slice(0, 30).map(item => simplify(item, depth + 1));
  const out = {};
  for (const [key, item] of Object.entries(value).slice(0, 80)) out[key] = simplify(item, depth + 1);
  return out;
}

async function runCandidate(label, task, report) {
  report.calls[label] = { fetches: [], builders: [], result: null, error: null };
  const slot = report.calls[label];
  const phone = window.ChamiPhoneEmulator.instance;
  const ai = phone.aiRequest;
  const oldFetch = window.fetch;
  const oldGlobalFetch = globalThis.fetch;
  const oldBuild = ai._buildRequest;
  const oldParse = ai._parseResponse;
  const fakeFetch = async (url, options = {}) => {
    slot.fetches.push({ url: String(url), options: simplify(options) });
    return {
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: '{"ok":true}' } }] }),
      text: async () => '{"ok":true}',
      blob: async () => new Blob(),
    };
  };
  window.fetch = globalThis.fetch = fakeFetch;
  ai._buildRequest = function (...args) {
    slot.builders.push(simplify(args));
    return oldBuild.apply(this, args);
  };
  ai._parseResponse = async function (...args) {
    slot.parseArgs = simplify(args);
    return oldParse.apply(this, args);
  };
  try {
    slot.result = simplify(await task(ai));
  } catch (error) {
    slot.error = error?.stack || String(error);
  } finally {
    window.fetch = oldFetch;
    globalThis.fetch = oldGlobalFetch;
    ai._buildRequest = oldBuild;
    ai._parseResponse = oldParse;
  }
}

const report = { error: null, sources: {}, storage: {}, featureConfig: null, calls: {}, presetDom: {} };
try {
  await import('../phone-plugin.js');
  await waitFor(() => window.ChamiPhoneEmulator?.instance?.aiRequest, 'Phone instance did not initialize.');
  const phone = window.ChamiPhoneEmulator.instance;
  const ai = phone.aiRequest;
  const storage = phone.chatStorage;

  for (const [name, fn] of Object.entries({
    request: ai.request,
    sendRequest: ai.sendRequest,
    getFeatureConfig: ai._getFeatureConfig,
    buildRequest: ai._buildRequest,
    renderFeaturePresetView: phone.settingsUI.renderFeaturePresetView,
  })) {
    report.sources[name] = String(fn).slice(0, 30000);
  }

  const config = {
    id: 'audit-api',
    configId: 'audit-api',
    name: 'Audit API',
    apiName: 'Audit API',
    apiUrl: 'https://example.test/v1',
    apiKey: 'audit-key',
    model: 'audit-model',
    temperature: 0.4,
    maxTokens: 2048,
    apiType: 'openai',
    format: 'openai',
  };
  try { await storage.saveAPIConfig(config); } catch (error) { report.storage.saveAPIConfigError = String(error); }
  try { await storage.saveActiveApiConfigId('audit-api'); } catch (error) { report.storage.saveActiveError = String(error); }
  let mapping = {};
  try { mapping = await storage.getFeaturePresetMapping() || {}; } catch (error) { report.storage.mappingReadError = String(error); }
  mapping.characterProfile = 'audit-api';
  mapping.characterUpdate = 'audit-api';
  try { await storage.saveFeaturePresetMapping(mapping); } catch (error) { report.storage.mappingSaveError = String(error); }
  report.storage.apiConfigs = simplify(await storage.getAllAPIConfigs().catch(error => ({ error: String(error) })));
  report.storage.mapping = simplify(await storage.getFeaturePresetMapping().catch(error => ({ error: String(error) })));
  report.storage.featurePreset = simplify(await storage.getFeaturePreset('characterProfile').catch(error => ({ error: String(error) })));
  report.featureConfig = simplify(await ai._getFeatureConfig('characterProfile').catch(error => ({ error: String(error) })));

  const messages = [
    { role: 'system', content: 'SYSTEM ROLE PROFILE' },
    { role: 'user', content: 'RETURN JSON' },
  ];
  const featureConfig = await ai._getFeatureConfig('characterProfile').catch(() => null);
  await runCandidate('request_messages', current => current.request({ messages }), report);
  await runCandidate('request_messages_config', current => current.request({ messages, config: featureConfig }), report);
  await runCandidate('request_messages_apiConfig', current => current.request({ messages, apiConfig: featureConfig }), report);
  await runCandidate('request_feature_messages', current => current.request({ feature: 'characterProfile', messages }), report);
  await runCandidate('send_feature_messages', current => current.sendRequest({ feature: 'characterProfile', messages }), report);
  await runCandidate('send_messages_config', current => current.sendRequest({ messages, config: featureConfig }), report);
  await runCandidate('send_messages_apiConfig', current => current.sendRequest({ messages, apiConfig: featureConfig }), report);

  window.ChamiPhoneEmulator.open();
  await waitFor(() => document.querySelector('[data-app="settings"]'), 'Settings icon unavailable.');
  document.querySelector('[data-app="settings"]').click();
  await new Promise(resolve => setTimeout(resolve, 300));
  const rows = [...document.querySelectorAll('*')].filter(node => /预设配置/.test(node.textContent || '') && node.children.length < 8);
  report.presetDom.settingsCandidates = rows.slice(0, 20).map(node => ({
    tag: node.tagName,
    className: node.className,
    id: node.id,
    text: node.textContent.replace(/\s+/g, ' ').trim().slice(0, 500),
    html: node.outerHTML.slice(0, 3000),
  }));
  const target = rows.find(node => /为各功能单独指定API预设/.test(node.textContent || '')) || rows[0];
  target?.click();
  await new Promise(resolve => setTimeout(resolve, 500));
  report.presetDom.afterClickText = (document.querySelector('.tsp-phone-screen')?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 16000);
  report.presetDom.afterClickHtml = (document.querySelector('.tsp-phone-screen')?.innerHTML || '').slice(0, 40000);
  report.presetDom.selects = [...document.querySelectorAll('select')].map(select => ({
    id: select.id, name: select.name, className: select.className,
    dataset: { ...select.dataset }, value: select.value,
    options: [...select.options].map(option => ({ value: option.value, text: option.textContent?.trim() })),
    parent: select.parentElement?.outerHTML.slice(0, 6000),
  }));
} catch (error) {
  report.error = error?.stack || String(error);
}
await writeFile('tests/runtime-phone-ai-report.json', JSON.stringify(report, null, 2), 'utf8');
window.close();
