/**
 * Reactive view of the motion policy and theme, shared by every island on the page.
 */
import { onMotionPolicyChange, prefersReducedMotion } from "~/motion/policy";
import { readPencils, type Pencils } from "./specimens";

class Prefs {
  reduced = $state(false);
  pencils = $state<Pencils>({ ink: "#16161A", graphite: "#8A8880", rule: "#E2DED5", blue: "#3D6BFF", red: "#FF3B1F", paper: "#F5F3EE" });
  private started = false;

  start() {
    if (this.started || typeof window === "undefined") return;
    this.started = true;
    const sync = () => {
      this.reduced = prefersReducedMotion();
      this.pencils = readPencils();
    };
    sync();
    onMotionPolicyChange(sync);
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", sync);
    document.addEventListener("astro:after-swap", sync);
  }
}

export const prefs = new Prefs();

/**
 * A figure's own "Still" toggle (in its plate caption). Combine with prefs.reduced:
 *   const still = $derived(prefs.reduced || plateStill);
 * Returns a cleanup function.
 */
export function watchPlateStill(node: HTMLElement, set: (still: boolean) => void): () => void {
  prefs.start();
  const plate = node.closest(".plate");
  set(plate?.classList.contains("is-still") ?? false);
  const onStill = (e: Event) => set((e as CustomEvent<boolean>).detail);
  plate?.addEventListener("ib:still", onStill);
  return () => plate?.removeEventListener("ib:still", onStill);
}
