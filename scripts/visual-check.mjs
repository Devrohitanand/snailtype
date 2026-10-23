import { writeFileSync } from "node:fs";
import { spawn } from "node:child_process";

const url = process.argv[2] || "http://127.0.0.1:3000/";
const out = process.argv[3] || "/home/user/snailtype/scripts/captured.png";
const width = Number(process.argv[4] || 1280);
const height = Number(process.argv[5] || 800);

async function tryFindBrowser() {
  const candidates = [
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ];
  for (const c of candidates) {
    try {
      const { existsSync } = await import("node:fs");
      if (existsSync(c)) return c;
    } catch {}
  }
  return null;
}

async function capture() {
  const browser = await tryFindBrowser();
  if (!browser) {
    console.error("no chrome/chromium found for headless capture");
    process.exit(0); // non-fatal in CI
  }
  const args = [
    "--headless=new",
    `--window-size=${width},${height}`,
    "--hide-scrollbars",
    "--no-sandbox",
    "--disable-gpu",
    `--screenshot=${out}`,
    url,
  ];
  await new Promise((resolve, reject) => {
    const p = spawn(browser, args, { stdio: "inherit" });
    p.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`chrome exited ${code}`))));
  });
  console.log("captured", out);
}

capture();
