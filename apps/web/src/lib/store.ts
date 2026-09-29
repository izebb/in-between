/**
 * Local-first storage (IndexedDB via idb-keyval): chapters read, drill scores,
 * calibration history, the specimen journal. No accounts at v1.
 */

import { createStore, get, set, update, values, del } from "idb-keyval";

const isBrowser = typeof indexedDB !== "undefined";
const progress = isBrowser ? createStore("inbetween", "progress") : undefined;
const journal = isBrowser ? createStore("inbetween-journal", "specimens") : undefined;
const drills = isBrowser ? createStore("inbetween-drills", "sessions") : undefined;

export async function markChapterRead(n: number) {
  if (!progress) return;
  await update<number[]>("chapters-read", (v) => [...new Set([...(v ?? []), n])].sort((a, b) => a - b), progress);
}

export async function chaptersRead(): Promise<number[]> {
  if (!progress) return [];
  return (await get<number[]>("chapters-read", progress)) ?? [];
}

// ---------- Drills ----------
export interface Trial {
  /** Ground truth (ms for durations, index for choices, value for tuning). */
  truth: number;
  /** The learner's answer in the same units. */
  answer: number;
  correct: boolean;
  /** Seconds taken. */
  time?: number;
  /** Free-form detail (the options shown, the word chosen…). */
  meta?: Record<string, unknown>;
}

export interface DrillSession {
  id: string;
  drill: string;
  at: number; // epoch ms
  score: number;
  streak: number;
  trials: Trial[];
  /** Where it was played: the Eye Trainer or a chapter. */
  source: string;
}

export async function saveSession(s: DrillSession) {
  if (!drills) return;
  await set(s.id, s, drills);
}

export async function allSessions(): Promise<DrillSession[]> {
  if (!drills) return [];
  const all = await values<DrillSession>(drills);
  return all.sort((a, b) => a.at - b.at);
}

export async function clearSessions() {
  if (!drills) return;
  const all = await values<DrillSession>(drills);
  await Promise.all(all.map((s) => del(s.id, drills)));
}

// ---------- Journal ----------
export interface JournalEntry {
  id: string;
  at: number;
  instrument: string;
  /** Serialisable lab state, loadable via ?s= */
  state: unknown;
  words: string[];
  note?: string;
  title?: string;
}

export async function saveSpecimen(e: JournalEntry) {
  if (!journal) return;
  await set(e.id, e, journal);
  dispatchEvent(new CustomEvent("ib:journal"));
}

export async function allSpecimens(): Promise<JournalEntry[]> {
  if (!journal) return [];
  return (await values<JournalEntry>(journal)).sort((a, b) => b.at - a.at);
}

export async function deleteSpecimen(id: string) {
  if (!journal) return;
  await del(id, journal);
  dispatchEvent(new CustomEvent("ib:journal"));
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
