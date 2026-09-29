// Look at the app: screenshot pages in both themes and at phone width, with system Chromium.
// Usage: node scripts/shoot.mjs --pages /,/system --out ./screenshots [--themes light,dark] [--widths 1280,375]
//        [--full] [--reduced] [--wait 600] [--base http://localhost:4321] [--hover selector] [--actions json]
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith("--")) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith("--") ? arr[i + 1] : "true"]);
    return acc;
  }, []),
);
const base = args.base ?? "http://localhost:4321";
const pages = (args.pages ?? "/").split(",");
const themes = (args.themes ?? "light,dark").split(",");
const widths = (args.widths ?? "1280").split(",").map(Number);
const out = resolve(args.out ?? "screenshots");
const wait = Number(args.wait ?? 500);
const actions = args.actions ? JSON.parse(args.actions) : [];
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.CHROME ?? "/usr/bin/chromium", args: ["--disable-gpu"] });
const errors = [];
for (const width of widths) {
  for (const theme of themes) {
    const ctx = await browser.newContext({
      viewport: { width, height: width < 600 ? 812 : 900 },
      deviceScaleFactor: width < 600 ? 2 : 1,
      colorScheme: theme === "dark" ? "dark" : "light",
      reducedMotion: args.reduced ? "reduce" : "no-preference",
    });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => errors.push(`${theme}/${width}: ${e.message}`));
    page.on("console", (m) => m.type() === "error" && errors.push(`${theme}/${width} console: ${m.text()}`));
    for (const p of pages) {
      // The dev server may reload mid-run (files changing): retry once.
      try {
        await page.goto(base + p, { waitUntil: "networkidle", timeout: 60000 });
      } catch {
        await page.waitForTimeout(1500);
        await page.goto(base + p, { waitUntil: "load", timeout: 90000 });
      }
      await page.evaluate(() => document.fonts.ready);
      if (args.full === "true" || args.scrollthrough) {
        // Walk the page so scroll-triggered reveals fire, then return to the top.
        await page.evaluate(async () => {
          for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); }
          window.scrollTo(0, 0);
        });
        await page.waitForTimeout(700);
      }
      for (const a of actions) {
        if (a.click) await page.click(a.click);
        if (a.hover) await page.hover(a.hover);
        if (a.eval) await page.evaluate(a.eval);
        if (a.wait) await page.waitForTimeout(a.wait);
        if (a.scroll) await page.evaluate((y) => window.scrollTo(0, y), a.scroll);
      }
      await page.waitForTimeout(wait);
      const slug = (p.split("?")[0].replace(/\//g, "_").replace(/^_$/, "_index") || "_index").slice(0, 80);
      const name = `${slug}-${theme}-${width}${args.tag ? "-" + args.tag : ""}.png`;
      if (args.selector) {
        const el = await page.$(args.selector);
        if (el) await el.screenshot({ path: resolve(out, name) });
      } else {
        await page.screenshot({ path: resolve(out, name), fullPage: args.full === "true" });
      }
      console.log(resolve(out, name));
    }
    await ctx.close();
  }
}
await browser.close();
if (errors.length) console.log("ERRORS:\n" + [...new Set(errors)].join("\n"));
