<script lang="ts">
  /**
   * The footer's watch: a small round watch standing on the bottom edge of the home page, cut just below
   * its 6, keeping the reader's own time (and date) on a simple analog face behind a domed glass. Built as an object under one light, above and a little
   * to the left: a satin case with polished edges, a sunray face with applied hour markers, hands that
   * stand at different heights (so their shadows fall at different distances), and a crystal that
   * catches the room.
   * The crown is the control. Press it and it goes in and springs back, the watch answers (a click if
   * sound is on, a tap on phones that can), and the seconds hand switches between a sweep and a tick
   * once a second with the small recoil a stepping hand has.
   * Reduced motion: the seconds hand ticks without recoil.
   */
  import { onMount, onDestroy } from "svelte";
  import { createLoop, type Loop } from "@inbetween/core";
  import { duration } from "~/motion/tokens";
  import { prefs } from "~/lib/prefs.svelte";
  import { tick as click } from "~/lib/sound";

  // Geometry, in the watch's own units: the case is 400 across, centred on 0,0, drawn in a 430 box so
  // the crown has room. Angles are degrees clockwise from 12.
  const R_CASE = 200, R_GLASS = 176, R_SCREEN = 164;

  const pol = (r: number, deg: number) => {
    const a = (deg * Math.PI) / 180;
    return [r * Math.sin(a), -r * Math.cos(a)] as [number, number];
  };
  const P = ([x, y]: [number, number]) => `${x.toFixed(2)} ${y.toFixed(2)}`;
  const minuteTicks = Array.from({ length: 60 }, (_, i) => i * 6).filter((a) => a % 30 !== 0);
  /** Numerals at every hour but 3, where the date window sits. */
  const numerals = Array.from({ length: 12 }, (_, i) => ({ n: i === 0 ? 12 : i, at: pol(118, i * 30) })).filter((n) => n.n !== 3);
  /** The sunray finish: fine lines from the centre, and the bow of light it throws toward the lamp. */
  const rays = Array.from({ length: 144 }, (_, i) => i * 2.5);
  const bow = (toward: number, spread: number) =>
    `M0 0L${P(pol(R_SCREEN, toward - spread))}A${R_SCREEN} ${R_SCREEN} 0 0 1 ${P(pol(R_SCREEN, toward + spread))}Z`;

  let hourA = $state(0);
  let minA = $state(0);
  let secA = $state(0);
  let tick = $state(false);
  let pressed = $state(false);
  let caption = $state(false);
  let timeText = $state("");
  let day = $state(0);

  let root: HTMLDivElement;
  let loop: Loop | null = null;
  let captionTimer = 0;
  let pressTimer = 0;

  /** A stepping hand: it jumps, overshoots a little, and settles within an eighth of a second. */
  const recoil = (f: number) => {
    const t = f / 0.12;
    return t >= 1 ? 1 : 1 - Math.exp(-6 * t) * Math.cos(9 * t);
  };

  function frame() {
    const now = new Date();
    const s = now.getSeconds() + now.getMilliseconds() / 1000;
    const m = now.getMinutes() + s / 60;
    const h = (now.getHours() % 12) + m / 60;
    const still = prefs.reduced;
    hourA = h * 30;
    minA = m * 6;
    const whole = Math.floor(s);
    secA = still ? whole * 6 : tick ? (whole + recoil(s - whole)) * 6 : s * 6;
    timeText = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    day = now.getDate();
  }

  function start() {
    if (loop) return;
    loop = createLoop(() => frame());
  }
  function stop() {
    loop?.stop();
    loop = null;
  }

  /** The crown, pressed: it switches the seconds hand, and the watch answers. */
  function press(e: MouseEvent) {
    // A keyboard press has no pointer to hold the crown in, so push it in for a beat.
    if (e.detail === 0) {
      pressed = true;
      clearTimeout(pressTimer);
      pressTimer = window.setTimeout(() => (pressed = false), duration.quick);
    }
    tick = !tick;
    click();
    navigator.vibrate?.(10);
    caption = true;
    clearTimeout(captionTimer);
    captionTimer = window.setTimeout(() => (caption = false), duration.scene * 4);
  }

  onMount(() => {
    prefs.start();
    frame();
    // Run only while it is on screen.
    const io = new IntersectionObserver(([en]) => (en.isIntersecting ? start() : stop()));
    io.observe(root);
    return () => {
      io.disconnect();
      clearTimeout(captionTimer);
      clearTimeout(pressTimer);
    };
  });
  onDestroy(stop);
</script>

<div class="watch" class:pressed bind:this={root}>
  <span class="visually-hidden">The time: <time>{timeText}</time></span>
  <!-- The page's edge cuts the watch just below its 6 -->
  <div class="cut">
  <!-- The case's satin top: brushed in rings (CSS, under the drawing). -->
  <span class="case" aria-hidden="true"></span>
  <svg viewBox="-215 -215 430 430" aria-hidden="true">
    <defs>
      <linearGradient id="wt-convex" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" class="s-light" />
        <stop offset="0.5" class="s-clear" />
        <stop offset="1" class="s-dark" />
      </linearGradient>
      <linearGradient id="wt-concave" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" class="s-dark" />
        <stop offset="0.5" class="s-clear" />
        <stop offset="1" class="s-light" />
      </linearGradient>
      <linearGradient id="wt-crown" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" class="s-steel-lo" />
        <stop offset="0.3" class="s-steel-hi" />
        <stop offset="0.55" class="s-steel" />
        <stop offset="1" class="s-steel-lo" />
      </linearGradient>
      <radialGradient id="wt-face" cx="0" cy="0" r={R_SCREEN} gradientUnits="userSpaceOnUse">
        <stop offset="0.6" class="s-face" />
        <stop offset="1" class="s-face-edge" />
      </radialGradient>
      <radialGradient id="wt-bow" cx="0" cy="0" r={R_SCREEN} gradientUnits="userSpaceOnUse">
        <stop offset="0" class="s-clear" />
        <stop offset="0.35" class="s-sheen" />
        <stop offset="1" class="s-clear" />
      </radialGradient>
      <!-- Hands and markers: a ridge down the middle, one facet lit and one in shade -->
      <linearGradient id="wt-facet" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" class="s-hand-lo" />
        <stop offset="0.5" class="s-hand-hi" />
        <stop offset="0.5" class="s-hand" />
        <stop offset="1" class="s-hand-lo" />
      </linearGradient>
      <radialGradient id="wt-cap" cx="0.35" cy="0.3" r="0.8">
        <stop offset="0" class="s-steel-hi" />
        <stop offset="1" class="s-steel-lo" />
      </radialGradient>
      <radialGradient id="wt-crystal-edge" cx="0" cy="0" r={R_GLASS} gradientUnits="userSpaceOnUse">
        <stop offset="0.88" class="s-clear" />
        <stop offset="1" class="s-edge" />
      </radialGradient>
      <radialGradient id="wt-window" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" class="s-glare" />
        <stop offset="1" class="s-clear" />
      </radialGradient>
      <radialGradient id="wt-coat" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" class="s-coat" />
        <stop offset="1" class="s-clear" />
      </radialGradient>
      <clipPath id="wt-glass"><circle r={R_GLASS} /></clipPath>
      <clipPath id="wt-face-clip"><circle r={R_SCREEN} /></clipPath>
      <filter id="wt-soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="10" /></filter>
      <filter id="wt-lift" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow class="shade" dx="0" dy="2" stdDeviation="2" />
      </filter>
      <!-- Each hand stands higher than the last, so its shadow falls further off and softer -->
      <filter id="wt-sh-marker" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow class="shade" dx="0.6" dy="1.2" stdDeviation="0.6" /></filter>
      <filter id="wt-sh-hour" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow class="shade" dx="1.2" dy="2.4" stdDeviation="1.4" /></filter>
      <filter id="wt-sh-minute" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow class="shade" dx="2" dy="3.6" stdDeviation="1.8" /></filter>
      <filter id="wt-sh-second" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow class="shade" dx="3" dy="5" stdDeviation="2" /></filter>
    </defs>

    <!-- The crown at 3 o'clock: knurled, a polished end, a red ring. It goes in when pressed. -->
    <g filter="url(#wt-lift)">
      <g class="crown">
        <rect x={R_CASE - 6} y="-10" width="8" height="20" fill="url(#wt-crown)" />
        <rect class="crown-body" x={R_CASE + 1} y="-20" width="19" height="40" rx="4" fill="url(#wt-crown)" />
        {#each Array(9) as _, i (i)}
          <line class="crown-knurl" x1={R_CASE + 3 + i * 1.9} y1="-18.5" x2={R_CASE + 3 + i * 1.9} y2="18.5" />
        {/each}
        <rect class="crown-end" x={R_CASE + 18} y="-18" width="2" height="36" rx="1" />
        <rect class="crown-ring" x={R_CASE + 1} y="-20" width="2.6" height="40" />
      </g>
    </g>

    <!-- The case's polished edges: the outer rim, and the chamfer stepping down to the glass -->
    <circle class="rim" r={R_CASE - 1} stroke="url(#wt-convex)" />
    <circle class="chamfer" r={R_GLASS + 5} stroke="url(#wt-concave)" />

    <!-- Under the glass: a black border, as a screen's, then the face -->
    <circle class="screen-border" r={R_GLASS} />
    <g clip-path="url(#wt-face-clip)">
      <circle r={R_SCREEN} fill="url(#wt-face)" />
      {#each rays as a (a)}
        {@const [x, y] = pol(R_SCREEN, a)}
        <line class="ray" class:alt={a % 5 === 0} x1="0" y1="0" x2={x} y2={y} />
      {/each}
      <g filter="url(#wt-soft)">
        <path d={bow(315, 22)} fill="url(#wt-bow)" />
        <path d={bow(135, 22)} fill="url(#wt-bow)" class="bow-far" />
      </g>
      <!-- Printed: the minute track and the numerals -->
      {#each minuteTicks as a (a)}
        {@const [x1, y1] = pol(151, a)}
        {@const [x2, y2] = pol(158, a)}
        <line class="track" {x1} {y1} {x2} {y2} />
      {/each}
      {#each numerals as n (n.n)}
        <text class="numeral" x={n.at[0]} y={n.at[1] + 7.5}>{n.n}</text>
      {/each}
      <!-- The date, on its disc behind a framed window at 3 -->
      <rect class="date-disc" x="100" y="-11" width="30" height="22" rx="2" />
      <text class="date" x="115" y="7">{day}</text>
      <rect class="date-well" x="100" y="-11" width="30" height="22" rx="2" />
      <!-- Applied: an hour marker at each hour, standing proud of the face, and the date window's frame -->
      <g filter="url(#wt-sh-marker)">
        {#each Array(12) as _, i (i)}
          <rect class="marker" x={i % 3 === 0 ? -3.2 : -2.4} y="-159" width={i % 3 === 0 ? 6.4 : 4.8} height={i % 3 === 0 ? 20 : 15} rx="1" fill="url(#wt-facet)" transform={`rotate(${i * 30})`} />
        {/each}
        <rect class="date-frame" x="98.5" y="-12.5" width="33" height="25" rx="3" />
      </g>
    </g>

    <!-- The hands, each at its own height: hours, minutes, then the red seconds on top -->
    <g filter="url(#wt-sh-hour)">
      <g transform={`rotate(${hourA})`}>
        <rect class="stem" x="-1.8" y="-22" width="3.6" height="22" />
        <rect class="hand" x="-5" y="-94" width="10" height="76" rx="5" fill="url(#wt-facet)" />
        <rect class="lume" x="-2.4" y="-89" width="4.8" height="60" rx="2.4" />
      </g>
    </g>
    <g filter="url(#wt-sh-minute)">
      <g transform={`rotate(${minA})`}>
        <rect class="stem" x="-1.6" y="-22" width="3.2" height="22" />
        <rect class="hand" x="-4" y="-150" width="8" height="132" rx="4" fill="url(#wt-facet)" />
        <rect class="lume" x="-1.9" y="-145" width="3.8" height="112" rx="1.9" />
      </g>
      <circle r="7" fill="url(#wt-cap)" />
    </g>
    <g filter="url(#wt-sh-second)">
      <g transform={`rotate(${secA})`}>
        <line class="seconds" x1="0" y1="30" x2="0" y2="-157" />
        <circle class="seconds-weight" cy="22" r="4.5" />
      </g>
      <circle class="seconds-hub" r="4" />
      <circle class="hub-pin" r="1.4" />
    </g>

    <!-- The domed glass, fixed to the room: darker toward its edge, a soft window reflection at the
         upper left with the faint colour of its coating, and a bright line along the upper rim -->
    <g class="crystal" clip-path="url(#wt-glass)">
      <circle r={R_GLASS} fill="url(#wt-crystal-edge)" />
      <ellipse cx="-62" cy="-92" rx="92" ry="48" transform="rotate(-38 -62 -92)" fill="url(#wt-window)" />
      <ellipse cx="78" cy="96" rx="78" ry="30" transform="rotate(-38 78 96)" fill="url(#wt-coat)" />
      <path class="rim-shine" d={`M${P(pol(R_GLASS - 4, 282))}A${R_GLASS - 4} ${R_GLASS - 4} 0 0 1 ${P(pol(R_GLASS - 4, 20))}`} />
    </g>
    <circle class="glass-edge" r={R_GLASS} stroke="url(#wt-convex)" />
  </svg>
  </div>

  <!-- The control: over the crown, and larger than it, so a finger can find it -->
  <button
    class="crown-button"
    type="button"
    aria-pressed={tick}
    aria-label="Crown. Press to switch the seconds hand between a sweep and a tick."
    onpointerdown={() => (pressed = true)}
    onpointerup={() => (pressed = false)}
    onpointerleave={() => (pressed = false)}
    onpointercancel={() => (pressed = false)}
    onclick={press}
  ></button>
  <span class="caption smallcaps" class:on={caption} aria-hidden="true">{tick ? "Tick · once a second" : "Sweep"}</span>
</div>

<style>
  .watch {
    /* The box is this wide: the case, with room for its crown. */
    --w: clamp(170px, 18vw, 220px);
    /* Light: satin steel, a silvered-white sunray face, markers and hands in polished black. */
    --face: #fbfaf6;
    --face-edge: #e9e5dc;
    --ray: rgb(0 0 0 / 0.035);
    --ray-alt: rgb(255 255 255 / 0.6);
    --sheen: rgb(255 255 255 / 0.9);
    --face-ink: #1b1b1f;
    --face-muted: rgb(27 27 31 / 0.4);
    --lume: #efe9d8;
    --date-disc: #ffffff;
    --hand: #2a2a2f;
    --hand-hi: #5c5c63;
    --hand-lo: #0e0e11;
    --screen-border: #0c0d0f;
    --steel-hi: #ffffff;
    --steel: #dcd8cf;
    --steel-lo: #aaa59a;
    --shade: rgb(40 30 20 / 0.34);
    --light: rgb(255 255 255 / 0.95);
    --dark: rgb(60 45 30 / 0.32);
    --edge: rgb(0 0 0 / 0.26);
    --glare: rgb(255 255 255 / 0.42);
    --coating: rgb(124 155 255 / 0.1);
    --metal:
      repeating-radial-gradient(circle at 50% 50%, rgb(255 255 255 / 0.07) 0 1px, rgb(0 0 0 / 0.025) 1px 2px),
      conic-gradient(from 0deg at 50% 50%, #d4cfc5, #f8f6f1 40deg, #d8d3c9 85deg, #efece5 130deg, #cdc8be 180deg, #efece5 230deg, #d8d3c9 275deg, #f8f6f1 320deg, #d4cfc5);
    --case-shadow: 0 10px 24px -12px rgb(40 30 20 / 0.5), 0 2px 4px rgb(40 30 20 / 0.12);
    position: relative;
    flex: none;
    align-self: center;
    margin-top: auto;
    width: var(--w);
    /* Down to just below the 6 (y 140 of the 430 units, from −215): the rest is under the page's edge. */
    height: calc(var(--w) * 355 / 430);
  }
  .cut { position: absolute; inset: 0; overflow: hidden; }
  /* Dark: the light set inverted. A black sunray face, markers and hands in pale steel, a gunmetal case. */
  :global(:root[data-theme="dark"]) .watch {
    --face: #0d0e10;
    --face-edge: #070708;
    --ray: rgb(255 255 255 / 0.03);
    --ray-alt: rgb(255 255 255 / 0.05);
    --sheen: rgb(255 255 255 / 0.16);
    --face-ink: #ece9e1;
    --face-muted: rgb(236 233 225 / 0.4);
    --lume: #cfd8c4;
    --date-disc: #141517;
    --hand: #d9d6ce;
    --hand-hi: #ffffff;
    --hand-lo: #8f8c85;
    --screen-border: #050506;
    --steel-hi: #7a7b82;
    --steel: #4a4b50;
    --steel-lo: #232428;
    --shade: rgb(0 0 0 / 0.8);
    --light: rgb(255 255 255 / 0.28);
    --dark: rgb(0 0 0 / 0.7);
    --edge: rgb(0 0 0 / 0.55);
    --glare: rgb(255 255 255 / 0.13);
    --coating: rgb(124 155 255 / 0.08);
    --metal:
      repeating-radial-gradient(circle at 50% 50%, rgb(255 255 255 / 0.035) 0 1px, rgb(0 0 0 / 0.05) 1px 2px),
      conic-gradient(from 0deg at 50% 50%, #26272b, #4b4c52 40deg, #2b2c30 85deg, #404146 130deg, #232428 180deg, #404146 230deg, #2b2c30 275deg, #4b4c52 320deg, #26272b);
    --case-shadow: 0 10px 24px -10px rgb(0 0 0 / 0.85), 0 2px 4px rgb(0 0 0 / 0.4);
  }
  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme="light"])) .watch {
      --face: #0d0e10;
      --face-edge: #070708;
      --ray: rgb(255 255 255 / 0.03);
      --ray-alt: rgb(255 255 255 / 0.05);
      --sheen: rgb(255 255 255 / 0.16);
      --face-ink: #ece9e1;
      --face-muted: rgb(236 233 225 / 0.4);
      --lume: #cfd8c4;
      --date-disc: #141517;
      --hand: #d9d6ce;
      --hand-hi: #ffffff;
      --hand-lo: #8f8c85;
      --screen-border: #050506;
      --steel-hi: #7a7b82;
      --steel: #4a4b50;
      --steel-lo: #232428;
      --shade: rgb(0 0 0 / 0.8);
      --light: rgb(255 255 255 / 0.28);
      --dark: rgb(0 0 0 / 0.7);
      --edge: rgb(0 0 0 / 0.55);
      --glare: rgb(255 255 255 / 0.13);
      --coating: rgb(124 155 255 / 0.08);
      --metal:
        repeating-radial-gradient(circle at 50% 50%, rgb(255 255 255 / 0.035) 0 1px, rgb(0 0 0 / 0.05) 1px 2px),
        conic-gradient(from 0deg at 50% 50%, #26272b, #4b4c52 40deg, #2b2c30 85deg, #404146 130deg, #232428 180deg, #404146 230deg, #2b2c30 275deg, #4b4c52 320deg, #26272b);
      --case-shadow: 0 10px 24px -10px rgb(0 0 0 / 0.85), 0 2px 4px rgb(0 0 0 / 0.4);
    }
  }
  /* The case: a circle 400 of the 430 units across, centred. */
  .case { position: absolute; left: calc(var(--w) * 15 / 430); top: calc(var(--w) * 15 / 430); width: calc(var(--w) * 400 / 430); height: calc(var(--w) * 400 / 430); border-radius: 50%; background: var(--metal); box-shadow: var(--case-shadow); }
  svg { position: relative; display: block; width: var(--w); height: var(--w); overflow: visible; pointer-events: none; }
  .shade { flood-color: var(--shade); }
  .s-clear { stop-color: #fff; stop-opacity: 0; }
  .s-light { stop-color: var(--light); }
  .s-dark { stop-color: var(--dark); }
  .s-steel-hi { stop-color: var(--steel-hi); }
  .s-steel { stop-color: var(--steel); }
  .s-steel-lo { stop-color: var(--steel-lo); }
  .s-face { stop-color: var(--face); }
  .s-face-edge { stop-color: var(--face-edge); }
  .s-sheen { stop-color: var(--sheen); }
  .s-hand { stop-color: var(--hand); }
  .s-hand-hi { stop-color: var(--hand-hi); }
  .s-hand-lo { stop-color: var(--hand-lo); }
  .s-edge { stop-color: var(--edge); }
  .s-glare { stop-color: var(--glare); }
  .s-coat { stop-color: var(--coating); }

  /* The crown goes in while it is held, and comes back out with a little spring. */
  .crown { transition: transform var(--dur-base) var(--ease-reveal); }
  .pressed .crown { transform: translateX(-5px); transition: transform var(--dur-instant) var(--ease-out); }
  .crown-body { stroke: rgb(0 0 0 / 0.28); stroke-width: 0.6; }
  .crown-knurl { stroke: rgb(0 0 0 / 0.22); stroke-width: 0.8; }
  .crown-end { fill: var(--steel-hi); opacity: 0.8; }
  .crown-ring { fill: var(--red-pencil); }
  .rim { fill: none; stroke-width: 2; }
  .chamfer { fill: none; stroke-width: 7; }
  .screen-border { fill: var(--screen-border); }

  .ray { stroke: var(--ray); stroke-width: 1.4; }
  .ray.alt { stroke: var(--ray-alt); }
  .bow-far { opacity: 0.55; }
  .track { stroke: var(--face-muted); stroke-width: 1.1; stroke-linecap: round; }
  .numeral { fill: var(--face-ink); font-family: var(--font-display); font-weight: 500; font-size: 22px; text-anchor: middle; font-variant-numeric: tabular-nums; }

  .stem { fill: var(--hand-lo); }
  .lume { fill: var(--lume); }
  .date-disc { fill: var(--date-disc); }
  .date { fill: var(--face-ink); font-family: var(--font-display); font-weight: 500; font-size: 16px; text-anchor: middle; font-variant-numeric: tabular-nums; }
  /* The window's inner wall shades the top of the disc */
  .date-well { fill: none; stroke: rgb(0 0 0 / 0.18); stroke-width: 2; }
  .date-frame { fill: none; stroke: url(#wt-convex); stroke-width: 2.2; }
  .seconds { stroke: var(--red-pencil); stroke-width: 2; stroke-linecap: round; }
  .seconds-weight { fill: none; stroke: var(--red-pencil); stroke-width: 2.6; }
  .seconds-hub { fill: var(--red-pencil); }
  .hub-pin { fill: var(--steel-hi); }

  .crystal { pointer-events: none; }
  .rim-shine { fill: none; stroke: var(--light); stroke-width: 2.2; stroke-linecap: round; opacity: 0.75; }
  .glass-edge { fill: none; stroke-width: 1.2; }

  /* The control: centred on the crown (at 420 of the 430 units), a comfortable target round it. */
  .crown-button {
    position: absolute;
    left: calc(var(--w) * 419 / 430);
    top: 50%;
    width: 30px;
    height: 44px;
    translate: -50% -50%;
    padding: 0;
    border: 0;
    border-radius: 8px;
    background: none;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .crown-button:focus-visible { outline: 2px solid var(--blue-pencil); outline-offset: 1px; }

  /* What the seconds hand is doing, for a moment after the crown is pressed: beside the watch. */
  .caption {
    position: absolute;
    left: calc(100% + 1.1rem);
    top: 50%;
    translate: calc(-1 * var(--dist-nudge)) -50%;
    padding: 0.3rem 0.6rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--paper) 88%, transparent);
    color: var(--graphite-strong);
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition: opacity var(--dur-quick) var(--ease-out), translate var(--dur-quick) var(--ease-out);
  }
  .caption.on { opacity: 1; translate: 0 -50%; }
</style>
