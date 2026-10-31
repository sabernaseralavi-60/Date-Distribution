import type { UserRole } from './types.ts';

/**
 * Runtime context for the domain engine. The engine functions stay pure with respect to the state they receive, but they
 * need a clock, unique ids and the acting user. The server sets the actor before each action; tests can pin the clock.
 */
let clock: () => number = () => Date.now();
let counter = 0;

export function setClock(fn: (() => number) | null): void {
  clock = fn ?? (() => Date.now());
}

export const nowMs = (): number => clock();
export const nowIso = (): string => new Date(clock()).toISOString();

/** Unique id fragment: time + process counter + randomness (two actions in the same millisecond never collide). */
let seeded: { seed: string; n: number } | null = null;

/** Deterministic ids: the browser predicts the ids the server will generate for the same action (same seed, same call order). */
export function withIdSeed<T>(seed: string, fn: () => T): T {
  const prev = seeded;
  seeded = { seed, n: 0 };
  try {
    return fn();
  } finally {
    seeded = prev;
  }
}

export function uid(): string {
  if (seeded) {
    seeded.n += 1;
    return `${seeded.seed}${seeded.n.toString(36)}`;
  }
  counter = (counter + 1) % 1_679_616;
  const rnd = Math.floor(Math.random() * 1_679_616);
  return `${clock().toString(36)}${counter.toString(36).padStart(2, '0')}${rnd.toString(36).padStart(4, '0')}`;
}

export interface Actor {
  role: UserRole;
  name: string;
  /** agent id or retailer id for scoped roles */
  entityId?: string;
}

let currentActor: Actor = { role: 'admin', name: 'مدیر سیستم' };

export function setActor(a: Actor | null): void {
  currentActor = a ?? { role: 'admin', name: 'مدیر سیستم' };
}

export const actor = (): Actor => currentActor;

/** Runs fn with the given actor and restores the previous one (engine functions are synchronous). */
export function withActor<T>(a: Actor, fn: () => T): T {
  const prev = currentActor;
  currentActor = a;
  try {
    return fn();
  } finally {
    currentActor = prev;
  }
}
