import { chromium } from "playwright-core";
import fs from "fs"; import path from "path";
const S = process.argv[2];
const html = "<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1,viewport-fit=cover'><style>[hidden]{display:none!important} #loader{transition:none!important}</style></head><body>" + fs.readFileSync(S + "/artifact.html", "utf8") + "</body></html>";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1100, height: 620 } });
const logs = [];
page.on("console", m => { if (!m.text().includes("ERR_FAILED")) logs.push(m.type() + ": " + m.text()); });
page.on("pageerror", e => logs.push("PAGEERROR: " + e.message));
await page.route("**/*", async route => {
  const u = route.request().url();
  if (u.startsWith("http://forge.test/")) return route.fulfill({ body: html, contentType: "text/html" });
  const m = u.match(/three@0\.186\.1\/(.*)$/);
  if (m) return route.fulfill({ path: path.resolve("node_modules/three/" + m[1]), contentType: "text/javascript" });
  return route.abort();
});
await page.goto("http://forge.test/");
await page.waitForFunction(() => window.forge?.state.ready && document.getElementById("loader").classList.contains("done"), null, { timeout: 400000, polling: 1000 }).catch(e => { console.log("WAIT FAIL", [...new Set(logs)].join("\n")); throw e; });
await page.waitForTimeout(2500);
await page.screenshot({ path: `${S}/ui-desktop.png`, timeout: 120000 });
await page.keyboard.press("KeyH");
// walk down to the shore and look across
await page.evaluate(() => { const f = window.forge; f.state.mode = "walk"; f.ctl.pitch = -0.02; });
await page.waitForTimeout(3000);
await page.screenshot({ path: `${S}/walk.png`, timeout: 120000 });
await page.evaluate(() => { window.forge.ctl.pitch = 0.05; window.forge.state.mode = "fly"; window.forge.ctl.pos.y += 20; });
for (const st of [1, 2, 3]) { await page.evaluate(i => window.forge.setStyle(i), st); await page.waitForTimeout(2500); await page.screenshot({ path: `${S}/style${st}.png`, timeout: 120000 }); }
await page.evaluate(() => window.forge.setStyle(0));
await page.keyboard.press("KeyH");
await page.setViewportSize({ width: 390, height: 780 });
await page.waitForTimeout(2500);
await page.screenshot({ path: `${S}/ui-phone.png`, timeout: 120000 });
console.log([...new Set(logs)].slice(0, 20).join("\n"));
await browser.close();
