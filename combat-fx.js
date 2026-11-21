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
  const id = attackPattern(e),
    x = e.x - cam,
    t = 1 - e.warn / 0.85;
  const color = e.kind === 4 ? "#edb0ff" : subjects[id].color;
  if (id === 1 || id === 3) {
    const offsets = id === 3 ? [-51, 0, 51] : [0];
    for (const offset of offsets) warningMark(e.markedX - cam + offset, t, color);
  } else {
    const dir = player.x >= e.x ? 1 : -1,
      y = GROUND - (id === 2 ? 10 : 29);
    g.save();
    g.globalAlpha = 0.55 + 0.2 * t;
    const start = x + dir * 28;
    fxLine(
      [
        [start, y],
        [start + dir * 125, y],
      ],
      "#44334c",
      3,
    );
    fxLine(
      [
        [start, y],
        [start + dir * 125, y],
      ],
      color,
      1,
    );
    for (let i = 0; i < 3; i++) {
      const px = start + dir * (31 + i * 36 + (reducedMotion.matches ? 0 : t * 10));
      fxLine(
        [
          [px - dir * 5, y - 4],
          [px, y],
          [px - dir * 5, y + 4],
        ],
        color,
        2,
      );
    }
    fxArc(start, y, 10 + t * 5, 14 + t * 5, color);
    g.restore();
  }
}

function groundWave(e, x, y, t) {
  const core = e.id === 7,
    fault = e.id === 6,
    color = spellLight[e.id];
  const radius = core ? 230 : fault ? 60 : 65;
  const reach = radius * (1 - (1 - t) ** 2.5);
  g.save();
  g.globalAlpha = Math.min(1, (1 - t) * 3);
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
  for (const e of foes) {
    if (e.slow <= 0 || e.dying) continue;
    const pose = reducedMotion.matches ? 2 : Math.floor(clock * 10);
    const x = e.x - cam,
      width = e.boss ? 0.48 : 0.35,
      alpha = Math.min(1, e.slow * 4);
    combatSprite(4, pose, x + 12, e.y - 7, width, false, alpha);
    combatSprite(4, pose + 3, x - 12, e.y - 5, width, true, alpha);
  }
  for (const e of effects) {
    const x = e.x - cam,
      y = e.y,
      t = 1 - e.life / e.max;
    if (x < -260 || x > W + 260) continue;
    if (e.type === "wave") groundWave(e, x, y, t);
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
      g.save();
      g.globalAlpha = 0.84 * glow;
      fxArc(x, feet, 26 + 10 * t, 6, c);
      fxArc(x, feet - 2, 20 + 9 * t, 4, "#fff1c5", Math.PI, Math.PI * 2);
      drawActor("scholar" + e.id, 4 + Math.min(3, Math.floor(t * 4)), x, feet, 74, e.flip);
      g.restore();
    }
    if (["jump", "doubleJump", "land", "heal"].includes(e.type)) {
      const double = e.type === "doubleJump",
        heal = e.type === "heal",
        land = e.type === "land";
      const radius = (double ? 53 : heal ? 36 : land ? 42 : 29) * (0.34 + 0.66 * t);
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
  for (const e of foes) if (e.boss && e.warn > 0) warningPath(e);
  for (const s of shots) if (s.team && !s.vx) warningMark(s.x - cam, 1, subjects[s.id].color);
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
    combatSprite(8 + s.id, frame, x, y, 1, s.vx < 0);
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
    for (let i = s.trail.length - 1; i >= 1; i -= 2) {
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
    combatSprite(FX_CLAW, frame, x + e.dir * reach, y - 3, 1, e.dir < 0, fade);
  } else if (e.type === "impact" || e.type === "hurt" || e.type === "enemyImpact") {
    const hurt = e.type === "hurt",
      enemy = e.type === "enemyImpact";
    const color = hurt ? "#ff997e" : enemy ? subjects[e.id].color : spellLight[e.id] || "#ffd282";
    const scale = hurt ? 0.68 : enemy ? 0.75 : e.id >= 0 ? 0.89 : 0.71;
    g.save();
    g.globalAlpha = fade;
    if (enemy && e.rift) combatSprite(FX_RIFT, frame, x, y, 0.66);
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
    combatSprite(FX_BURST, frame, x, y, scale, false, fade * 0.93);
    if (!reducedMotion.matches) splinters(x, y, t, scale * 75, color, 8);
  } else if (e.type === "defeat") {
    const color = subjects[e.kind]?.color || "#edc878",
      scale = e.boss ? 1.45 : 0.62;
    if (e.boss) combatSprite(FX_RIFT, frame, x, y, scale * (0.46 + 0.55 * t), false, 0.67 * fade);
    combatSprite(FX_BURST, frame, x, y, scale, false, fade);
    if (!reducedMotion.matches) splinters(x, y, t, scale * 85, color, e.boss ? 18 : 8);
  }
}
