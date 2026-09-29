/**
 * Smooth randomness. `Math.random()` jumps; noise drifts.
 * Nature looks like noise: neighbouring moments are related.
 */

/** Seeded PRNG (mulberry32): the same seed gives the same sequence. */
export function seededRandom(seed = 1): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

function permutation(seed: number): Uint8Array {
  const rand = seededRandom(seed);
  const p = new Uint8Array(512);
  const base = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [base[i], base[j]] = [base[j], base[i]];
  }
  for (let i = 0; i < 512; i++) p[i] = base[i & 255];
  return p;
}

/** 1D Perlin gradient noise, roughly in [-1, 1]. */
export function perlin1D(seed = 1): (x: number) => number {
  const p = permutation(seed);
  const grad = (h: number, x: number) => ((h & 1) === 0 ? x : -x) * ((h & 2) === 0 ? 1 : 0.5);
  return (x: number) => {
    const xi = Math.floor(x) & 255;
    const xf = x - Math.floor(x);
    const u = fade(xf);
    const a = grad(p[xi], xf);
    const b = grad(p[xi + 1], xf - 1);
    return (a + (b - a) * u) * 2;
  };
}

/** 2D simplex noise, in [-1, 1]. */
export function simplex2D(seed = 1): (x: number, y: number) => number {
  const p = permutation(seed);
  const G = [
    [1, 1], [-1, 1], [1, -1], [-1, -1],
    [1, 0], [-1, 0], [0, 1], [0, -1],
  ];
  const F2 = 0.5 * (Math.sqrt(3) - 1);
  const G2 = (3 - Math.sqrt(3)) / 6;
  return (xin: number, yin: number) => {
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const t = (i + j) * G2;
    const x0 = xin - (i - t);
    const y0 = yin - (j - t);
    const i1 = x0 > y0 ? 1 : 0;
    const j1 = x0 > y0 ? 0 : 1;
    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;
    const ii = i & 255;
    const jj = j & 255;
    const corner = (gi: number, x: number, y: number) => {
      let t0 = 0.5 - x * x - y * y;
      if (t0 < 0) return 0;
      t0 *= t0;
      const g = G[gi % 8];
      return t0 * t0 * (g[0] * x + g[1] * y);
    };
    const n0 = corner(p[ii + p[jj]], x0, y0);
    const n1 = corner(p[ii + i1 + p[jj + j1]], x1, y1);
    const n2 = corner(p[ii + 1 + p[jj + 1]], x2, y2);
    return 70 * (n0 + n1 + n2);
  };
}

/** Fractal noise: several octaves summed, each finer and fainter. */
export function fbm1D(noise: (x: number) => number, octaves = 4): (x: number) => number {
  return (x) => {
    let sum = 0;
    let amp = 0.5;
    let freq = 1;
    let norm = 0;
    for (let o = 0; o < octaves; o++) {
      sum += amp * noise(x * freq);
      norm += amp;
      amp *= 0.5;
      freq *= 2;
    }
    return sum / norm;
  };
}
