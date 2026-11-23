#!/usr/bin/env node
/**
 * Deploy size budget.
 *
 * This site ships every GLB from the repository, so a careless commit (an
 * uncompressed character, a stray archive model back in `public/`) can double
 * the payload without anyone noticing until a visitor on a phone waits ten
 * seconds. The budget is deliberately a hard ceiling, not a target.
 *
 *   dist total      <= 12 MiB   (currently ~10 MiB, GLBs dominate)
 *   app JS (assets) <= 1.25 MiB (currently ~1.2 MiB across two chunks)
 *   largest app JS  <= 0.65 MiB
 * (draco/ decoders are runtime payload, counted only in the dist total)
 *   all CSS         <= 60 KiB
 */
import { readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const DIST = 'dist';

const BUDGET = {
  totalBytes: 12 * 1024 * 1024,
  appJsBytes: 1.25 * 1024 * 1024,
  appChunkBytes: 0.65 * 1024 * 1024,
  cssBytes: 60 * 1024,
};

/** @param {string} dir @returns {{path: string, size: number}[]} */
const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return [{ path: full, size: statSync(full).size }];
});

const files = walk(DIST);
const sum = (list) => list.reduce((acc, file) => acc + file.size, 0);
const byExt = (ext) => files.filter((file) => extname(file.path) === ext);

const js = byExt('.js');
const appJs = js.filter((file) => file.path.split('/').includes('assets'));
const css = byExt('.css');
const total = sum(files);

const checks = [
  ['dist total', total, BUDGET.totalBytes],
  ['app JS', sum(appJs), BUDGET.appJsBytes],
  ['largest app JS', Math.max(0, ...appJs.map((f) => f.size)), BUDGET.appChunkBytes],
  ['all CSS', sum(css), BUDGET.cssBytes],
];

const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)} MiB`;
const kib = (bytes) => `${(bytes / 1024).toFixed(0)} KiB`;
const format = (name, bytes) => (/JS|CSS/.test(name) ? kib(bytes) : mb(bytes));

let failed = false;
for (const [name, actual, limit] of checks) {
  const ok = actual <= limit;
  if (!ok) failed = true;
  console.log(
    `${ok ? '✓' : '✗'} ${name.padEnd(18)} ${format(name, actual).padStart(10)} / ${format(name, limit)}`
  );
}

if (failed) {
  console.error('\nSize budget exceeded. Trim assets or raise the budget deliberately.');
  process.exit(1);
}
console.log('\nSize budget OK.');
