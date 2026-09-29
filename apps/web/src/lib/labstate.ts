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

export function writeUrlState(state: unknown) {
  if (typeof history === "undefined") return;
  const url = new URL(location.href);
  url.searchParams.set("s", encodeState(state));
  history.replaceState(history.state, "", url);
}

export function labUrl(instrument: string, state?: unknown): string {
  return `/lab/${instrument}${state ? `?s=${encodeState(state)}` : ""}`;
}
