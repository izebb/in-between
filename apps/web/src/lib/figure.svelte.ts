/**
 * Figure playback policy: a figure plays only while it is on screen, never under
 * reduced motion or its plate's "Still" toggle. Stillness is the canvas.
 */
import { prefs } from "./prefs.svelte";

export interface Playable {
  play(): void;
  pause(): void;
}

/** Svelte action: autoplay a transport while visible and allowed. Also exposes still state. */
export function figurePlay(node: HTMLElement, opts: { transport: Playable; onstill?: (still: boolean) => void; autoplay?: boolean }) {
  prefs.start();
  let visible = false;
  let plateStill = false;
  let o = opts;
  const plate = node.closest(".plate");
  plateStill = plate?.classList.contains("is-still") ?? false;

  const apply = () => {
    const still = prefs.reduced || plateStill;
    o.onstill?.(still);
    if (visible && !still && o.autoplay !== false) o.transport.play();
    else o.transport.pause();
  };
  const io = new IntersectionObserver((entries) => {
    visible = entries.some((e) => e.isIntersecting);
    apply();
  }, { threshold: 0.2 });
  io.observe(node);
  const onStill = (e: Event) => {
    plateStill = (e as CustomEvent<boolean>).detail;
    apply();
  };
  plate?.addEventListener("ib:still", onStill);
  const off = () => apply();
  addEventListener("ib:prefs", off);
  const mq = matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", off);
  apply();
  return {
    update(next: typeof opts) {
      o = next;
      apply();
    },
    destroy() {
      io.disconnect();
      plate?.removeEventListener("ib:still", onStill);
      removeEventListener("ib:prefs", off);
      mq.removeEventListener("change", off);
      o.transport.pause();
    },
  };
}
