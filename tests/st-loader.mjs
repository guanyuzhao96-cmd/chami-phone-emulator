import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve('.');
const stubUrl = pathToFileURL(path.resolve('tests/generated-stubs.mjs')).href;

function escapesRoot(specifier, parentURL) {
  if (!parentURL || !specifier.endsWith('.js')) return false;
  try {
    const resolved = new URL(specifier, parentURL);
    if (resolved.protocol !== 'file:') return false;
    const filePath = fileURLToPath(resolved);
    return !filePath.startsWith(`${root}${path.sep}`) && filePath !== root;
  } catch {
    return false;
  }
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('/') || escapesRoot(specifier, context.parentURL)) {
    return { url: stubUrl, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
