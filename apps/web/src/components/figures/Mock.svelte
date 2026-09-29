<script lang="ts" module>
  export type MockKind =
    | "dot"
    | "card"
    | "modal"
    | "toast"
    | "menu"
    | "list"
    | "drawer"
    | "toggle"
    | "like"
    | "drop"
    | "expand"
    | "swap"
    | "tabs"
    | "badge"
    | "progress";

  export interface MockMotion {
    easing?: string;
    duration?: number;
    /** How far it travels, px. 0 = it fades in place (a dialog or menu then doesn't scale either). */
    distance?: number;
    stagger?: number;
    /** Exit timing (for direction "exit" or "loop"). Defaults to 0.7× the enter, ease-in. */
    exitEasing?: string;
    exitDuration?: number;
    /** 0 duration = no motion at all: the state just changes. */
    none?: boolean;
    /** transform-origin for the scaling part (menu, dialog, panel), e.g. "top left" or "center". */
    origin?: string;
  }
</script>

<script lang="ts">
  /**
   * A small UI specimen that performs one state change with a given motion.
   * Real WAAPI on real elements: what you see is what the browser does with those numbers.
   */
  import { onDestroy, untrack } from "svelte";
  import { easingFn } from "@inbetween/core";
  import { parseSpec, waapiTiming } from "~/lib/spec";
  import { duration, easingCss } from "~/motion/tokens";

  interface Props {
    kind: MockKind;
    motion?: MockMotion;
    direction?: "enter" | "exit" | "loop";
    label?: string;
    height?: number;
  }
  let { kind, motion = {}, direction = "enter", label, height = 190 }: Props = $props();

  let root: HTMLDivElement;
  let running: Animation[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;
  let shown = $state(true);

  interface Part {
    sel: string;
    frames: Keyframe[];
    /** Delay multiplier for staggered parts. */
    order?: number;
    origin?: string;
    /** The frames were measured against this origin, so a motion's `origin` must not replace it. */
    lockOrigin?: boolean;
    /**
     * A gesture made of several beats (press, then pop) carries its easing on each keyframe and runs
     * linear overall: one curve across all the beats would squeeze the first beat into a few ms.
     */
    beats?: boolean;
  }

  function partsFor(k: MockKind, d: number, w: number, h: number): Part[] {
    switch (k) {
      case "dot": {
        // The dot crosses the track. A curve that overshoots, or pulls back first, is fitted inside it (as its
        // thumbnail is, in Match the curve), so the dot never leaves the stage. Most curves reach 0 and 1 only.
        const f = easingFn(parseSpec(motion.easing ?? "--ease-out")).ease;
        let lo = 0;
        let hi = 1;
        for (let i = 1; i < 100; i++) {
          const y = f(i / 100);
          lo = Math.min(lo, y);
          hi = Math.max(hi, y);
        }
        const span = (w - 58) / (hi - lo);
        root.querySelector<HTMLElement>(".m-dot")!.style.left = `${-lo * span}px`;
        return [{ sel: ".m-dot", frames: [{ transform: "translateX(0)" }, { transform: `translateX(${span}px)` }] }];
      }
      case "card":
        return [{ sel: ".m-card", frames: [{ opacity: 0, transform: `translateY(${d}px)` }, { opacity: 1, transform: "none" }] }];
      case "modal":
        return [
          { sel: ".m-backdrop", frames: [{ opacity: 0 }, { opacity: 1 }] },
          { sel: ".m-dialog", frames: [{ opacity: 0, transform: d === 0 ? "none" : "scale(0.92)" }, { opacity: 1, transform: "none" }] },
        ];
      case "toast":
        return [{ sel: ".m-toast", frames: [{ opacity: 0, transform: `translateY(${d * 2}px)` }, { opacity: 1, transform: "none" }] }];
      case "menu":
        return [{ sel: ".m-menu", frames: [{ opacity: 0, transform: d === 0 ? "none" : "scale(0.8)" }, { opacity: 1, transform: "none" }], origin: "top left" }];
      case "list":
        return [0, 1, 2, 3, 4].map((i) => ({
          sel: `.m-row:nth-child(${i + 1})`,
          frames: [{ opacity: 0, transform: `translateY(${d}px)` }, { opacity: 1, transform: "none" }],
          order: i,
        }));
      case "drawer":
        return [
          { sel: ".m-backdrop", frames: [{ opacity: 0 }, { opacity: 1 }] },
          { sel: ".m-drawer", frames: [{ transform: "translateX(100%)" }, { transform: "none" }] },
        ];
      case "toggle":
        return [
          { sel: ".m-knob", frames: [{ transform: "translateX(0)" }, { transform: "translateX(22px)" }] },
          { sel: ".m-switch", frames: [{ backgroundColor: "var(--rule)" }, { backgroundColor: "var(--ink)" }] },
        ];
      case "like":
        // Unliked (outline) → the press squashes it flat → it fills and stretches up → settles, liked.
        return [{
          sel: ".m-heart",
          origin: "50% 85%",
          beats: true,
          frames: [
            { transform: "none", fill: "transparent", offset: 0, easing: "ease-in" },
            { transform: "scale(1.18, 0.78)", fill: "transparent", offset: 0.28, easing: "ease-out" },
            { transform: "scale(0.9, 1.16)", fill: "var(--red-pencil)", offset: 0.56, easing: "ease-in-out" },
            { transform: "scale(1.04, 0.97)", offset: 0.8, easing: "ease-out" },
            { transform: "none", fill: "var(--red-pencil)" },
          ],
        }];
      case "drop":
        return [{ sel: ".m-ball", frames: [{ transform: `translateY(-${h - 70}px)` }, { transform: "none" }] }];
      case "expand": {
        // FLIP: start the panel exactly on the tile it opens from, so it reads as that tile growing.
        const panel = root.querySelector<HTMLElement>(".m-panel")!;
        const tile = root.querySelector<HTMLElement>(".m-grid .m-open")!;
        const sx = tile.offsetWidth / panel.offsetWidth;
        const sy = tile.offsetHeight / panel.offsetHeight;
        const dx = tile.offsetLeft - panel.offsetLeft;
        const dy = tile.offsetTop - panel.offsetTop;
        return [
          {
            sel: ".m-panel",
            origin: "top left",
            lockOrigin: true,
            // It starts as the tile itself: the tile's colour, flat, no edge, and (counter-scaled) its own
            // 6px corners. It lifts into the panel as it grows.
            frames: [
              {
                transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`,
                borderRadius: `${6 / sx}px / ${6 / sy}px`,
                backgroundColor: "var(--m-tile)",
                borderColor: "transparent",
                boxShadow: "0 16px 40px -20px rgb(0 0 0 / 0)",
              },
              { transform: "none", borderRadius: "8px", backgroundColor: "var(--paper-raised)", borderColor: "var(--rule)", boxShadow: "0 16px 40px -20px rgb(0 0 0 / 0.5)" },
            ],
          },
          // The panel's content would be squashed while it grows, so it fades in once there's room.
          { sel: ".m-panel .l", frames: [{ opacity: 0 }, { opacity: 0, offset: 0.45 }, { opacity: 1 }] },
        ];
      }
      case "swap": {
        // Measured from the layout: the item starts in the left list's first slot and ends as the
        // right list's third. The two items it leaves behind move up one slot to close the gap.
        const mover = root.querySelector<HTMLElement>(".m-mover")!;
        const stays = root.querySelectorAll<HTMLElement>(".m-stay");
        const dx = stays[0].offsetLeft - mover.offsetLeft;
        const dy = stays[0].offsetTop - mover.offsetTop;
        const pitch = stays[1].offsetTop - stays[0].offsetTop;
        return [
          { sel: ".m-mover", frames: [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }] },
          { sel: ".m-stay", frames: [{ transform: `translateY(${pitch}px)` }, { transform: "none" }] },
        ];
      }
      case "tabs":
        return [{ sel: ".m-ink", frames: [{ transform: "translateX(0)" }, { transform: "translateX(100%)" }] }];
      case "badge":
        // Not scale(0): a glide back reads the live transform as a matrix, and a matrix can't be tweened
        // into a flat one (it has no inverse), so the badge would blink out instead of shrinking.
        return [{ sel: ".m-badge", frames: [{ transform: "scale(0.001)" }, { transform: "scale(1)" }] }];
      case "progress":
        return [{ sel: ".m-fill", frames: [{ transform: "scaleX(0.15)" }, { transform: "scaleX(1)" }], origin: "left" }];
    }
  }

  type Pose = "shown" | "hidden" | "between";
  /**
   * Where the specimen is held. null: nothing holds it, so it sits in its CSS pose, which is the shown
   * (end-of-enter) pose for every kind but the dot, which rests where it starts.
   */
  let pose: Pose | null = null;
  /** Bumped by every play, cue or stop: an older sequence that wakes up after being replaced ends there. */
  let gen = 0;
  /** The pose the running (or last) loop started from, and returns to; and whether one is under way. */
  let loopFrom: "shown" | "hidden" = "hidden";
  let looping = false;
  const poseNow = (): Pose => pose ?? (kind === "dot" ? "hidden" : "shown");
  /** The clip's first frame: an exit starts shown, an enter (or a loop) starts hidden. */
  const firstPose = (): "shown" | "hidden" => (direction === "exit" ? "shown" : "hidden");
  const wait = (ms: number) => new Promise<void>((r) => (timer = setTimeout(r, ms)));

  function cancelAll() {
    for (const a of running) a.cancel();
    running = [];
  }

  function stop() {
    gen++;
    looping = false;
    cancelAll();
    if (timer) clearTimeout(timer);
    timer = null;
    pose = null;
  }

  function currentParts() {
    return partsFor(kind, motion.distance ?? 16, root.clientWidth, root.clientHeight);
  }

  function setOrigin(el: HTMLElement, p: Part) {
    if (p.lockOrigin) el.style.transformOrigin = p.origin!;
    else if (p.origin || (motion.origin && /menu|dialog|panel|badge/.test(p.sel))) el.style.transformOrigin = motion.origin ?? p.origin!;
  }

  /** A part's frame for a pose, without its timing keys. */
  function frameAt(p: Part, which: "shown" | "hidden"): Keyframe {
    const { offset: _o, easing: _e, composite: _c, ...rest } = which === "hidden" ? p.frames[0] : p.frames[p.frames.length - 1];
    return rest;
  }

  const settle = (anims: Animation[], to: Pose, g: number) =>
    Promise.all(anims.map((a) => a.finished.catch(() => undefined))).then(() => {
      if (g === gen) pose = to;
    });

  /** Hold every part on a pose at once: a cut. */
  function hold(which: "shown" | "hidden") {
    cancelAll();
    for (const p of currentParts()) {
      root.querySelectorAll<HTMLElement>(p.sel).forEach((el) => {
        setOrigin(el, p);
        const f = frameAt(p, which);
        running.push(el.animate([f, f], { duration: 0, fill: "both" }));
      });
    }
    pose = which;
  }

  /**
   * Glide from wherever each part is now, mid-flight or at rest, to a pose. Read every value *before*
   * cancelling what holds it: once cancelled, the computed style is the CSS rest.
   */
  function glide(which: "shown" | "hidden", g: number): Promise<void> {
    const plan: { el: HTMLElement; p: Part; from: Keyframe; to: Keyframe }[] = [];
    for (const p of currentParts()) {
      root.querySelectorAll<HTMLElement>(p.sel).forEach((el) => {
        const to = frameAt(p, which);
        const cs = getComputedStyle(el) as unknown as Record<string, string>;
        const from = Object.fromEntries(Object.keys(to).map((k) => [k, cs[k]]));
        plan.push({ el, p, from, to });
      });
    }
    cancelAll();
    const anims = plan.map(({ el, p, from, to }) => {
      setOrigin(el, p);
      return el.animate([from, to], { duration: duration.quick, easing: easingCss.inout, fill: "both" });
    });
    running.push(...anims);
    pose = "between";
    return settle(anims, which, g);
  }

  function run(dir: "enter" | "exit", g: number): Promise<void> {
    const parts = currentParts();
    const enterSpec = parseSpec(motion.easing ?? "--ease-out");
    const enterT = waapiTiming(enterSpec, motion.duration ?? 280);
    const exitT = waapiTiming(parseSpec(motion.exitEasing ?? "--ease-in"), motion.exitDuration ?? Math.round((motion.duration ?? 280) * 0.7));
    const t = dir === "enter" ? enterT : exitT;
    const none = motion.none || t.duration === 0;
    // It starts from the pose the last motion left it in, so dropping that motion shows no jump.
    cancelAll();
    const anims: Animation[] = [];
    for (const p of parts) {
      root.querySelectorAll<HTMLElement>(p.sel).forEach((el) => {
        setOrigin(el, p);
        const frames = dir === "enter" ? p.frames : [...p.frames].reverse().map((f) => ({ ...f, offset: f.offset != null ? 1 - (f.offset as number) : undefined }));
        const a = el.animate(frames, {
          duration: none ? 0 : t.duration,
          easing: p.beats ? "linear" : t.easing,
          delay: none ? 0 : (p.order ?? 0) * (motion.stagger ?? 0),
          fill: "both",
        });
        anims.push(a);
      });
    }
    running.push(...anims);
    pose = "between";
    return settle(anims, dir === "enter" ? "shown" : "hidden", g);
  }

  /**
   * Play the state change from the start. An enter starts hidden and an exit shown; a loop goes to the
   * other state and back from whichever one it rests in, so it ends where it began. If the specimen isn't
   * on that first frame, even mid-flight, it goes back there first: a quick glide (a cut, when its motion
   * is a cut), then a beat, so a replay never jumps and the clip itself starts clean.
   */
  export async function play() {
    if (!root) return;
    const g = ++gen;
    if (timer) clearTimeout(timer);
    const alive = () => g === gen;
    const now = poseNow();
    // Replayed during a loop (moving, or holding at the far end), it goes back to where that loop began.
    const start: "shown" | "hidden" = direction === "loop" ? (looping || now === "between" ? loopFrom : now) : firstPose();
    if (now !== start) {
      if (motion.none) {
        // A cut: gone, then simply there. Without the gap there'd be nothing to see.
        hold(start);
        await wait(260);
      } else {
        await glide(start, g);
        if (!alive()) return;
        await wait(duration.quick);
      }
      if (!alive()) return;
    }
    if (direction === "loop") {
      loopFrom = start;
      looping = true;
      await run(start === "hidden" ? "enter" : "exit", g);
      if (!alive()) return;
      await wait(700);
      if (!alive()) return;
      await run(start === "hidden" ? "exit" : "enter", g);
      if (alive()) looping = false;
    } else await run(direction, g);
  }

  /** Hold the clip's first frame, ready to play: for a specimen that is about to play by itself. */
  export function cue() {
    if (!root) return;
    gen++;
    looping = false;
    if (timer) clearTimeout(timer);
    hold(firstPose());
  }

  /** Show the CSS rest (the end state; the dot's start) without motion. */
  export function rest() {
    stop();
    shown = direction !== "exit";
  }

  // Place the dot for its curve before anything plays (an anticipating curve starts it a little way in).
  $effect(() => {
    void motion.easing;
    if (kind === "dot") untrack(() => root && currentParts());
  });

  onDestroy(stop);
</script>

<div class="mock mock-{kind}" bind:this={root} style={`height:${height}px`} role="img" aria-label={label ?? `${kind} specimen`} data-shown={shown}>
  {#if kind === "dot"}
    <div class="m-track"><div class="m-dot"></div></div>
  {:else if kind === "card"}
    <div class="m-card"><div class="l w60"></div><div class="l w90"></div><div class="l w75"></div></div>
  {:else if kind === "modal"}
    <div class="m-page"><div class="l w40"></div><div class="l w80"></div><div class="l w70"></div></div>
    <div class="m-backdrop"></div>
    <div class="m-dialog"><div class="l w50 dark"></div><div class="l w90"></div><div class="m-btns"><span></span><span class="solid"></span></div></div>
  {:else if kind === "toast"}
    <div class="m-page"><div class="l w40"></div><div class="l w80"></div></div>
    <div class="m-toast"><span class="tick"></span><div class="l w60 light"></div></div>
  {:else if kind === "menu"}
    <div class="m-button">Sort ▾</div>
    <div class="m-menu"><div class="l w70"></div><div class="l w60"></div><div class="l w80"></div></div>
  {:else if kind === "list"}
    <div class="m-list">{#each Array(5) as _, i (i)}<div class="m-row"><span class="av"></span><div class="l" style={`width:${[70, 55, 80, 60, 72][i]}%`}></div></div>{/each}</div>
  {:else if kind === "drawer"}
    <div class="m-page"><div class="l w40"></div><div class="l w80"></div><div class="l w70"></div></div>
    <div class="m-backdrop"></div>
    <div class="m-drawer"><div class="l w70 dark"></div><div class="l w90"></div><div class="l w80"></div><div class="l w60"></div></div>
  {:else if kind === "toggle"}
    <div class="m-setting"><div class="l w50"></div><div class="m-switch"><div class="m-knob"></div></div></div>
  {:else if kind === "like"}
    <div class="m-heart-wrap"><svg class="m-heart" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.2-9.3C1.6 7.9 3.7 4.8 7 4.8c2 0 3.5 1.1 5 3 1.5-1.9 3-3 5-3 3.3 0 5.4 3.1 4.2 6.4-1.7 4.7-9.2 9.3-9.2 9.3z" /></svg></div>
  {:else if kind === "drop"}
    <div class="m-floor"><div class="m-ball"></div></div>
  {:else if kind === "expand"}
    <div class="m-grid"><span class="m-open"></span><span></span><span></span><span></span></div>
    <div class="m-panel"><div class="l w50 dark"></div><div class="l w90"></div><div class="l w80"></div></div>
  {:else if kind === "swap"}
    <div class="m-cols">
      <div class="m-col"><span class="m-stay"></span><span class="m-stay"></span></div>
      <div class="m-col"><span></span><span></span><span class="m-mover"></span></div>
    </div>
  {:else if kind === "tabs"}
    <div class="m-tabs"><span>Day</span><span>Week</span><span>Month</span><div class="m-ink"></div></div>
    <div class="m-page low"><div class="l w80"></div><div class="l w60"></div></div>
  {:else if kind === "badge"}
    <div class="m-bell"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 17V11a6 6 0 0 1 12 0v6l1.5 1.5h-15z M10 20a2 2 0 0 0 4 0" /></svg><span class="m-badge">3</span></div>
  {:else if kind === "progress"}
    <div class="m-upload"><div class="l w50"></div><div class="m-bar"><div class="m-fill"></div></div></div>
  {/if}
</div>

<style>
  .mock {
    position: relative;
    overflow: hidden;
    border: 1px solid var(--rule);
    border-radius: 8px;
    background: var(--paper);
    padding: 16px;
    --m-ink: var(--ink);
    --m-soft: color-mix(in srgb, var(--ink) 14%, transparent);
    --m-softer: color-mix(in srgb, var(--ink) 8%, transparent);
    /* A tile's colour, opaque: what the expand panel is before it grows. */
    --m-tile: color-mix(in srgb, var(--ink) 8%, var(--paper));
    transition: border-color var(--dur-quick) var(--ease-out), box-shadow var(--dur-quick) var(--ease-out);
  }
  .l { height: 7px; border-radius: 4px; background: var(--m-soft); margin: 7px 0; }
  .l.dark { background: color-mix(in srgb, var(--ink) 55%, transparent); height: 8px; }
  .l.light { background: color-mix(in srgb, var(--paper) 50%, transparent); }
  .w40 { width: 40%; } .w50 { width: 50%; } .w60 { width: 60%; } .w70 { width: 70%; } .w75 { width: 75%; } .w80 { width: 80%; } .w90 { width: 90%; }

  .m-track { position: absolute; left: 20px; right: 20px; top: 50%; height: 1px; background: var(--rule); }
  .m-dot { position: absolute; left: 0; top: -9px; translate: 0 0; width: 18px; height: 18px; border-radius: 50%; background: var(--red-pencil); }

  .m-card { position: absolute; left: 50%; top: 50%; width: 62%; margin-left: -31%; margin-top: -40px; padding: 12px 14px; border: 1px solid var(--rule); border-radius: 8px; background: var(--paper-raised); box-shadow: 0 8px 24px -16px rgb(0 0 0 / 0.4); }

  .m-page { opacity: 0.9; }
  .m-page.low { position: absolute; left: 16px; right: 16px; top: 70px; }
  /* A scrim dims the page in either theme (an ink veil would lighten it in the dark one). */
  .m-backdrop { position: absolute; inset: 0; background: color-mix(in srgb, var(--ink) 22%, transparent); background: light-dark(rgb(0 0 0 / 0.2), rgb(0 0 0 / 0.55)); }
  .m-dialog { position: absolute; left: 50%; top: 50%; width: 60%; margin-left: -30%; margin-top: -48px; padding: 12px; background: var(--paper-raised); border-radius: 8px; box-shadow: 0 16px 40px -18px rgb(0 0 0 / 0.5); }
  .m-btns { display: flex; justify-content: flex-end; gap: 6px; margin-top: 10px; }
  .m-btns span { width: 38px; height: 14px; border-radius: 4px; background: var(--m-softer); }
  .m-btns span.solid { background: var(--ink); }

  .m-toast { position: absolute; left: 50%; bottom: 14px; width: 64%; margin-left: -32%; display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 8px; background: var(--ink); }
  .m-toast .tick { width: 10px; height: 10px; border-radius: 50%; background: var(--paper); flex: none; }
  .m-toast .l { margin: 0; flex: 1; }

  .m-button { display: inline-block; font-family: var(--font-mono); font-size: 11px; padding: 5px 10px; border: 1px solid var(--rule); border-radius: 5px; color: var(--ink); background: var(--paper-raised); }
  .m-menu { position: absolute; left: 16px; top: 48px; width: 55%; padding: 6px 10px; border: 1px solid var(--rule); border-radius: 6px; background: var(--paper-raised); box-shadow: 0 10px 28px -16px rgb(0 0 0 / 0.45); }

  /* Five rows fit the smallest stage the drills use (160px). */
  .m-list { display: flex; flex-direction: column; gap: 5px; }
  .m-row { display: flex; align-items: center; gap: 8px; padding: 3px 6px; border-bottom: 1px solid var(--rule); }
  .m-row .l { margin: 0; }
  .av { width: 14px; height: 14px; border-radius: 50%; background: var(--m-soft); flex: none; }

  .m-drawer { position: absolute; top: 0; right: 0; bottom: 0; width: 46%; padding: 14px; background: var(--paper-raised); border-left: 1px solid var(--rule); box-shadow: -12px 0 30px -20px rgb(0 0 0 / 0.5); }

  .m-setting { display: flex; align-items: center; justify-content: space-between; gap: 16px; position: absolute; left: 20px; right: 20px; top: 50%; margin-top: -12px; }
  .m-setting .l { margin: 0; flex: 1; }
  .m-switch { width: 46px; height: 24px; border-radius: 12px; background: var(--ink); padding: 3px; flex: none; }
  .m-knob { width: 18px; height: 18px; border-radius: 50%; background: var(--paper); transform: translateX(22px); }

  .m-heart-wrap { position: absolute; inset: 0; display: grid; place-items: center; }
  .m-heart { width: 54px; height: 54px; fill: var(--red-pencil); stroke: var(--red-pencil); stroke-width: 1.6; stroke-linejoin: round; overflow: visible; }

  .m-floor { position: absolute; left: 20%; right: 20%; bottom: 22px; height: 1px; background: var(--graphite); }
  .m-ball { position: absolute; left: 50%; bottom: 0; width: 22px; height: 22px; margin-left: -11px; border-radius: 50%; background: var(--red-pencil); }

  .m-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; height: 100%; }
  .m-grid span { border-radius: 6px; background: var(--m-softer); }
  .m-panel { position: absolute; inset: 12px; padding: 14px; border-radius: 8px; background: var(--paper-raised); border: 1px solid var(--rule); box-shadow: 0 16px 40px -20px rgb(0 0 0 / 0.5); }

  .m-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; height: 100%; }
  .m-col { display: flex; flex-direction: column; gap: 8px; padding: 8px; border: 1px dashed var(--rule); border-radius: 6px; }
  .m-col span { height: 22px; border-radius: 5px; background: var(--m-softer); }
  .m-col span.m-mover { position: relative; z-index: 1; background: var(--ink); }

  .m-tabs { position: relative; display: grid; grid-template-columns: repeat(3, 1fr); font-family: var(--font-mono); font-size: 11px; color: var(--graphite-strong); text-align: center; padding-bottom: 8px; border-bottom: 1px solid var(--rule); }
  .m-ink { position: absolute; left: 0; bottom: -1px; width: 33.333%; height: 2px; background: var(--ink); transform: translateX(100%); }

  .m-bell { position: absolute; left: 50%; top: 50%; width: 44px; height: 44px; margin: -22px 0 0 -22px; }
  .m-bell svg { width: 44px; height: 44px; fill: none; stroke: var(--ink); stroke-width: 1.5; }
  .m-badge { position: absolute; right: -2px; top: -2px; min-width: 18px; height: 18px; border-radius: 9px; background: var(--red-pencil); color: var(--paper); font: 600 11px/18px var(--font-body); text-align: center; }

  .m-upload { position: absolute; left: 20px; right: 20px; top: 50%; margin-top: -18px; }
  .m-bar { height: 6px; border-radius: 3px; background: var(--m-softer); overflow: hidden; }
  .m-fill { height: 100%; background: var(--ink); border-radius: 3px; }
</style>
