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
window.SillyTavern = globalThis.SillyTavern = {
  getContext: () => ({ name1: 'Tester', name2: 'Test Character', chatId: 'audit-chat', characterId: 0, characters: [{ name: 'Test Character' }], chat: [], eventSource }),
  getCurrentChatId: () => 'audit-chat',
};
window.toastr = globalThis.toastr = { success() {}, info() {}, warning() {}, error() {} };
window.callPopup = globalThis.callPopup = async () => null;
window.fetch = globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({}), text: async () => '', blob: async () => new Blob() });
window.__TSP_IMAGE_TEST_API__ = { GeneratorManager: { async generate() { return { url: 'x' }; } } };
async function waitFor(predicate, message, timeoutMs = 12000) {
  const end = Date.now() + timeoutMs;
  while (!predicate() && Date.now() < end) { if (window.__CHAMI_PHONE_STATUS__?.stage === 'failed') break; await new Promise(r => setTimeout(r, 50)); }
  if (!predicate()) throw new Error(`${message}: ${JSON.stringify(window.__CHAMI_PHONE_STATUS__)}`);
}
function plain(v) { try { return JSON.parse(JSON.stringify(v)); } catch { return String(v); } }

await import('../phone-plugin.js');
await waitFor(() => window.ChamiPhoneEmulator?.instance?.messageUI, 'phone init');
const phone = window.ChamiPhoneEmulator.instance;
const ui = phone.messageUI;
const ai = phone.aiRequest;
const storage = phone.chatStorage;
const created = await storage.createContact({ name: 'Audit Friend', nickname: 'Audit Friend', characterName: 'Audit Friend', description: '测试联系人', avatar: '' });
const contacts = await storage.getContacts();
ui.setContacts(contacts); ui.currentContact = contacts[0] || created; ui.currentCharacter = 'Test Character'; ui.messages = [];
const writes = [];
for (const method of ['addMessage', 'addMessages']) {
  if (typeof storage[method] !== 'function') continue;
  const original = storage[method].bind(storage);
  storage[method] = async (...args) => { writes.push({ method, args: plain(args) }); return original(...args); };
}
const variants = {
  oneNumeric: '{"1":"你好，我收到了。"}',
  twoNumeric: '{"1":"你好。","2":"我收到了。"}',
  replyKey: '{"reply":"你好，我收到了。"}',
  messageKey: '{"message":"你好，我收到了。"}',
  responseKey: '{"response":"你好，我收到了。"}',
  contentOnly: '{"content":"你好，我收到了。"}',
  messagesStrings: '{"messages":["你好。","我收到了。"]}',
  repliesStrings: '{"replies":["你好。","我收到了。"]}',
};
const results = {};
const originalSendChatRequest = ai.sendChatRequest.bind(ai);
for (const [name, response] of Object.entries(variants)) {
  writes.length = 0; ui.messages = []; ai.sendChatRequest = async () => response;
  try { const result = await ui.getAIResponse(`test-${name}`); results[name] = { result: plain(result), writes: plain(writes) }; }
  catch (error) { results[name] = { error: error?.message || String(error), writes: plain(writes) }; }
}
ai.sendChatRequest = originalSendChatRequest; window.close();
throw new Error(`CHAT_OBJECT_MATRIX=${JSON.stringify(results)}`);
