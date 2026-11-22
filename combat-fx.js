"use strict";

// Atlas rows 0–7 are scholar spells, 8–11 are hostile shots, then claw, dash, impact and rift.
const spellLight = ["#ffac59", "#65ddff", "#ffdc76", "#de99ff", "#a6ee73", "#ffe684", "#ffa15b", "#ffc876"];
const FX_CLAW = 12,
  FX_DASH = 13,
  FX_BURST = 14,
  FX_RIFT = 15;

function combatEvent(type, x, y, seconds, details = {}) {
  effects.push({ type, x, y, max: seconds, life: seconds, ...details });
}

const disciplineSeals = ["orbitSeal", "reactionSeal", "livingSeal", "strataSeal"];
// Contact is anchored at the victim's chest. Mendel's roots instead track its feet for the full slow.
const scholarHits = [
  { clip: "gravity", size: 1.16, dy: 2 },
  { clip: "space", size: 1.19, dy: 4 },
  { clip: "restore", size: 1.08, dy: 12 },
  { clip: "prism", size: .89, dy: 2 },
  null,
  { clip: "wings", size: 1.02, dy: 0 },
  { clip: "gravity", size: .6, dy: 16 },
  { clip: "gravity", size: .72, dy: 9 },
];
const bossHits = ["field", "flask", "thicket", "meteor"];
const bossWakes = ["orbit", "bubbles", "vine", "ember"];
const scholarWakes = ["apple", "orbit", "bubbles", "prism", "vine", "wings"];

// The atlas keeps the pivot of each simulation. A narrow particle cell can have its pivot outside the cell.
function spellClip(name, t, x, y, scale = 1, alpha = 1, flip = false) {
  const victory = Object.hasOwn(victoryClips, name);
  const sheet = victory ? assets.victoryFX : assets.spellFX;
  if (!sheet.naturalWidth || alpha <= 0) return;
  const [row, w, h, px, py, cols, frames] = (victory ? victoryClips : spellClips)[name];
  const pose = reducedMotion.matches ? .29 : clamp(t, 0, 1);
  const i = Math.min(frames - 1, Math.floor(pose * frames));
  const left = x - (flip ? w - px : px) * scale;
  if (left > W || left + w * scale < 0 || y - py * scale > H) return;
  g.save();
  g.globalAlpha *= Math.min(1, alpha);
  g.translate(Math.round(x), Math.round(y));
  if (flip) g.scale(-1, 1);
  g.drawImage(sheet, (i % cols) * w, row + Math.floor(i / cols) * h, w, h,
    -Math.round(px * scale), -Math.round(py * scale), Math.round(w * scale), Math.round(h * scale));
  g.restore();
}

// Leaves, molecules and orbital rings use the local flight direction so even a turning swarm keeps its wake.
function spellWake(s) {
  if (!s.trail?.length || reducedMotion.matches || s.x - cam < -140 || s.x - cam > W + 140) return;
  const motif = (s.team ? bossWakes : scholarWakes)[s.id];
  const color = s.team ? subjects[s.id].color : spellLight[s.id];
  g.save();
  let front = s;
  for (let i = 0; i < s.trail.length; i++) {
    const p = s.trail[i], dx = front.x - p.x, dy = front.y - p.y;
    front = p;
    const length = Math.hypot(dx, dy);
    if (length < 1) continue;
    const strength = 1 - i / 9, x = p.x - cam;
    const phase = (s.age - i / 25) * 17 + (s.lane || 0) * 2;
    const bend = Math.sin(phase) * (3 + i);
    g.save();
    g.translate(Math.round(x), Math.round(p.y));
    g.transform(dx / length, dy / length, -dy / length, dx / length, 0, 0);
    g.globalAlpha = strength * (motif === "prism" ? .64 : .86);
    if (motif === "orbit") {
      if (!(i % 2)) fxArc(0, 0, 3 + strength * 2, 6 + strength * 10, color, .35, 5.8, 2);
      r(-2, bend, 4, 2, "#e1fbff");
    } else if (motif === "bubbles") {
      const size = 2 + (i % 3) * 1.5;
      fxArc(0, bend, size, size, color);
      r(-1, bend - size, 2, 2, "#fff5df");
      if (i % 2) r(2, -bend * .8, 2, 3, color);
    } else if (motif === "prism") {
      fxLine([[0, bend], [length, Math.sin(phase + .68) * (2 + i)]], color, 2);
      path([[-3, bend], [0, bend - 3], [3, bend], [0, bend + 3]], "#fff0ff");
    } else if (motif === "vine" || motif === "apple") {
      const side = i % 2 ? -1 : 1;
      const leaf = motif === "apple" ? "#b9d674" : color;
      fxLine([[0, bend], [length, bend * .7]], color, 2);
      path([[0, bend], [-3, bend + 4 * side], [-9, bend + 7 * side], [-6, bend + side]], leaf);
    } else if (motif === "wings") {
      star(0, bend + (i % 2 ? 6 : -6), 2 + strength, i % 2 ? "#a9f4d2" : color);
    } else {
      fxLine([[3, bend], [-8 - strength * 4, bend * 1.4]], i % 2 ? "#ff9354" : "#ffcc73", 2);
      r(-6, -bend, 2, 3, "#ffe3a1");
    }
    if (s.rift && i % 2) {
      path([[0, -11], [3, -7], [0, -3], [-2, -7]], "#e0adff");
    }
    g.restore();
  }
  g.restore();
}

function bossCharge(e) {
  const id = e.plan.move.id, t = bossWarningProgress(e);
  const x = e.x - cam, dir = e.plan.dir, scale = e.height / 116;
  const still = reducedMotion.matches;
  if (e.kind === 4) spellClip("riftCharge", t, x + dir * 66, e.y - e.height * .62, 1.17, .92);
  // Collect small copies of the actual attack core around the hand just before release.
  const handX = x + dir * e.half * .72, handY = e.y - (id === 2 ? 18 : e.height * .40);
  combatSprite(8 + id, still ? 2 : Math.floor(t * 8), handX, handY, scale * (.22 + .28 * t), dir < 0, .52 + .42 * t);
  if (still) return;
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3 + t * 2, dist = 9 + 28 * (1 - t);
    star(handX + Math.cos(a) * dist, handY + Math.sin(a) * dist * .7, 1 + 2 * t, subjects[id].color);
  }
}

function combatSprite(row, frame, x, y, scale = 1, flip = false, alpha = 1, scaleY = scale) {
  const sheet = assets.combat;
  if (x < -200 * scale || x > W + 200 * scale || alpha <= 0) return;
  g.save();
  g.globalAlpha *= Math.min(1, alpha);
  g.translate(Math.round(x), Math.round(y));
  g.scale(flip ? -scale : scale, scaleY);
  if (sheet.naturalWidth) {
    g.drawImage(sheet, (frame & 7) * 208, row * 176, 208, 176, -124, -113, 208, 176);
  } else {
    // Keep attacks visible even during the initial texture download.
    star(0, 0, row < 8 ? 14 : 9, row < 8 ? spellLight[row] : "#ffe0b4");
  }
  g.restore();
}

function fxLine(points, color, width = 1) {
  g.beginPath();
  for (let i = 0; i < points.length; i++) {
    const [x, y] = points[i];
    if (i) g.lineTo(Math.round(x), Math.round(y));
    else g.moveTo(Math.round(x), Math.round(y));
  }
  g.lineWidth = width;
  g.strokeStyle = color;
  g.stroke();
}

function fxArc(x, y, rx, ry, color, start = 0, end = Math.PI * 2, width = 2) {
  g.beginPath();
  g.ellipse(Math.round(x), Math.round(y), Math.max(1, rx), Math.max(1, ry), 0, start, end);
  g.lineWidth = width;
  g.strokeStyle = color;
  g.stroke();
}

function splinters(x, y, t, radius, color, count = 9, lift = 0.68) {
  const travel = 1 - (1 - t) ** 2;
  for (let i = 0; i < count; i++) {
    const a = i * 2.4 - 1.18,
      dx = Math.cos(a),
      dy = Math.sin(a);
    const distance = radius * (0.6 + (i % 4) * 0.12) * travel;
    const px = x + dx * distance,
      py = y + dy * distance * lift + t * t * 9;
    const size = (1 - t) * (i % 2 ? 3 : 4) + 0.8;
    path(
      [
        [px + dx * size * 2, py + dy * size],
        [px - dy * size, py + dx * size],
        [px - dx * size * 2.8, py - dy * size * 1.8],
        [px + dy * size, py - dx * size],
      ],
      color,
    );
    r(px, py, size, size, "#fff6cb");
  }
}

function warningMark(x, t, color) {
  if (x < -45 || x > W + 45) return;
  const y = GROUND - 2,
    spread = 21;
  g.save();
  g.globalAlpha = 0.15;
  path(
    [
      [x - 11, y - 87],
      [x + 11, y - 87],
      [x + spread, y - 2],
      [x - spread, y - 2],
    ],
    "#ff8d72",
  );
  g.globalAlpha = 0.87;
  fxArc(x, y, spread, 6, "#482c36", 0, Math.PI * 2, 5);
  fxArc(x, y, spread, 6, "#ffa078", 0, Math.PI * 2, 3);
  fxArc(x, y, spread - 3, 4, color);
  for (const side of [-1, 1]) {
    const edge = x + side * spread;
    fxLine(
      [
        [edge + side * 6, y - 5],
        [edge, y],
        [edge + side * 6, y + 4],
      ],
      "#fff0bc",
      2,
    );
  }
  g.globalAlpha = 0.95;
  const drop = reducedMotion.matches ? 0 : 11 * (1 - t);
  for (const dy of [20, 30]) {
    const arrow = [
      [x - 5, y - dy - drop],
      [x, y - dy + 5 - drop],
      [x + 5, y - dy - drop],
    ];
    fxLine(arrow, "#553142", 5);
    fxLine(arrow, "#fff1c3", 2);
  }
  g.restore();
}

function entranceLight(x, y, time) {
  if (x < -52 || x > W + 52) return;
  g.save();
  fxArc(x, y - 2, 40, 8, "#946b43", 0, Math.PI * 2, 3);
  fxArc(x, y - 3, 39, 8, "#ffe3a0");
  for (const side of [-1, 1]) {
    const a = time * .78 + (side < 0 ? Math.PI : 0);
    fxArc(x, y - 39, 28, 40, "#a6dce8", a, a + 1.8, 3);
    fxArc(x, y - 39, 31, 43, "#fff2ba", a + .14, a + 1.38);
    const tipX = x + 31 * Math.cos(a + 1.38), tipY = y - 39 + 43 * Math.sin(a + 1.38);
    star(tipX, tipY, 3, "#fff7cf");
  }
  for (let i = 0; i < 6; i++) {
    const t = (time * .39 + i / 6) % 1;
    g.globalAlpha = Math.sin(Math.PI * t) * .85;
    star(x + Math.sin(i * 2.4 + t * 2) * 23, y - 8 - t * 58, 2, "#fff5ba");
  }
  g.restore();
}

function warningPath(e) {
  const { move, dir, start, end, strikes } = e.plan;
  const color = e.kind === 4 ? "#edadff" : subjects[move.id].color;
  const t = bossWarningProgress(e);
  for (const zone of strikes) drawBossZone({ ...zone, id: move.id, rift: e.kind === 4 }, true, t);
  if (move.dash) {
    warningLane(start - cam - dir * e.half * .56, end - cam + dir * e.half * .56, GROUND - 18, color, t);
    return;
  }
  const lanes = new Set();
  for (const shot of move.bolts || []) {
    const aim = shot.reverse ? -dir : dir;
    const key = shot.height * aim;
    if (lanes.has(key)) continue;
    lanes.add(key);
    const x = e.x + aim * e.half * .72;
    warningLane(x - cam, (aim < 0 ? 0 : worldWidth) - cam, GROUND - shot.height, color, t);
  }
}

function warningLane(from, to, y, color, t) {
  const side = Math.sign(to - from);
  const first = Math.max(-14, Math.min(from, to));
  const last = Math.min(W + 14, Math.max(from, to));
  if (!side || first >= last) return;
  g.save();
  g.globalAlpha = .61 + t * .2;
  r(first, y - 14, last - first, 29, "#7c3b4938");
  fxLine([[first, y], [last, y]], "#402535", 5);
  fxLine([[first, y], [last, y]], color, 2);
  for (let x = first + 19; x < last - 7; x += 42) {
    const px = x + (reducedMotion.matches ? 0 : side * t * 10);
    const arrow = [[px - side * 6, y - 5], [px, y], [px - side * 6, y + 5]];
    fxLine(arrow, "#251e31", 5);
    fxLine(arrow, "#fff0c1", 2);
  }
  g.restore();
}

function drawBossZone(zone, warning, t) {
  const x = zone.x - cam, y = GROUND, width = zone.radius * 2;
  if (x + zone.radius < -10 || x - zone.radius > W + 10) return;
  const left = x - zone.radius, right = x + zone.radius, top = y - zone.height;
  const color = zone.rift ? "#e493ff" : subjects[zone.id].color;
  g.save();
  if (warning) {
    r(left, top, width, zone.height, "#e5686235");
    r(left, top, 1, zone.height, "#f3a68d");
    r(right - 1, top, 1, zone.height, "#f3a68d");
    r(left, y - 9, width, 10, "#612b3c");
    for (let dx = 2; dx < width - 2; dx += 9) r(left + dx, y - 6, 5, 3, "#ffb28e");
    if (zone.height > 45) {
      warningMark(x, t, color);
      const arrow = [[x - 6, top + 8], [x, top + 15], [x + 6, top + 8]];
      fxLine(arrow, "#41283d", 5);
      fxLine(arrow, "#ffe0b7", 2);
    }
    if ((zone.id === 1 || zone.id === 3) && zone.height > 100 && t > .65) {
      const falling = (t - .65) / .35;
      const targetY = reducedMotion.matches ? top + 14 : top + (zone.height - 15) * falling ** 2;
      combatSprite(8 + zone.id, 2, x, targetY, .66 + zone.radius / 200, false, .62);
    }
    g.restore();
    return;
  }
  const age = zone.timer;
  const impact = clamp(age / .24, 0, 1);
  const fade = Math.min(1, (zone.linger - age) * 9);
  if (zone.height > 42) {
    g.globalAlpha = fade * .27;
    r(left, top, width, zone.height, color);
    g.globalAlpha = fade * .9;
    // The column's edges are the hit edges. The drawn matter inside varies by subject.
    r(left, top, 3, zone.height, color);
    r(right - 3, top, 3, zone.height, color);
    for (let i = 0; i < 4; i++) {
      const cx = left + (i + .5) * width / 4;
      const cy = top + ((i * 43 + (reducedMotion.matches ? 12 : impact * 90)) % zone.height);
      combatSprite(8 + zone.id, 3 + i, cx, cy, .64 + zone.radius / 180, i % 2 > 0, .88);
    }
    spellClip(bossHits[zone.id], impact, x, y - zone.height * (zone.id === 2 ? .17 : .42), Math.min(1.3, .68 + zone.radius / 168), .67);
  } else {
    g.globalAlpha = fade * .54;
    r(left, top, width, zone.height, color);
    for (let i = 0; i < width; i += 18) {
      const rise = 7 + (i * 13 % 15);
      if (zone.id === 1) fxArc(left + i, y - 6 - rise / 3, 4, 3 + rise / 6, color);
      else path([[left + i, y - 3], [left + i + 3, y - rise], [left + i + 8, y - 8]], color);
    }
  }
  g.globalAlpha = fade;
  r(left, y - 4, width, 4, color);
  const release = zone.rift ? "riftBurst" : bossHits[zone.id];
  spellClip(release, impact, x, y - 4, Math.min(1.65, .7 + zone.radius / 120), fade);
  if (!reducedMotion.matches && age < .3) splinters(x, y - 9, impact, zone.radius, color, 12);
  g.restore();
}

function groundWave(e, x, y, t) {
  const core = e.id === 7,
    fault = e.id === 6,
    color = spellLight[e.id];
  const radius = core ? 230 : fault ? 60 : 65;
  const reach = radius * (1 - (1 - t) ** 2.5);
  g.save();
  g.globalAlpha = Math.min(1, (1 - t) * 3);
  if (core) {
    // Two fronts travel from the epicentre to the outer rim of the damaging wave.
    spellClip("core", t, x, y - 2, .66, .70);
    for (const side of [-1, 1]) spellClip("quake", t, x + side * reach * .62, y, .86, .93, side < 0);
  } else if (fault) {
    spellClip("fault", t, x, y, .82);
  } else if (e.id === 0) {
    spellClip("gravity", t, x, y - 4, 1.48);
  } else {
    spellClip("reactionSeal", t, x, y - 2, 1.04, .87);
  }
  fxArc(x, y, reach, 4 + reach * 0.065, color, 0, Math.PI * 2, core ? 3 : 2);
  fxArc(x, y - 2, reach * 0.84, 3 + reach * 0.035, "#fff3bd", Math.PI, Math.PI * 2);
  for (const side of [-1, 1]) {
    const edge = x + side * reach;
    const zig = [
      [x, y],
      [x + side * reach * 0.24, y - 3],
      [x + side * reach * 0.4, y + 2],
      [x + side * reach * 0.61, y - 4],
      [x + side * reach * 0.73, y],
      [edge, y - 3],
    ];
    fxLine(zig, "#67384b", 5);
    fxLine(zig, color, 2);
    const spike = (1 - t) * (core ? 36 : 21);
    path(
      [
        [edge - side * 19, y],
        [edge - side * 6, y - spike * 0.38],
        [edge + side * 4, y - spike],
        [edge + side * 2, y - 4],
        [edge + side * 9, y - 1],
      ],
      color,
    );
  }
  const frame = Math.min(7, Math.floor(t * 8));
  if (core) {
    combatSprite(7, frame, x, y - 35 - 12 * Math.sin(t * Math.PI), 0.93, false, Math.min(1, (1 - t) * 2));
  } else if (fault) {
    combatSprite(6, frame, x, y + 1, 1, false, Math.min(1, (1 - t) * 3));
  } else {
    combatSprite(FX_BURST, frame, x, y - 11, 0.83, false, 0.85, 0.56);
  }
  if (!reducedMotion.matches) splinters(x, y - 8, t, core ? 115 : 70, color, core ? 16 : 10, 1);
  g.restore();
}

function drawCombatGround() {
  for (const s of shots) spellWake(s);
  for (const e of foes) {
    if (e.slow <= 0 || e.dying) continue;
    const pose = reducedMotion.matches ? 2 : Math.floor(clock * 10);
    const x = e.x - cam,
      width = e.boss ? 0.48 : 0.35,
      alpha = Math.min(1, e.slow * 4);
    spellClip("roots", 1 - e.slow / 2.2, x, e.y, e.boss ? 1.55 : .98, alpha);
    combatSprite(4, pose, x + 12, e.y - 7, width, false, alpha);
    combatSprite(4, pose + 3, x - 12, e.y - 5, width, true, alpha);
  }
  for (const e of effects) {
    const x = e.x - cam,
      y = e.y,
      t = 1 - e.life / e.max;
    if (x < -260 || x > W + 260) continue;
    if (e.type === "wave") groundWave(e, x, y, t);
    if (e.type === "bossRelease") {
      const flip = e.dir < 0, alpha = Math.min(1, e.life * 6);
      if (e.rift) spellClip("riftBurst", t * .7, x, y - 95, .7 * e.scale, alpha * .8);
      spellClip(disciplineSeals[e.id], .48 + .5 * t, x, y, e.scale + .24 * t, alpha * .78);
      // Recoil happens at the caster. Falling attacks keep a separate marker at the landing site.
      if (!reducedMotion.matches) splinters(x + e.dir * 27, y - (e.id === 2 ? 15 : 46), t, 48, subjects[e.id].color);
      if (e.id === 0) spellClip("space", t, x + e.dir * 34, y - 30, .72, alpha, flip);
    }
    if (e.type === "bossPhaseShift") {
      const color = subjects[e.kind].color;
      const crest = y - e.height * .45;
      g.save();
      g.globalAlpha = .77 * (1 - t);
      fxArc(x, crest, 39 + t * 142, 24 + t * 78, color, 0, Math.PI * 2, 3);
      fxArc(x, crest, 31 + t * 111, 17 + t * 59, "#fff1d3");
      if (!reducedMotion.matches) splinters(x, crest, t, 147, color, 20);
      g.restore();
    }
    if (e.type === "discovery") {
      const lift = 20 * (1 - (1 - t) ** 2), opacity = Math.min(1, (1 - t) * 3);
      combatSprite(e.id, Math.floor(t * 8), x, y - 78 - lift, .55, false, opacity);
      g.save();
      g.globalAlpha = opacity;
      fxArc(x, y - 2, 24 + 33 * t, 5 + 5 * t, spellLight[e.id]);
      if (!reducedMotion.matches) splinters(x, y - 67, t, 67, spellLight[e.id], 12);
      g.restore();
    }
    if (e.type === "summon") {
      const glow = Math.min(1, e.life * 3),
        feet = y - 10 * t,
        c = spellLight[e.id];
      spellClip(disciplineSeals[e.id >> 1], t, x, feet, .64 + .28 * Math.min(1, t * 4), glow);
      g.save();
      g.globalAlpha = 0.84 * glow;
      fxArc(x, feet, 26 + 10 * t, 6, c);
      fxArc(x, feet - 2, 20 + 9 * t, 4, "#fff1c5", Math.PI, Math.PI * 2);
      drawActor("scholar" + e.id, 4 + Math.min(3, Math.floor(t * 4)), x, feet, 74, e.flip);
      g.restore();
      if (t < .74) {
        const pulse = Math.sin(t / .74 * Math.PI), dir = e.flip ? -1 : 1;
        combatSprite(e.id, Math.floor(t * 10), x + dir * (20 + 9 * t), feet - 27,
          .26 + .12 * pulse, e.flip, pulse * .92);
      }
    }
    if (["jump", "doubleJump", "land", "heal"].includes(e.type)) {
      const double = e.type === "doubleJump",
        heal = e.type === "heal",
        land = e.type === "land";
      const radius = (double ? 53 : heal ? 36 : land ? 42 : 29) * (0.34 + 0.66 * t);
      if (heal) spellClip("restore", t, player.x - cam, player.y, 1.22, Math.min(1, e.life * 7));
      if (land || e.type === "jump") spellClip("dust", t, x, y, land ? .81 : .55, (1 - t) * .76);
      if (double) spellClip("wings", t, x, y - 2, .58, (1 - t) * .82);
      g.save();
      g.globalAlpha = (1 - t) * 0.9;
      fxArc(x, y - (heal ? 30 * t : 0), radius, 3 + radius * 0.12, heal ? "#ffe58b" : "#b7f3ff");
      if (double || heal) fxArc(x, y - 5 - 10 * t, radius * 0.74, 5, "#fff4c6", Math.PI, Math.PI * 2);
      if (heal)
        for (const side of [-1, 1]) {
          const px = x + side * (18 + t * 9),
            py = y - 12 - 34 * t - 5 * side;
          r(px - 1, py - 4, 3, 9, "#fff0a4");
          r(px - 4, py - 1, 9, 3, "#fff0a4");
        }
      if (!reducedMotion.matches)
        for (const side of [-1, 1]) {
          const edge = x + side * radius;
          path(
            [
              [edge - side * 10, y],
              [edge, y - 3],
              [edge + side * 9, y - 9 - t * 7],
              [edge + side * 3, y - 1],
            ],
            heal ? "#ffe58b" : "#b3e4f2",
          );
        }
      g.restore();
    }
  }
  for (const e of foes) if (e.boss && e.warn > 0) {
    const t = bossWarningProgress(e);
    spellClip(disciplineSeals[e.plan.move.id], t, e.x - cam, e.y - 2, e.height / 145 + t * .28, .5 + .35 * t);
  }
}

function drawCombatShot(s) {
  const x = s.x - cam,
    y = s.y,
    age = s.age || 0,
    staticPose = reducedMotion.matches;
  const frame = staticPose ? 2 : Math.floor(age * 16) + (s.lane || 0) * 2;
  if (x < -170 || x > W + 170) return;
  if (s.team) {
    if (s.rift) combatSprite(FX_RIFT, frame, x, y, s.id === 1 || s.id === 3 ? 0.51 : 0.6, false, 0.65);
    combatSprite(8 + s.id, frame, x, y, s.scale ?? 1, s.vx < 0);
    return;
  }
  const flip = s.vx ? s.vx < 0 : !s.area && s.dir < 0;
  if (s.id === 6) {
    const rise = clamp(1 - (GROUND - 25 - y) / 100, 0, 1);
    g.save();
    g.globalAlpha = 0.43 + rise * 0.32;
    fxArc(x, GROUND - 3, 12 + rise * 21, 3 + rise * 2, "#ffd289");
    combatSprite(6, 1, x, GROUND - 3, 0.49, false, 0.8, 0.22 + rise * 0.24);
    g.restore();
    return;
  }
  if (s.id === 5 && !staticPose && s.trail) {
    for (let i = Math.min(5, s.trail.length - 1); i >= 1; i -= 2) {
      const p = s.trail[i];
      combatSprite(
        5,
        frame + i,
        p.x - cam,
        p.y + Math.sin(age * 9 + i) * 14,
        i > 2 ? 0.42 : 0.61,
        p.flip,
        i > 2 ? 0.48 : 0.72,
      );
    }
  }
  combatSprite(s.id, frame, x, y, 1, flip);
}

function drawCombatAccent(e) {
  const x = e.x - cam,
    y = e.y,
    t = clamp(1 - e.life / e.max, 0, 1);
  const frame = Math.min(7, Math.floor(t * 8)),
    fade = Math.min(1, (1 - t) * 2.5);
  if (x < -180 || x > W + 180) return;
  if (e.type === "slash") {
    const reach = 69 + 22 * Math.sin(Math.PI * t);
    spellClip("talons", t, x + e.dir * 33, y - 6, 1.08, fade, e.dir < 0);
    combatSprite(FX_CLAW, frame, x + e.dir * reach, y - 3, 1, e.dir < 0, fade);
  } else if (e.type === "impact" || e.type === "hurt" || e.type === "enemyImpact") {
    const hurt = e.type === "hurt",
      enemy = e.type === "enemyImpact";
    const color = hurt ? "#ff997e" : enemy ? subjects[e.id].color : spellLight[e.id] || "#ffd282";
    const scale = hurt ? 0.68 : enemy ? 0.75 : e.id >= 0 ? 0.89 : 0.71;
    g.save();
    g.globalAlpha = fade;
    if (enemy && e.rift) spellClip("riftBurst", t, x, y, .57, .88);
    if (!enemy && e.id === 1) {
      fxArc(x, y, 8 + 26 * t, 18 + 31 * t, "#85e8ff", 0, Math.PI * 2, 3);
      fxArc(x, y, 5 + 14 * t, 12 + 28 * t, "#f3ffff");
    } else if (!enemy && e.id === 3) {
      for (const side of [-1, 1]) combatSprite(3, frame, x + side * (9 + 40 * t), y - 12 * t, 0.5, side < 0);
    } else if (!enemy && e.id === 5) {
      for (const side of [-1, 1])
        combatSprite(5, frame + side, x + side * (8 + 30 * t), y - 34 * t, 0.43, side < 0);
    }
    g.restore();
    // Keep the common contact flash short so the individual material reads on the follow-through.
    combatSprite(FX_BURST, frame, x, y, scale * (enemy || e.id >= 0 ? .63 : .87), false, fade * Math.max(0, 1 - t * 2));
    if (enemy) {
      const size = [.92, 1.3, .64, .82][e.id];
      spellClip(bossHits[e.id], t, x, y + (e.id === 0 ? 12 : 0), size, fade, e.id === 2 && e.dir > 0);
    } else if (e.id >= 0) {
      const contact = scholarHits[e.id];
      if (contact) spellClip(contact.clip, t, x, y + contact.dy, contact.size, fade, e.dir < 0);
      if (e.id === 7) fxArc(x, y, 7 + 31 * t, 5 + 13 * t, "#ffd586", Math.PI * .15, Math.PI * 1.82);
    } else {
      spellClip("gravity", t, x, y, hurt ? .85 : 1.03, fade);
    }
    if (!reducedMotion.matches) splinters(x, y, t, scale * 75, color, 8);
  } else if (e.type === "defeat") {
    combatSprite(FX_BURST, frame, x, y, .62, false, fade);
    if (!reducedMotion.matches) splinters(x, y, t, 53, "#edc878", 8);
  }
}
