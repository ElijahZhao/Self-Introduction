#!/usr/bin/env node
/**
 * Build static, JS-free detail pages for every project:
 *
 *   dist/work/<slug>.html
 *
 * Why this exists: the stage is a canvas app, so a crawler (or a link preview,
 * or someone with JS off) sees no project content at all. These pages are plain
 * HTML, shareable on their own, and linked from the in-app project cards.
 *
 * The same run regenerates dist/sitemap.xml so the pages are discoverable.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadProjects, validateContent } from './content.mjs';

const SITE = 'https://elijahzhao.github.io/Self-Introduction';
const OUT = join('dist', 'work');

const problems = validateContent(loadProjects());
if (problems.length > 0) {
  console.error('projects.json invalid, refusing to generate pages:');
  for (const problem of problems) console.error(`  ✗ ${problem}`);
  process.exit(1);
}

const { projects, updatedAt } = loadProjects();

const escape = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const clip = (value, max = 160) => {
  const text = String(value).replace(/\s+/g, ' ').trim();
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
};

const page = (project) => {
  const title = `${project.name} · ${project.tagline} — Elijah Zhao`;
  const description = clip(project.desc);
  const accent = project.accent || '#5ba8ff';
  const chips = project.tech.map((item) => `<li>${escape(item)}</li>`).join('');
  const highlights = project.highlights.map((item) => `<li>${escape(item)}</li>`).join('');
  const enHighlights = (project.highlightsEn || [])
    .map((item) => `<li>${escape(item)}</li>`)
    .join('');
  const demo = project.demoUrl
    ? `<a class="btn" href="${escape(project.demoUrl)}" target="_blank" rel="noopener noreferrer">在线 Demo</a>`
    : '';
  const demo2 = project.demoUrl2
    ? `<a class="btn ghost" href="${escape(project.demoUrl2)}" target="_blank" rel="noopener noreferrer">研究 Demo</a>`
    : '';
  const repo = `<a class="btn ghost" href="${escape(project.repoUrl)}" target="_blank" rel="noopener noreferrer">源码仓库</a>`;
  const papers = (project.papers || [])
    .map(
      (paper, pi) =>
        `<a class="btn ghost" href="${escape(paper.url)}" target="_blank" rel="noopener noreferrer">预印本${project.papers.length > 1 ? ` ${pi + 1}` : ''}</a>`
    )
    .join('');
  const papersSection =
    project.papers && project.papers.length > 0
      ? `<h2>预印本 / Preprints</h2>
  <ul class="papers">${project.papers
    .map(
      (paper) =>
        `<li><a href="${escape(paper.url)}" target="_blank" rel="noopener noreferrer">${escape(paper.title)}</a></li>`
    )
    .join('')}</ul>`
      : '';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: project.name,
    alternateName: project.nameEn,
    description: project.descEn || project.desc,
    url: `${SITE}/work/${project.slug}.html`,
    keywords: project.tech.join(', '),
    codeRepository: project.repoUrl,
    ...(project.papers && project.papers.length > 0
      ? { citation: project.papers.map((paper) => paper.url) }
      : {}),
    author: {
      '@type': 'Person',
      name: 'Elijah Zhao',
      url: SITE,
      sameAs: ['https://github.com/ElijahZhao', 'https://github.com/Elijah-Lin-Dancer'],
    },
    dateModified: updatedAt,
  };

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escape(title)}</title>
<meta name="description" content="${escape(description)}" />
<link rel="canonical" href="${SITE}/work/${project.slug}.html" />
<link rel="icon" type="image/svg+xml" href="../favicon.svg" />
<meta property="og:type" content="article" />
<meta property="og:title" content="${escape(title)}" />
<meta property="og:description" content="${escape(description)}" />
<meta property="og:image" content="${SITE}/og-image.jpg" />
<meta property="og:url" content="${SITE}/work/${project.slug}.html" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="theme-color" content="#f5f6f9" media="(prefers-color-scheme: light)" />
<meta name="theme-color" content="#0d1220" media="(prefers-color-scheme: dark)" />
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
<style>
  :root { --accent: ${accent}; --bg: #f4f6fb; --card: rgba(255,255,255,.92); --ink: #1f2937; --muted: #5b6577; --line: rgba(31,41,55,.1); }
  @media (prefers-color-scheme: dark) { :root { --bg: #0d1220; --card: rgba(20,27,43,.92); --ink: #e8edf7; --muted: #9aa7bd; --line: rgba(255,255,255,.12); } }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; padding: clamp(16px, 4vw, 56px); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
         color: var(--ink); background: radial-gradient(1200px 600px at 20% 0%, color-mix(in srgb, var(--accent) 18%, transparent), transparent), var(--bg); }
  .card { max-width: 720px; margin: 0 auto; background: var(--card); border: 1px solid var(--line); border-radius: 26px; padding: clamp(20px, 4vw, 44px);
          box-shadow: 0 26px 65px -30px rgba(28,42,72,.35); backdrop-filter: blur(18px); }
  .back { display: inline-block; font-size: 13px; color: var(--muted); text-decoration: none; margin-bottom: 26px; }
  .back:hover { color: var(--accent); }
  .kicker { margin: 0 0 6px; font-size: 12px; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }
  h1 { margin: 0; font-size: clamp(26px, 5vw, 40px); letter-spacing: -.02em; }
  .tagline { margin: 8px 0 0; font-size: clamp(14px, 2.4vw, 17px); font-weight: 600; color: var(--accent); }
  h2 { margin: 30px 0 10px; font-size: 13px; letter-spacing: .1em; text-transform: uppercase; color: var(--muted); }
  p { margin: 0; font-size: 15px; line-height: 1.75; }
  ul { margin: 0; padding: 0; list-style: none; display: flex; flex-wrap: wrap; gap: 8px; }
  .chips li { font-size: 12px; padding: 3px 9px; border-radius: 999px; background: color-mix(in srgb, var(--accent) 14%, transparent); color: var(--ink); }
  .facts li { display: flex; gap: 8px; font-size: 13px; color: var(--muted); width: 100%; }
  .facts li::before { content: '▸'; color: var(--accent); }
  .papers { display: block; }
  .papers li { font-size: 13px; line-height: 1.65; margin-bottom: 8px; color: var(--muted); }
  .papers a { color: var(--ink); text-decoration-color: color-mix(in srgb, var(--accent) 55%, transparent); text-underline-offset: 3px; }
  .papers a:hover { color: var(--accent); }
  .links { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 26px; }
  .btn { font-size: 13px; font-weight: 600; padding: 9px 14px; border-radius: 10px; color: #fff; background: var(--accent); text-decoration: none; }
  .btn.ghost { background: transparent; color: var(--ink); border: 1px solid var(--line); }
  .btn:hover { opacity: .9; }
  .en { margin-top: 34px; padding-top: 18px; border-top: 1px dashed var(--line); }
  footer { margin-top: 34px; font-size: 12px; line-height: 1.7; color: var(--muted); }
  footer a { color: var(--accent); }
</style>
</head>
<body>
<main class="card">
  <a class="back" href="../">← 返回 3D 展台</a>
  <p class="kicker">作品档案 · Elijah Zhao</p>
  <h1>${escape(project.name)}</h1>
  <p class="tagline">${escape(project.tagline)}</p>

  <h2>项目简介</h2>
  <p>${escape(project.desc)}</p>

  <h2>技术栈</h2>
  <ul class="chips">${chips}</ul>

  <h2>关键结果</h2>
  <ul class="facts">${highlights}</ul>

  ${papersSection}

  <div class="links">${demo}${demo2}${repo}${papers}</div>

  <section class="en" lang="en">
    <h2>English summary</h2>
    <p>${escape(project.descEn || project.desc)}</p>
    ${enHighlights ? `<ul class="facts" style="margin-top:14px">${enHighlights}</ul>` : ''}
  </section>

  <footer>
    本页是静态摘要，完整交互体验请返回 <a href="../">3D 星轨展台</a>。<br />
    数据来自 <code>src/data/projects.json</code>，更新于 ${updatedAt}。
  </footer>
</main>
</body>
</html>
`;
};

mkdirSync(OUT, { recursive: true });
for (const project of projects) {
  writeFileSync(join(OUT, `${project.slug}.html`), page(project), 'utf8');
}

const urls = [
  `  <url><loc>${SITE}/</loc><changefreq>monthly</changefreq><priority>1.0</priority></url>`,
  ...projects.map(
    (project) =>
      `  <url><loc>${SITE}/work/${project.slug}.html</loc><lastmod>${updatedAt}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>`
  ),
];
writeFileSync(
  join('dist', 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`,
  'utf8'
);

console.log(`work pages: ${projects.length} generated → dist/work/, sitemap updated.`);
