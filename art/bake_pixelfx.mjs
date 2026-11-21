// node art/bake_pixelfx.mjs ../pixelfx   (Node, Python + Pillow; see combat-effects.md)
import { readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const game = fileURLToPath(new URL("../", import.meta.url));
const upstream = resolve(process.argv[2] || "../pixelfx");
const load = file => import(pathToFileURL(join(upstream, file)).href);
const { loadEffect } = await load("tools/lib/fxlib.mjs");
const { createFx, createFrame, clearFrame, composite } = await load("src/core/index.js");
const { encodePNG } = await load("tools/lib/png.mjs");
const palettes = {
  orbit: ["#161f48", "#254373", "#267ca6", "#479fca", "#61cdec", "#9cebff", "#ddf8ff", "#ffffff"],
  reaction: ["#27123a", "#48205c", "#79358a", "#b24bac", "#dd79c9", "#f3a3dc", "#ffdbef", "#fff7fc"],
  living: ["#102c29", "#215039", "#33764a", "#579c58", "#8cc368", "#bae17e", "#dff6ae", "#fff8da"],
  strata: ["#301e32", "#663443", "#9a4542", "#ce6740", "#ee924c", "#ffc36c", "#ffe4a0", "#fff9dd"],
};
// A time slice of each simulation is selected to match the game's release, flight or contact pose.
// Pivot offsets are relative to the upstream origin (often the feet of its stand-in actor).
const clips = [];
function clip(name, source, from, to, count, options = {}, dx = 0, dy = 0) {
  clips.push({ name, source, from, to, count, options, dx, dy });
}
for (const [key, palette] of Object.entries(palettes))
  clip(key + "Seal", "arcane/rune-circle", 0, 3.75, 16, { palette });
clip("gravity", "impacts/blunt-hit", 0, .77, 13, { warm: "#ffab4b", dust: "#d7aa70", height: 0 });
clip("space", "lightning/zap-hit", .02, .8, 14, { palette: palettes.orbit });
clip("restore", "holy/heal", .05, 1.78, 15);
clip("prism", "ice/ice-shatter", .69, 2.08, 15, { palette: palettes.reaction }, 0, -16);
clip("roots", "nature/root-snare", .10, 2.56, 18, { palette: palettes.living });
clip("wings", "holy/feather-burst", .03, 1.65, 15, { palette: ["#535061","#568a86","#81c5b0","#ebcb75","#fff2b5","#fffce6"], glow: "#f6d270" });
clip("fault", "nature/earth-spike", .31, 2.68, 18, { height: 53 });
clip("core", "fire/fire-ring", .04, 2.62, 18);
clip("quake", "nature/quake", .12, 2.46, 18, { reach: 90, glow: ["#703044", "#bc5146", "#f1934c", "#ffd888", "#fff4cf"] });
clip("field", "scifi/emp-blast", .43, 1.18, 14, { palette: palettes.orbit, fringe: "#7de5ff" });
clip("flask", "nature/acid-splash", .30, 2.02, 16, { palette: palettes.reaction });
clip("thicket", "nature/thorns", .13, 1.99, 16, { palette: palettes.living, count: 3 });
clip("meteor", "explosions/dirt-explosion", .10, 1.95, 16);
clip("riftCharge", "shadow/hex-sigil", .15, 2.65, 17, {}, 0, -50);
clip("riftBurst", "shadow/dark-explosion", .50, 2.61, 18, {}, 0, -54);
clip("talons", "melee/claw-swipe", .03, .68, 12, { palette: palettes.orbit }, 0, -30);
clip("dust", "impacts/heavy-landing", .04, 1.3, 13);

const rows = [];
let width = 0, height = 0;
const layout = {};
for (const c of clips) {
  const { mod, meta } = await loadEffect(c.source);
  const [w, h] = meta.size, [ox, oy] = meta.origin;
  const fx = createFx(mod, { ...c.options, x: ox, y: oy });
  const frame = createFrame(w, h);
  const frames = [];
  let tick = 0, left = w, top = h, right = 0, bottom = 0;
  for (let i = 0; i < c.count; i++) {
    const time = c.from + (c.to - c.from) * i / (c.count - 1);
    while (tick < Math.round(time * 60)) { fx.update(1 / 60); tick++; }
    clearFrame(frame);
    fx.draw(frame);
    const pixels = composite(frame, new Uint8ClampedArray(w * h * 4), null);
    for (let pos = 0; pos < w * h; pos++) {
      // Quantize only the low-opacity light falloff. Solid pixels keep their original palette.
      const alpha = pos * 4 + 3;
      if (pixels[alpha] < 12) { pixels.fill(0, pos * 4, alpha + 1); continue; }
      if (pixels[alpha] < 245) pixels[alpha] = Math.min(255, Math.round(pixels[alpha] / 12) * 12);
      const x = pos % w, y = Math.floor(pos / w);
      left = Math.min(left, x); right = Math.max(right, x);
      top = Math.min(top, y); bottom = Math.max(bottom, y);
    }
    frames.push(pixels);
  }
  const cw = right - left + 1, ch = bottom - top + 1;
  if (cw <= 0 || ch <= 0) throw Error("Empty clip " + c.name);
  // Wrap wide sequences to keep both atlas dimensions within mobile texture limits.
  const cols = Math.min(frames.length, Math.floor(2048 / cw));
  layout[c.name] = [height, cw, ch, ox + c.dx - left, oy + c.dy - top, cols, frames.length];
  rows.push({ frames, left, top, w, cw, ch, cols, y: height });
  width = Math.max(width, cols * cw);
  height += ch * Math.ceil(frames.length / cols);
}
const atlas = new Uint8Array(width * height * 4);
for (const row of rows) {
  row.frames.forEach((pixels, i) => {
    const x = (i % row.cols) * row.cw, y = row.y + Math.floor(i / row.cols) * row.ch;
    for (let dy = 0; dy < row.ch; dy++) {
      const start = ((row.top + dy) * row.w + row.left) * 4;
      atlas.set(pixels.subarray(start, start + row.cw * 4), ((y + dy) * width + x) * 4);
    }
  });
}
const out = join(game, "assets/combat");
execFileSync("python", ["-c", "import io,sys; from PIL import Image; Image.open(io.BytesIO(sys.stdin.buffer.read())).save(sys.argv[1],lossless=True,method=5)", join(out, "pixelfx.webp")], { input: encodePNG(width, height, atlas) });
writeFileSync(join(out, "pixelfx.js"), "// Generated by art/bake_pixelfx.mjs. Row Y, cell W/H, pivot X/Y, columns, frames.\nconst spellClips = " + JSON.stringify(layout, null, 0).replaceAll("],", "],\n  ").replace("{", "{\n  ").replace("}", "\n}") + ";\n");
copyFileSync(join(upstream, "LICENSE"), join(game, "vendor/pixelfx-LICENSE.txt"));
console.log(clips.length + " clips, " + rows.reduce((sum, row) => sum + row.frames.length, 0) + " frames, " + width + "×" + height + ", " + readFileSync(join(out, "pixelfx.webp")).length + " bytes");
