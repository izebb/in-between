/**
 * Which scene path is "hot" right now: hovered in the code, on the stage, or on a knob.
 * Code lines, knobs and stage marks that control it light up together.
 */
export class LinkState {
  group = $state<string | null>(null);
  source = $state<"code" | "stage" | "knob" | null>(null);
  set(group: string | null, source: "code" | "stage" | "knob") {
    this.group = group;
    this.source = group ? source : null;
  }
}

/** Does an element's data-link list match the hot group? "0.easing" matches "0.easing.x1" and "0". */
export function linkMatches(links: string, group: string): boolean {
  const gs = group.split(/\s+/);
  // A hot "0.easing.x1" lights marks for "0.easing" (its parent) but not the whole row "0".
  return links.split(/\s+/).some((l) => gs.some((g) => l === g || l.startsWith(g + ".") || (l.includes(".") && g.startsWith(l + "."))));
}
