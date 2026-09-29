/**
 * A tiny text writer that remembers where every parameter was printed.
 * Each number bound to a scene path becomes a Binding with its character range,
 * so an editor can map edits back to knobs and knobs forward to characters.
 */

export interface Binding {
  /** Scene path, e.g. "0.duration" or "0.easing.x1". */
  path: string;
  from: number;
  to: number;
  /** The parameter value (scene units, e.g. ms). */
  value: number;
  /** Printed text = value × scale (e.g. 0.001 for seconds). */
  scale: number;
  /** Decimals printed (before trimming zeros). */
  decimals: number;
}

export interface LineInfo {
  /** Scene path groups this line controls, e.g. ["0.easing"]. */
  targets: string[];
}

export interface Code {
  dialect: Dialect;
  language: "css" | "javascript";
  text: string;
  bindings: Binding[];
  lines: LineInfo[];
}

export type Dialect = "css" | "waapi" | "motion" | "gsap" | "canvas";

/** Trim a fixed-decimal string: 0.200 → 0.2, 280.0 → 280. */
export function fmt(v: number, decimals: number): string {
  if (!Number.isFinite(v)) return "0";
  const s = v.toFixed(decimals);
  const t = s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, "") : s;
  return t === "-0" ? "0" : t;
}

/** The group a path belongs to, for line ↔ stage linking: "0.easing.x1" → "0.easing". */
export function groupOf(path: string): string {
  const parts = path.split(".");
  return parts.length > 2 ? parts.slice(0, 2).join(".") : path;
}

export class Writer {
  text = "";
  bindings: Binding[] = [];
  private lineTargets: Set<string>[] = [new Set()];

  /** Append literal text. */
  t(s: string): this {
    const parts = s.split("\n");
    parts.forEach((p, i) => {
      if (i > 0) {
        this.text += "\n";
        this.lineTargets.push(new Set());
      }
      this.text += p;
    });
    return this;
  }

  /** Append a bound number. */
  n(path: string, value: number, opts: { scale?: number; decimals?: number } = {}): this {
    const scale = opts.scale ?? 1;
    const decimals = opts.decimals ?? 0;
    const s = fmt(value * scale, decimals);
    const from = this.text.length;
    this.text += s;
    this.bindings.push({ path, from, to: from + s.length, value, scale, decimals });
    this.tag(groupOf(path));
    return this;
  }

  /** Mark the current line as controlling a path group. */
  tag(...paths: string[]): this {
    const cur = this.lineTargets[this.lineTargets.length - 1];
    for (const p of paths) cur.add(p);
    return this;
  }

  done(dialect: Dialect, language: "css" | "javascript"): Code {
    return {
      dialect,
      language,
      text: this.text,
      bindings: this.bindings,
      lines: this.lineTargets.map((s) => ({ targets: [...s] })),
    };
  }
}
