/**
 * Token-level diff between two versions of generated code.
 * Gives the minimal edits to turn old into new (so an editor keeps the cursor and
 * scroll), and the token ranges that changed (so they can flash in red pencil).
 */

export interface Edit {
  from: number; // in old text
  to: number; // in old text
  insert: string;
}

export interface Range {
  from: number;
  to: number;
}

interface Tok {
  s: string;
  at: number;
}

function tokenize(text: string): Tok[] {
  const re = /-?\d*\.?\d+(?:e[-+]?\d+)?|[A-Za-z_$][\w$]*|\s+|./g;
  const out: Tok[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.push({ s: m[0], at: m.index });
  return out;
}

export function diffCode(oldText: string, newText: string): { edits: Edit[]; changed: Range[] } {
  if (oldText === newText) return { edits: [], changed: [] };
  const a = tokenize(oldText);
  const b = tokenize(newText);
  let pre = 0;
  while (pre < a.length && pre < b.length && a[pre].s === b[pre].s) pre++;
  let suf = 0;
  while (suf < a.length - pre && suf < b.length - pre && a[a.length - 1 - suf].s === b[b.length - 1 - suf].s) suf++;
  const A = a.slice(pre, a.length - suf);
  const B = b.slice(pre, b.length - suf);

  // LCS table on the middle.
  const n = A.length;
  const m = B.length;
  const edits: Edit[] = [];
  const changed: Range[] = [];
  const endA = (i: number) => (i < n ? A[i].at : suf ? a[a.length - suf].at : oldText.length);
  const endB = (j: number) => (j < m ? B[j].at : suf ? b[b.length - suf].at : newText.length);

  if (n * m > 400_000) {
    // Too different: replace the whole middle.
    const from = n ? A[0].at : endA(0);
    const bFrom = m ? B[0].at : endB(0);
    edits.push({ from, to: endA(n), insert: newText.slice(bFrom, endB(m)) });
    if (m) changed.push({ from: bFrom, to: endB(m) });
    return { edits, changed };
  }

  const dp: Uint16Array[] = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = A[i].s === B[j].s ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);

  let i = 0;
  let j = 0;
  let pending: { aFrom: number; bFrom: number } | null = null;
  const flush = () => {
    if (!pending) return;
    const aTo = endA(i);
    const bTo = endB(j);
    edits.push({ from: pending.aFrom, to: aTo, insert: newText.slice(pending.bFrom, bTo) });
    if (bTo > pending.bFrom && newText.slice(pending.bFrom, bTo).trim()) changed.push({ from: pending.bFrom, to: bTo });
    pending = null;
  };
  while (i < n || j < m) {
    if (i < n && j < m && A[i].s === B[j].s) {
      flush();
      i++;
      j++;
    } else {
      if (!pending) pending = { aFrom: endA(i), bFrom: endB(j) };
      if (j < m && (i >= n || dp[i][j + 1] >= dp[i + 1][j])) j++;
      else i++;
    }
  }
  flush();
  return { edits, changed };
}
