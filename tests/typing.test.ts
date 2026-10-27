import { describe, expect, it } from "vitest";
import { computeAccuracy, computeWpm } from "@/lib/typing-engine";
describe("typing flow math", () => {
  it("user types 50 correct chars over 30 seconds", () => {
    expect(computeWpm(50, 30_000)).toBe(20);
    expect(computeAccuracy(50, 0)).toBe(100);
  });

  it("user types 250 correct + 25 errors over 60 seconds", () => {
    expect(computeWpm(250, 60_000)).toBe(50);
    expect(computeAccuracy(250, 25)).toBe(91);
  });

  it("user types one wrong character early; never divides by zero", () => {
    // 1 char / 1s = 1/5 word / (1/60) minute = 12 wpm
    expect(computeWpm(1, 1_000)).toBe(12);
    expect(computeAccuracy(1, 1)).toBe(50);
  });

  it("duration tracking for word tests uses the elapsed window", () => {
    // 100 chars / 0.5min = 200/5 / 0.5 = 80 wpm
    expect(computeWpm(100, 30_000)).toBe(40);
  });
});
