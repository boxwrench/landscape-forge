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
  const f = window.forge, st = f.state, F = st.field, grid = st.treeGrid, out = {};
  const H = (x, z) => { const R = F.R, gx = Math.min(Math.max((x / F.size + .5) * (R - 1), 0), R - 1.001), gz = Math.min(Math.max((z / F.size + .5) * (R - 1), 0), R - 1.001), ix = gx | 0, iz = gz | 0, fx = gx - ix, fz = gz - iz, i = iz * R + ix; return F.H[i] * (1 - fx) * (1 - fz) + F.H[i + 1] * fx * (1 - fz) + F.H[i + R] * (1 - fx) * fz + F.H[i + R + 1] * fx * fz; };
  const W = F.hasWater ? F.water : -1e9;
  // forest
  let best = null;
  for (const list of grid.values()) for (const t of list) { if (t.type === "shrub" || t.type === "cactus") continue; let n = 0; for (const u of list) if ((u.x - t.x) ** 2 + (u.z - t.z) ** 2 < 625) n++; if (!best || n > best.n) best = { t, n }; }
  if (best) { const t = best.t; let p = null; for (let a = 0; a < 6.28; a += .4) { const x = t.x + Math.cos(a) * 16, z = t.z + Math.sin(a) * 16; const h = H(x, z); if (h > W + .5 && (!p || h < p.h)) p = { x, z, h }; } if (p) out.forest = { pos: [p.x, Math.max(p.h, W) + 1.7, p.z], look: [t.x, t.h + 3, t.z] }; }
  // shore
  for (let n = 0; n < 4000 && F.hasWater; n++) { const x = (Math.random() - .5) * F.size * .6, z = (Math.random() - .5) * F.size * .6, h = H(x, z); if (h > W + .2 && h < W + .6) { let a = 0; for (; a < 6.28; a += .3) if (H(x + Math.cos(a) * 30, z + Math.sin(a) * 30) < W - 1) break; if (a < 6.28) { const b = a + 1.2; out.shore = { pos: [x - Math.cos(b) * 6, h + 1.4, z - Math.sin(b) * 6], look: [x + Math.cos(b) * 40, W, z + Math.sin(b) * 40] }; break; } } }
  // cliff
  for (let n = 0; n < 6000; n++) { const x = (Math.random() - .5) * F.size * .6, z = (Math.random() - .5) * F.size * .6, e = 6; const gx = H(x + e, z) - H(x - e, z), gz = H(x, z + e) - H(x, z - e); if (Math.hypot(gx, gz) / (2 * e) > 1.2) { const l = Math.hypot(gx, gz); const px = x - gx / l * 35, pz = z - gz / l * 35; if (H(px, pz) > W) { out.cliff = { pos: [px, H(px, pz) + 2, pz], look: [x, H(x, z) + 4, z] }; break; } } }
  const ex = st.extras || {};
  const near = (it, dist, up) => { if (!it) return null; const e = it.m.elements, x = e[12], y = e[13], z = e[14]; let p = null; for (let a = 0; a < 6.28; a += .5) { const px = x + Math.cos(a) * dist, pz = z + Math.sin(a) * dist, h = Math.max(H(px, pz), W); if (!p || h < p.h) p = { x: px, z: pz, h }; } return { pos: [p.x, p.h + up, p.z], look: [x, y + .4, z] }; };
  if (ex.reed) out.reeds = near(ex.reed, 5, 1.6);
  if (ex.samples?.fern) out.fern = near(ex.samples.fern, 3.5, 1.5);
  if (ex.samples?.log) out.log = near(ex.samples.log, 6, 1.7);
  for (let n = 0; n < 5000; n++) { const x = (Math.random() - .5) * F.size * .6, z = (Math.random() - .5) * F.size * .6, h = H(x, z), e = 4; if (h < W + 1) continue; const sl = Math.hypot(H(x + e, z) - H(x - e, z), H(x, z + e) - H(x, z - e)) / (2 * e); if (sl < .08) { out.ground = { pos: [x, h + 1.6, z], look: [x + 6, h, z + 2] }; break; } }
  out.info = ex.counts;
  return out;
});
console.log(JSON.stringify(shots.info)); delete shots.info; for (const k2 of Object.keys(shots)) if (!shots[k2]) delete shots[k2]; console.log(Object.keys(shots));
for (const [name, sh] of Object.entries(shots)) {
  for (const fx of [true, false]) {
    if (!fx && name !== "forest") continue;
    await page.evaluate(({ sh, fx }) => { const f = window.forge; f.state.fx.blur = false; f.state.fx.dof = false; f.state.tour = false; f.state.mode = "fly"; f.ctl.pos.set(...sh.pos); const dx = sh.look[0] - sh.pos[0], dy = sh.look[1] - sh.pos[1], dz = sh.look[2] - sh.pos[2]; f.ctl.yaw = Math.atan2(dx, -dz); f.ctl.pitch = Math.atan2(dy, Math.hypot(dx, dz)); }, { sh, fx });
    await page.waitForTimeout(9000);
    await page.screenshot({ path: `${S}/c-${k}-${name}${fx ? "" : "-nofx"}.png`, timeout: 120000 });
    if (fx && name === "forest") console.log("tris", await page.evaluate(() => window.forge.renderer?.info.render.triangles));
  }
}
console.log([...new Set(logs)].slice(0, 20).join("\n"));
await browser.close();
