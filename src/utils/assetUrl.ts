/// <reference types="vite/client" />

/**
 * Asset URL resolution utilities.
 * Handles subpath deployments (such as GitHub Pages: /<repo-name>/)
 * and falls back gracefully to relative or raw CDN sources.
 */

export function resolveAssetUrl(relativePath: string): string {
  if (!relativePath) return '';
  if (/^(?:https?:|blob:|data:|\/\/)/i.test(relativePath)) {
    return relativePath;
  }

  const cleanPath = relativePath.replace(/^\/+/, '');

  if (typeof window !== 'undefined') {
    try {
      let base = document.baseURI || window.location.href;
      const urlObj = new URL(base);
      // Ensure directory ending with /
      if (!urlObj.pathname.endsWith('/') && !urlObj.pathname.split('/').pop()?.includes('.')) {
        urlObj.pathname += '/';
        base = urlObj.href;
      }
      return new URL(cleanPath, base).href;
    } catch (e) {
      console.warn('resolveAssetUrl error:', e);
    }
  }

  const base = import.meta.env.BASE_URL || './';
  const cleanBase = base.endsWith('/') ? base : `${base}/`;
  return `${cleanBase}${cleanPath}`;
}

export function getModelCandidateUrls(rawPath: string): string[] {
  if (/^(?:blob:|data:)/i.test(rawPath)) {
    return [rawPath];
  }
  const cleanPath = rawPath.replace(/^\/+/, '');
  const list: string[] = [];

  // 1. Primary: document baseURI / current pathname resolved
  const primary = resolveAssetUrl(cleanPath);
  list.push(primary);

  // 2. Relative to current HTML directory
  const relativeDot = `./${cleanPath}`;
  if (!list.includes(relativeDot)) list.push(relativeDot);

  // 3. Absolute root path (for dev server or root domain)
  const absoluteRoot = `/${cleanPath}`;
  if (!list.includes(absoluteRoot)) list.push(absoluteRoot);

  // 4. Reliable GitHub Raw fallback (CORS enabled)
  const githubRaw = `https://raw.githubusercontent.com/ElijahZhao/Self-Introduction/main/public/${cleanPath}`;
  if (!list.includes(githubRaw)) list.push(githubRaw);

  return list;
}
