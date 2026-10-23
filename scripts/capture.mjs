import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

mkdirSync("/home/user/snailtype/scripts/artifacts", { recursive: true });

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const allErrors = [];

async function shoot(width, height, name) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => allErrors.push(`${name} pageerror: ${e.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") allErrors.push(`${name} console: ${msg.text()}`);
  });
  await page.goto("http://127.0.0.1:3000/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const path = `/home/user/snailtype/scripts/artifacts/${name}.png`;
  await page.screenshot({ path, fullPage: false });
  await ctx.close();
  return path;
}

const desktop = await shoot(1280, 1092, "snailtype-desktop");
const mobile = await shoot(390, 800, "snailtype-mobile");

await browser.close();

console.log("desktop=" + desktop);
console.log("mobile=" + mobile);
console.log("errors=" + JSON.stringify(allErrors));
