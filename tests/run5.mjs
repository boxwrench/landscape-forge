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
const done = () => page.waitForFunction(() => window.forge?.state.ready && document.getElementById("loader").classList.contains("done"), null, { timeout: 400000, polling: 1000 }).catch(e => { console.log("WAIT FAIL", [...new Set(logs)].join("\n")); throw e; });
await done();
await page.keyboard.press("KeyH");
await page.keyboard.press("KeyH");
await page.evaluate(() => { document.getElementById("panel-body").scrollTop = 9999; });
await page.waitForTimeout(3000);
await page.screenshot({ path: `${S}/fx-panel.png`, timeout: 120000 });
for (const id of ["fx-dof", "fx-dof", "fx-sound", "fx-blur", "fx-blur"]) { await page.click("#" + id); await page.waitForTimeout(600); }
console.log("state", await page.evaluate(() => JSON.stringify({ fx: window.forge.state.fx, sound: document.getElementById("fx-sound").getAttribute("aria-pressed"), toast: document.getElementById("toast").textContent })));
await page.keyboard.press("KeyH");
// spin the camera every frame to see motion blur
await page.evaluate(() => { const f = window.forge; const spin = () => { f.ctl.yaw += 0.06; requestAnimationFrame(spin); }; requestAnimationFrame(spin); });
await page.waitForTimeout(9000);
await page.screenshot({ path: `${S}/fx-blur.png`, timeout: 120000 });
await page.keyboard.press("KeyM");
await page.waitForTimeout(800);
console.log("after M", await page.evaluate(() => document.getElementById("fx-sound").getAttribute("aria-pressed")));
console.log([...new Set(logs)].slice(0, 20).join("\n"));
await browser.close();
