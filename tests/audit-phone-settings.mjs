import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { Window } from 'happy-dom';
import jqueryFactory from 'jquery';
import 'fake-indexeddb/auto';

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(path));
    else if (entry.isFile() && path.endsWith('.js')) out.push(path);
  }
  return out;
}

function clip(source, index, radius = 900) {
  const start = Math.max(0, index - radius);
  const end = Math.min(source.length, index + radius);
  return source.slice(start, end).replace(/\s+/g, ' ');
}

const files = await walk('Phone_emulator');
for (const file of files) {
  const source = await readFile(file, 'utf8');
  const needles = ['PhoneAIRequest', 'ai-request.js', 'new PhoneAIRequest', 'generateResponse', 'generateReply', 'generateRaw'];
  const hits = [];
  for (const needle of needles) {
    let offset = 0;
    while (hits.length < 24) {
      const index = source.toLowerCase().indexOf(needle.toLowerCase(), offset);
      if (index < 0) break;
      hits.push({ needle, index });
      offset = index + needle.length;
    }
  }
  if (!hits.length) continue;
  console.log(`\n=== ${file} (${source.length}) ===`);
  for (const { needle, index } of hits.sort((a, b) => a.index - b.index)) {
    console.log(`-- HIT ${needle} @ ${index} --`);
    console.log(clip(source, index));
  }
}

console.log('\n=== RUNTIME PROBE ===');
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
window.toastr = globalThis.toastr = { success() {}, info() {}, warning() {}, error() {} };
window.SillyTavern = globalThis.SillyTavern = {
  getContext: () => ({ name1: 'Tester', name2: 'Character', chatId: 'probe', characterId: 0, characters: [{ name: 'Character' }], chat: [] }),
};
window.TavernHelper = globalThis.TavernHelper = { async generateRaw() { return '{}'; }, async generate() { return '{}'; } };

const exits = [];
const originalExit = process.exit;
const originalAbort = process.abort;
process.exit = code => { exits.push(['exit', code]); throw new Error(`BLOCKED_PROCESS_EXIT_${code}`); };
process.abort = () => { exits.push(['abort']); throw new Error('BLOCKED_PROCESS_ABORT'); };
try {
  const mod = await import('../Phone_emulator/api/ai-request.js');
  console.log('MODULE_EXPORTS', Object.keys(mod));
  const Type = mod.PhoneAIRequest;
  console.log('STATIC_KEYS', Object.getOwnPropertyNames(Type));
  console.log('PROTOTYPE_METHODS', Object.getOwnPropertyNames(Type.prototype));
  for (const name of Object.getOwnPropertyNames(Type.prototype)) {
    if (name === 'constructor') continue;
    const fn = Type.prototype[name];
    console.log('METHOD', name, 'ARITY', typeof fn === 'function' ? fn.length : '-', 'ASYNC', fn?.constructor?.name);
  }
  const ctx = {
    api: {}, db: {}, events: { on() {}, off() {}, emit() {} }, helpers: {},
    log() {}, warn() {}, error() {}, getSTContext: window.SillyTavern.getContext,
  };
  const instance = new Type(ctx);
  console.log('INSTANCE_KEYS', Object.keys(instance));
} catch (error) {
  console.log('RUNTIME_PROBE_FAILED', error?.stack || String(error));
} finally {
  process.exit = originalExit;
  process.abort = originalAbort;
  console.log('BLOCKED_EXITS', JSON.stringify(exits));
  window.close();
}

console.log('\nAUDIT_COMPLETE');
