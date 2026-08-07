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
  chat: [
    { is_user: false, name: 'Test Character', mes: '你好。' },
    { is_user: true, name: 'Tester', mes: '测试消息。' },
  ],
  eventSource,
  getWorldInfoNames: () => [],
};
window.SillyTavern = globalThis.SillyTavern = {
  getContext: () => stContext,
  getCurrentChatId: () => 'audit-chat',
};
window.toastr = globalThis.toastr = {
  success(...args) { report.toasts.push(['success', ...args.map(String)]); },
  info(...args) { report.toasts.push(['info', ...args.map(String)]); },
  warning(...args) { report.toasts.push(['warning', ...args.map(String)]); },
  error(...args) { report.toasts.push(['error', ...args.map(String)]); },
};
window.callPopup = globalThis.callPopup = async () => null;
window.fetch = globalThis.fetch = async (url, options = {}) => {
  report.fetches.push({ url: String(url), body: String(options.body || '').slice(0, 4000) });
  return {
    ok: true, status: 200,
    json: async () => ({ choices: [{ message: { content: '{"reply":"好的"}' } }] }),
    text: async () => '{"reply":"好的"}',
    blob: async () => new Blob(),
  };
};
window.__TSP_IMAGE_TEST_API__ = { GeneratorManager: { async generate() { return { url: 'x' }; } } };

const report = { error: null, phone: {}, chatObjects: {}, dom: [], aiCalls: [], toasts: [], fetches: [], featureConfigs: {} };
async function waitFor(predicate, message, timeoutMs = 12000) {
  const end = Date.now() + timeoutMs;
  while (!predicate() && Date.now() < end) {
    if (window.__CHAMI_PHONE_STATUS__?.stage === 'failed') break;
    await new Promise(r => setTimeout(r, 50));
  }
  if (!predicate()) throw new Error(`${message}: ${JSON.stringify(window.__CHAMI_PHONE_STATUS__)}`);
}
function describe(value) {
  const proto = value ? Object.getPrototypeOf(value) : null;
  return {
    ctor: value?.constructor?.name || null,
    keys: value ? Object.keys(value) : [],
    methods: proto ? Object.getOwnPropertyNames(proto).filter(x => x !== 'constructor').map(name => ({ name, arity: typeof value[name] === 'function' ? value[name].length : null })) : [],
  };
}
function snap(label) {
  const screen = document.querySelector('.tsp-phone-screen');
  report.dom.push({
    label,
    text: (screen?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 12000),
    html: (screen?.innerHTML || '').slice(0, 24000),
    inputs: [...(screen?.querySelectorAll('input,textarea,button,select') || [])].map(el => ({
      tag: el.tagName, id: el.id, cls: el.className, type: el.type, placeholder: el.placeholder,
      text: el.textContent?.trim().slice(0, 100), value: el.value, dataset: { ...el.dataset }, disabled: el.disabled,
    })),
  });
}

try {
  await import('../phone-plugin.js');
  await waitFor(() => window.ChamiPhoneEmulator?.instance, 'phone init');
  const phone = window.ChamiPhoneEmulator.instance;
  report.phone = describe(phone);
  for (const key of Object.keys(phone)) {
    if (/chat|message|contact|friend|ui/i.test(key)) report.chatObjects[key] = describe(phone[key]);
  }
  for (const feature of ['chat', 'moments', 'forum']) {
    try { report.featureConfigs[feature] = await phone.aiRequest._getFeatureConfig(feature); }
    catch (e) { report.featureConfigs[feature] = `ERR:${e.message}`; }
  }

  const proto = Object.getPrototypeOf(phone.aiRequest);
  for (const name of Object.getOwnPropertyNames(proto)) {
    if (typeof phone.aiRequest[name] !== 'function') continue;
    if (!/request|chat|message|reply/i.test(name)) continue;
    const original = phone.aiRequest[name].bind(phone.aiRequest);
    phone.aiRequest[name] = async (...args) => {
      report.aiCalls.push({ name, args: JSON.parse(JSON.stringify(args, (_k, v) => typeof v === 'function' ? '[fn]' : v)).slice?.(0, 10) || args });
      if (name === 'request' || name === 'sendRequest') return '{"reply":"好的","message":"好的","content":"好的"}';
      try { return await original(...args); } catch (e) { report.aiCalls.push({ name: `${name}:ERROR`, error: e.message }); throw e; }
    };
  }

  window.ChamiPhoneEmulator.open();
  await waitFor(() => document.querySelector('[data-app="chat"]'), 'chat icon');
  snap('home');
  document.querySelector('[data-app="chat"]').click();
  await new Promise(r => setTimeout(r, 500));
  snap('chat-open');

  const screen = document.querySelector('.tsp-phone-screen');
  const candidate = [...screen.querySelectorAll('button, [role="button"], .tsp-phone-chat-item, .tsp-phone-contact-item')]
    .find(el => /Test Character|聊天|消息/.test(el.textContent || '') && !/返回/.test(el.textContent || ''));
  candidate?.click();
  await new Promise(r => setTimeout(r, 500));
  snap('after-first-candidate-click');

  const input = screen.querySelector('textarea:not([disabled]), input[type="text"]:not([disabled])');
  if (input) {
    input.value = '你好，这是发送测试';
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
  }
  const send = [...screen.querySelectorAll('button')].find(el => /发送|send/i.test(el.textContent || '') || /send/i.test(el.className || '') || el.dataset?.action === 'send');
  send?.click();
  await new Promise(r => setTimeout(r, 1500));
  snap('after-send');
} catch (error) {
  report.error = error?.stack || String(error);
}
await writeFile('tests/chat-send-audit-report.json', JSON.stringify(report, null, 2));
window.close();
