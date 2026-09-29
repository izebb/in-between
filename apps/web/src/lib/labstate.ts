/**
 * Lab state in the URL: ?s=<base64url JSON>. Snippet cards link to "Open in Lab"
 * with the exact state loaded; the Journal saves the same objects.
 */
import { encodeState, decodeState } from "@inbetween/codegen";

export function readUrlState<T>(): T | null {
  if (typeof location === "undefined") return null;
  const s = new URLSearchParams(location.search).get("s");
  return s ? decodeState<T>(s) : null;
}

let pendingWrite: ReturnType<typeof setTimeout> | null = null;

/** Keep the URL in step with the lab. Trailing, so a slider drag is one history write, not sixty a second
 *  (browsers throttle replaceState and warn past a couple of hundred calls in ten seconds). */
export function writeUrlState(state: unknown) {
  if (typeof history === "undefined") return;
  if (pendingWrite) clearTimeout(pendingWrite);
  const path = location.pathname;
  pendingWrite = setTimeout(() => {
    pendingWrite = null;
    if (location.pathname !== path) return; // left the page (client-side navigation) meanwhile
    const url = new URL(location.href);
    url.searchParams.set("s", encodeState(state));
    history.replaceState(history.state, "", url);
  }, 250);
}

export function labUrl(instrument: string, state?: unknown): string {
  return `/lab/${instrument}${state ? `?s=${encodeState(state)}` : ""}`;
}
