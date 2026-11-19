import { describe, expect, it } from 'vitest';
import { getModelCandidateUrls, resolveAssetUrl } from './assetUrl';

describe('getModelCandidateUrls', () => {
  it('never falls back across releases via raw.githubusercontent', () => {
    const urls = getModelCandidateUrls('models/char-classic-capybara.glb');
    expect(urls.some((u) => u.includes('raw.githubusercontent.com'))).toBe(false);
  });

  it('keeps local fallbacks in a stable order', () => {
    const urls = getModelCandidateUrls('models/saturn.glb');
    expect(urls[0]).toMatch(/saturn\.glb$/);
    expect(urls).toContain('./models/saturn.glb');
  });

  it('passes through absolute and blob/data urls untouched', () => {
    expect(getModelCandidateUrls('https://example.com/a.glb')).toEqual(['https://example.com/a.glb']);
    expect(getModelCandidateUrls('blob:abc')).toEqual(['blob:abc']);
  });

  it('strips a leading slash before resolving', () => {
    expect(resolveAssetUrl('/models/a.glb')).not.toContain('//models');
  });
});
