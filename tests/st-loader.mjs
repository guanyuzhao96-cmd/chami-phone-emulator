import { pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve('.');
const stubUrl = pathToFileURL(path.resolve('tests/generated-stubs.mjs')).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('/') && specifier.endsWith('.js')) {
    return { url: stubUrl, shortCircuit: true };
  }
  if (specifier.startsWith('file:///') && specifier.endsWith('.js')) {
    const filePath = new URL(specifier).pathname;
    if (!filePath.startsWith(root)) {
      return { url: stubUrl, shortCircuit: true };
    }
  }
  return nextResolve(specifier, context);
}
