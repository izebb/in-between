<script lang="ts">
  /**
   * Runs a drill: a short timed round (60–90s) or a fixed number of trials in a chapter.
   * Scores, streaks, and every answer go to IndexedDB for the calibration graph.
   */
  import { onDestroy, tick } from "svelte";
  import { seededRandom } from "@inbetween/core";
  import { drills } from "~/lib/drills";
  import type { Scored } from "~/lib/drills/types";
  import type { DrillId } from "~/lib/curriculum";
  import { saveSession, uid, type DrillSession } from "~/lib/store";
  import { trialComponents } from "./registry";
  import Calibration from "./Calibration.svelte";

  interface Props {
    drill: DrillId;
    mode?: "round" | "short";
    trials?: number;
    seconds?: number;
    source?: string;
    /** Focus a drill's pool (Blind A/B pairs by topic). */
    topic?: string;
    /** Name the drill over the runner, with what it trains. Off where its row already says both (the Eye trainer). */
    heading?: boolean;
    onfinish?: (s: DrillSession) => void;
  }
  let { drill, mode = "round", trials = 5, seconds = 75, source = "eye-trainer", topic, heading = true, onfinish }: Props = $props();

  const def = $derived(drills[drill]);
  const Trial = $derived(trialComponents[drill]);

  let phase = $state<"intro" | "trial" | "reveal" | "done">("intro");
  let spec = $state<unknown>(null);
  let result = $state<Scored | null>(null);
  // Raw, not a deep proxy: these objects go to IndexedDB, and a proxy can't be structured-cloned.
  let results = $state.raw<{ spec: unknown; scored: Scored }[]>([]);
  let level = $state(0);
  let streak = $state(0);
  let best = $state(0);
  let timeLeft = $state(seconds);
  let session = $state<DrillSession | null>(null);
  let trialKey = $state(0);
  let timer: ReturnType<typeof setInterval> | null = null;
  let rand = seededRandom(1);
  let nextBtn = $state<HTMLButtonElement>();

  const total = $derived(results.reduce((s, r) => s + r.scored.points, 0));
  const accuracy = $derived(results.length ? Math.round((results.filter((r) => r.scored.correct).length / results.length) * 100) : 0);

  function start() {
    rand = seededRandom((Date.now() % 1e9) + 7);
    results = [];
    level = 0;
    streak = 0;
    best = 0;
    timeLeft = seconds;
    session = null;
    next();
    if (mode === "round") {
      timer = setInterval(() => {
        timeLeft = Math.max(0, timeLeft - 1);
        // Out of time: the trial on screen can still be answered, and a verdict stays until it's read.
        // The button then says "See results".
        if (timeLeft === 0 && timer) {
          clearInterval(timer);
          timer = null;
        }
      }, 1000);
    }
  }

  const keyOf = (s: unknown) => (def!.key ? def!.key(s) : JSON.stringify(s));

  function next() {
    // Don't show a trial that was just seen: draw again (a few times at most) if it's one of the last three.
    const recent = results.slice(-3).map((r) => keyOf(r.spec));
    let s = def!.make(rand, level, { topic });
    for (let i = 0; i < 8 && recent.includes(keyOf(s)); i++) s = def!.make(rand, level, { topic });
    spec = s;
    result = null;
    trialKey++;
    phase = "trial";
  }

  function answer(a: unknown) {
    if (phase !== "trial") return;
    const scored = def!.score(spec as never, a as never);
    result = scored;
    results = [...results, { spec: $state.snapshot(spec), scored }];
    if (scored.correct) {
      streak++;
      best = Math.max(best, streak);
      if (streak % 3 === 0) level++;
    } else {
      streak = 0;
      level = Math.max(0, level - 1);
    }
    phase = "reveal";
    // The verdict's button takes the focus, so Enter (or a tap on it) moves on.
    tick().then(() => nextBtn?.focus({ preventScroll: true }));
  }

  async function finish() {
    if (timer) clearInterval(timer);
    timer = null;
    const s: DrillSession = {
      id: uid(),
      drill,
      at: Date.now(),
      score: total,
      streak: best,
      source,
      trials: results.map((r) => ({ truth: r.scored.truth, answer: r.scored.answer, correct: r.scored.correct, meta: r.scored.meta })),
    };
    session = s;
    phase = "done";
    if (results.length) await saveSession(s);
    onfinish?.(s);
  }

  function proceed() {
    const outOfTime = mode === "round" && timeLeft === 0;
    const enough = mode === "short" && results.length >= trials;
    if (outOfTime || enough) finish();
    else next();
  }

  function key(e: KeyboardEvent) {
    // A focused control handles its own keys (a focused Replay replays); anywhere else, Enter moves on.
    const t = e.target as HTMLElement | null;
    if (t?.closest?.("input, select, textarea, a") || (t?.closest?.("button") && !(t.closest("button") as HTMLButtonElement).disabled)) return;
    if (phase === "reveal" && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      proceed();
    }
  }

  onDestroy(() => timer && clearInterval(timer));
  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
</script>

<svelte:window onkeydown={key} />

{#if !def || !Trial}
  <div class="runner"><p class="fine">This drill is still being built. It will appear here and in the Eye trainer.</p></div>
{:else}
<div class="runner" data-drill={drill}>
  {#if heading || phase !== "intro"}
  <header class="r-head" class:bare={!heading}>
    {#if heading}
      <div class="r-title">
        <span class="smallcaps">Eye trainer · {def.kind === "estimate" ? "estimate" : "choose"}</span>
        <span class="serif">{def.name}</span>
      </div>
    {/if}
    {#if phase !== "intro"}
      <div class="r-stats mono">
        {#if mode === "round"}<span title="Time left"><b>{mmss(timeLeft)}</b></span>{:else}<span><b>{Math.min(results.length + (phase === "trial" ? 1 : 0), trials)}</b>/{trials}</span>{/if}
        <!-- A changed score or streak fades in, so the eye catches that it changed. -->
        <span title="Score">score {#key total}<b data-motion="fade">{total}</b>{/key}</span>
        <span title="Streak">streak {#key streak}<b data-motion="fade">{streak}</b>{/key}</span>
      </div>
    {/if}
  </header>
  {/if}

  {#if phase === "intro"}
    <div class="r-intro">
      <p>{def.prompt}{#if heading} <span class="trains">{def.trains}.</span>{/if}</p>
      <p class="fine">{mode === "round" ? `A round lasts ${seconds} seconds.` : `${trials} trials.`} Judge with your eyes first; the numbers come after. Three right in a row makes trials harder, a miss eases them.</p>
      <button class="btn solid" type="button" onclick={start}>Start</button>
    </div>
  {:else if phase === "trial" || phase === "reveal"}
    <p class="prompt">{def.prompt}</p>
    {#key trialKey}
      <div class="trial-in" data-motion="fade"><Trial {spec} {result} onanswer={answer} /></div>
    {/key}
    <!-- A live region that is there before the verdict is, so a screen reader reads the verdict out. -->
    <div class="said" class:idle={!(phase === "reveal" && result)} aria-live="polite">
      {#if phase === "reveal" && result}
        <div class="verdict" data-motion="fade">
          <span class="mark smallcaps" class:ok={result.correct}>{result.correct ? (def.kind === "estimate" ? "Close" : "Right") : "Not quite"} · +{result.points}</span>
          <p>{result.verdict}</p>
          <button class="btn solid" type="button" bind:this={nextBtn} onclick={proceed}>{(mode === "round" && timeLeft === 0) || (mode === "short" && results.length >= trials) ? "See results" : "Next"} <kbd>↵</kbd></button>
        </div>
      {/if}
    </div>
  {:else if phase === "done" && session}
    <div class="r-done" data-motion="rise">
      <div class="figures">
        <div><span class="smallcaps">Score</span><b class="serif">{total}</b></div>
        <div><span class="smallcaps">Accuracy</span><b class="serif">{accuracy}%</b></div>
        <div><span class="smallcaps">Best streak</span><b class="serif">{best}</b></div>
        <div><span class="smallcaps">Trials</span><b class="serif">{results.length}</b></div>
      </div>
      {#if def.kind === "estimate" && results.length}
        <Calibration {def} sessions={[session]} height={220} />
      {/if}
      <div class="again">
        <button class="btn solid" type="button" onclick={start}>Another round</button>
        <!-- In the Eye trainer the calibration is already beside the runner. -->
        {#if source !== "eye-trainer"}<a class="btn ghost" href={`/lab/eye-trainer?drill=${drill}`}>Your calibration over time</a>{/if}
      </div>
    </div>
  {/if}
</div>
{/if}

<style>
  .runner { display: flex; flex-direction: column; gap: 0.9rem; }
  .r-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
  .r-head.bare { justify-content: flex-end; }
  .r-title { display: flex; flex-direction: column; gap: 0.15rem; }
  .r-title .smallcaps { color: var(--graphite-strong); }
  .r-title .serif { font-size: 1.6rem; line-height: 1.05; }
  .r-stats { display: flex; gap: 1rem; font-size: var(--text-sm); color: var(--graphite-strong); }
  .r-stats b { color: var(--ink); font-weight: 500; }
  .r-intro { display: flex; flex-direction: column; gap: 0.6rem; align-items: flex-start; }
  .trains { color: var(--graphite-strong); }
  .fine { font-size: var(--text-sm); color: var(--graphite-strong); }
  .prompt { font-family: var(--font-display); font-size: 1.25rem; }
  /* Empty until a verdict comes: it takes no room (its gap is taken back) until then. */
  .said.idle { margin-top: -0.9rem; }
  .verdict { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem 1rem; border-top: 1px solid var(--rule); padding-top: 0.8rem; }
  .verdict p { flex: 1; min-width: 14rem; font-size: var(--text-sm); }
  .mark { color: var(--graphite-strong); }
  .mark.ok { color: var(--ink); }
  .verdict kbd { font-size: 0.75em; margin-left: 0.25rem; border-color: color-mix(in srgb, var(--paper) 40%, transparent); }
  .r-done { display: flex; flex-direction: column; gap: 1.2rem; }
  .figures { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); border: 1px solid var(--rule); border-radius: 6px; }
  .figures > div { display: flex; flex-direction: column; gap: 0.15rem; padding: 0.7rem 0.9rem; }
  .figures > div + div { border-left: 1px solid var(--rule); }
  .figures .smallcaps { color: var(--graphite-strong); }
  .figures b { font-size: 2rem; font-weight: 400; line-height: 1; font-variant-numeric: tabular-nums lining-nums; }
  @media (max-width: 520px) { .figures { grid-template-columns: repeat(2, minmax(0, 1fr)); } .figures > div:nth-child(3) { border-left: 0; } .figures > div:nth-child(n+3) { border-top: 1px solid var(--rule); } }
  .again { display: flex; gap: 0.5rem; flex-wrap: wrap; }
</style>
