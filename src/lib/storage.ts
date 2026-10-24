export interface StoredResult {
  /** Unix ms when the test completed. */
  finishedAt: number;
  wpm: number;
  accuracy: number;
  correct: number;
  errors: number;
  durationMs: number;
  mode: "time" | "words";
  target: number;
}

export interface StoredStats {
  results: StoredResult[];
}

const STATS_KEY = "snailtype.stats.v1";
const PREFERENCES_KEY = "snailtype.preferences.v1";

const EMPTY_STATS: StoredStats = { results: [] };

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function isFiniteNonNegative(v: unknown): v is number {
  return isFiniteNumber(v) && v >= 0;
}

export function loadStats(): StoredStats {
  if (typeof window === "undefined") return EMPTY_STATS;
  try {
    const raw = window.localStorage.getItem(STATS_KEY);
    if (!raw) return EMPTY_STATS;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return EMPTY_STATS;
    const maybeResults = (parsed as { results?: unknown }).results;
    if (!Array.isArray(maybeResults)) return EMPTY_STATS;

    const validResults: StoredResult[] = [];
    for (const candidate of maybeResults) {
      if (!candidate || typeof candidate !== "object") continue;
      const c = candidate as Partial<StoredResult>;
      if (!isFiniteNumber(c.finishedAt)) continue;
      if (!isFiniteNonNegative(c.wpm)) continue;
      if (!isFiniteNumber(c.accuracy)) continue;
      if (!isFiniteNonNegative(c.correct)) continue;
      if (!isFiniteNonNegative(c.errors)) continue;
      if (!isFiniteNonNegative(c.durationMs)) continue;
      if (c.mode !== "time" && c.mode !== "words") continue;
      if (!isFiniteNonNegative(c.target)) continue;
      validResults.push({
        finishedAt: c.finishedAt,
        wpm: c.wpm,
        accuracy: c.accuracy,
        correct: c.correct,
        errors: c.errors,
        durationMs: c.durationMs,
        mode: c.mode,
        target: c.target,
      });
    }
    return { results: validResults };
  } catch {
    return EMPTY_STATS;
  }
}

export function saveStats(stats: StoredStats): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
  }
}

export function appendResult(stats: StoredStats, result: StoredResult): StoredStats {
  const next = { results: [...stats.results, result] };
  // Cap stored history to keep storage small and avoid performance drift.
  next.results = next.results.slice(-200);
  return next;
}

export function resetStats(): StoredStats {
  saveStats(EMPTY_STATS);
  return EMPTY_STATS;
}

export interface Preferences {
  textSize: "sm" | "md" | "lg";
  caret: boolean;
  sound: boolean;
  preview: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
  textSize: "md",
  caret: true,
  sound: false,
  preview: true,
};

export function loadPreferences(): Preferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  try {
    const raw = window.localStorage.getItem(PREFERENCES_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return DEFAULT_PREFERENCES;
    const p = parsed as Partial<Preferences>;
    return {
      textSize: p.textSize === "sm" || p.textSize === "lg" ? p.textSize : "md",
      caret: typeof p.caret === "boolean" ? p.caret : DEFAULT_PREFERENCES.caret,
      sound: typeof p.sound === "boolean" ? p.sound : DEFAULT_PREFERENCES.sound,
      preview: typeof p.preview === "boolean" ? p.preview : DEFAULT_PREFERENCES.preview,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function savePreferences(prefs: Preferences): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs));
  } catch {
    // No-op: preferences are a nicety, not a hard requirement.
  }
}
