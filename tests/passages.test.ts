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
import { describe, expect, it } from "vitest";
import { pickPassage, truncateToWords } from "@/lib/passages";

describe("truncateToWords", () => {
  it("keeps text shorter than target intact", () => {
    expect(truncateToWords("a b c", 10)).toBe("a b c");
  });

  it("truncates at word boundaries when exceeding target", () => {
    const text = "the quick brown fox jumps over";
    expect(truncateToWords(text, 3)).toBe("the quick brown");
  });

  it("strips trailing whitespace and never returns a half-trailing-word", () => {
    expect(truncateToWords("a b c d e", 2)).toBe("a b");
  });
});