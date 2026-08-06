import { readFile } from 'node:fs/promises';

const targets = [
  'Phone_emulator/api/ai-request.js',
  'Phone_emulator/resources/preset/phone-preset.js',
  'Phone_emulator/ui/phone-settings.js',
  'Phone_emulator/services/api-config.js',
  'Phone_emulator/utils/system-prompt-enhancer.js',
  'Phone_emulator/config.js',
];

const patterns = [
  ['IMPORT', /import\s+[\s\S]{0,300}?\s+from\s+['"][^'"]+['"]/g],
  ['SIDE_EFFECT_IMPORT', /import\s+['"][^'"]+['"]/g],
  ['EXPORT_DECL', /export\s+(?:default\s+)?(?:async\s+)?(?:class|function|const|let|var)\s+[A-Za-z_$][\w$]*/g],
  ['EXPORT_LIST', /export\s*\{[^}]{1,1500}\}/g],
  ['DYNAMIC_IMPORT', /import\s*\(\s*['"][^'"]+['"]\s*\)/g],
];

const keywords = [
  'getDefaultGenerator', 'getOptionalGenerator', 'initializeGenerator',
  'generateRaw', 'generate', 'apiPreset', 'preset', 'jailbreak',
  '破限', 'phone-preset', 'system-prompt', 'api-config', 'localStorage',
];

function clip(source, index, radius = 600) {
  const start = Math.max(0, index - radius);
  const end = Math.min(source.length, index + radius);
  return source.slice(start, end).replace(/\s+/g, ' ');
}

for (const target of targets) {
  const source = await readFile(target, 'utf8');
  console.log(`\n=== ${target} ===`);
  console.log(`SIZE ${source.length}`);

  for (const [label, regex] of patterns) {
    const matches = [...source.matchAll(regex)].slice(0, 80);
    console.log(`-- ${label} (${matches.length}) --`);
    for (const match of matches) console.log(match[0].slice(0, 1800));
  }

  for (const keyword of keywords) {
    let offset = 0;
    let count = 0;
    while (count < 8) {
      const index = source.toLowerCase().indexOf(keyword.toLowerCase(), offset);
      if (index < 0) break;
      console.log(`-- HIT ${keyword} @ ${index} --`);
      console.log(clip(source, index));
      offset = index + keyword.length;
      count += 1;
    }
  }

  console.log('-- HEAD --');
  console.log(source.slice(0, 5000).replace(/\s+/g, ' '));
  console.log('-- TAIL --');
  console.log(source.slice(-7000).replace(/\s+/g, ' '));
}

console.log('\nAUDIT_COMPLETE');
