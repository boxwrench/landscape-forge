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
const k = presets[0];
await page.evaluate(k => { window.forge.state.ready = false; window.forge.generate(window.forge.PRESETS[k]); }, k);
await done();
const shots = await page.evaluate(() => {
  const f = window.forge, st = f.state, F = st.field, out = {};
  const H = (x, z) => { const R = F.R, gx = Math.min(Math.max((x / F.size + .5) * (R - 1), 0), R - 1.001), gz = Math.min(Math.max((z / F.size + .5) * (R - 1), 0), R - 1.001), ix = gx | 0, iz = gz | 0, fx = gx - ix, fz = gz - iz, i = iz * R + ix; return F.H[i] * (1 - fx) * (1 - fz) + F.H[i + 1] * fx * (1 - fz) + F.H[i + R] * (1 - fx) * fz + F.H[i + R + 1] * fx * fz; };
  const W = F.hasWater ? F.water : -1e9, sites = st.sites || {};
  const from = (t, dist, up, lookUp = 0) => { let best = null; for (let a = 0; a < 6.28; a += .4) { const x = t[0] + Math.cos(a) * dist, z = t[2] + Math.sin(a) * dist, h = Math.max(H(x, z), W); if (!best || h < best.h) best = { x, z, h }; } return { pos: [best.x, best.h + up, best.z], look: [t[0], t[1] + lookUp, t[2]] }; };
  if (sites.bones?.[0]) out.bones = from(sites.bones[0], 75, 35, 5);
  if (sites.floats?.[0]) out.float = from(sites.floats[0], 120, 8, 0);
  if (sites.flora) out.flora = from(sites.flora, 9, 1.7, 1.5);
  out.info = { bones: sites.bones?.length, floats: sites.floats?.length, flora: !!sites.flora };
  return out;
});
console.log(JSON.stringify(shots.info)); delete shots.info; for (const k2 of Object.keys(shots)) if (!shots[k2]) delete shots[k2]; console.log(Object.keys(shots));
for (const [name, sh] of Object.entries(shots)) {
  for (const fx of [true, false]) {
    if (!fx) continue;
    await page.evaluate(({ sh, fx }) => { const f = window.forge; f.state.fx.blur = false; f.state.fx.dof = false; f.state.tour = false; f.state.mode = "fly"; f.ctl.pos.set(...sh.pos); const dx = sh.look[0] - sh.pos[0], dy = sh.look[1] - sh.pos[1], dz = sh.look[2] - sh.pos[2]; f.ctl.yaw = Math.atan2(dx, -dz); f.ctl.pitch = Math.atan2(dy, Math.hypot(dx, dz)); }, { sh, fx });
    await page.waitForTimeout(9000);
    await page.screenshot({ path: `${S}/c-${k}-${name}${fx ? "" : "-nofx"}.png`, timeout: 120000 });
    if (fx && name === "forest") console.log("tris", await page.evaluate(() => window.forge.renderer?.info.render.triangles));
  }
}
console.log([...new Set(logs)].slice(0, 20).join("\n"));
await browser.close();
