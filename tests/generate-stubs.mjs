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
];
for (const name of [...names].sort()) {
  let value = 'noop';
  if (/eventSource/i.test(name)) value = 'eventSourceValue';
  else if (/event_types/i.test(name)) value = '{}';
  else if (/chat|characters|groups|extension_settings|power_user|settings/i.test(name)) value = '[]';
  else if (/save|load|fetch|generate|update|delete|create|write|read/i.test(name)) value = 'asyncNoop';
  lines.push(`export const ${name} = ${value};`);
}
if (needsDefault) lines.push('export default {};');
fs.writeFileSync(path.join(root, 'tests/generated-stubs.mjs'), `${lines.join('\n')}\n`);
console.log(`Generated ${names.size} SillyTavern named export stubs: ${[...names].sort().join(', ')}`);
console.log([...externalImports].sort().join('\n'));
