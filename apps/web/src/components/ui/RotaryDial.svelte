<script lang="ts">
  /**
   * The footer's rotary dial. It stands on the bottom edge of the page, so only its upper half is
   * in view: wide and low. Put a finger in a hole and pull it round to the stop; let go and the wheel runs home
   * at the governor's steady speed, a click for each pulse, while the card counts the pulses up. A
   * governor exists to make that return linear, so this is the one motion on the site with no easing.
   * The holes the page leaves in view are 1 to 6; typing a digit dials any of them.
   * Reduced motion: dialling still works, the wheel just doesn't spin home.
   */
  import { onMount, onDestroy } from "svelte";
  import { createLoop, cubicBezier, type Loop } from "@inbetween/core";
  import { duration, easing } from "~/motion/tokens";
  import { prefs } from "~/lib/prefs.svelte";
  import { tick } from "~/lib/sound";

  // Geometry, in the dial's own units: 400 across, centred on 0,0. Angles are degrees clockwise from 12.
  const R_PLATE = 200, R_WHEEL = 176, R_HOLES = 142, R_HOLE = 21, R_CARD = 80;
  /** The finger stop, mirroring hole 6 across 12 o'clock so both clear the page's edge. */
  const STOP = 76;
  /** The holes' pitch, and one pulse of travel. A real dial spaces them 30°; closer here (and the holes
   *  a little smaller, further out) puts holes 1 to 6 and the stop in the half that shows. */
  const STEP = (2 * STOP) / 7;
  /** Ten pulses a second, the rate exchanges were built for. */
  const GOVERNOR = 10 * STEP;
  /** The knock as the wheel lands home: a stiff, lightly damped spring. */
  const KNOCK = { k: 1200, c: 21, kick: 0.3 };
  /** A beat at the stop before letting go, when the keyboard dials. */
  const HOLD = 0.08;
  const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
  const LETTERS = ["", "ABC", "DEF", "GHI", "JKL", "MNO", "PRS", "TUV", "WXY", "OPER"];

  /** Hole i at rest: digit 1 two steps short of the stop, then round the wheel to 0 just past it. */
  const base = (i: number) => STOP - (i + 2) * STEP;
  /** How far hole i travels to the stop; it sends i + 1 pulses on the way home. */
  const travel = (i: number) => (i + 2) * STEP;
  const pol = (r: number, deg: number) => {
    const a = (deg * Math.PI) / 180;
    return [r * Math.sin(a), -r * Math.cos(a)] as const;
  };
  const circle = (x: number, y: number, r: number) =>
    `M${x + r} ${y}a${r} ${r} 0 1 0 ${-2 * r} 0a${r} ${r} 0 1 0 ${2 * r} 0Z`;
  const wheelPath =
    circle(0, 0, R_WHEEL) + DIGITS.map((_, i) => circle(...pol(R_HOLES, base(i)), R_HOLE)).join("");
  /** A scale of frame ticks round the rim, five to a pitch, a long one where each hole rests. The seam
   *  where they meet is at 6 o'clock, below the page. */
  const ticks = Array.from({ length: 121 }, (_, j) => j - 30)
    .map((k) => ({ a: STOP - (k * STEP) / 5, major: k % 5 === 0 }))
    .filter(({ a }) => Math.abs(a) <= 180)
    .map(({ a, major }) => ({ a1: pol(major ? 182 : 186, a), a2: pol(193, a), major }));

  let rot = $state(0);
  /** The hole in hand (dragged, or dialled from the keyboard): ringed, as if a finger were in it. */
  let held = $state<number | null>(null);
  let grabbing = $state(false);
  let dialled = $state("");
  /** The pulses counted so far for the digit on its way home. */
  let counting = $state("");
  const readout = $derived((dialled + counting).slice(-7));
  /** Where each hole is now, with the wheel turned: its lighting stays fixed to the room, so it is
   *  drawn at these points rather than turned with the wheel. */
  const holesNow = $derived(DIGITS.map((_, i) => pol(R_HOLES, base(i) + rot)));
  const live = $derived(dialled ? `Dialled ${[...dialled].join(" ")}` : "");

  let root: HTMLDivElement;
  let svg: SVGSVGElement;
  let loop: Loop | null = null;
  let mode: "idle" | "drag" | "wind" | "return" | "knock" = "idle";
  let raw = 0, prev = 0, limit = 0, atStop = false, vel = 0;
  /** The hole whose pulses are going home (null: a slip or a nudge, which sends nothing). */
  let sending: number | null = null;
  let wind = { from: 0, to: 0, t: 0, dur: 0, then: null as number | null };
  const queue: number[] = [];
  const windEase = cubicBezier(...easing.inout);

  function step(dt: number) {
    if (mode === "wind") {
      wind.t += dt;
      rot = wind.from + (wind.to - wind.from) * windEase(Math.min(1, wind.t / wind.dur));
      if (wind.t >= wind.dur + HOLD) letGo(wind.then);
    } else if (mode === "return") {
      rot = Math.max(0, rot - GOVERNOR * dt);
      if (sending !== null) {
        const n = sending + 1;
        const count = Math.max(0, Math.min(n, n - Math.floor(rot / STEP)));
        const shown = count ? String(count % 10) : "";
        if (shown !== counting) {
          counting = shown;
          tick();
        }
      }
      if (rot <= 0) {
        if (sending !== null) dialled = (dialled + DIGITS[sending]).slice(-12);
        counting = "";
        sending = null;
        mode = "knock";
        vel = -GOVERNOR * KNOCK.kick;
      }
    } else if (mode === "knock") {
      vel += (-KNOCK.k * rot - KNOCK.c * vel) * dt;
      rot += vel * dt;
      if (Math.abs(rot) < 0.02 && Math.abs(vel) < 1) {
        rot = 0;
        mode = "idle";
        held = null;
        next();
      }
    }
  }

  function run() {
    if (loop) return;
    loop = createLoop(({ dt }) => {
      step(dt);
      if (mode === "idle" || mode === "drag") {
        loop = null;
        return false;
      }
    });
  }

  /** Release the wheel: it spins home, sending hole i's pulses (or none). */
  function letGo(i: number | null) {
    sending = i;
    counting = "";
    if (prefs.reduced) {
      rot = 0;
      held = null;
      mode = "idle";
      if (i !== null) {
        dialled = (dialled + DIGITS[i]).slice(-12);
        tick();
      }
      next();
      return;
    }
    mode = "return";
    run();
  }

  /** Dial hole i without a hand: wind it to the stop, hold a beat, let go. */
  function dial(i: number) {
    if (prefs.reduced) return letGo(i);
    held = i;
    wind = { from: rot, to: travel(i), t: 0, dur: 0.18 + travel(i) / 700, then: i };
    mode = "wind";
    run();
  }
  function next() {
    if (mode === "idle" && queue.length) dial(queue.shift()!);
  }
  /** Hang up: forget the number, and any digit still on its way home. */
  function clear() {
    dialled = "";
    counting = "";
    sending = null;
    queue.length = 0;
  }

  function local(e: PointerEvent) {
    const r = svg.getBoundingClientRect();
    const s = (2 * R_PLATE) / r.width;
    return [(e.clientX - r.left) * s - R_PLATE, (e.clientY - r.top) * s - R_PLATE] as const;
  }
  const angleOf = ([x, y]: readonly [number, number]) => (Math.atan2(x, -y) * 180) / Math.PI;

  function onDown(e: PointerEvent) {
    const hole = (e.target as Element).closest<SVGGElement>("[data-hole]");
    if (!hole || (mode !== "idle" && mode !== "knock") || (e.pointerType === "mouse" && e.button !== 0)) return;
    e.preventDefault();
    loop?.stop();
    loop = null;
    const i = Number(hole.dataset.hole);
    svg.setPointerCapture(e.pointerId);
    mode = "drag";
    held = i;
    grabbing = true;
    limit = travel(i);
    raw = Math.max(0, rot);
    prev = angleOf(local(e));
    atStop = false;
  }
  function onMove(e: PointerEvent) {
    if (mode !== "drag") return;
    const a = angleOf(local(e));
    let d = a - prev;
    d -= 360 * Math.round(d / 360);
    prev = a;
    raw += d;
    // The finger drags the wheel clockwise only, and no further than the stop.
    rot = Math.min(limit, Math.max(0, raw));
    if (!atStop && rot >= limit) {
      atStop = true;
      tick();
      navigator.vibrate?.(8);
    } else if (atStop && rot < limit - 6) atStop = false;
  }
  function onUp() {
    if (mode !== "drag") return;
    grabbing = false;
    // Short of the stop, the wheel still goes home, but nothing is dialled.
    letGo(rot >= limit - 4 ? held : null);
  }

  function onKey(e: KeyboardEvent) {
    const i = DIGITS.indexOf(e.key);
    if (i >= 0) {
      e.preventDefault();
      queue.push(i);
      next();
    } else if (e.key === "Escape" || e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();
      clear();
    }
  }

  onMount(() => {
    prefs.start();
    // Holes are for dragging, not for scrolling the page; everywhere else on the dial still scrolls.
    const onTouch = (e: TouchEvent) => {
      if ((e.target as Element).closest("[data-hole]")) e.preventDefault();
    };
    svg.addEventListener("touchstart", onTouch, { passive: false });
    // The first time it comes into view, the wheel gives a small turn and runs home: it moves.
    let nudge = 0;
    const io = new IntersectionObserver(
      ([en]) => {
        if (!en.isIntersecting) return;
        io.disconnect();
        nudge = window.setTimeout(() => {
          if (prefs.reduced || mode !== "idle") return;
          wind = { from: 0, to: 18, t: 0, dur: duration.scene / 1000, then: null };
          mode = "wind";
          run();
        }, duration.scene);
      },
      { threshold: 0.6 },
    );
    io.observe(root);
    return () => {
      io.disconnect();
      clearTimeout(nudge);
      svg.removeEventListener("touchstart", onTouch);
    };
  });
  onDestroy(() => loop?.stop());
</script>

<div
  class="dial"
  class:grabbing
  bind:this={root}
  role="group"
  aria-roledescription="rotary dial"
  aria-label="Rotary dial. Pull a finger hole round to the stop, or type digits. Escape clears."
  tabindex="0"
  onkeydown={onKey}
>
  <!-- The dial's body: a satin metal bezel, brushed in rings (CSS, under the drawing). -->
  <div class="body" aria-hidden="true"></div>
  <svg
    bind:this={svg}
    viewBox="-200 -200 400 400"
    aria-hidden="true"
    onpointerdown={onDown}
    onpointermove={onMove}
    onpointerup={onUp}
    onpointercancel={onUp}
  >
    <!-- One light, above and a little to the left. Everything that turns is lit as it stands now. -->
    <defs>
      <radialGradient id="dl-wheel" cx="0" cy="0" r={R_WHEEL} gradientUnits="userSpaceOnUse">
        <stop offset="0.4" class="s-wheel-hi" />
        <stop offset="1" class="s-wheel-lo" />
      </radialGradient>
      <!-- A convex edge catches the light on top; a concave one (a hole's lip) underneath. -->
      <linearGradient id="dl-convex" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" class="s-bevel-light" />
        <stop offset="0.5" class="s-clear" />
        <stop offset="1" class="s-bevel-dark" />
      </linearGradient>
      <linearGradient id="dl-concave" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" class="s-bevel-dark" />
        <stop offset="0.55" class="s-clear" />
        <stop offset="1" class="s-bevel-light" />
      </linearGradient>
      <!-- Down a hole: the wheel's wall shades the plate beneath its upper lip. -->
      <linearGradient id="dl-well" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" class="s-well" />
        <stop offset="0.55" class="s-clear" />
      </linearGradient>
      <radialGradient id="dl-gloss" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" class="s-gloss" />
        <stop offset="1" class="s-clear" />
      </radialGradient>
      <!-- Enamel on the finger stop: lit along its upper edge -->
      <linearGradient id="dl-enamel" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" class="s-enamel-hi" />
        <stop offset="0.45" class="s-enamel" />
        <stop offset="1" class="s-enamel-lo" />
      </linearGradient>
      <radialGradient id="dl-card-edge" cx="0" cy="0" r={R_CARD} gradientUnits="userSpaceOnUse">
        <stop offset="0.82" class="s-clear" />
        <stop offset="1" class="s-card-edge" />
      </radialGradient>
      <linearGradient id="dl-glass" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0.18" class="s-clear" />
        <stop offset="0.3" class="s-glass" />
        <stop offset="0.46" class="s-clear" />
      </linearGradient>
      <mask id="dl-wheel-mask" maskUnits="userSpaceOnUse" x="-200" y="-200" width="400" height="400">
        <path d={wheelPath} fill="#fff" fill-rule="evenodd" transform={`rotate(${rot})`} />
      </mask>
      <clipPath id="dl-card-clip"><circle r={R_CARD - 2} /></clipPath>
      <filter id="dl-lift" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow class="shade" dx="0" dy="2.5" stdDeviation="2.5" />
      </filter>
      <filter id="dl-lift-sm" x="-60%" y="-20%" width="220%" height="140%">
        <feDropShadow class="shade" dx="0" dy="2" stdDeviation="1.6" />
      </filter>
      <filter id="dl-grain" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="7" />
        <feColorMatrix type="matrix" values="0 0 0 0 0.3  0 0 0 0 0.25  0 0 0 0 0.2  0 0 0 0.09 0" />
      </filter>
    </defs>

    <!-- The bezel: its outer edge, the gap it leaves round the wheel, and a scale of frame ticks printed on it. -->
    <circle class="bezel-edge" r={R_PLATE - 0.75} />
    {#each ticks as t, k (k)}
      <line class="tick" class:major={t.major} x1={t.a1[0]} y1={t.a1[1]} x2={t.a2[0]} y2={t.a2[1]} />
    {/each}

    <!-- The number plate, under the wheel: seen only through the holes. -->
    <circle class="plate" r={R_WHEEL + 1.5} />
    {#each DIGITS as d, i (d)}
      {@const [x, y] = pol(R_HOLES, base(i))}
      <text class="digit" {x} y={y + (LETTERS[i] ? 2 : 7)}>{d}</text>
      {#if LETTERS[i]}<text class="letters" {x} y={y + 12}>{LETTERS[i]}</text>{/if}
    {/each}
    {#each holesNow as [x, y], i (i)}
      <circle class="well" cx={x} cy={y} r={R_HOLE} fill="url(#dl-well)" />
    {/each}

    <!-- The finger wheel: the only part that turns. -->
    <g transform={`rotate(${rot})`}>
      <path class="wheel" d={wheelPath} fill-rule="evenodd" fill="url(#dl-wheel)" filter="url(#dl-lift)" />
      {#each DIGITS as d, i (d)}
        {@const [x, y] = pol(R_HOLES, base(i))}
        <g class="hole" class:held={held === i} data-hole={i}>
          <circle class="hit" cx={x} cy={y} r={R_HOLE + 4} />
          <circle class="ring" cx={x} cy={y} r={R_HOLE - 1.5} />
        </g>
      {/each}
    </g>
    <!-- Its light: a soft reflection across the top, fixed while the wheel turns under it; the bevels of
         its rim, its hub and every hole's lip. -->
    <g class="lit" mask="url(#dl-wheel-mask)">
      <ellipse cx="-24" cy="-118" rx="150" ry="58" fill="url(#dl-gloss)" />
      <ellipse class="gloss-soft" cx="0" cy="-40" rx="176" ry="120" fill="url(#dl-gloss)" />
    </g>
    <circle class="lip" r={R_WHEEL - 0.75} stroke="url(#dl-convex)" />
    <circle class="lip" r={R_CARD + 9} stroke="url(#dl-concave)" />
    {#each holesNow as [x, y], i (i)}
      <circle class="lip" cx={x} cy={y} r={R_HOLE + 0.5} stroke="url(#dl-concave)" />
    {/each}
    <circle class="bezel-gap" r={R_WHEEL + 2.25} />

    <!-- The finger stop: enamelled metal, screwed to the bezel, reaching over the wheel's edge. -->
    <g transform={`rotate(${STOP})`} filter="url(#dl-lift-sm)">
      <path class="stop" d="M -6.5 -198 L 6.5 -198 L 5 -151 Q 4.6 -145 0 -145 Q -4.6 -145 -5 -151 Z" fill="url(#dl-enamel)" />
      <path class="stop-shine" d="M -3.6 -195 L -2.6 -153" />
      <circle class="screw" cy="-190" r="2.6" />
      <path class="screw-slot" d="M -1.8 -190 L 1.8 -190" />
    </g>

    <!-- The number card, under a clear cover held by a metal ring: it keeps what you dial. Only its
         upper half shows, so its lines sit there. -->
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <g class="card" class:can-clear={!!dialled} onclick={clear}>
      <circle class="card-face" r={R_CARD} />
      <circle r={R_CARD} filter="url(#dl-grain)" clip-path="url(#dl-card-clip)" class="grain" />
      <circle class="card-rule" r={R_CARD - 9} />
      <text class="card-number" class:empty={!readout} y="-36">{readout || "– – –"}</text>
      <text class="card-hint" y="-16">{dialled ? "tap to clear" : "pull to the stop"}</text>
      <circle r={R_CARD} fill="url(#dl-card-edge)" class="cover" />
      <rect x={-R_CARD} y={-R_CARD} width={2 * R_CARD} height={2 * R_CARD} fill="url(#dl-glass)" clip-path="url(#dl-card-clip)" class="cover" />
      <circle class="retainer" r={R_CARD - 0.5} stroke="url(#dl-convex)" />
    </g>
  </svg>
  <span class="visually-hidden" aria-live="polite">{live}</span>
</div>

<style>
  .dial {
    /* Wide and low: half of it shows, so its height is half this. */
    --d: clamp(340px, 58vw, 740px);
    /* Materials. Light: ivory plastic, a cream number plate, warm satin metal. */
    --wheel-hi: #fffdf8;
    --wheel-lo: #ebe6da;
    --plate: #eee9dd;
    --plate-ink: #1b1b1f;
    --plate-letters: #8c867a;
    --card: #fbf9f3;
    --card-ink: #16161a;
    --card-muted: #8a8880;
    --gloss: rgb(255 255 255 / 0.75);
    --glass: rgb(255 255 255 / 0.55);
    --card-edge: rgb(40 30 20 / 0.16);
    --shade: rgb(40 30 20 / 0.3);
    --well: rgb(40 30 20 / 0.32);
    --bevel-light: rgb(255 255 255 / 0.95);
    --bevel-dark: rgb(60 45 30 / 0.3);
    --tick: rgb(40 36 30 / 0.5);
    --metal:
      repeating-radial-gradient(circle at 50% 50%, rgb(255 255 255 / 0.07) 0 1px, rgb(0 0 0 / 0.025) 1px 2px),
      conic-gradient(from 0deg at 50% 50%, #d4cfc5, #f8f6f1 40deg, #d8d3c9 85deg, #efece5 130deg, #cdc8be 180deg, #efece5 230deg, #d8d3c9 275deg, #f8f6f1 320deg, #d4cfc5);
    --body-shadow: 0 18px 40px -22px rgb(40 30 20 / 0.45), 0 1px 0 rgb(255 255 255 / 0.8) inset;
    position: relative;
    flex: none;
    align-self: center;
    margin-top: auto;
    width: var(--d);
    /* The upper half: the rest is below the edge of the page. */
    height: calc(var(--d) / 2);
    overflow: hidden;
    outline: none;
  }
  /* Dark: the light set inverted. Black bakelite over a darker number plate printed in cream (the plate
     is recessed, so it sits in shade), a dark number card, a gunmetal bezel. */
  :global(:root[data-theme="dark"]) .dial {
    --wheel-hi: #2c2d32;
    --wheel-lo: #111215;
    --plate: #0c0d0f;
    --plate-ink: #e6e2d8;
    --plate-letters: #7d796f;
    --card: #17181b;
    --card-ink: #e6e2d8;
    --card-muted: #85817a;
    --gloss: rgb(255 255 255 / 0.16);
    --glass: rgb(255 255 255 / 0.09);
    --card-edge: rgb(0 0 0 / 0.55);
    --shade: rgb(0 0 0 / 0.75);
    --well: rgb(0 0 0 / 0.5);
    --bevel-light: rgb(255 255 255 / 0.22);
    --bevel-dark: rgb(0 0 0 / 0.7);
    --tick: rgb(236 234 228 / 0.42);
    --metal:
      repeating-radial-gradient(circle at 50% 50%, rgb(255 255 255 / 0.035) 0 1px, rgb(0 0 0 / 0.05) 1px 2px),
      conic-gradient(from 0deg at 50% 50%, #26272b, #4b4c52 40deg, #2b2c30 85deg, #404146 130deg, #232428 180deg, #404146 230deg, #2b2c30 275deg, #4b4c52 320deg, #26272b);
    --body-shadow: 0 18px 40px -20px rgb(0 0 0 / 0.8), 0 1px 0 rgb(255 255 255 / 0.08) inset;
  }
  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme="light"])) .dial {
      --wheel-hi: #2c2d32;
      --wheel-lo: #111215;
      --plate: #0c0d0f;
      --plate-ink: #e6e2d8;
      --plate-letters: #7d796f;
      --card: #17181b;
      --card-ink: #e6e2d8;
      --card-muted: #85817a;
      --gloss: rgb(255 255 255 / 0.16);
      --glass: rgb(255 255 255 / 0.09);
    --card-edge: rgb(0 0 0 / 0.55);
      --shade: rgb(0 0 0 / 0.75);
      --well: rgb(0 0 0 / 0.5);
      --bevel-light: rgb(255 255 255 / 0.22);
      --bevel-dark: rgb(0 0 0 / 0.7);
      --tick: rgb(236 234 228 / 0.42);
      --metal:
        repeating-radial-gradient(circle at 50% 50%, rgb(255 255 255 / 0.035) 0 1px, rgb(0 0 0 / 0.05) 1px 2px),
        conic-gradient(from 0deg at 50% 50%, #26272b, #4b4c52 40deg, #2b2c30 85deg, #404146 130deg, #232428 180deg, #404146 230deg, #2b2c30 275deg, #4b4c52 320deg, #26272b);
      --body-shadow: 0 18px 40px -20px rgb(0 0 0 / 0.8), 0 1px 0 rgb(255 255 255 / 0.08) inset;
    }
  }
  .body { position: absolute; left: 0; top: 0; width: var(--d); height: var(--d); border-radius: 50%; background: var(--metal); box-shadow: var(--body-shadow); }
  svg { position: relative; display: block; width: var(--d); height: var(--d); overflow: visible; user-select: none; -webkit-user-select: none; }
  .shade { flood-color: var(--shade); }
  .s-clear { stop-color: #fff; stop-opacity: 0; }
  .s-wheel-hi { stop-color: var(--wheel-hi); }
  .s-wheel-lo { stop-color: var(--wheel-lo); }
  .s-bevel-light { stop-color: var(--bevel-light); }
  .s-bevel-dark { stop-color: var(--bevel-dark); }
  .s-well { stop-color: var(--well); }
  .s-gloss { stop-color: var(--gloss); }
  .s-glass { stop-color: var(--glass); }
  .s-card-edge { stop-color: var(--card-edge); }
  .s-enamel-hi { stop-color: color-mix(in srgb, var(--red-pencil) 60%, white); }
  .s-enamel { stop-color: var(--red-pencil); }
  .s-enamel-lo { stop-color: color-mix(in srgb, var(--red-pencil) 72%, black); }

  .bezel-edge { fill: none; stroke: url(#dl-convex); stroke-width: 1.5; }
  /* Focus draws the bezel's edge in blue pencil. */
  .dial:focus-visible .bezel-edge { stroke: var(--blue-pencil); stroke-width: 2.5; }
  .bezel-gap { fill: none; stroke: var(--bevel-dark); stroke-width: 1.5; pointer-events: none; }
  .tick { stroke: var(--tick); stroke-width: 1; opacity: 0.6; }
  .tick.major { opacity: 1; }
  .plate { fill: var(--plate); }
  .digit { fill: var(--plate-ink); font-family: var(--font-display); font-weight: 500; font-size: 19px; text-anchor: middle; }
  .letters { fill: var(--plate-letters); font-family: var(--font-mono); font-size: 6px; letter-spacing: 0.08em; text-anchor: middle; }
  .well, .lit, .lip { pointer-events: none; }
  .lip { fill: none; stroke-width: 1.5; }
  .gloss-soft { opacity: 0.35; }

  .hit { fill: transparent; cursor: grab; }
  /* The hole under a finger: a dark ring in the plate's ink, and a little shade where the fingertip
     presses in. It sits over the cream plate, so it reads the same in light and dark. */
  .ring {
    fill: var(--plate-ink);
    fill-opacity: 0;
    stroke: var(--plate-ink);
    stroke-width: 1.75;
    stroke-opacity: 0;
    pointer-events: none;
    transition: stroke-opacity var(--dur-quick) var(--ease-out), fill-opacity var(--dur-quick) var(--ease-out);
  }
  @media (hover: hover) { .hole:hover .ring { stroke-opacity: 0.22; } }
  .hole.held .ring { stroke-opacity: 0.55; fill-opacity: 0.07; }
  .grabbing, .grabbing .hit { cursor: grabbing; }

  .stop-shine { stroke: rgb(255 255 255 / 0.55); stroke-width: 1.1; stroke-linecap: round; fill: none; }
  .screw { fill: color-mix(in srgb, var(--red-pencil) 55%, black); stroke: rgb(255 255 255 / 0.25); stroke-width: 0.6; }
  .screw-slot { stroke: rgb(0 0 0 / 0.55); stroke-width: 0.8; stroke-linecap: round; }

  .card-face { fill: var(--card); }
  .grain { pointer-events: none; }
  .cover { pointer-events: none; }
  .card-rule { fill: none; stroke: color-mix(in srgb, var(--card-ink) 14%, transparent); stroke-width: 0.75; }
  .retainer { fill: none; stroke-width: 3; pointer-events: none; }
  .card text { text-anchor: middle; font-family: var(--font-mono); pointer-events: none; }
  .card-number { fill: var(--card-ink); font-size: 20px; letter-spacing: 0.12em; font-variant-numeric: tabular-nums; }
  .card-number.empty { fill: var(--card-muted); }
  .card-hint { fill: var(--card-muted); font-size: 7px; letter-spacing: 0.04em; }
  .card.can-clear { cursor: pointer; }
</style>
