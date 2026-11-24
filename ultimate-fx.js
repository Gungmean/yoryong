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

// [atlas clip, delay, duration, x offset, y offset, scale, mirrored].
// Each follow-through has its own rhythm and stays behind the fighters.
const techniqueBursts = [
  [["meteor",0,.74,0,0,1.46], ["gravity",0,.51,0,-73,2.2],
    ["meteor",.21,.65,-132,0,1.01,true], ["meteor",.32,.65,139,0,.97],
    ["victoryEarth",.44,.82,0,0,1.43]],
  [["space",0,.65,-84,-85,1.72,true], ["space",0,.65,84,-85,1.72],
    ["orbitSeal",.14,.71,0,-3,2.65], ["space",.34,.54,-169,-105,1.06,true],
    ["space",.47,.62,169,-105,1.06], ["victoryPhysics",.37,.93,0,0,1.58]],
  [["restore",0,.72,-113,-5,2.26], ["restore",0,.72,113,-5,2.26],
    ["reactionSeal",.18,.86,0,-2,2.80], ["restore",.32,.76,-196,-6,1.41,true],
    ["restore",.32,.76,196,-6,1.41], ["victoryChemistry",.40,.83,0,0,1.30]],
  [["prism",0,.58,-45,-62,1.60], ["prism",0,.58,45,-62,1.60,true],
    ["reactionSeal",.1,.82,0,0,2.28], ["prism",.31,.65,-128,-40,1.32,true],
    ["prism",.39,.65,128,-47,1.32], ["victoryChemistry",.49,.84,0,0,1.34]],
  [["roots",0,.83,0,0,3.10], ["thicket",.10,.67,45,0,1.44,true],
    ["thicket",.10,.67,-45,0,1.44], ["thicket",.36,.78,-176,0,1.26],
    ["thicket",.40,.78,176,0,1.26,true], ["victoryBiology",.38,.92,0,0,1.66]],
  [["wings",0,.77,-78,-95,1.55,true], ["wings",0,.77,78,-95,1.55],
    ["livingSeal",.13,.73,0,-3,2.50], ["wings",.36,.75,-168,-80,1.13,true],
    ["wings",.36,.75,168,-80,1.13], ["wings",.50,.78,0,-143,1.44]],
  [["fault",0,.67,-55,0,1.24], ["fault",0,.67,55,0,1.24,true],
    ["quake",.14,.74,0,0,1.56], ["fault",.31,.72,-179,0,.93,true],
    ["fault",.31,.72,179,0,.93], ["victoryEarth",.43,.88,0,0,1.58]],
  [["core",0,.74,0,-4,1.87], ["quake",.13,.71,-130,-2,1.24,true],
    ["quake",.13,.71,130,-2,1.24], ["core",.40,.68,0,-4,2.03],
    ["quake",.56,.78,-228,0,1.23,true], ["quake",.56,.78,228,0,1.23]],
];
const techniqueSeals = ["orbitSeal", "reactionSeal", "livingSeal", "strataSeal"];

function wardConvergence(x, foot, height, p, id) {
  const [edge, color, tip] = techniqueInk[id];
  const origin = foot - height * .49;
  const radius = 208 - p * 102;
  g.save();
  g.globalAlpha *= Math.min(.88, p * 1.3);
  spellClip(techniqueSeals[id >> 1], .29 + .39 * p, x, foot - 3, 1.65 + .42 * p, .85);
  const sweep = 1 - (1 - p) ** 2;
  fxArc(x, foot - 4, 89 + sweep * 155, 10 + sweep * 20, tip, p * 3, p * 3 + Math.PI * 1.28, 2);
  fxArc(x, foot - 3, radius * 1.1, 14 + p * 5, edge, 0, Math.PI * 2, 5);
  fxArc(x, foot - 3, radius * 1.1, 14 + p * 5, color, 0, Math.PI * 2, 2);
  for (let i = 0; i < 20; i++) {
    const angle = i * 2.39996 + p * 1.4;
    const dir = Math.cos(angle), rise = Math.sin(angle) * .7;
    const distance = radius * (.76 + i % 5 * .085), length = 10 + i % 4 * 9;
    const px = x + dir * distance, py = origin + rise * distance;
    fxLine([[px + dir * length, py + rise * length], [px, py]], color, 2);
    r(px - 1, py - 1, i % 4 === 0 ? 4 : 2, 3, tip);
  }
  g.restore();
}

function drawWardTechniqueBack() {
  if (quietCombat()) return;
  const charging = foes.find(e => e.wardCast);
  const impact = effects.find(fx => fx.type === "wardImpact");
  if (!charging && !impact) return;
  const fx = charging?.wardCast ?? impact;
  const stage = charging ? clamp(fx.elapsed / wardImpactTime, 0, 1) : 1 - fx.life / fx.max;
  g.save();
  g.globalAlpha *= charging ? .29 * Math.min(1, stage * 4) : .27 * (1 - stage);
  r(-18, 0, W + 36, H, "#101a2f");
  g.restore();
  if (charging) {
    wardConvergence(charging.x - cam, charging.y, charging.height, stage, fx.id);
    return;
  }
  const x = fx.x - cam, floor = fx.y;
  const age = fx.max - fx.life;
  for (const [clip, delay, duration, dx, dy, size, flip] of techniqueBursts[fx.id]) {
    const beat = (age - delay) / duration;
    if (beat < 0 || beat >= 1) continue;
    spellClip(clip, beat, x + dx, floor + dy, size, Math.min(.91, (1 - beat) * 2), flip);
  }
  spellClip("dust", stage, x - 105, floor, 1.7, .58, true);
  spellClip("dust", stage, x + 105, floor, 1.7, .58);
}

// Each technique sends patterned particles in a different fan. The variation
// comes from its release angle and gravity, with no extra gameplay hit.
const echoFlights = [
  {count:26, width:260, lift:103, gravity:115, spread:1.60, turn:0},   // embers
  {count:24, width:235, lift:8, gravity:15, spread:Math.PI, turn:1.30}, // clock fragments
  {count:18, width:216, lift:67, gravity:75, spread:1.16, turn:0},     // balanced plumes
  {count:28, width:248, lift:22, gravity:33, spread:Math.PI, turn:.30}, // prism chips
  {count:21, width:192, lift:183, gravity:117, spread:1.04, turn:.46},  // leaves
  {count:25, width:242, lift:86, gravity:17, spread:1.82, turn:1.22},   // butterflies
  {count:24, width:281, lift:30, gravity:127, spread:.62, turn:0},      // rock slivers
  {count:22, width:290, lift:12, gravity:49, spread:.87, turn:.63},     // seismic traces
];

function wardEchoFlights(x, y, fx, age) {
  const flight = echoFlights[fx.id];
  const [edge, color, tip] = techniqueInk[fx.id];
  const motif = cutInThemes[fx.id].mote;
  g.save();
  for (let i = 0; i < flight.count; i++) {
    const local = (age - .10 - (i % 7) * .041) / (1.02 + (i % 4) * .078);
    if (local <= 0 || local >= 1) continue;
    const a = (i % 2 ? Math.PI : 0) + (i * 2.39996 % 1.97 - .98) * flight.spread + local * flight.turn;
    const spread = (1 - (1 - local) ** 2) * (.44 + (i % 6) * .12);
    const vx = Math.cos(a), vy = Math.sin(a);
    const px = x + vx * flight.width * spread;
    const py = Math.min(fx.y + 1, y + vy * 75 * spread - flight.lift * local + flight.gravity * local * local);
    const dot = i % 6 === 0 ? 2 : 1;
    g.globalAlpha = (1 - local) ** 1.15 * .92;
    fxLine([[px - vx * 28 * (1 - local), py - vy * 15], [px - vx * 12, py], [px, py]], edge, 4);
    fxLine([[px - vx * 20 * (1 - local), py - vy * 10], [px, py]], color, 2);
    paintMote(motif, px, py, color, tip, dot, r);
  }
  g.restore();
}

function shatteredWard(x, y, fx, t, soft) {
  const [edge, color, tip] = techniqueInk[fx.id];
  const pieces = soft ? 8 : 21;
  for (let i = 0; i < pieces; i++) {
    const a = i * 2.39996;
    const sx = Math.cos(a), sy = Math.sin(a);
    const reach = t * (100 + i % 6 * 21) * (soft ? .45 : 1);
    const px = x + sx * (fx.half + 19 + reach);
    const py = Math.min(fx.y + 3, y + sy * (fx.height * .43 + reach * .65) + 116 * t * t);
    const size = (7 + i % 5 * 2) * (1 - t * .65);
    const tilt = a + (i % 2 ? -1 : 1) * t * 4;
    const dx = Math.cos(tilt) * size, dy = Math.sin(tilt) * size;
    const points = [[px-dy, py+dx], [px+dx, py+dy], [px+dy, py-dx], [px-dx*.53, py-dy*.53]];
    path(points, edge);
    fxLine(points.slice(0,3), i % 3 ? color : tip, i % 3 ? 2 : 3);
    if (!soft && t < .25) fxLine([[px-sx*21,py-sy*12], [px,py]], tip, 2);
  }
}

function wardShockwave(x, foot, height, t, color, tip, soft) {
  const rings = soft ? 1 : 3;
  for (let i = 0; i < rings; i++) {
    const wave = (t - i * .105) / .64;
    if (wave < 0 || wave > 1) continue;
    const span = 29 + (1 - (1 - wave) ** 2.3) * (soft ? 118 : 337);
    g.save();
    g.globalAlpha *= 1 - wave;
    fxArc(x, foot - 4, span, 5 + wave * 27, color, 0, Math.PI * 2, i ? 2 : 4);
    if (!soft) fxArc(x, foot - 7, span * .86, 4 + wave * 21, tip, Math.PI, Math.PI * 2, 2);
    g.restore();
  }
  if (soft || t > .21) return;
  const quick = t / .21, center = foot - height * .51;
  const breadth = 38 + quick * 231;
  g.save();
  g.globalAlpha *= (1 - quick) ** 2;
  path([[x-breadth,center+16], [x-25,center-4], [x,center-38], [x+24,center-10],
    [x+breadth,center-17], [x+29,center+4], [x+2,center+30], [x-24,center+12]], color);
  path([[x-breadth*.72,center+11], [x-9,center-3], [x+3,center-22],
    [x+13,center-4], [x+breadth*.72,center-12], [x+15,center+3], [x,center+17], [x-9,center+5]], tip);
  g.restore();
}

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
    const [, color, tip] = techniqueInk[fx.id];
    g.save();
    g.globalAlpha *= (1 - t) ** 1.2;
    if (!soft && t < .48) {
      g.save();
      g.globalAlpha *= 1 - t / .48;
      techniquePoses[fx.id](x, y, 1, 1, Math.min(1.18, fx.height / 172) * (1 + expand * .16));
      g.restore();
    }
    shatteredWard(x, y, fx, t, soft);
    wardShockwave(x, fx.y, fx.height, t, color, tip, soft);
    if (!soft) {
      splinters(x, y, t, 255, tip, 34);
      splinters(x, y, t, 321, color, 19, .48);
      wardEchoFlights(x, y, fx, fx.max - fx.life);
    }
    g.restore();
  }
}

const cutInBolts = $("cut-in-bolts");
const cutInBand = document.querySelector(".cut-in-band");
const lightningInk = cutInBolts.getContext("2d");
const lightningTeeth = [
  [0,0], [.06,2], [.084,-6], [.114,4], [.166,-4], [.21,-3], [.23,-13],
  [.253,7], [.27,1], [.34,2], [.38,-6], [.418,4], [.467,-3], [.489,-12],
  [.512,7], [.538,-1], [.61,1], [.646,-8], [.662,7], [.7,-3], [.766,1],
  [.791,-12], [.815,5], [.868,-5], [.907,4], [.931,-8], [.949,4], [1,0],
];

function lightningPixels(points, mark) {
  for (let i = 1; i < points.length; i++) {
    const [startX, startY] = points[i - 1], [endX, endY] = points[i];
    const steps = Math.max(Math.abs(endX - startX), Math.abs(endY - startY), 1);
    for (let j = 0; j <= steps; j++) {
      const t = j / steps;
      mark(Math.round(startX + (endX - startX) * t), Math.round(startY + (endY - startY) * t));
    }
  }
}

function paintLightning(points, color, size, light = () => true) {
  lightningInk.fillStyle = color;
  const inset = Math.floor(size / 2);
  lightningPixels(points, (x, y) => {
    if (light(x)) lightningInk.fillRect(x - inset, y - inset, size, size);
  });
}

// [launch position, length, distance from the band]. Both banks run uphill.
const lightningLanes = [
  [-.30,.50,30], [.12,.44,27], [.58,.53,33],
  [-.25,.36,67], [.26,.53,63], [.70,.41,71],
  [-.03,.32,100], [.49,.38,98],
];
const cutInThemes = [
  {bed:"#301c25", speed:1.34, length:.82, teeth:1.15, kinks:[0,4,-6,3,-8,1,0],
    mote:["....+","...+#","..++#",".++##","###.."]}, // Newton's embers
  {bed:"#172943", speed:.94, length:1.16, teeth:.58, kinks:[0,0,4,4,-2,-2,0],
    mote:["..+..",".#+#.","++#++",".#+#.","..+.."]}, // Time marks
  {bed:"#32261a", speed:.82, length:1.12, teeth:.52, kinks:[0,2,2,0,-2,-2,0],
    mote:["..+..",".+++.",".###.","#####","#####"]}, // Scale weights
  {bed:"#2c2045", speed:1.12, length:.88, teeth:1.30, kinks:[0,7,-6,7,-7,4,0],
    mote:["..+..",".+##.","++###",".###.","..#.."]}, // Crystal facets
  {bed:"#183323", speed:.87, length:1.10, teeth:.74, kinks:[0,7,8,2,-5,-5,0],
    mote:["...##","..#+#",".#+##","#+##.","###.."]}, // Leaves
  {bed:"#38221a", speed:1.22, length:.77, teeth:.92, kinks:[0,-7,-2,8,2,-6,0],
    mote:["#+..+#","##++##",".#++#.",".+##+.",".#..#."]}, // Paired wings
  {bed:"#352620", speed:.78, length:.94, teeth:1.28, kinks:[0,5,5,-7,-7,3,0],
    mote:["..+++.",".####.","#####.","#####.","..###."]}, // Broken strata
  {bed:"#382128", speed:1.06, length:1.18, teeth:.66, kinks:[0,7,9,3,-6,-9,0],
    mote:["..++..",".+##+.","+#+##+","+##+#+",".+##+.","..++.."]}, // Core rings
];

function paintMote(pattern, x, y, color, face, size, pixel) {
  for (const [row, marks] of pattern.entries()) {
    for (let col = 0; col < marks.length; col++) {
      if (marks[col] === ".") continue;
      pixel(x + col * size, y + row * size, size, size, marks[col] === "+" ? face : color);
    }
  }
}
function cutInPixel(x, y, width, height, color) {
  lightningInk.fillStyle = color;
  lightningInk.fillRect(Math.round(x), Math.round(y), width, height);
}

function lightningRush(side, width, base, slant, px, age, theme, [edge, color, face]) {
  const outward = side ? 1 : -1;
  const slope = slant / width;
  const release = clamp((age - .65) / .29, 0, 1);
  for (const [index, [launch, length, gap]] of lightningLanes.entries()) {
    const start = width * (launch + (age - .5) * (.36 + index % 3 * .08) * theme.speed + side * .12);
    const lengthPx = width * length * (.82 + .22 * release) * theme.length;
    const y = base + outward * gap / px;
    const points = theme.kinks.map((kink, step) => {
      const x = start + lengthPx * step / (theme.kinks.length - 1);
      return [x, y - x * slope + kink / px];
    });
    lightningInk.globalAlpha = (.55 + index % 3 * .11) * (1 - release * .34);
    paintLightning(points, edge, index < 3 ? 6 : 4);
    paintLightning(points, color, index < 3 ? 4 : 2);
    const core = start + lengthPx * (.2 + (age + index * .19) % .6);
    paintLightning(points, face, index < 3 ? 2 : 1, x => x >= core && x < core + lengthPx * .34);

    const end = start + lengthPx;
    for (let spark = 0; spark < 2; spark++) {
      const x = end + (12 + spark * 25) * (1 + release) / px;
      const py = y - x * slope - 2 - spark;
      paintMote(theme.mote, x, py, color, face, index < 3 && px > 2 && !spark ? 2 : 1, cutInPixel);
    }
  }
  lightningInk.globalAlpha = 1;
}

function drawCutInLightning() {
  if (!cutInRemaining) return;
  const cutIn = $("scholar-cut-in");
  const boundsWidth = cutIn.clientWidth;
  if (!boundsWidth) return;
  const tilt = clamp(boundsWidth * .145, 28, 196);
  const tiltValue = tilt + "px";
  if (cutIn.style.getPropertyValue("--cut-in-tilt") !== tiltValue) cutIn.style.setProperty("--cut-in-tilt", tiltValue);
  const px = boundsWidth < 600 ? 2 : 3;
  const width = Math.ceil(boundsWidth / px), height = Math.ceil(cutInBolts.clientHeight / px);
  if (cutInBolts.width !== width) cutInBolts.width = width;
  if (cutInBolts.height !== height) cutInBolts.height = height;
  lightningInk.clearRect(0, 0, width, height);

  const quiet = quietCombat();
  const age = 1 - cutInRemaining / .94;
  const id = Number(cutIn.dataset.technique);
  const theme = cutInThemes[id], palette = techniqueInk[id];
  const [edge, color, face] = palette;
  const slant = tilt / px, pad = (cutInBolts.clientHeight - cutInBand.clientHeight) / (2 * px);
  const breadth = height - slant - pad * 2;
  for (const side of [0, 1]) {
    const out = side ? 1 : -1;
    const crest = age * 1.35 - .16 - side * .12;
    const knots = lightningTeeth.map(([fraction, tooth], i) => {
      const bend = side ? lightningTeeth[lightningTeeth.length - 1 - i][1] : tooth;
      const depth = bend * theme.teeth * (quiet ? .55 : 1);
      return [Math.round(fraction * (width - 1)),
        Math.round(pad + side * breadth + (1 - fraction) * slant - out * depth / px)];
    });
    if (!quiet) {
      lightningRush(side, width, pad + side * breadth + slant, slant, px, age, theme, palette);
    }
    paintLightning(knots, edge, quiet ? 5 : 8);
    paintLightning(knots, color, quiet ? 3 : 5);
    paintLightning(knots, face, quiet ? 1 : 2, x => quiet || Math.abs(x / width - crest) < .30);
  }
}

const cutInLettering = $("cut-in-lettering");
const cutInType = cutInLettering.parentElement;
const cutInTitle = $("cut-in-skill");
const cutInScholar = $("cut-in-scholar");
let cutInLetteringKey = "";

function drawCutInLettering() {
  if (!cutInRemaining || !document.fonts.check("12px Galmuri")) return;
  const title = cutInTitle.textContent, scholar = cutInScholar.textContent;
  const available = cutInType.clientWidth;
  if (!available) return;
  const color = $("scholar-cut-in").style.getPropertyValue("--cut-in-color");
  const face = $("scholar-cut-in").style.getPropertyValue("--cut-in-face");
  const bandDepth = cutInBand.clientHeight - (parseFloat($("scholar-cut-in").style.getPropertyValue("--cut-in-tilt")) || 0);
  const key = [title, scholar, available, bandDepth, color, face].join("|");
  if (cutInLetteringKey === key) return;
  cutInLetteringKey = key;

  const wholeTitle = pixelLettering(title, face);
  const words = title.split(" ");
  const titleLines = wholeTitle.width * 2 + 5 > available && words.length > 1
    ? [words.slice(0, Math.ceil(words.length / 2)).join(" "), words.slice(Math.ceil(words.length / 2)).join(" ")]
    : [title];
  const glyphs = titleLines.map(line => pixelLettering(line, face));
  const largest = Math.max(...glyphs.map(run => run.width));
  const headlineDots = Math.max(1, Math.min(5, Math.floor(bandDepth / 31), Math.floor((available - 5) / largest)));
  const caption = pixelLettering(scholar, color);
  const captionDots = available >= 245 && caption.width * 2 + 16 <= available ? 2 : 1;
  const titleGap = 5;
  const headerHeight = caption.height * captionDots;
  cutInLettering.width = Math.max(largest * headlineDots + 4, caption.width * captionDots + 4);
  cutInLettering.height = headerHeight + titleGap + glyphs.reduce((sum, run) => sum + run.height * headlineDots + 3, 0) + 2;
  const ctx = cutInLettering.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  const captionWidth = caption.width * captionDots;
  ctx.drawImage(caption, 0, 0, captionWidth, headerHeight);
  ctx.fillStyle = color;
  const trimWidth = Math.max(0, Math.min(46, cutInLettering.width - captionWidth - 11));
  if (trimWidth > 4) {
    ctx.globalAlpha = .65;
    ctx.fillRect(captionWidth + 9, Math.floor(headerHeight / 2), trimWidth, captionDots);
    ctx.globalAlpha = 1;
  }
  let y = headerHeight + titleGap;
  const weight = Math.max(1, Math.floor(headlineDots / 2));
  for (const [index, run] of glyphs.entries()) {
    const width = run.width * headlineDots, height = run.height * headlineDots;
    ctx.drawImage(pixelLettering(titleLines[index], "#101b2b"), 2, y + 3, width, height);
    ctx.globalAlpha = .47;
    ctx.drawImage(pixelLettering(titleLines[index], color), 0, y + 2, width, height);
    ctx.globalAlpha = 1;
    ctx.drawImage(run, weight, y, width, height);
    ctx.drawImage(run, 0, y, width, height);
    y += height + 3;
  }
  cutInLettering.hidden = false;
}
