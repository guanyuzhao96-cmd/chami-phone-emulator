import fs from 'node:fs';
import path from 'node:path';

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full.replaceAll('\\', '/'));
  }
  return out;
}

const files = walk('Phone_emulator');
console.log('=== PHONE FILE TREE ===');
for (const file of files) {
  const lower = file.toLowerCase();
  if (/setting|config|preset|prompt|ai|api|request|service|database|db/.test(lower)) {
    console.log(file, fs.statSync(file).size);
  }
}

console.log('=== LITERAL HITS ===');
for (const file of files.filter(file => /\.(js|json|html|css)$/i.test(file))) {
  const text = fs.readFileSync(file, 'utf8');
  const terms = ['预设配置', '预设', '破限', 'jailbreak', 'systemPrompt', 'generateRaw', 'apiPreset', 'presetId'];
  const hits = terms.filter(term => text.includes(term));
  if (hits.length) console.log(file, hits.join(', '));
}

const likelyModules = [
  './Phone_emulator/api/ai-request.js',
  './Phone_emulator/api/phone-api.js',
  './Phone_emulator/services/settings-service.js',
  './Phone_emulator/services/config-service.js',
  './Phone_emulator/ui/phone-settings.js',
  './Phone_emulator/db/settings.js',
];
console.log('=== MODULE EXPORTS ===');
for (const modulePath of likelyModules) {
  if (!fs.existsSync(modulePath)) continue;
  try {
    const mod = await import(`../${modulePath.replace(/^\.\//, '')}`);
    console.log(modulePath, Object.keys(mod));
  } catch (error) {
    console.log(modulePath, 'IMPORT_FAILED', String(error?.message || error));
  }
}
