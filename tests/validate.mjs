import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const manifestPath = path.join(root, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const errors = [];

for (const field of ['display_name', 'author', 'version', 'js']) {
  if (!manifest[field]) errors.push(`manifest missing required field: ${field}`);
}
for (const file of [manifest.js, manifest.css].filter(Boolean)) {
  if (!fs.existsSync(path.join(root, file))) errors.push(`manifest target missing: ${file}`);
}
if (manifest.minimum_client_version && !/^\d+\.\d+\.\d+$/.test(manifest.minimum_client_version)) {
  errors.push('minimum_client_version must be semver');
}

const jsFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.js') || entry.name.endsWith('.mjs')) jsFiles.push(full);
  }
}
walk(root);

for (const file of jsFiles) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  } catch (error) {
    errors.push(`syntax error: ${path.relative(root, file)}\n${error.stderr?.toString() || error.message}`);
  }

  const source = fs.readFileSync(file, 'utf8');
  const importRe = /(?:import\s+(?:[^'";]+?\s+from\s+)?|export\s+[^'";]+?\s+from\s+|import\s*\()(['"])(\.{1,2}\/[^'"]+)\1/g;
  for (const match of source.matchAll(importRe)) {
    const spec = match[2];
    const base = path.resolve(path.dirname(file), spec);
    const candidates = [base, `${base}.js`, `${base}.mjs`, path.join(base, 'index.js')];
    if (!candidates.some(candidate => fs.existsSync(candidate))) {
      errors.push(`missing relative import in ${path.relative(root, file)}: ${spec}`);
    }
  }
}

const cssEntry = manifest.css ? path.join(root, manifest.css) : null;
if (cssEntry && fs.existsSync(cssEntry)) {
  const css = fs.readFileSync(cssEntry, 'utf8');
  const importRe = /@import\s+url\((['"]?)([^)'"\s]+)\1\)/g;
  for (const match of css.matchAll(importRe)) {
    const target = path.resolve(path.dirname(cssEntry), match[2]);
    if (!fs.existsSync(target)) errors.push(`missing CSS import: ${match[2]}`);
  }
}

if (errors.length) {
  console.error(errors.join('\n\n'));
  process.exit(1);
}
console.log(`Validation passed: ${jsFiles.length} JavaScript modules checked.`);
