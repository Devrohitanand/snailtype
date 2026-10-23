import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import path from "node:path";

const outDir = process.argv[2] || "scripts/artifacts/focused";
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const errors = [];
const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`);
}

async function fresh(viewport, name) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`${name} pageerror: ${e.message}`));
  page.on("console", (msg) => { if (msg.type() === "error") errors.push(`${name} console: ${msg.text()}`); });
  await page.goto("http://127.0.0.1:3000/", { waitUntil: "networkidle" });
  return { ctx, page };
}

// Concatenate the two preview spans (typed + untyped)
async function firstDisplayChar(page) {
  return page.evaluate(() => {
    const spans = Array.from(document.querySelectorAll("main span"));
    const light = spans.find((s) => window.getComputedStyle(s).color === "rgb(240, 234, 237)");
    const dim   = spans.find((s) => window.getComputedStyle(s).color === "rgba(0, 0, 0, 0)" /* opacity-50 derives from 92,78,86 */ || window.getComputedStyle(s).color === "rgb(92, 78, 86)" || s.className?.includes?.("opacity-50"));
    const join = ((light?.textContent || "") + (dim?.textContent || "")).replace(/^\s+/u, "");
    return join.charAt(0);
  });
}
async function readErr(page) {
  return page.evaluate(() => {
    const labels = Array.from(document.querySelectorAll("main span"));
    const errLabel = labels.find((el) => el.textContent === "err");
    return errLabel?.nextElementSibling?.textContent ?? null;
  });
}

// 1. Preview -> first character 
{
  const { ctx, page } = await fresh({ width: 1440, height: 900 }, "firstchar");
  await page.waitForTimeout(1200);
  const first = await firstDisplayChar(page);
  await page.keyboard.press(first);
  await page.waitForTimeout(250);
  check("correct first char accepted without error", (await readErr(page)) === "0", `firstChar=${first}`);

  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  await page.keyboard.press("Escape"); // ensure new passage
  await page.waitForTimeout(400);
  await page.keyboard.press("@");
  await page.waitForTimeout(250);
  check("incorrect char marked as error", (await readErr(page)) !== "0", `err=${await readErr(page)}`);
  await ctx.close();
}

// Long preview wait, then type current display char.
{
  const { ctx, page } = await fresh({ width: 1440, height: 900 }, "longwait");
  await page.waitForTimeout(7000);
  const first = await firstDisplayChar(page);
  await page.keyboard.press(first);
  await page.waitForTimeout(250);
  check("first char correct after long preview wait", (await readErr(page)) === "0", `rotated=${first}`);
  await ctx.close();
}

// One keystroke → one input update.
{
  const { ctx, page } = await fresh({ width: 1440, height: 900 }, "onekey");
  await page.waitForTimeout(1200);
  await firstDisplayChar(page).then((c) => page.keyboard.press(c));
  await page.waitForTimeout(250);
  const count1 = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("[data-token-index]")).filter((s) => s.dataset.status === "correct" || s.dataset.status === "incorrect").length;
  });
  check("first keystroke processed exactly once", count1 === 1, `processed=${count1}`);
  await ctx.close();
}

// Idle caret aligned with text (preview state).
{
  const { ctx, page } = await fresh({ width: 1440, height: 900 }, "caret");
  await page.waitForTimeout(400);
  const caret = await page.locator(".caret").boundingBox();
  const flow = await page.locator("div[style*='font-size']").first().boundingBox();
  if (caret && flow) {
    const dy = Math.abs(caret.y - flow.y);
    check("idle caret aligned with text line", dy <= 60, `dy=${dy.toFixed(0)}px caretY=${caret.y.toFixed(0)} flowY=${flow.y.toFixed(0)}`);
  } else {
    check("idle caret aligned with text line", false, "no caret/flow box");
  }
  await ctx.close();
}

// Layout: footer pinned, group centered, instagram once.
{
  const { ctx, page } = await fresh({ width: 1440, height: 900 }, "layout");
  const footer = await page.locator("footer").boundingBox();
  const group = await page.locator("main > div.relative.z-10").boundingBox();
  const nav = await page.locator("header").boundingBox();
  const ig = await page.locator('footer a[href*="instagram"]').count();
  const footerBottomGap = 900 - (footer.y + footer.height);
  check("footer pinned to viewport bottom", footerBottomGap <= 2, `gap=${footerBottomGap.toFixed(0)}px`);
  if (group && nav && footer) {
    const above = group.y - (nav.y + nav.height);
    const below = footer.y - (group.y + group.height);
    const imbalance = Math.abs(above - below);
    check("typing group vertically centered", imbalance <= 50, `above=${above.toFixed(0)} below=${below.toFixed(0)} imbalance=${imbalance.toFixed(0)}`);
  }
  check("instagram appears exactly once in footer", ig === 1, `count=${ig}`);
  await page.screenshot({ path: path.join(outDir, "desktop.png") });
  await ctx.close();
}

// Mode switch before test start.
{
  const { ctx, page } = await fresh({ width: 1440, height: 900 }, "modeswitch");
  await page.getByRole("tab", { name: "words" }).click();
  await page.waitForTimeout(300);
  const previewShown = await page.getByText("preview mode · press any key to begin").isVisible();
  check("time/words switch before test stays in preview", previewShown, "");
  await firstDisplayChar(page).then((c) => page.keyboard.press(c));
  await page.waitForTimeout(250);
  check("typing after mode switch starts clean", (await readErr(page)) === "0", `err=${await readErr(page)}`);
  await ctx.close();
}

// Restart clears session.
{
  const { ctx, page } = await fresh({ width: 1440, height: 900 }, "restart");
  await page.waitForTimeout(1200);
  await firstDisplayChar(page).then((c) => page.keyboard.press(c));
  await page.waitForTimeout(150);
  await page.keyboard.press("Tab"); // tab+enter = restart
  await page.waitForTimeout(150);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  const previewShown = await page.getByText("preview mode · press any key to begin").isVisible();
  check("restart restores preview state", previewShown, "");
  await firstDisplayChar(page).then((c) => page.keyboard.press(c));
  await page.waitForTimeout(250);
  check("post-restart first char still correct", (await readErr(page)) === "0", `err=${await readErr(page)}`);
  await ctx.close();
}

await browser.close();

const failed = results.filter((r) => !r.ok).length;
console.log("pageerrors=" + JSON.stringify(errors));
console.log(`SUMMARY ${results.length - failed}/${results.length} passed`);
process.exit(failed > 0 ? 1 : 0);
