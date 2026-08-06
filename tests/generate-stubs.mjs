import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const names = new Set();
let needsDefault = false;
const externalImports = new Set();

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'tests') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.js') || entry.name.endsWith('.mjs')) scan(full);
  }
}

function isExternal(file, specifier) {
  if (specifier.startsWith('/')) return true;
  if (!specifier.startsWith('.')) return false;
  const resolved = path.resolve(path.dirname(file), specifier);
  return !resolved.startsWith(`${root}${path.sep}`) && resolved !== root;
}

function scan(file) {
  const source = fs.readFileSync(file, 'utf8');
  const re = /import\s*([^;]+?)\s*from\s*(['"])([^'"]+\.js)\2/g;
  for (const match of source.matchAll(re)) {
    const clause = match[1].trim();
    const specifier = match[3];
    if (!isExternal(file, specifier)) continue;
    externalImports.add(`${path.relative(root, file)} -> ${specifier}`);

    if (clause.startsWith('{')) {
      const inside = clause.slice(1, clause.lastIndexOf('}'));
      for (const part of inside.split(',')) {
        const name = part.trim().split(/\s+as\s+/)[0];
        if (/^[A-Za-z_$][\w$]*$/.test(name)) names.add(name);
      }
    } else if (clause.startsWith('* as ')) {
      // Namespace imports do not require named exports.
    } else {
      needsDefault = true;
      const brace = clause.indexOf('{');
      if (brace >= 0) {
        const inside = clause.slice(brace + 1, clause.lastIndexOf('}'));
        for (const part of inside.split(',')) {
          const name = part.trim().split(/\s+as\s+/)[0];
          if (/^[A-Za-z_$][\w$]*$/.test(name)) names.add(name);
        }
      }
    }
  }
}

walk(root);
const lines = [
  'const noop = () => undefined;',
  'const asyncNoop = async () => undefined;',
  'const eventSourceValue = { on: noop, off: noop, emit: noop };',
  'class PopupValue { constructor() {} async show() { return null; } static async show() { return null; } }',
];

const explicitValues = {
  Popup: 'PopupValue',
  PopupType: "{ TEXT: 'text', CONFIRM: 'confirm', INPUT: 'input' }",
  characters: '[]',
  chat: '[]',
  eventSource: 'eventSourceValue',
  event_types: "{ CHAT_CHANGED: 'chat_changed', MESSAGE_RECEIVED: 'message_received', MESSAGE_SENT: 'message_sent', CHARACTER_MESSAGE_RENDERED: 'character_message_rendered' }",
  extension_settings: '{}',
  generateRaw: "async () => '<profile_data>{}</profile_data>'",
  getRequestHeaders: "() => ({ 'Content-Type': 'application/json' })",
  getSortedEntries: '() => []',
  getThumbnailUrl: "() => ''",
  getWorldInfoPrompt: "async () => ({ worldInfoBefore: '', worldInfoAfter: '', worldInfoString: '' })",
  loadWorldInfo: 'async () => []',
  openCharacterWorldInfoEditor: 'asyncNoop',
  saveChatConditional: 'asyncNoop',
  saveSettingsDebounced: 'noop',
};

for (const name of [...names].sort()) {
  let value = explicitValues[name];
  if (!value) {
    value = 'noop';
    if (/eventSource/i.test(name)) value = 'eventSourceValue';
    else if (/event_types/i.test(name)) value = '{}';
    else if (/save|load|fetch|generate|update|delete|create|write|read|send|open|close|refresh|reload/i.test(name)) value = 'asyncNoop';
    else if (/^(chat|characters|groups)$/i.test(name)) value = '[]';
    else if (/settings|power_user/i.test(name)) value = '{}';
  }
  lines.push(`export const ${name} = ${value};`);
}
if (needsDefault) lines.push('export default {};');
fs.writeFileSync(path.join(root, 'tests/generated-stubs.mjs'), `${lines.join('\n')}\n`);
console.log(`Generated ${names.size} SillyTavern named export stubs: ${[...names].sort().join(', ')}`);
console.log([...externalImports].sort().join('\n'));
