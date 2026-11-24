"use strict";

// Individual pixel poses share a 144×152 cell and an anchor at (72, 112).
const scienceRows = {
  gravity: 0, collapse: 1, foam: 2, sunRoots: 3, shadeRoots: 4, pWave: 5,
  sWave: 6, shearStop: 7, moon: 8, reflection: 9, mirror: 10,
  sunshaft: 11, foamWake: 12, fracture: 13,
};

function scienceStamp(clip, frame, x, y, scaleX, scaleY, flip = false, alpha = 1) {
  const sheet = assets.scienceFX;
  if (!sheet.naturalWidth) return false;
  if (x + 72 * scaleX < 0 || x - 72 * scaleX > W || alpha <= 0) return true;
  g.save();
  g.globalAlpha *= alpha;
  drawFieldCell(sheet, (frame & 7) * 144, scienceRows[clip] * 152, 144, 152, 72, 112,
    x, y, scaleX, scaleY, flip);
  g.restore();
  return true;
}

function drawGravityWake(zone, t, warning) {
  const quiet = quietCombat();
  const scale = warning && !quiet ? .80 + t * .64 : 1.60;
  const pose = quiet ? 2 : Math.floor(t * (warning ? 8 : 16));
  scienceStamp("gravity", pose, zone.x - cam, GROUND - 55, scale, scale, false,
    quiet ? .34 : warning ? .19 + t * .33 : .83);
}

function drawScienceBack() {
  for (const e of foes) {
    const field = e.warn > 0 && e.plan?.move.signature === "gravity" && e.plan.strikes[0];
    if (field) drawGravityWake(field, bossWarningProgress(e), true);
  }
  const quiet = quietCombat();
  for (const zone of bossZones) {
    if (zone.timer < 0) continue;
    const t = zone.timer / zone.linger;
    if (zone.field) drawGravityWake(zone, t, false);
    if (quiet) continue;
    const x = zone.x - cam, frame = Math.min(7, Math.floor(t * 8));
    const fade = Math.min(1, (1 - t) * 2.7);
    if (zone.collapse) {
      scienceStamp("fracture", frame, x, GROUND, 1.82, 1, false, fade * .94);
    } else if (zone.water) {
      scienceStamp("foamWake", frame, x, GROUND, 1.13, zone.height / 68, false, fade * .80);
    } else if (zone.lit) {
      scienceStamp("sunshaft", frame, x, GROUND, .96, 1.54, false, fade * .82);
    }
  }
  for (const e of effects) if (e.type === "scienceFx") drawScienceResidue(e);
}

function drawScienceStrike(zone, frame, opacity) {
  const {radius, height} = zone;
  const x = zone.x - cam, quiet = quietCombat();
  if (zone.wave) {
    return scienceStamp(zone.wave === "P" ? "pWave" : "sWave", frame, x, GROUND,
      radius / 65, height / 47, zone.dir < 0, opacity);
  }
  const clip = zone.collapse ? "collapse" : zone.water ? "foam"
    : zone.lit === true ? "sunRoots" : zone.lit === false ? "shadeRoots" : null;
  if (!clip) return false;
  const rise = zone.collapse ? 98 : zone.water ? 90 : 81;
  return scienceStamp(clip, frame, x, GROUND, radius / 64, height / rise,
    false, opacity * (quiet ? .74 : 1));
}

function drawScienceResidue(e) {
  const age = e.max - e.life - (e.delay || 0);
  if (age < 0 || (e.plan && !foes.some(boss => !boss.dying && boss.plan === e.plan))) return;
  const t = clamp(age / (e.max - (e.delay || 0)), 0, 1);
  const quiet = quietCombat();
  const alpha = Math.min(1, (1 - t) * 2.4) * (quiet ? .63 : 1);
  const frame = quiet ? 2 : Math.min(7, Math.floor(t * 8));
  const reflected = e.clip === "reflection" && !quiet;
  const scale = reflected ? 1.55 : 1;
  if (reflected) scienceStamp("fracture", frame, e.x - cam, e.y + 1, 1.65, .80, false, alpha * .70);
  scienceStamp(e.clip, frame, e.x - cam, e.y, scale, scale, e.dir < 0, alpha);
}

function drawMoonBolt(s, frame) {
  const dir = Math.sign(s.vx);
  const {x, y, span} = s.mirror;
  if (!quietCombat()) {
    // Sample the two actual legs, leaving a V-shaped wake through the reflection.
    const travel = (s.x - x) * dir;
    for (let i = 10; i > 0; i--) {
      const position = travel - i * 8;
      if (position < -span) continue;
      const scale = .42 + (10 - i) * .060;
      scienceStamp("moon", frame + i, x + position * dir - cam, y - Math.abs(position),
        scale, scale, dir < 0, .77 - i * .058);
    }
  }
  return scienceStamp("moon", quietCombat() ? 2 : frame, s.x - cam, s.y, 1.15, 1.14, dir < 0);
}
