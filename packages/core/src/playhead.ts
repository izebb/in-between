/**
 * A shared playhead: the Frame Stepper's clock.
 *
 * Every stage in the lab reads its time from a playhead rather than from the wall
 * clock, so playback can be slowed to 0.25× or 0.1×, paused, and stepped one frame
 * at a time without the stage knowing or caring.
 */

import { createLoop, type Clock, type Loop } from "./loop.ts";

export type PlayheadListener = (p: Playhead) => void;

export interface PlayheadOptions {
  /** Length of one pass in ms. Null = runs forever. */
  duration?: number | null;
  /** Wrap to the start after `duration` (+ hold). */
  loop?: boolean;
  /** Pause at the end of each pass before looping, ms. */
  hold?: number;
  /** Frame grid used by step(), frames per second. */
  fps?: number;
  rate?: number;
  clock?: Clock;
  autoplay?: boolean;
}

export interface Playhead {
  /** Current time in ms. */
  readonly time: number;
  /** Current frame on the fps grid. */
  readonly frame: number;
  readonly playing: boolean;
  rate: number;
  fps: number;
  duration: number | null;
  loop: boolean;
  hold: number;
  play(): void;
  pause(): void;
  toggle(): void;
  /** Jump to ms (clamped to the pass). */
  seek(ms: number): void;
  /** Move by n frames on the fps grid; pauses playback. */
  step(n?: number): void;
  /** Restart from zero. */
  restart(): void;
  subscribe(fn: PlayheadListener): () => void;
  destroy(): void;
}

export function createPlayhead(opts: PlayheadOptions = {}): Playhead {
  const listeners = new Set<PlayheadListener>();
  let time = 0;
  let playing = false;
  let loopRunner: Loop | null = null;

  const emit = () => {
    for (const fn of listeners) fn(head);
  };

  const passLength = () => (head.duration == null ? Infinity : head.duration + (head.loop ? head.hold : 0));

  const advance = (ms: number) => {
    time += ms;
    const len = passLength();
    if (Number.isFinite(len) && time >= len) {
      if (head.loop) time = len > 0 ? time % len : 0;
      else {
        time = head.duration ?? time;
        head.pause();
      }
    }
  };

  const head: Playhead = {
    rate: opts.rate ?? 1,
    fps: opts.fps ?? 60,
    duration: opts.duration ?? null,
    loop: opts.loop ?? true,
    hold: opts.hold ?? 0,
    get time() {
      return head.duration == null ? time : Math.min(time, head.duration);
    },
    get frame() {
      return Math.round((head.time / 1000) * head.fps);
    },
    get playing() {
      return playing;
    },
    play() {
      if (playing) return;
      if (!head.loop && head.duration != null && time >= head.duration) time = 0;
      playing = true;
      loopRunner = createLoop(
        ({ dt }) => {
          advance(dt * 1000 * head.rate);
          emit();
        },
        { clock: opts.clock, maxDt: 1 / 20 },
      );
      emit();
    },
    pause() {
      if (!playing) return;
      playing = false;
      loopRunner?.stop();
      loopRunner = null;
      emit();
    },
    toggle() {
      if (playing) head.pause();
      else head.play();
    },
    seek(ms) {
      const max = head.duration ?? Infinity;
      time = Math.max(0, Math.min(ms, max));
      emit();
    },
    step(n = 1) {
      head.pause();
      const frameMs = 1000 / head.fps;
      const current = Math.round(head.time / frameMs);
      const max = head.duration ?? Infinity;
      time = Math.max(0, Math.min((current + n) * frameMs, max));
      emit();
    },
    restart() {
      time = 0;
      emit();
    },
    subscribe(fn) {
      listeners.add(fn);
      fn(head);
      return () => listeners.delete(fn);
    },
    destroy() {
      head.pause();
      listeners.clear();
    },
  };

  if (opts.autoplay) head.play();
  return head;
}
