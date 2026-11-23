/**
 * Content contract for src/data/projects.json.
 *
 * The JSON is the single source for both the in-app project cards and the
 * generated /work/<slug>.html pages, so a broken entry would ship twice. Keep
 * the rules here instead of duplicating them in the generator.
 */
import { readFileSync } from 'node:fs';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const URL = /^https?:\/\/\S+$/;

/** @param {string} path */
export const loadProjects = (path = 'src/data/projects.json') =>
  JSON.parse(readFileSync(path, 'utf8'));

/**
 * @param {unknown} doc
 * @returns {string[]} problems (empty when valid)
 */
export const validateContent = (doc) => {
  /** @type {string[]} */
  const problems = [];
  if (!doc || typeof doc !== 'object') return ['projects.json is not an object'];
  const data = /** @type {any} */ (doc);
  if (typeof data.version !== 'number' || data.version < 1) problems.push('version must be a number ≥ 1');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.updatedAt || '')) problems.push('updatedAt must be YYYY-MM-DD');
  if (!Array.isArray(data.projects) || data.projects.length === 0) {
    problems.push('projects must be a non-empty array');
    return problems;
  }

  const seen = new Set();
  data.projects.forEach((/** @type {any} */ project, /** @type {number} */ index) => {
    const at = `projects[${index}]${project?.name ? ` (${project.name})` : ''}`;
    if (typeof project?.slug !== 'string' || !SLUG.test(project.slug)) {
      problems.push(`${at}: slug must be kebab-case`);
    } else if (seen.has(project.slug)) {
      problems.push(`${at}: duplicate slug ${project.slug}`);
    } else {
      seen.add(project.slug);
    }
    for (const field of ['name', 'tagline', 'desc', 'repoUrl']) {
      if (typeof project?.[field] !== 'string' || project[field].trim() === '') {
        problems.push(`${at}: ${field} is required`);
      }
    }
    if (typeof project?.repoUrl === 'string' && !URL.test(project.repoUrl)) {
      problems.push(`${at}: repoUrl must be an http(s) URL`);
    }
    for (const key of ['demoUrl', 'demoUrl2']) {
      if (project?.[key] && !URL.test(project[key])) problems.push(`${at}: ${key} must be an http(s) URL`);
    }
    if (!Array.isArray(project?.tech) || project.tech.length === 0) {
      problems.push(`${at}: tech must be a non-empty array`);
    }
    if (!Array.isArray(project?.highlights) || project.highlights.length === 0) {
      problems.push(`${at}: highlights must be a non-empty array`);
    }
  });

  return problems;
};
