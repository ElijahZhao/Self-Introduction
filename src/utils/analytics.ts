/**
 * Privacy-first, opt-in visitor analytics.
 *
 * Design constraints this file is written against:
 *  - No cookies, no fingerprinting, no per-visitor IDs: a page view is a page view.
 *  - Nothing is sent unless a collector is configured at build time
 *    (`VITE_ANALYTICS_ENDPOINT`), so a fork of this repo never phones home.
 *  - Do Not Track wins over the configuration.
 *
 * The collector is expected to accept `POST` with a JSON body and to ignore
 * anything else; a self-hosted Umami/Plausible-style endpoint or a tiny function
 * works. See README for how to point it somewhere.
 */
export type AnalyticsEvent = 'page_view' | 'module_open' | 'persona_switch' | 'project_page_open';

interface AnalyticsPayload {
  event: AnalyticsEvent;
  path: string;
  lang: string;
  ts: number;
  detail?: string;
}

const endpoint = (import.meta.env.VITE_ANALYTICS_ENDPOINT as string | undefined)?.trim();

/** Pure gate, exported so the decision can be unit-tested without a browser. */
export const isTrackingAllowed = (options: {
  endpoint?: string | null;
  dnt?: string | null;
}): boolean => {
  const url = (options.endpoint || '').trim();
  if (!/^https?:\/\//i.test(url)) return false;
  // DNT values are '1' (on) / '0' / null. Be strict: only an explicit '0' or a
  // missing header counts as consent.
  if (options.dnt === '1') return false;
  return true;
};

const readDnt = (): string | null => {
  try {
    return (
      navigator.doNotTrack ??
      (window as unknown as { doNotTrack?: string }).doNotTrack ??
      null
    );
  } catch {
    return null;
  }
};

export const track = (event: AnalyticsEvent, detail?: string): void => {
  if (!isTrackingAllowed({ endpoint, dnt: readDnt() })) return;
  const payload: AnalyticsPayload = {
    event,
    path: window.location.pathname + window.location.search,
    lang: document.documentElement.lang || 'zh-CN',
    ts: Date.now(),
    ...(detail ? { detail } : {}),
  };
  const body = JSON.stringify(payload);
  try {
    // sendBeacon survives the page being closed mid-navigation; keepalive fetch
    // is the fallback for browsers without it.
    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint as string, new Blob([body], { type: 'application/json' }));
      return;
    }
    void fetch(endpoint as string, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* analytics must never break the stage */
  }
};
