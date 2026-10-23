import { readFileSync, writeFileSync } from "node:fs";
import { PNG } from "pngjs";

function parseFile(path) {
  const raw = readFileSync(path);
  return PNG.sync.read(raw);
}

function pixelwiseDiff(a, b) {
  if (a.width !== b.width || a.height !== b.height) {
    return {
      matched: false,
      reason: `size mismatch ${a.width}x${a.height} vs ${b.width}x${b.height}`,
    };
  }
  const diff = new PNG({ width: a.width, height: a.height });
  let totalDiff = 0;
  let maxDiff = 0;
  let significantDiffPixels = 0;
  const len = a.width * a.height * 4;
  for (let i = 0; i < len; i += 4) {
    const dr = Math.abs(a.data[i] - b.data[i]);
    const dg = Math.abs(a.data[i + 1] - b.data[i + 1]);
    const db = Math.abs(a.data[i + 2] - b.data[i + 2]);
    const sum = dr + dg + db;
    totalDiff += sum;
    if (sum > maxDiff) maxDiff = sum;
    if (sum > 30) significantDiffPixels += 1;
    // Render the diff: red where they differ noticeably.
    diff.data[i] = 255;
    diff.data[i + 1] = 0;
    diff.data[i + 2] = 0;
    diff.data[i + 3] = Math.min(255, sum * 1.5);
  }
  const pixelCount = a.width * a.height;
  const mean = totalDiff / pixelCount;
  return {
    matched: true,
    width: a.width,
    height: a.height,
    mean,
    max: maxDiff,
    significant: significantDiffPixels,
    diffPng: PNG.sync.write(diff),
  };
}

function main() {
  const [refArg, candArg, outArg] = process.argv.slice(2);
  if (!refArg || !candArg) {
    console.error("Usage: node scripts/compare.mjs <ref.png> <candidate.png> [out.png]");
    process.exit(1);
  }
  const ref = parseFile(refArg);
  const cand = parseFile(candArg);
  const result = pixelwiseDiff(ref, cand);
  if (!result.matched) {
    console.log(JSON.stringify(result));
    return;
  }
  console.log(
    JSON.stringify(
      {
        ...result,
        significantPctOfGrid: ((result.significant / (result.width * result.height)) * 100).toFixed(2),
      },
      null,
      2,
    ),
  );
  if (outArg && result.diffPng) {
    writeFileSync(outArg, result.diffPng);
  }
}

main();
