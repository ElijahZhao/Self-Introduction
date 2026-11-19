/**
 * WebGL2 capability probe.
 *
 * The stage needs a real WebGL2 context: every character GLB is Draco-compressed
 * and the scene relies on texture formats only available in WebGL2. Probing up
 * front lets us show a readable fallback instead of letting `new WebGLRenderer()`
 * throw inside an effect, which would strand the visitor on a blank screen.
 */
export const isWebGL2Supported = (): boolean => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return false;
    // Some drivers hand out a context that immediately fails to compile; a
    // cheap getParameter round-trip catches the "context exists but is dead"
    // case that would otherwise blow up on the first render call.
    const version = gl.getParameter(gl.VERSION);
    return typeof version === 'string' && version.length > 0;
  } catch {
    return false;
  }
};
