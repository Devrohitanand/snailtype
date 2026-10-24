export const PREVIEW_PHRASES = [
  "take your time and find your rhythm",
  "the quiet art of deliberate motion",
  "clarity arrives when hurry departs",
  "smooth is fast, and patience is precision",
  "breathe between sentences and feel the keys",
];

export const PASSAGES = [
  "The quiet art of deliberate motion brings clarity where hurry brings only friction. In every measured strike of a key, the mind settles into natural resonance, moving effortlessly through thoughts without premature friction or haste.",
  "A slow rhythm is not lack of pace, but the presence of total intention. When fingers learn silence and grace, words assemble themselves like stone bridges built to endure generations of quiet footsteps.",
  "Do not hurry the next sentence before the current word has found its home. Mastery resides in the subtle pause between inhalation and execution, letting the cadence lead the thought forward.",
  "Observe how the craftsman never rushes the plane across rough cedar. Thin ribbons curl with effortless grace because the blade is sharp and the hand is calm. Typing is no different than carving air into reason.",
  "Stillness precedes true velocity. When we let go of artificial urgency, our hands rediscover their natural poise, turning simple keystrokes into fluid expressions of composed thought.",
  "Patience is not simply the ability to wait; it is the vigilance with which we keep our attention intact while the world urges us to sprint toward mistakes.",
];

export function pickPassage(previous: string | null): string {
  const filtered = PASSAGES.filter((p) => p !== previous);
  if (filtered.length === 0) return PASSAGES[0]!;
  const idx = Math.floor(Math.random() * filtered.length);
  return filtered[idx]!;
}

export function truncateToWords(text: string, target: number): string {
  const words = text.split(/\s+/);
  if (words.length <= target) return text.replace(/\s+$/u, "");
  return words.slice(0, target).join(" ");
}
