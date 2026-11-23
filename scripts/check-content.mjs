#!/usr/bin/env node
/**
 * Validate src/data/projects.json against the content contract.
 * Wired into CI before the build so a broken entry fails fast.
 */
import { loadProjects, validateContent } from './content.mjs';

const problems = validateContent(loadProjects());

if (problems.length > 0) {
  console.error(`projects.json: ${problems.length} problem(s)`);
  for (const problem of problems) console.error(`  ✗ ${problem}`);
  process.exit(1);
}
console.log('projects.json OK.');
