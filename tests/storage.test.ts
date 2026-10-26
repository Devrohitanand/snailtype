import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  loadStats,
  saveStats,
  appendResult,
  StoredStats,
} from "@/lib/storage";

interface MockStorage {
  store: Map<string, string>;
}

function setupMockStorage(): MockStorage {
  const store = new Map<string, string>();
  const mock = {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  };

  Object.defineProperty(globalThis, "window", {
    value: { localStorage: mock },
    configurable: true,
  });
  Object.defineProperty(globalThis, "localStorage", {
    value: mock,
    configurable: true,
  });

  return { store };
}

describe("storage", () => {
  beforeEach(() => setupMockStorage());

  afterEach(() => {
    delete (globalThis as any).window;
    delete (globalThis as any).localStorage;
  });

  it("loadStats returns empty when nothing stored", () => {
    expect(loadStats()).toEqual({ results: [] });
  });

  it("appendResult / saveStats roundtrip", () => {
    const r1 = {
      finishedAt: 1,
      wpm: 50,
      accuracy: 96,
      correct: 240,
      errors: 10,
      durationMs: 60000,
      mode: "time" as const,
      target: 30,
    };
    const r2 = { ...r1, finishedAt: 2, wpm: 80 };

    let stats: StoredStats = { results: [] };
    stats = appendResult(stats, r1);
    stats = appendResult(stats, r2);
    saveStats(stats);

    const reloaded = loadStats();
    expect(reloaded.results).toHaveLength(2);
    expect(reloaded.results[0]?.wpm).toBe(50);
    expect(reloaded.results[1]?.wpm).toBe(80);
  });
});
