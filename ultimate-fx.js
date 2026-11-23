"use strict";

const techniqueInk = [
  ["#802d29", "#ff7040", "#ffe3a0"], ["#244471", "#57cfff", "#e3fbff"],
  ["#6d4b25", "#ffbd4c", "#fff0b4"], ["#4a3879", "#bca0ff", "#f7dbff"],
  ["#295544", "#8be26c", "#eaffb3"], ["#7c4528", "#ffa957", "#fff1a0"],
  ["#654331", "#ff9853", "#ffdf99"], ["#7b3d4a", "#ffc365", "#fff2c5"],
];
const glyphCell = 112;

function techniqueGlyph(id, x, y, size, alpha = 1, flip = false, width = 1) {
  g.save();
  g.globalAlpha *= clamp(alpha, 0, 1);
  const sheet = assets.ultimate;
  if (sheet.naturalWidth) {
    drawFieldCell(sheet, (id % 4) * glyphCell, Math.floor(id / 4) * glyphCell,
      glyphCell, glyphCell, glyphCell / 2, glyphCell / 2, x, y, size * width, size, flip);
  } else {
    star(x, y, 12 * size, techniqueInk[id][2]);
  }
  g.restore();
}

function fallingApples(x, y, p, alpha, scale) {
  for (const i of [-1, 1, 0]) {
    const progress = clamp(p * 1.35 - Math.abs(i) * .22, 0, 1);
    const dx = i * (72 + 28 * (1 - progress)) * scale;
    const py = y - (1 - progress) ** 1.45 * 230 * scale;
    const size = i ? .68 : 1.32;
    const trail = 83 * size * (1 - progress * .5);
    for (const [sw, tint] of [[1, "#8f3327"], [.65, "#ff6836"], [.35, "#ffe2a3"]]) {
      path([[x + dx - 26 * size * sw, py + 6], [x + dx - 18 * size * sw, py - trail * .63],
        [x + dx - 30 + 13 * i, py - trail], [x + dx + 20 * size * sw, py - trail * .4],
        [x + dx + 25 * size * sw, py + 8]], tint);
    }
    techniqueGlyph(0, x + dx, py, size * scale, alpha, i < 0);
  }
}

function stoppedClock(x, y, p, alpha, scale) {
  const radius = (115 - 30 * p) * scale;
  for (const side of [-1, 1]) {
    fxArc(x, y, radius + 8 * side, radius * .74, "#479bdd", p * 2 + side, p * 2 + side + Math.PI, 3);
    fxLine([[x - radius, y + 16 * side], [x - 30, y + side * 47], [x + radius, y - 25 * side]], "#88eaff", 2);
  }
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6 - p * .6;
    r(x + Math.cos(a) * radius, y + Math.sin(a) * radius * .74, i % 3 ? 3 : 6, 3, "#d5f7ff");
  }
  techniqueGlyph(1, x, y, (1 + .83 * p) * scale, alpha);
}

function goldenBalance(x, y, p, alpha, scale) {
  const shell = 108 * scale, base = y + 63 * scale;
  const sweep = Math.sin(p * Math.PI);
  for (const side of [-1, 1]) {
    const px = x + side * shell;
    path([[px - 4, y - 100], [px + 5, y - 100], [px + 20 * sweep, base],
      [px - 20 * sweep, base]], "#ad6b2d");
    fxLine([[px, y - 104], [px, base]], "#fff0af", 3);
    fxArc(px, base, 27 + sweep * 25, 8, "#ffc862", 0, Math.PI * 2, 2);
  }
  fxLine([[x - shell, y - 18], [x, y - 18 - 22 * (1 - p)], [x + shell, y - 18]], "#ffe3a1", 3);
  techniqueGlyph(2, x, y - (1 - p) * 45, (1.3 + p * .46) * scale, alpha);
}

function amethystLattice(x, y, p, alpha, scale) {
  for (let row = -1; row <= 1; row++) {
    for (let col = -2; col <= 2; col++) {
      const px = x + (col * 37 + row * 15) * scale, py = y + row * 44 * scale;
      const stretch = (18 + 6 * p) * scale;
      const points = [[px,py-stretch], [px+stretch,py], [px,py+stretch], [px-stretch,py]];
      fxLine([...points, points[0]], (row + col) % 2 ? "#a894f4" : "#6651aa", 2);
      if ((row + col) % 2 === 0) star(px, py, 3, "#f1ddff");
    }
  }
  for (const side of [-1, 1]) techniqueGlyph(3, x + side * (115 - 44 * p) * scale, y + side * 21,
    (.62 + p * .24) * scale, alpha, side < 0);
  techniqueGlyph(3, x, y - 8, (1.28 + p * .36) * scale, alpha);
}

function risingSeed(x, y, p, alpha, scale) {
  const base = y + 57 * scale;
  for (const dir of [-1, 1]) {
    const reach = (36 + p * 109) * scale, height = (20 + p * 99) * scale;
    const curve = [[x + dir * reach, base + 12], [x + dir * reach * .69, base - height * .35],
      [x + dir * reach * .54, base - height * .72], [x + dir * reach * .87, base - height]];
    fxLine(curve, "#254c39", 11);
    fxLine(curve, "#93d55c", 4);
    for (const [px,py] of curve.slice(1)) {
      path([[px,py + 5], [px + dir * 15,py - 13], [px + dir * 30,py - 15], [px + dir * 23,py + 1]], "#85bf4e");
      fxLine([[px,py + 5], [px + dir * 20,py - 9]], "#d4ef85", 2);
    }
  }
  techniqueGlyph(4, x, base - (18 + 67 * p) * scale, (1.03 + .7 * p) * scale, alpha);
}

function goldenWings(x, y, p, alpha, scale) {
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4 + p * 1.5;
    const radius = (178 - 62 * p + 27 * (i % 2)) * scale;
    const px = x + Math.cos(a) * radius, py = y + Math.sin(a) * radius * .51;
    const wave = .48 + .51 * Math.abs(Math.sin(p * 25 + i));
    fxLine([[px,py], [x + Math.cos(a - .22) * radius, y + Math.sin(a - .22) * radius * .51]], "#f6bf6d", 2);
    techniqueGlyph(5, px, py, .47 * scale, alpha, i % 2 === 0, wave);
  }
  techniqueGlyph(5, x, y - 11 * p, (1.08 + p * .62) * scale, alpha);
}

function plateCollision(x, y, p, alpha, scale) {
  const base = y + 72 * scale;
  const shove = (1 - p) * 110 * scale;
  for (const side of [-1, 1]) {
    const px = x + side * (43 + shove);
    path([[px + side * 98,base], [px + side * 65,base - 15], [px + side * 51,base - 45 * p],
      [px,base - 52 * p], [px - side * 14,base - 9]], "#613b32");
    techniqueGlyph(6, px, base - 30 - 50 * p, (1 + .15 * p) * scale, alpha, side < 0);
    fxLine([[x,base], [px,base + 9], [px + side * 42,base - 2], [px + side * 87,base + 5]], "#ffbd71", 4);
  }
}

function innerCore(x, y, p, alpha, scale) {
  for (let i = 0; i < 4; i++) {
    const radius = (35 + i * 29 + p * 26) * scale;
    const crest = y + (i % 2 ? 12 : -3);
    fxArc(x, crest, radius, radius * .64, i % 2 ? "#fd9b51" : "#ffdc8b", i * .66, i * .66 + Math.PI * 1.62, 3);
    fxArc(x, y + 63 * scale, radius * 1.17, 7 + i * 5, "#edaa5b", Math.PI, Math.PI * 2, 2);
  }
  techniqueGlyph(7, x, y, (1.06 + .62 * p) * scale, alpha);
}

const techniquePoses = [fallingApples, stoppedClock, goldenBalance, amethystLattice,
  risingSeed, goldenWings, plateCollision, innerCore];

function drawWardTechniques() {
  const soft = quietCombat();
  for (const boss of foes) {
    const cast = boss.wardCast;
    if (!cast) continue;
    const progress = clamp(cast.elapsed / wardImpactTime, 0, 1);
    const x = boss.x - cam, y = boss.y - boss.height * .5;
    const scale = Math.min(1.14, boss.height / 175);
    const alpha = Math.min(.88, .24 + progress);
    g.save();
    g.globalAlpha *= alpha;
    if (soft) techniqueGlyph(cast.id, x, y, .98 * scale);
    else techniquePoses[cast.id](x, y, progress, 1, scale);
    g.restore();
  }
  for (const fx of effects) {
    if (fx.type !== "wardImpact") continue;
    const x = fx.x - cam, y = fx.y - fx.height * .51;
    const t = 1 - fx.life / fx.max;
    const expand = 1 - (1 - t) ** 3;
    const [edge, color, tip] = techniqueInk[fx.id];
    g.save();
    g.globalAlpha *= (1 - t) ** 1.2;
    if (!soft && t < .48) techniquePoses[fx.id](x, y, 1, 1, Math.min(1.18, fx.height / 172));
    const rx = fx.half + 25 + expand * (soft ? 35 : 99), ry = fx.height * .5 + expand * 43;
    for (let i = 0; i < 12; i++) {
      const angle = i * Math.PI / 6;
      const sx = Math.cos(angle), sy = Math.sin(angle);
      const px = x + sx * rx, py = y + sy * ry;
      path([[px,py - 7], [px + sx * 16 + 3,py + sy * 16], [px + 3,py + 10],
        [px - sx * 10,py - sy * 8]], edge);
      fxLine([[px,py - 7], [px + sx * 16 + 3,py + sy * 16], [px + 3,py + 10]], i % 2 ? color : tip, 2);
    }
    fxArc(x, fx.y - 5, 30 + expand * (soft ? 90 : 240), 6 + expand * 29, color, 0, Math.PI * 2, 3);
    if (!soft) splinters(x, y, t, 185, tip, 28);
    g.restore();
  }
}
