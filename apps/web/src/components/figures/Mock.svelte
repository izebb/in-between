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
  import { onDestroy } from "svelte";
  import { parseSpec, waapiTiming } from "~/lib/spec";

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
  }

  function partsFor(k: MockKind, d: number, w: number, h: number): Part[] {
    switch (k) {
      case "dot":
        return [{ sel: ".m-dot", frames: [{ transform: "translateX(0)" }, { transform: `translateX(${w - 58}px)` }] }];
      case "card":
        return [{ sel: ".m-card", frames: [{ opacity: 0, transform: `translateY(${d}px)` }, { opacity: 1, transform: "none" }] }];
      case "modal":
        return [
          { sel: ".m-backdrop", frames: [{ opacity: 0 }, { opacity: 1 }] },
          { sel: ".m-dialog", frames: [{ opacity: 0, transform: "scale(0.92)" }, { opacity: 1, transform: "none" }] },
        ];
      case "toast":
        return [{ sel: ".m-toast", frames: [{ opacity: 0, transform: `translateY(${d * 2}px)` }, { opacity: 1, transform: "none" }] }];
      case "menu":
        return [{ sel: ".m-menu", frames: [{ opacity: 0, transform: "scale(0.8)" }, { opacity: 1, transform: "none" }], origin: "top left" }];
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
        return [{ sel: ".m-heart", frames: [{ transform: "scale(1)" }, { transform: "scale(0.82)", offset: 0.25 }, { transform: "scale(1.18)", offset: 0.6 }, { transform: "scale(1)" }] }];
      case "drop":
        return [{ sel: ".m-ball", frames: [{ transform: `translateY(-${h - 70}px)` }, { transform: "none" }] }];
      case "expand":
        return [{ sel: ".m-panel", frames: [{ transform: "translate(-38%, 22%) scale(0.22, 0.3)", borderRadius: "14px" }, { transform: "none", borderRadius: "8px" }], origin: "center" }];
      case "swap":
        return [{ sel: ".m-mover", frames: [{ transform: "translate(0, 0)" }, { transform: "translate(150px, 46px)" }] }];
      case "tabs":
        return [{ sel: ".m-ink", frames: [{ transform: "translateX(0)" }, { transform: "translateX(100%)" }] }];
      case "badge":
        return [{ sel: ".m-badge", frames: [{ transform: "scale(0)" }, { transform: "scale(1)" }] }];
      case "progress":
        return [{ sel: ".m-fill", frames: [{ transform: "scaleX(0.15)" }, { transform: "scaleX(1)" }], origin: "left" }];
    }
  }

  function stop() {
    for (const a of running) a.cancel();
    running = [];
    if (timer) clearTimeout(timer);
    timer = null;
  }

  function run(dir: "enter" | "exit"): Promise<void> {
    const d = motion.distance ?? 16;
    const parts = partsFor(kind, d, root.clientWidth, root.clientHeight);
    const enterSpec = parseSpec(motion.easing ?? "--ease-out");
    const enterT = waapiTiming(enterSpec, motion.duration ?? 280);
    const exitT = waapiTiming(parseSpec(motion.exitEasing ?? "--ease-in"), motion.exitDuration ?? Math.round((motion.duration ?? 280) * 0.7));
    const t = dir === "enter" ? enterT : exitT;
    const none = motion.none || t.duration === 0;
    const anims: Animation[] = [];
    for (const p of parts) {
      root.querySelectorAll<HTMLElement>(p.sel).forEach((el) => {
        if (p.origin || (motion.origin && /menu|dialog|panel|badge/.test(p.sel))) el.style.transformOrigin = motion.origin ?? p.origin!;
        const frames = dir === "enter" ? p.frames : [...p.frames].reverse().map((f) => ({ ...f, offset: f.offset != null ? 1 - (f.offset as number) : undefined }));
        const a = el.animate(frames, {
          duration: none ? 0 : t.duration,
          easing: t.easing,
          delay: none ? 0 : (p.order ?? 0) * (motion.stagger ?? 0),
          fill: "both",
        });
        anims.push(a);
      });
    }
    running.push(...anims);
    return Promise.all(anims.map((a) => a.finished.catch(() => undefined))).then(() => undefined);
  }

  /** Play the state change from the start. */
  export async function play() {
    stop();
    if (!root) return;
    if (direction === "enter" && motion.none) {
      // A cut: gone, then simply there. Without the gap there'd be nothing to see.
      await run("exit");
      await new Promise<void>((r) => (timer = setTimeout(r, 260)));
      await run("enter");
    } else if (direction === "enter") await run("enter");
    else if (direction === "exit") await run("exit");
    else {
      await run("enter");
      await new Promise<void>((r) => (timer = setTimeout(r, 700)));
      await run("exit");
      // Rest in the shown state again, so a still specimen never looks empty.
      await new Promise<void>((r) => (timer = setTimeout(r, 500)));
      stop();
    }
  }

  /** Show the end state without motion. */
  export function rest() {
    stop();
    shown = direction !== "exit";
  }

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
    <div class="m-grid"><span></span><span></span><span></span><span></span></div>
    <div class="m-panel"><div class="l w50 dark"></div><div class="l w90"></div><div class="l w80"></div></div>
  {:else if kind === "swap"}
    <div class="m-cols"><div class="m-col"><span></span><span></span><span></span></div><div class="m-col"><span></span><span></span></div></div>
    <div class="m-mover"></div>
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
  .m-backdrop { position: absolute; inset: 0; background: color-mix(in srgb, var(--ink) 22%, transparent); }
  .m-dialog { position: absolute; left: 50%; top: 50%; width: 60%; margin-left: -30%; margin-top: -48px; padding: 12px; background: var(--paper-raised); border-radius: 8px; box-shadow: 0 16px 40px -18px rgb(0 0 0 / 0.5); }
  .m-btns { display: flex; justify-content: flex-end; gap: 6px; margin-top: 10px; }
  .m-btns span { width: 38px; height: 14px; border-radius: 4px; background: var(--m-softer); }
  .m-btns span.solid { background: var(--ink); }

  .m-toast { position: absolute; left: 50%; bottom: 14px; width: 64%; margin-left: -32%; display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 8px; background: var(--ink); }
  .m-toast .tick { width: 10px; height: 10px; border-radius: 50%; background: var(--paper); flex: none; }
  .m-toast .l { margin: 0; flex: 1; }

  .m-button { display: inline-block; font-family: var(--font-mono); font-size: 11px; padding: 5px 10px; border: 1px solid var(--rule); border-radius: 5px; color: var(--ink); background: var(--paper-raised); }
  .m-menu { position: absolute; left: 16px; top: 48px; width: 55%; padding: 6px 10px; border: 1px solid var(--rule); border-radius: 6px; background: var(--paper-raised); box-shadow: 0 10px 28px -16px rgb(0 0 0 / 0.45); }

  .m-list { display: flex; flex-direction: column; gap: 6px; }
  .m-row { display: flex; align-items: center; gap: 8px; padding: 4px 6px; border-bottom: 1px solid var(--rule); }
  .m-row .l { margin: 0; }
  .av { width: 16px; height: 16px; border-radius: 50%; background: var(--m-soft); flex: none; }

  .m-drawer { position: absolute; top: 0; right: 0; bottom: 0; width: 46%; padding: 14px; background: var(--paper-raised); border-left: 1px solid var(--rule); box-shadow: -12px 0 30px -20px rgb(0 0 0 / 0.5); }

  .m-setting { display: flex; align-items: center; justify-content: space-between; gap: 16px; position: absolute; left: 20px; right: 20px; top: 50%; margin-top: -12px; }
  .m-setting .l { margin: 0; flex: 1; }
  .m-switch { width: 46px; height: 24px; border-radius: 12px; background: var(--ink); padding: 3px; flex: none; }
  .m-knob { width: 18px; height: 18px; border-radius: 50%; background: var(--paper); transform: translateX(22px); }

  .m-heart-wrap { position: absolute; inset: 0; display: grid; place-items: center; }
  .m-heart { width: 54px; height: 54px; fill: var(--red-pencil); }

  .m-floor { position: absolute; left: 20%; right: 20%; bottom: 22px; height: 1px; background: var(--graphite); }
  .m-ball { position: absolute; left: 50%; bottom: 0; width: 22px; height: 22px; margin-left: -11px; border-radius: 50%; background: var(--red-pencil); }

  .m-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; height: 100%; }
  .m-grid span { border-radius: 6px; background: var(--m-softer); }
  .m-panel { position: absolute; inset: 12px; padding: 14px; border-radius: 8px; background: var(--paper-raised); border: 1px solid var(--rule); box-shadow: 0 16px 40px -20px rgb(0 0 0 / 0.5); }

  .m-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; height: 100%; }
  .m-col { display: flex; flex-direction: column; gap: 8px; padding: 8px; border: 1px dashed var(--rule); border-radius: 6px; }
  .m-col span { height: 22px; border-radius: 5px; background: var(--m-softer); }
  .m-mover { position: absolute; left: 24px; top: 24px; width: calc(50% - 38px); height: 22px; border-radius: 5px; background: var(--ink); transform: translate(150px, 46px); }

  .m-tabs { position: relative; display: grid; grid-template-columns: repeat(3, 1fr); font-family: var(--font-mono); font-size: 11px; color: var(--graphite-strong); text-align: center; padding-bottom: 8px; border-bottom: 1px solid var(--rule); }
  .m-ink { position: absolute; left: 0; bottom: -1px; width: 33.333%; height: 2px; background: var(--ink); transform: translateX(100%); }

  .m-bell { position: absolute; left: 50%; top: 50%; width: 44px; height: 44px; margin: -22px 0 0 -22px; }
  .m-bell svg { width: 44px; height: 44px; fill: none; stroke: var(--ink); stroke-width: 1.5; }
  .m-badge { position: absolute; right: -2px; top: -2px; min-width: 18px; height: 18px; border-radius: 9px; background: var(--red-pencil); color: var(--paper); font: 600 11px/18px var(--font-body); text-align: center; }

  .m-upload { position: absolute; left: 20px; right: 20px; top: 50%; margin-top: -18px; }
  .m-bar { height: 6px; border-radius: 3px; background: var(--m-softer); overflow: hidden; }
  .m-fill { height: 100%; background: var(--ink); border-radius: 3px; }
</style>
