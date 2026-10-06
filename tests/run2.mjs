import { chromium } from "playwright-core";
import fs from "fs"; import path from "path";
const S = process.argv[2]; const presets = process.argv[3].split(","); const extra = process.argv[4] || "";
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
const done = () => page.waitForFunction(() => window.forge?.state.ready && document.getElementById("loader").classList.contains("done"), null, { timeout: 300000 });
await done();
await page.keyboard.press("KeyH");
for (const k of presets) {
  const t0 = Date.now();
  await page.evaluate(k => { window.forge.state.ready = false; window.forge.generate(window.forge.PRESETS[k]); }, k);
  await done();
  const secs = (Date.now() - t0) / 1000;
  if (extra) console.log(await page.evaluate(extra));
  await page.waitForTimeout(3500);
  await page.screenshot({ path: `${S}/p-${k}.png`, timeout: 120000 });
  console.log(k, "gen", secs);
}
console.log([...new Set(logs)].slice(0, 20).join("\n"));
await browser.close();
