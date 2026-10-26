import { describe, expect, it } from "vitest";
import { pickPassage } from "@/lib/passages";

describe("pickPassage", () => {
  it("returns a passage from the list", () => {
    expect(pickPassage(null).length).toBeGreaterThan(0);
  });

  it("avoids repeating the previous passage when possible", () => {
    // Try a few times to check that another passage can be picked.
    let foundDifferent = false;
    const previous = pickPassage(null);

    for (let i = 0; i < 20; i++) {
      if (pickPassage(previous) !== previous) {
        foundDifferent = true;
        break;
      }
    }

    expect(foundDifferent).toBe(true);
  });

  it("handles unusual inputs without throwing", () => {
    expect(typeof pickPassage(null)).toBe("string");
  });
});