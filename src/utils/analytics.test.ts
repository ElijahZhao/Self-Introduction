import { describe, expect, it } from 'vitest';
import { isTrackingAllowed } from './analytics';

describe('isTrackingAllowed', () => {
  it('stays off when no collector is configured', () => {
    expect(isTrackingAllowed({ endpoint: undefined })).toBe(false);
    expect(isTrackingAllowed({ endpoint: '' })).toBe(false);
    expect(isTrackingAllowed({ endpoint: '   ' })).toBe(false);
  });

  it('ignores a malformed endpoint instead of posting to it', () => {
    expect(isTrackingAllowed({ endpoint: 'javascript:alert(1)' })).toBe(false);
    expect(isTrackingAllowed({ endpoint: '//evil.example/collect' })).toBe(false);
  });

  it('honours Do Not Track', () => {
    expect(isTrackingAllowed({ endpoint: 'https://collect.example/p', dnt: '1' })).toBe(false);
  });

  it('sends when a collector exists and DNT is absent or explicitly off', () => {
    expect(isTrackingAllowed({ endpoint: 'https://collect.example/p', dnt: null })).toBe(true);
    expect(isTrackingAllowed({ endpoint: 'http://localhost:8787/collect', dnt: '0' })).toBe(true);
  });
});
