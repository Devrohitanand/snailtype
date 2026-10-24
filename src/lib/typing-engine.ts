export type TokenStatus = "untyped" | "correct" | "incorrect";

export interface Token {
  char: string;
  status: TokenStatus;
}

export interface ResultMetrics {
  wpm: number;
  accuracy: number;
  correctChars: number;
  errorChars: number;
  durationMs: number;
}

export function computeWpm(correctChars: number, elapsedMs: number): number {
  if (elapsedMs <= 0) return 0;
  const minutes = elapsedMs / 60000;
  if (minutes <= 0) return 0;
  return Math.round(correctChars / 5 / minutes);
}

export function computeAccuracy(correctChars: number, errorChars: number): number {
  const total = correctChars + errorChars;
  if (total === 0) return 100;
  return Math.round((correctChars / total) * 100);
}

export function completedWordCount(passage: string, currentIndex: number): number {
  const typedPrefix = passage.slice(0, currentIndex);
  const segments = typedPrefix.split(/\s+/).filter((segment) => segment.length > 0);
  return segments.length;
}

export function buildResult(input: {
  correctChars: number;
  errorChars: number;
  elapsedMs: number;
}): ResultMetrics {
  return {
    wpm: computeWpm(input.correctChars, input.elapsedMs),
    accuracy: computeAccuracy(input.correctChars, input.errorChars),
    correctChars: input.correctChars,
    errorChars: input.errorChars,
    durationMs: input.elapsedMs,
  };
}

export function tokensFor(text: string): Token[] {
  return Array.from(text, (char) => ({ char, status: "untyped" as TokenStatus }));
}
