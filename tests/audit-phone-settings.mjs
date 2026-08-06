import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(path));
    else if (entry.isFile() && path.endsWith('.js')) out.push(path);
  }
  return out;
}

function clip(source, index, radius = 1200) {
  const start = Math.max(0, index - radius);
  const end = Math.min(source.length, index + radius);
  return source.slice(start, end).replace(/\s+/g, ' ');
}

const files = await walk('Phone_emulator');
const needles = [
  'PhoneAIRequest',
  'ai-request.js',
  "api/ai-request",
  'new PhoneAIRequest',
  'generateResponse',
  'generateReply',
  'generateRaw',
  'apiPreset',
  'featurePresetMapping',
  'getFeaturePresetMapping',
];

for (const file of files) {
  const source = await readFile(file, 'utf8');
  const hits = [];
  for (const needle of needles) {
    let offset = 0;
    while (hits.length < 40) {
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

for (const target of [
  'Phone_emulator/api/ai-request.js',
  'Phone_emulator/resources/preset/phone-preset.js',
  'Phone_emulator/ui/phone-settings.js',
]) {
  const source = await readFile(target, 'utf8');
  console.log(`\n=== DECLARATIONS ${target} ===`);
  for (const match of source.matchAll(/import[\s\S]{0,400}?from\s*['"][^'"]+['"]|export\s+(?:default\s+)?(?:async\s+)?(?:class|function|const|let|var)\s+[A-Za-z_$][\w$]*/g)) {
    console.log(match[0].slice(0, 2000));
  }
}

console.log('\nAUDIT_COMPLETE');
