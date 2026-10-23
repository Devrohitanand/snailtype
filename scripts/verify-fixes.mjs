import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import path from "node:path";

const outDir = process.argv[2] || "scripts/artifacts";
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const errors = [];

function bindPage(page, name) {
  page.on("pageerror", (e) => errors.push(`${name} pageerror: ${e.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`${name} console: ${msg.text()}`);
  });
}

async function readPreviewChar(page) {
  return page.evaluate(() => {
    const candidates = Array.from(document.querySelectorAll("main span"));
    const typedSpan = candidates.find((s) => {
      const c = window.getComputedStyle(s);
      return c.color.includes("240, 234, 237");
    });
    const untypedSpan = candidates.find((s) => {
      const c = window.getComputedStyle(s);
      return c.color.includes("92, 78, 86") || s.className?.includes?.("opacity-50");
    });
    if (!typedSpan || !untypedSpan) return null;
    // next char the preview is going to type
    return (untypedSpan.textContent || "").charAt(0);
  });
}

async function newPage(width, height, name) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  const page = await ctx.newPage();
  bindPage(page, name);
  await page.goto("http://127.0.0.1:3000/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500); // give the preview a moment to start
  return { ctx, page };
}

// read the char right before typing, the phrase can rotate on us
async function typeFirstPreviewChar(page) {
  const first = await readPreviewChar(page);
  if (!first) throw new Error("could not read preview char from DOM");
  await page.keyboard.type(first);
  return first;
}

async function readErr(page) {
  return page.evaluate(() => {
    const labels = Array.from(document.querySelectorAll("main span"));
    const errLabel = labels.find((el) => el.textContent === "err");
    return errLabel?.nextElementSibling?.textContent ?? null;
  });
}

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`);
}

// layout checks (desktop)
const desktop = await newPage(1440, 900, "desktop");
const footer = desktop.page.locator("footer");
const stage = desktop.page.locator("[ref], div.relative.z-10").first();

const footerBox = await footer.boundingBox();
const footerBottomGap = 900 - (footerBox ? footerBox.y + footerBox.height : 0);
check("footer anchored to bottom of viewport", footerBottomGap <= 2, `gap=${footerBottomGap}px`);

const footerCenter = desktop.page.locator("footer > div > div:nth-child(2)");
const fBox = await footer.boundingBox();
const cBox = await footerCenter.boundingBox();
if (fBox && cBox) {
  const centerOffset = Math.abs((cBox.x + cBox.width / 2) - (fBox.x + fBox.width / 2));
  check("restart shortcut centered in container", centerOffset <= 3, `offset=${centerOffset.toFixed(1)}px`);
} else {
  check("restart shortcut centered in container", false, "bounding boxes unavailable");
}

const igCount = await desktop.page.locator('footer a[href*="instagram"]').count();
check("instagram link appears exactly once", igCount === 1, `count=${igCount}`);

// space above the stats bar vs space below the stage should be about equal
const group = desktop.page.locator("main > div.relative.z-10");
const groupBox = await group.boundingBox();
const navBox = await desktop.page.locator("header").boundingBox();
if (groupBox && navBox && footerBox) {
  const spaceAbove = groupBox.y - (navBox.y + navBox.height);
  const spaceBelow = footerBox.y - (groupBox.y + groupBox.height);
  const imbalance = Math.abs(spaceAbove - spaceBelow);
  check("typing group vertically centered between navbar and footer", imbalance <= 40, `above=${spaceAbove.toFixed(0)}px below=${spaceBelow.toFixed(0)}px imbalance=${imbalance.toFixed(0)}px`);
} else {
  check("typing group vertically centered", false, "bounding boxes unavailable");
}

await desktop.page.screenshot({ path: path.join(outDir, "desktop.png") });

// first character from preview
{
  const { ctx, page } = await newPage(1440, 900, "firstchar");
  await page.waitForTimeout(200);
  const first = await typeFirstPreviewChar(page);
  await page.waitForTimeout(300);
  const errMetric = await readErr(page);
  check("correct first char accepted without error", errMetric === "0", `firstChar=${first} err=${errMetric}`);

  const caretBox = await page.locator(".caret").boundingBox();
  const flowBox = await page.locator("div[style*='font-size']").first().boundingBox();

  await page.waitForTimeout(200);
  const idleCaret = await page.locator(".caret").boundingBox();
  const idleFlow = await page.locator("div[style*='font-size']").first().boundingBox();
  if (idleCaret && idleFlow) {
    const dy = Math.abs(idleCaret.y - idleFlow.y);
    check("idle caret aligned with text line", dy <= 80, `caretY=${idleCaret.y.toFixed(0)} flowY=${idleFlow.y.toFixed(0)} dy=${dy.toFixed(0)}`);
  }
  if (caretBox && flowBox) {
    const dy = Math.abs(caretBox.y - flowBox.y);
    check("caret follows text after first char", dy <= 80, `caretY=${caretBox.y.toFixed(0)} flowY=${flowBox.y.toFixed(0)} dy=${dy.toFixed(0)}`);
  }

  // now a wrong first char after restart
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  await page.keyboard.type("~");
  await page.waitForTimeout(300);
  const errMetric2 = await readErr(page);
  check("incorrect first char marked as error", errMetric2 === "1", `forced-wrong ~ err=${errMetric2}`);
  await ctx.close();
}

// preview has rotated a few phrases by the time we type
{
  const { ctx, page } = await newPage(1440, 900, "longwait");
  await page.waitForTimeout(7000);
  const first = await typeFirstPreviewChar(page);
  await page.waitForTimeout(300);
  const errMetric = await readErr(page);
  check("first char correct after long preview wait", errMetric === "0", `rotatedFirstChar=${first} err=${errMetric}`);
  await ctx.close();
}

// each keystroke should only count once
{
  const { ctx, page } = await newPage(1440, 900, "onekey");
  await page.waitForTimeout(200);
  const first = await readPreviewChar(page);
  const second = (await readPreviewChar(page)) ?? "";
  await page.waitForTimeout(300);
  const idx = await page.evaluate(() => {
    const spans = document.querySelectorAll("[data-token-index]");
    let count = 0;
    for (const s of spans) {
      if (s.dataset.status === "correct" || s.dataset.status === "incorrect") count++;
    }
    return count;
  });
  check("first keystroke processed exactly once", idx === 1, `firstPreview=${first} processed=${idx}`);
  if (second) {
    await page.keyboard.type(second);
    await page.waitForTimeout(200);
    const idx2 = await page.evaluate(() => {
      const spans = document.querySelectorAll("[data-token-index]");
      let count = 0;
      for (const s of spans) {
        if (s.dataset.status === "correct" || s.dataset.status === "incorrect") count++;
      }
      return count;
    });
    check("second keystroke processed exactly once", idx2 === 2, `second=${second} processed=${idx2}`);
  }
  await ctx.close();
}

// backspace, then restart
{
  const { ctx, page } = await newPage(1440, 900, "backspace");
  await page.waitForTimeout(200);
  const first = await readPreviewChar(page);
  await page.waitForTimeout(150);
  const second = (await readPreviewChar(page)) ?? "";
  if (second) await page.keyboard.type(second);
  await page.waitForTimeout(150);
  await page.keyboard.press("Backspace");
  await page.waitForTimeout(200);
  const processed = await page.evaluate(() => {
    const spans = document.querySelectorAll("[data-token-index]");
    let count = 0;
    for (const s of spans) {
      if (s.dataset.status === "correct" || s.dataset.status === "incorrect") count++;
    }
    return count;
  });
  check("backspace restores previous token", processed === 1, `first=${first} second=${second} processed=${processed}`);

  await page.keyboard.press("Tab");
  await page.waitForTimeout(200);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  const previewVisible = await page.getByText("preview mode · press any key to begin").isVisible();
  check("restart restores ready (preview) state", previewVisible, `previewVisible=${previewVisible}`);
  await ctx.close();
}

// switch to words mode before starting
{
  const { ctx, page } = await newPage(1440, 900, "modeswitch");
  await page.getByRole("tab", { name: "words" }).click();
  await page.waitForTimeout(300);
  const previewStillOk = await page.getByText("preview mode · press any key to begin").isVisible();
  check("time/words mode switch before test works", previewStillOk, `previewVisible=${previewStillOk}`);
  await typeFirstPreviewChar(page);
  await page.waitForTimeout(300);
  const errMetric = await readErr(page);
  check("typing after mode switch starts clean", errMetric === "0", `err=${errMetric}`);
  await ctx.close();
}

// mobile
const mobile = await newPage(375, 812, "mobile");
const mGroupBox = await mobile.page.locator("main > div.relative.z-10").boundingBox();
const mFooterBox = await mobile.page.locator("footer").boundingBox();
if (mGroupBox && mFooterBox) {
  const overlap = mGroupBox.y + mGroupBox.height - mFooterBox.y;
  check("no footer overlap on mobile", overlap <= 1, `overlap=${overlap.toFixed(0)}px`);
}
await mobile.page.screenshot({ path: path.join(outDir, "mobile.png") });
await mobile.ctx.close();

await desktop.ctx.close();
await browser.close();

console.log("pageerrors=" + JSON.stringify(errors));
const failed = results.filter((r) => !r.ok).length;
console.log(`SUMMARY ${results.length - failed}/${results.length} passed`);
process.exit(failed > 0 ? 1 : 0);
