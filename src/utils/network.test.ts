import { describe, expect, it } from 'vitest';
import { isConstrainedConnection, shouldSkipPrewarm } from './network';

describe('shouldSkipPrewarm', () => {
  it('keeps the prewarm when the connection is unknown', () => {
    expect(shouldSkipPrewarm(null)).toBe(false);
    expect(shouldSkipPrewarm(undefined)).toBe(false);
    expect(shouldSkipPrewarm({})).toBe(false);
  });

  it('honours an explicit saveData request', () => {
    expect(shouldSkipPrewarm({ saveData: true, effectiveType: '4g' })).toBe(true);
  });

  it('skips on 2G/3G but keeps 4G', () => {
    expect(shouldSkipPrewarm({ effectiveType: '2g' })).toBe(true);
    expect(shouldSkipPrewarm({ effectiveType: 'slow-2g' })).toBe(true);
    expect(shouldSkipPrewarm({ effectiveType: '3g' })).toBe(true);
    expect(shouldSkipPrewarm({ effectiveType: '4g' })).toBe(false);
  });

  it('skips on a very slow downlink and keeps a fast one', () => {
    expect(shouldSkipPrewarm({ downlink: 0.6 })).toBe(true);
    expect(shouldSkipPrewarm({ downlink: 10 })).toBe(false);
    // 0 means "unknown" in the spec, so it must not be read as slow.
    expect(shouldSkipPrewarm({ downlink: 0 })).toBe(false);
  });
});

describe('isConstrainedConnection', () => {
  it('is the same gate the loader uses for the critical path', () => {
    expect(isConstrainedConnection({ saveData: true })).toBe(true);
    expect(isConstrainedConnection({ effectiveType: '4g', downlink: 8 })).toBe(false);
    expect(isConstrainedConnection(null)).toBe(false);
  });
});
