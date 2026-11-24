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

function fallingApples(x, y, p, scale, foot, dir) {
  for (const [offset, start, stop, size] of [[-104, .02, .75, .72], [97, .14, .88, .82], [0, .26, 1, 1.48]]) {
    if (p < start || p > stop) continue;
    const fall = ((p - start) / (stop - start)) ** 2.1;
    const px = x + (offset - dir * (1 - fall) * 104) * scale;
    const py = Math.min(foot - 32 * scale, y + 32 * scale) - (1 - fall) * 258 * scale;
    const trail = 94 * scale * size;
    for (const [sw, tint] of [[1, "#862d31"], [.74, "#ed4e30"], [.49, "#ff9c43"], [.24, "#ffedaa"]]) {
      path([[px - trail * .26 * sw, py + 6], [px - dir * trail * .3, py - trail * .51],
        [px - dir * trail * .67, py - trail], [px - dir * trail * .28 + trail * .26 * sw, py - trail * .51],
        [px + trail * .26 * sw, py + 8]], tint);
    }
    techniqueGlyph(0, px, py, size * scale, 1, dir < 0);
  }
}

function stoppedClock(x, y, p, scale) {
  const radius = (73 + 48 * Math.min(1, p * 2.6)) * scale;
  const ry = radius * .72;
  const turn = Math.min(p, .75) * 5.5 - Math.PI / 2;
  fxArc(x, y, radius + 5, ry + 5, "#284066", 0, Math.PI * 2, 8);
  fxArc(x, y, radius, ry, "#8cdeff", 0, Math.PI * 2, 3);
  fxArc(x, y, radius * .83, ry * .83, "#4e94c6", 0, Math.PI * 2, 2);
  for (let i = 0; i < 24; i++) {
    const a = i * Math.PI / 12;
    const inset = i % 6 === 0 ? .82 : .92;
    fxLine([[x + Math.cos(a) * radius * inset, y + Math.sin(a) * ry * inset],
      [x + Math.cos(a) * radius, y + Math.sin(a) * ry]], i % 6 ? "#8cceea" : "#f0feff", i % 6 ? 1 : 4);
  }
  for (const [angle, length, width] of [[turn, .82, 4], [turn * .32 + 1.1, .49, 7]]) {
    const ex = x + Math.cos(angle) * radius * length, ey = y + Math.sin(angle) * ry * length;
    fxLine([[x,y], [ex,ey]], "#25578c", width + 4);
    fxLine([[x,y], [ex,ey]], "#defcff", width);
  }
  star(x, y, p > .75 ? 10 : 5, "#e4fcff");
}

function goldenBalance(x, y, p, scale) {
  const shell = 109 * scale;
  const dip = Math.sin(p * Math.PI * 1.22) * (1 - p) * 48 * scale;
  const rail = y - 62 * scale;
  fxLine([[x - shell, rail - dip], [x, rail], [x + shell, rail + dip]], "#966136", 12);
  fxLine([[x - shell, rail - dip - 2], [x, rail - 2], [x + shell, rail + dip - 2]], "#ffda7c", 4);
  fxLine([[x,y - 110 * scale], [x,y + 34 * scale]], "#d59847", 7);
  for (const side of [-1, 1]) {
    const px = x + side * shell;
    const pan = rail + side * dip + (77 + 28 * p ** 3) * scale;
    const edge = 34 * scale;
    fxLine([[px - edge, pan], [px, rail + side * dip], [px + edge, pan]], "#ffd789", 2);
    path([[px - edge, pan], [px + edge, pan], [px + edge * .64, pan + 11], [px - edge * .64, pan + 11]], "#bd782f");
    r(px - edge, pan - 1, edge * 2, 4, "#fff0ab");
    const load = pan - 15 - Math.max(0, .76 - p) ** 2 * 118;
    path([[px-17,load+14],[px-11,load],[px+11,load],[px+17,load+14]], "#7d4d27");
    r(px - 11, load, 22, 4, "#efb361");
    r(px - 7, load + 5, 5, 5, "#fff1b4");
  }
  techniqueGlyph(2, x, rail - 11, .78 * scale);
}

const latticeTiles = ["#8070d5", "#bd8de0", "#6bd0cb", "#e8ae8f"];
function amethystLattice(x, y, p, scale) {
  for (let row = 0; row < 4; row++) {
    for (let col = -3; col <= 3; col++) {
      if (row < 2 && Math.abs(col) < 2 && (row === 0 || col !== 0)) continue;
      const slide = clamp((p - Math.abs(col) * .047 - row * .061) / .39, 0, 1);
      if (!slide) continue;
      const px = x + (col * (40 + (1 - slide) * 22) - 9 * row) * scale;
      const py = y + ((row - 1.5) * 32 - (1 - slide) * 59) * scale;
      const size = 28 * scale, ink = latticeTiles[(row + col + 4) % latticeTiles.length];
      path([[px,py], [px+size,py], [px+size-5,py+size-2], [px-5,py+size-2]], "#30244d");
      fxLine([[px-5,py+size-2], [px,py], [px+size,py]], ink, 2);
      r(px + 4, py + 5, 8, 3, ink);
      r(px + 4, py + 12, size - 12, 4, "#ebd8fd");
      r(px + 3, py + 19, size - 15, 3, ink);
    }
  }
  techniqueGlyph(3, x, y - 16, (1.35 + p * .36) * scale);
}

function risingSeed(x, y, p, scale, base) {
  for (const dir of [-1, 1]) {
    for (const arm of [0, 1]) {
      const grow = clamp(p * 1.21 - arm * .19, 0, 1);
      if (!grow) continue;
      const reach = (38 + arm * 39 + grow * 56) * scale;
      const height = (30 + grow * (169 - arm * 52)) * scale;
      const curve = [[x + dir * (22 + arm * 43), base], [x + dir * reach * .58, base - height * .31],
        [x + dir * reach * .76, base - height * .63], [x + dir * reach, base - height]];
      fxLine(curve, "#244836", arm ? 13 : 20);
      fxLine(curve, "#83bb4d", arm ? 5 : 8);
      for (const [i,[px,py]] of curve.slice(1).entries()) {
        const s = 16 + grow * (25 - i * 4), side = i === 1 ? -dir : dir;
        path([[px,py+4], [px+side*s*.39,py-s*.61], [px+side*s,py-s*.81], [px+side*s*.83,py-s*.22],
          [px+side*s*.38,py+6]], i % 2 ? "#5a994d" : "#98c94e");
        fxLine([[px,py+4], [px+side*s*.84,py-s*.65]], "#dff18f", 2);
      }
    }
  }
  techniqueGlyph(4, x, base - (18 + 138 * p) * scale, (1.0 + .83 * p) * scale);
}

function goldenWings(x, y, p, scale, foot, dir) {
  for (let i = 0; i < 15; i++) {
    const flight = p * 1.3 - i * .033;
    if (flight < 0 || flight > 1) continue;
    const px = x + dir * (flight - .5) * 460 * scale;
    const py = Math.min(foot - 20, y + (Math.sin(flight * Math.PI * 2.2 + i % 3 * .7) * 61 + (i % 3 - 1) * 25) * scale);
    const flap = .35 + .65 * Math.abs(Math.sin(p * 29 + i * 2));
    const size = (i === 2 || i === 8 ? .83 : .29 + i % 3 * .09) * scale;
    fxLine([[px-dir*(29+i%3*12),py+12], [px-dir*16,py+1], [px,py]], "#ffc27a", 2);
    techniqueGlyph(5, px, py, size, 1, dir < 0, flap);
  }
}

function plateCollision(x, y, p, scale, base) {
  const shove = (1 - p ** 2.1) * 170 * scale;
  for (const side of [-1, 1]) {
    const px = x + side * (10 + shove);
    const outer = (186 - 28 * (1 - p)) * scale;
    const upslope = [[px,base - 73 * p], [px+side*32,base - 105 * p], [px+side*74,base-48-18*p],
      [px+side*118,base-46], [px+side*outer,base-21]];
    path([...upslope,[px+side*outer,base+12],[px+side*14,base+19]], "#473140");
    for (const [depth, tint, width] of [[15,"#ae614d",13],[29,"#e6995b",8],[43,"#784a4a",6],[51,"#d07f52",4]]) {
      fxLine(upslope.map(([tx,ty], index) => [tx, Math.min(base + 9 - index, ty + depth)]), tint, width);
    }
    fxLine(upslope, "#ffd78c", 4);
    techniqueGlyph(6, px + side * 59, base - 38 - 35 * p, .94 * scale, .85, side < 0);
  }
}

function seismicTrace(x, y, distance, direction, reach, amplitude, color) {
  if (distance <= 0) return;
  const part = Math.min(reach, distance);
  const first = Math.max(0, distance - reach);
  const points = [];
  for (let hop = 0; hop <= 12; hop++) {
    const offset = first + part * hop / 12;
    const pulse = Math.sin(hop * 2.3) * Math.sin(Math.PI * hop / 12) * amplitude;
    points.push([x + direction * offset, y + pulse]);
  }
  fxLine(points, "#5a3548", 6);
  fxLine(points, color, 3);
}

function innerCore(x, y, p, scale, base) {
  const radius = (67 + 40 * p) * scale;
  for (let i = 0; i < 3; i++) {
    const shell = radius * (1 - i * .19);
    fxArc(x, y, shell, shell * .79, ["#934f5c", "#c76b51", "#ffd18f"][i], -.85, Math.PI * 1.16, 4 - i);
    fxLine([[x + shell * .65,y - shell * .53],[x,y],[x - shell * .88,y + shell * .33]], "#a75e56", 2);
  }
  techniqueGlyph(7, x, y, (1.0 + .55 * p) * scale);
  for (const sign of [-1,1]) {
    seismicTrace(x, base - 18, p * 207, sign, 110, 8, "#ffe6a1");
    seismicTrace(x, base - 39, (p - .21) * 147, sign, 96, 17, "#f29e85");
  }
}

const techniquePoses = [fallingApples, stoppedClock, goldenBalance, amethystLattice,
  risingSeed, goldenWings, plateCollision, innerCore];

// [atlas clip, delay, duration, x offset, y offset, scale, mirrored].
// Each follow-through has its own rhythm and stays behind the fighters.
const techniqueBursts = [
  [["meteor",0,.71,0,0,1.28], ["meteor",.18,.58,-112,0,.83,true], ["meteor",.31,.58,117,0,.92]],
  [["space",.13,.74,-108,-64,1.12,true], ["space",.13,.74,108,-64,1.12]],
  [["restore",.04,.98,-110,-3,1.42], ["restore",.04,.98,110,-3,1.42]],
  [["prism", .02,.62,-66,-64,1.23], ["prism",.12,.59,88,-52,1.30,true]],
  [["roots",0,.98,0,0,2.15], ["thicket",.28,.65,-127,0,1.08], ["thicket",.34,.65,127,0,1.08,true]],
  [["wings", .15,.73,-128,-119,1.0,true], ["wings",.31,.74,136,-85,1.12]],
  [["fault",.04,.77,-48,0,1.18], ["fault",.04,.77,48,0,1.18,true], ["dust",.29,.91,0,0,2.5]],
  [["core",.11,.76,0,-4,1.24], ["quake",.24,.73,-157,0,1.26,true], ["quake",.38,.73,157,0,1.26]],
];
const techniqueShade = ["#401822", "#102647", "#3c291b", "#2d204c", "#1c3a32", "#3c2a20", "#362129", "#372438"];

function drawWardTechniqueBack() {
  if (quietCombat()) return;
  const charging = foes.find(e => e.wardCast);
  const impact = effects.find(fx => fx.type === "wardImpact");
  if (!charging && !impact) return;
  const fx = charging?.wardCast ?? impact;
  const stage = charging ? clamp(fx.elapsed / wardChoreography[fx.id].impact, 0, 1) : 1 - fx.life / fx.max;
  g.save();
  g.globalAlpha *= charging ? .22 * Math.min(1, stage * 4) : .23 * (1 - stage);
  r(-18, 0, W + 36, H, techniqueShade[fx.id]);
  g.restore();
  if (charging) return;
  const x = fx.x - cam, floor = fx.y;
  const age = fx.max - fx.life;
  for (const [clip, delay, duration, dx, dy, size, flip] of techniqueBursts[fx.id]) {
    const beat = (age - delay) / duration;
    if (beat < 0 || beat >= 1) continue;
    spellClip(clip, beat, x + dx, floor + dy, size, Math.min(.91, (1 - beat) * 2), flip);
  }
}

function shatteredWard(x, y, fx, t, soft) {
  const [edge, color, tip] = techniqueInk[fx.id];
  const pieces = soft ? 7 : 13;
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

function drawTechniqueRelease(x, y, fx, t) {
  const [, color, tip] = techniqueInk[fx.id];
  const foot = fx.y, age = fx.max - fx.life;
  const stretch = 1 - (1 - t) ** 2;
  switch (fx.id) {
    case 0:
      for (const [dx, delay, width] of [[0,0,110],[-112,.18,58],[117,.31,62]]) {
        const fire = (age - delay) / .66;
        if (fire < 0 || fire > 1) continue;
        const px = x + dx, height = 126 * (1 - fire) ** 1.35;
        path([[px-width*.52,foot], [px-width*.31,foot-height*.28], [px-width*.15,foot-height],
          [px+width*.11,foot-height*.24], [px+width*.29,foot-height*.60], [px+width*.55,foot]], "#bf482e");
        fxLine([[px-width*.42,foot-2],[px-width*.18,foot-height*.18],[px+7,foot-2],[px+width*.37,foot-height*.28]], tip, 4);
        for (let i = 0; i < 12; i++) {
          const py = foot - (48 + i * 53 % 119) * Math.sin(fire * Math.PI);
          r(px + (i - 5.5) * (3 + 15 * fire),py,2 + i % 3,4 + i % 3,i % 3 ? color : tip);
        }
      }
      break;
    case 1:
      for (const side of [-1, 1]) {
        const cx = x + side * (7 + stretch * 164);
        // The clock splits into two time slices before the sweep fades.
        g.save();
        g.beginPath();
        g.rect(side < 0 ? cx - 125 : cx, y - 105, 125, 210);
        g.clip();
        stoppedClock(cx, y, 1, 1.03);
        g.restore();
        fxLine([[cx+side*15,y-98],[cx,y-61],[cx+side*9,y-19],[cx-side*8,y+16],[cx,y+90]], color, 4);
        for (let i = 0; i < 6; i++) {
          const width = 35 + i % 3 * 19;
          r(cx + side * i * 11 - (side < 0 ? width : 0), y - 82 + i * 31, width, i % 3 ? 2 : 4, tip);
        }
      }
      break;
    case 2:
      for (const side of [-1, 1]) {
        const panX = x + side * 108, panY = foot - 61 + Math.min(1, age / .28) * 55;
        const span = 39 + stretch * 37;
        path([[panX-span,panY],[panX+span,panY],[panX+span*.62,panY+9],[panX-span*.59,panY+9]], "#a16a37");
        r(panX-span,panY,span*2,4,tip);
        for (let i = 0; i < 6; i++) {
          const size = 9 + i * 4, px = panX + (i - 2.5) * (12 + 18 * stretch);
          const py = foot - 11 - Math.sin(Math.min(1, age / .93) * Math.PI) * (40 + 10 * (i % 3));
          r(px-size*.5,py,size,3,i % 2 ? color : tip);
          r(px-2,py-3,4,9,color);
        }
      }
      fxLine([[x-196,foot-10],[x-108,foot-10],[x-20,foot-11],[x,foot-22],[x+20,foot-11],[x+196,foot-10]], color, 2);
      break;
    case 3:
      for (let i = 0; i < 18; i++) {
        const side = i % 2 ? 1 : -1;
        const px = x + side * (26 + stretch * (101 + i * 17 % 138));
        const py = y + (i % 6 - 2.5) * 26 + stretch * (i % 3 - 1) * 43;
        const tint = latticeTiles[i % latticeTiles.length];
        path([[px-8,py-11],[px+9,py-11],[px+14,py],[px+4,py+11],[px-12,py+6]], "#563c85");
        fxLine([[px-8,py-11],[px+9,py-11],[px+14,py]], tint, 3);
        r(px-3,py-2,9,3,tip);
        if (t < .37) fxLine([[px-side*68,py+19],[px-side*29,py+3],[px-side*9,py]], tint, 2);
      }
      break;
    case 4:
      g.save();
      g.globalAlpha *= .82;
      risingSeed(x, y, 1 - t * .20, 1.05, foot);
      g.restore();
      for (let i = 0; i < 21; i++) {
        const side = i % 2 ? -1 : 1;
        const px = x + side * (24 + stretch * (62 + i * 21 % 111));
        const py = foot - (38 + i * 29 % 138) - stretch * (27 + i % 5 * 9);
        const size = 4 + i % 5;
        path([[px,py],[px+side*size,py-size-3],[px+side*size*2,py-size],[px+side*size,py+3]], i % 3 ? color : tip);
      }
      break;
    case 5:
      for (let i = 0; i < 21; i++) {
        const pace = clamp(age * .81 - i * .025, 0, 1);
        const px = x + fx.dir * ((i * 53 % 189) - 98 + pace * 344);
        const py = y + (i % 5 - 2) * 18 - pace * (101 + i % 3 * 24) + Math.sin(pace * 9 + i) * 18;
        const flap = .37 + Math.abs(Math.sin(age * 26 + i)) * .63;
        fxLine([[px-fx.dir*51,py+15],[px-fx.dir*18,py+5],[px,py]], i % 3 ? color : tip, 2);
        techniqueGlyph(5, px, py, i % 4 ? .36 : .61, 1, fx.dir < 0, flap);
      }
      break;
    case 6:
      plateCollision(x, y, 1 - t * .07, 1, foot);
      for (let i = 0; i < 22; i++) {
        const dx = (i - 10.5) * 12 * stretch;
        const rise = Math.min(1, age / .9), py = foot - (65 + i * 37 % 124) * 4 * rise * (1 - rise);
        const size = 4 + i % 7;
        path([[x+dx,py],[x+dx+size,py-size*.5],[x+dx+size*.4,py+size],[x+dx-size,py+size*.5]], i % 4 ? "#a45e4d" : tip);
      }
      break;
    case 7:
      for (const side of [-1, 1]) {
        seismicTrace(x, foot - 14, age * 496, side, 181, 11, tip);
        seismicTrace(x, foot - 42, (age - .16) * 325, side, 153, 21, "#ffae91");
        seismicTrace(x, foot - 62, (age - .33) * 206, side, 113, 13, "#ec8f70");
      }
      if (t < .55) techniqueGlyph(7, x, y, 1.28 + t * .42, 1 - t / .55);
      break;
  }
}

function drawWardTechniques() {
  const soft = quietCombat();
  for (const boss of foes) {
    const cast = boss.wardCast;
    if (!cast) continue;
    const progress = clamp(cast.elapsed / wardChoreography[cast.id].impact, 0, 1);
    const x = boss.x - cam, y = boss.y - boss.height * .5;
    const scale = Math.min(1.14, boss.height / 175);
    const alpha = Math.min(.88, .24 + progress);
    g.save();
    g.globalAlpha *= alpha;
    if (soft) techniqueGlyph(cast.id, x, y, .98 * scale);
    else techniquePoses[cast.id](x, y, progress, scale, boss.y, cast.dir);
    g.restore();
  }
  for (const fx of effects) {
    if (fx.type !== "wardImpact") continue;
    const x = fx.x - cam, y = fx.y - fx.height * .51;
    const t = 1 - fx.life / fx.max;
    const [, color] = techniqueInk[fx.id];
    g.save();
    g.globalAlpha *= (1 - t) ** 1.2;
    if (!soft) drawTechniqueRelease(x, y, fx, t);
    else fxArc(x, fx.y - 2, 22 + t * 105, 4 + t * 7, color, 0, Math.PI * 2, 2);
    shatteredWard(x, y, fx, t, soft);
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
