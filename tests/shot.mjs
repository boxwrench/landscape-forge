import { chromium } from "playwright-core";
import fs from "fs"; import path from "path";
const S = "..", presets = process.argv[2].split(","), out = process.argv[3];
const html = fs.readFileSync(S + "/index.html", "utf8");
const browser = await chromium.launch({ executablePath: process.env.HOME + "/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on("pageerror", e => console.log("PAGEERROR: " + e.message));
await page.route("**/*", async route => {
  const u = route.request().url();
  if (u.startsWith("http://forge.test/")) return route.fulfill({ body: html, contentType: "text/html" });
  const m = u.match(/three@0\.186\.1\/(.*)$/);
  if (m) return route.fulfill({ path: path.resolve("node_modules/three/" + m[1]), contentType: "text/javascript" });
  return route.abort();
});
await page.goto("http://forge.test/");
const done = () => page.waitForFunction(() => window.forge?.state.ready && document.getElementById("loader").classList.contains("done"), null, { timeout: 600000 });
await done();
await page.keyboard.press("KeyH");
for (const k of presets) {
  await page.evaluate(k => { window.forge.state.ready = false; window.forge.generate(window.forge.PRESETS[k]); }, k);
  await done();
  await page.waitForTimeout(4000);
  await page.screenshot({ path: `${out}/${k}.png`, timeout: 180000 });
  console.log("done", k);
}
await browser.close();
