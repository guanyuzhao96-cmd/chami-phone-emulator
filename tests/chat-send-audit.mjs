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
  HTMLTextAreaElement: window.HTMLTextAreaElement, HTMLSelectElement: window.HTMLSelectElement,
  CustomEvent: window.CustomEvent, Event: window.Event, Node: window.Node,
  indexedDB: globalThis.indexedDB, IDBKeyRange: globalThis.IDBKeyRange,
});
const $ = jqueryFactory(window);
globalThis.$ = globalThis.jQuery = window.$ = window.jQuery = $;

const eventSource = { on() {}, off() {}, emit() {} };
const stContext = {
  name1: 'Tester', name2: 'Test Character', chatId: 'audit-chat', characterId: 0,
  characters: [{ name: 'Test Character' }],
  chat: [{ is_user: false, name: 'Test Character', mes: '你好。' }],
  eventSource,
  getWorldInfoNames: () => [],
};
window.SillyTavern = globalThis.SillyTavern = {
  getContext: () => stContext,
  getCurrentChatId: () => 'audit-chat',
};
window.toastr = globalThis.toastr = { success() {}, info() {}, warning() {}, error() {} };
window.callPopup = globalThis.callPopup = async () => null;
window.fetch = globalThis.fetch = async () => ({
  ok: true, status: 200,
  json: async () => ({ choices: [{ message: { content: 'ok' } }] }),
  text: async () => 'ok', blob: async () => new Blob(),
});
window.__TSP_IMAGE_TEST_API__ = { GeneratorManager: { async generate() { return { url: 'x' }; } } };

const report = { error: null, messageMethods: {}, aiMethods: {}, presetMethods: {}, attempts: {}, configs: {} };
async function waitFor(predicate, message, timeoutMs = 12000) {
  const end = Date.now() + timeoutMs;
  while (!predicate() && Date.now() < end) {
    if (window.__CHAMI_PHONE_STATUS__?.stage === 'failed') break;
    await new Promise(r => setTimeout(r, 50));
  }
  if (!predicate()) throw new Error(`${message}: ${JSON.stringify(window.__CHAMI_PHONE_STATUS__)}`);
}
function methodSources(object, regex) {
  const out = {};
  const proto = object ? Object.getPrototypeOf(object) : null;
  if (!proto) return out;
  for (const name of Object.getOwnPropertyNames(proto)) {
    if (name === 'constructor' || !regex.test(name) || typeof object[name] !== 'function') continue;
    try { out[name] = Function.prototype.toString.call(object[name]).slice(0, 40000); }
    catch (e) { out[name] = `ERR:${e.message}`; }
  }
  return out;
}
function plain(value) {
  try { return JSON.parse(JSON.stringify(value, (_k, v) => typeof v === 'function' ? '[fn]' : v)); }
  catch { return String(value); }
}

try {
  await import('../phone-plugin.js');
  await waitFor(() => window.ChamiPhoneEmulator?.instance?.messageUI, 'phone init');
  const phone = window.ChamiPhoneEmulator.instance;
  const ui = phone.messageUI;
  const ai = phone.aiRequest;
  const preset = ai.preset;

  report.messageMethods = methodSources(ui, /sendUserMessage|getAIResponse|openChatDetail|loadAndRenderMessages|formatMessage|processImage/i);
  report.aiMethods = methodSources(ai, /chat|message|request|parse|feature|response/i);
  report.presetMethods = methodSources(preset, /chat|message|reply|response/i);

  for (const feature of ['chat', 'moments', 'forum']) {
    try { report.configs[feature] = plain(await ai._getFeatureConfig(feature)); }
    catch (e) { report.configs[feature] = `ERR:${e.message}`; }
  }

  const created = await phone.chatStorage.createContact({
    name: 'Audit Friend', nickname: 'Audit Friend', characterName: 'Audit Friend',
    description: '测试联系人', avatar: '',
  });
  report.attempts.createdContact = plain(created);
  const contacts = await phone.chatStorage.getContacts();
  report.attempts.contacts = plain(contacts);
  ui.setContacts(contacts);
  const contact = contacts[0] || created;
  ui.currentContact = contact;
  ui.currentCharacter = 'Test Character';
  report.attempts.currentContact = plain(ui.currentContact);

  const originalRequest = ai.request.bind(ai);
  const originalSendRequest = ai.sendRequest.bind(ai);
  const originalSendChatRequest = typeof ai.sendChatRequest === 'function' ? ai.sendChatRequest.bind(ai) : null;
  const captures = [];
  ai.request = async (...args) => {
    captures.push({ method: 'request', args: plain(args) });
    return '[{"content":"你好，我收到了。","type":"text"}]';
  };
  ai.sendRequest = async (...args) => {
    captures.push({ method: 'sendRequest', args: plain(args) });
    return '[{"content":"你好，我收到了。","type":"text"}]';
  };
  if (originalSendChatRequest) {
    ai.sendChatRequest = async (...args) => {
      captures.push({ method: 'sendChatRequest', args: plain(args) });
      try {
        const result = await originalSendChatRequest(...args);
        captures.push({ method: 'sendChatRequest:result', result: plain(result) });
        return result;
      } catch (e) {
        captures.push({ method: 'sendChatRequest:error', error: e.stack || e.message });
        throw e;
      }
    };
  }

  try {
    report.attempts.getAIResponse = plain(await ui.getAIResponse('你好，这是测试'));
  } catch (e) {
    report.attempts.getAIResponseError = e.stack || e.message;
  }
  report.attempts.captures = captures;

  ai.request = originalRequest;
  ai.sendRequest = originalSendRequest;
  if (originalSendChatRequest) ai.sendChatRequest = originalSendChatRequest;
} catch (error) {
  report.error = error?.stack || String(error);
}

await writeFile('tests/chat-send-audit-report.json', JSON.stringify(report, null, 2));
const diagnostic = {
  error: report.error,
  configs: report.configs,
  attempts: report.attempts,
  messageMethods: Object.fromEntries(Object.entries(report.messageMethods).map(([k, v]) => [k, v.slice(0, 1800)])),
  aiMethods: Object.fromEntries(Object.entries(report.aiMethods).map(([k, v]) => [k, v.slice(0, 1800)])),
  presetMethods: Object.fromEntries(Object.entries(report.presetMethods).map(([k, v]) => [k, v.slice(0, 1800)])),
};
window.close();
throw new Error(`CHAT_AUDIT_RESULT=${JSON.stringify(diagnostic)}`);
