/**
 * The frame tick: a soft click on each stepped frame, like a film counter.
 * Off by default (View → Frame tick).
 */
import { getSoundPref } from "~/motion/policy";

let ctx: AudioContext | null = null;

export function tick() {
  if (typeof window === "undefined" || !getSoundPref()) return;
  try {
    ctx ??= new AudioContext();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(1800, t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.05, t + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.04);
  } catch {
    /* no audio: silence is fine */
  }
}
