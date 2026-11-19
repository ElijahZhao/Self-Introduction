/**
 * Connection hints used to decide whether background asset work is worth doing.
 *
 * The stage prewarms four more character GLBs (~4 MB) after the first character
 * is on screen. That is a great trade on wifi and a bad one on a phone that is
 * on a metered or slow link: the visitor pays for bytes they may never use, and
 * the decodes compete with the 3D loop.
 */
export interface NetworkHint {
  saveData?: boolean;
  effectiveType?: string;
  downlink?: number;
}

/** Read the browser's Network Information API, tolerating browsers without it. */
export const getConnectionHint = (): NetworkHint | null => {
  if (typeof navigator === 'undefined') return null;
  const nav = navigator as unknown as {
    connection?: NetworkHint;
    mozConnection?: NetworkHint;
    webkitConnection?: NetworkHint;
  };
  return nav.connection ?? nav.mozConnection ?? nav.webkitConnection ?? null;
};

/**
 * True when the visitor asked to save data, or the link is slow enough that a
 * multi-megabyte background download is not a courtesy.
 *
 * Unknown connections return false: a browser without the API is usually a
 * desktop browser on a decent link, and the prewarm is a real UX win there.
 */
export const shouldSkipPrewarm = (hint: NetworkHint | null | undefined): boolean => {
  if (!hint) return false;
  if (hint.saveData === true) return true;
  const effectiveType = (hint.effectiveType || '').toLowerCase();
  if (effectiveType === 'slow-2g' || effectiveType === '2g' || effectiveType === '3g') return true;
  // downlink is megabits per second; below ~1.5 Mbps the warm pass competes with
  // the visible scene for bandwidth.
  if (typeof hint.downlink === 'number' && hint.downlink > 0 && hint.downlink < 1.5) return true;
  return false;
};

/**
 * Same predicate as the prewarm gate, reused for the loading critical path: on a
 * constrained link, holding the whole overlay for two medium GLBs is worse than
 * letting their placeholders pop into detail later.
 */
export const isConstrainedConnection = shouldSkipPrewarm;
