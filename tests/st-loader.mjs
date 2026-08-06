import { pathToFileURL } from 'node:url';
import path from 'node:path';

const stubUrl = pathToFileURL(path.resolve('tests/generated-stubs.mjs')).href;

export async function resolve(specifier, context, nextResolve) {
  const normalized = String(specifier);
  if (
    normalized.endsWith('/script.js') ||
    normalized.endsWith('/world-info.js') ||
    normalized.includes('/scripts/extensions.js') ||
    normalized.includes('/scripts/popup.js') ||
    normalized.includes('/scripts/utils.js')
  ) {
    return { url: stubUrl, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
