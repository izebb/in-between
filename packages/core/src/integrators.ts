/**
 * Physics by hand: advancing position and velocity one small step at a time.
 *
 *   explicit Euler       x += v·dt;  v += a·dt       (gains energy: springs explode)
 *   semi-implicit Euler  v += a·dt;  x += v·dt       (velocity first: stable, cheap)
 *   Verlet               x' = 2x − x₋₁ + a·dt²       (position only: great for cloth)
 */

export interface Body {
  x: number;
  v: number;
}

export interface VerletBody {
  x: number;
  prev: number;
}

export type Acceleration = (x: number, v: number) => number;

export function eulerStep(b: Body, accel: Acceleration, dt: number): Body {
  const a = accel(b.x, b.v);
  b.x += b.v * dt;
  b.v += a * dt;
  return b;
}

export function semiImplicitEulerStep(b: Body, accel: Acceleration, dt: number): Body {
  b.v += accel(b.x, b.v) * dt;
  b.x += b.v * dt;
  return b;
}

export function verletStep(b: VerletBody, accel: Acceleration, dt: number): VerletBody {
  const v = (b.x - b.prev) / dt;
  const next = 2 * b.x - b.prev + accel(b.x, v) * dt * dt;
  b.prev = b.x;
  b.x = next;
  return b;
}

/** Runge–Kutta 4: the accurate reference the others are judged against. */
export function rk4Step(b: Body, accel: Acceleration, dt: number): Body {
  const k1x = b.v;
  const k1v = accel(b.x, b.v);
  const k2x = b.v + (k1v * dt) / 2;
  const k2v = accel(b.x + (k1x * dt) / 2, k2x);
  const k3x = b.v + (k2v * dt) / 2;
  const k3v = accel(b.x + (k2x * dt) / 2, k3x);
  const k4x = b.v + k3v * dt;
  const k4v = accel(b.x + k3x * dt, k4x);
  b.x += ((k1x + 2 * k2x + 2 * k3x + k4x) * dt) / 6;
  b.v += ((k1v + 2 * k2v + 2 * k3v + k4v) * dt) / 6;
  return b;
}

/** Hooke's law plus damping: the spring as a force. */
export const springAccel =
  (k: number, c: number, m: number, target = 0): Acceleration =>
  (x, v) =>
    (-k * (x - target) - c * v) / m;

/** Total energy of a spring body: kinetic + potential. Should never grow. */
export const springEnergy = (b: Body, k: number, m: number, target = 0) =>
  0.5 * m * b.v * b.v + 0.5 * k * (b.x - target) * (b.x - target);
