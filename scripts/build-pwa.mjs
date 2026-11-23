/* Stamps the hand-written service worker with a per-build id.
 *
 * The cache name derives from this id, so every deploy starts from a clean
 * cache and activate() can drop the previous one. GitHub Actions gives us the
 * commit sha; a local build falls back to a timestamp.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const DIST = 'dist';
if (!existsSync(DIST)) {
  console.error('[pwa] dist/ missing — run vite build first.');
  process.exit(1);
}

const buildId = (process.env.GITHUB_SHA || Date.now().toString(36)).slice(0, 8);
const template = await readFile('scripts/sw-template.js', 'utf8');
const stamped = template.replace('__BUILD_ID__', buildId);
await writeFile(`${DIST}/sw.js`, stamped, 'utf8');
console.log(`[pwa] sw.js written, cache stage-${buildId}`);
