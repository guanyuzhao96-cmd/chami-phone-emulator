import { pathToFileURL } from 'node:url';
import path from 'node:path';

const stubUrl = pathToFileURL(path.resolve('tests/generated-stubs.mjs')).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('/') && specifier.endsWith('.js')) {
    return { url: stubUrl, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
