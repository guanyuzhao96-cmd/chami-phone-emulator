import { pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve('.');
const stubUrl = pathToFileURL(path.resolve('tests/generated-stubs.mjs')).href;

function isExternalSillyTavernModule(specifier) {
  if (specifier === '/script.js' || specifier.endsWith('/script.js')) return true;
  if (specifier.startsWith('/') && specifier.endsWith('.js')) return true;
  if (specifier.startsWith('file:///') && specifier.endsWith('.js')) {
    const filePath = new URL(specifier).pathname;
    return !filePath.startsWith(root);
  }
  return false;
}

export async function resolve(specifier, context, nextResolve) {
  if (isExternalSillyTavernModule(specifier)) {
    return { url: stubUrl, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
