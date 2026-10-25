import { describe, expect, it } from "vitest";
import {
  buildResult,
  completedWordCount,
  computeAccuracy,
  computeWpm,
  tokensFor,
} from "@/lib/typing-engine";

describe("computeWpm", () => {
  it("returns 0 with zero elapsed time", () => {
    expect(computeWpm(50, 0)).toBe(0);
  });

  it("returns 0 with zero characters typed", () => {
    expect(computeWpm(0, 30000)).toBe(0);
  });

  it("computes standard five-char gross WPM deterministically", () => {
    // Five characters count as one word for WPM.
    expect(computeWpm(250, 60_000)).toBe(50);
  });

  it("rounds to nearest integer and never goes negative", () => {
    expect(computeWpm(1, 12_000)).toBe(1);
    expect(computeWpm(50, 30_000)).toBe(20);
    expect(computeWpm(100, -1)).toBe(0);
  });
});

describe("computeAccuracy", () => {
  it("defaults to 100% when no input", () => {
    expect(computeAccuracy(0, 0)).toBe(100);
  });

  it("computes correct ratio of correct to total keystrokes", () => {
    expect(computeAccuracy(9, 1)).toBe(90);
    expect(computeAccuracy(50, 50)).toBe(50);
    expect(computeAccuracy(100, 0)).toBe(100);
  });
});

describe("completedWordCount", () => {
  it("counts typed words up to the caret, ignoring trailing spaces", () => {
    const passage = "the quick brown fox";
    expect(completedWordCount(passage, 3)).toBe(1); // "the"
    expect(completedWordCount(passage, 4)).toBe(1); // "the "
    expect(completedWordCount(passage, 9)).toBe(2); // "the quick"
    expect(completedWordCount(passage, 10)).toBe(2); // "the quick "
  });

  it("handles empty input", () => {
    expect(completedWordCount("anything", 0)).toBe(0);
  });
});

describe("tokensFor", () => {
  it("creates a token per character with status untyped", () => {
    const tokens = tokensFor("hi there");
    expect(tokens).toHaveLength(8);
    expect(tokens.every((t) => t.status === "untyped")).toBe(true);
    expect(tokens.map((t) => t.char).join("")).toBe("hi there");
  });
});

describe("buildResult", () => {
  it("composes WPM, accuracy, and counts into a single result object", () => {
    const r = buildResult({ correctChars: 250, errorChars: 10, elapsedMs: 60_000 });
    expect(r.wpm).toBe(50);
    expect(r.accuracy).toBe(96);
    expect(r.correctChars).toBe(250);
    expect(r.errorChars).toBe(10);
    expect(r.durationMs).toBe(60_000);
  });

  it("handles empty input without dividing by zero", () => {
    const r = buildResult({ correctChars: 0, errorChars: 0, elapsedMs: 0 });
    expect(r.wpm).toBe(0);
    expect(r.accuracy).toBe(100);
  });
});