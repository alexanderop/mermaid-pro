import fs from 'node:fs';
import path from 'node:path';

/**
 * Which Mermaid version will render this file? Walk up to the nearest
 * package.json and read the first matching dependency. Packages that bundle
 * Mermaid only tell us the major, so their version is a floor (`approx`).
 *
 * @typedef {{ version: string, source: string, approx: boolean }} Target
 */

// Order matters: an explicit mermaid dependency beats a wrapper package.
const WRAPPERS = [
  { dep: '@slidev/cli', version: '12.0.0' },
  { dep: '@slidev/client', version: '12.0.0' },
  { dep: '@docusaurus/theme-mermaid', version: '11.6.0' },
  { dep: 'vitepress-plugin-mermaid', version: '11.0.0' },
  { dep: 'astro-mermaid', version: '11.0.0' },
];

const cache = new Map();

/** @returns {Target | null} */
export function findTarget(file) {
  let dir = path.dirname(path.resolve(file));
  for (;;) {
    if (cache.has(dir)) return cache.get(dir);
    const pkgPath = path.join(dir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const target = fromPackage(dir, pkgPath);
      cache.set(dir, target);
      return target;
    }
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function fromPackage(dir, pkgPath) {
  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  } catch {
    return null;
  }
  const deps = { ...pkg.peerDependencies, ...pkg.devDependencies, ...pkg.dependencies };

  if (deps.mermaid) {
    // The installed copy is the truth; the range only says what is allowed.
    const installed = readVersion(path.join(dir, 'node_modules', 'mermaid', 'package.json'));
    const version = installed ?? floorOf(deps.mermaid);
    if (version) return { version, source: 'mermaid', approx: false };
  }
  for (const w of WRAPPERS) {
    if (deps[w.dep]) return { version: w.version, source: w.dep, approx: true };
  }
  return null;
}

function readVersion(pkgPath) {
  try {
    return JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version ?? null;
  } catch {
    return null;
  }
}

// "^11.4.0" -> "11.4.0", "~12" -> "12.0.0"; "latest" / "workspace:*" -> null.
function floorOf(range) {
  const m = /(\d+)(?:\.(\d+))?(?:\.(\d+))?/.exec(range);
  return m ? `${m[1]}.${m[2] ?? 0}.${m[3] ?? 0}` : null;
}

/** True when semver `a` is newer than `b`. */
export function isNewer(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) > (pb[i] ?? 0);
  }
  return false;
}
