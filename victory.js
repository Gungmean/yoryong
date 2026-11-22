"use strict";

const bossClearEffects = [
  { clip: "victoryPhysics", color: "#7bdeff", bright: "#dcfbff", sound: "impactOrbit", scale: 1.30 },
  { clip: "victoryChemistry", color: "#f899ee", bright: "#ffeafa", sound: "impactFoam", scale: 1.75 },
  { clip: "victoryBiology", color: "#9fe4a3", bright: "#f0facc", sound: "impactVine", scale: 1.58 },
  { clip: "victoryEarth", color: "#ffb060", bright: "#fff1bc", sound: "impactMeteor", scale: 1.43 },
  { clip: "victoryRoof", color: "#d5a8ff", bright: "#fff2c8", sound: "impactRoof", scale: 1.62 },
];
const bossBurstAt = .39;

function beginBossClear(boss) {
  boss.clearDuration = reducedMotion.matches ? .7 : boss.kind === 4 ? 2.45 : 1.88;
  boss.dying = boss.clearDuration;
  boss.rush = null;
  shots = [];
  bossZones.length = 0;
  player.inv = boss.clearDuration + .15;
  if (!reducedMotion.matches) contactPause = .105;
}

function bossClearAge(boss) {
  return boss.clearDuration - boss.dying;
}

function advanceBossClear(boss, dt) {
  const age = bossClearAge(boss);
  const impactAt = boss.clearDuration < 1 ? .20 : bossBurstAt;
  if (age - dt >= impactAt || age < impactAt) return;
  const finale = boss.kind === 4;
  playEffect(bossClearEffects[boss.kind].sound, finale ? 1.10 : .90);
  if (!reducedMotion.matches) shake = Math.max(shake, finale ? 11 : 7);
  player.celebrate = .70;
}

function bossClearLight(boss, x, y, profile, age) {
  const opening = clamp(age / bossBurstAt, 0, 1);
  const rays = boss.kind === 4 ? 12 : 8;
  g.save();
  g.globalAlpha = opening * .68;
  for (let i = 0; i < rays; i++) {
    const angle = i * Math.PI * 2 / rays + opening * 1.22;
    const radius = 21 + (1 - opening) * 77;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius * .59;
    fxLine([[px, py], [x + (px - x) * .56, y + (py - y) * .56]], profile.color, 2);
    star(px, py, 2 + opening * 2, profile.bright);
  }
  fxArc(x, y, 11 + opening * 18, 9 + opening * 13, profile.bright);
  g.restore();
}

function drawBossClearBack(boss) {
  if (reducedMotion.matches) return;
  const profile = bossClearEffects[boss.kind], age = bossClearAge(boss), x = boss.x - cam;
  const after = age - bossBurstAt;
  const darkness = Math.min(.26, age * 1.45, boss.dying * 1.04);
  g.save();
  g.globalAlpha = darkness;
  r(-16, 0, W + 32, H, "#151828");
  g.restore();
  if (after < 0) return;
  const phase = clamp(after / (boss.kind === 4 ? 1.76 : 1.34), 0, 1);
  if (boss.kind === 1) {
    spellClip(profile.clip, phase, x, boss.y - 40, profile.scale);
  } else if (boss.kind === 2) {
    spellClip(profile.clip, phase, x - 67, boss.y, profile.scale * .9, .92, true);
    spellClip(profile.clip, phase, x + 64, boss.y, profile.scale * .82);
    spellClip(profile.clip, phase, x, boss.y, profile.scale * 1.15);
  } else {
    spellClip(profile.clip, phase, x, boss.y, profile.scale);
  }
}

function victoryFragments(kind, x, foot, height, profile, time) {
  const count = kind === 4 ? 52 : 32;
  const crest = foot - height * .53;
  for (let i = 0; i < count; i++) {
    const age = time - (i % 7) * .034;
    const life = .57 + (i % 11) * .065;
    if (age < 0 || age >= life) continue;
    const fade = 1 - age / life;
    const angle = i * 2.39996;
    const direction = Math.cos(angle);
    const speed = 84 + i % 12 * 16;
    const px = x + direction * speed * age;
    const py = Math.min(foot - 2, crest - (44 + i % 13 * 10) * age + (kind === 3 ? 232 : 69) * age * age);
    const size = 2 + (i % 5) * fade;
    g.globalAlpha = Math.min(1, fade * 2.3);
    if (kind === 1) {
      fxArc(px, py, size + age * 3, size + age * 2, profile.color, 0, Math.PI * 2, 2);
      r(px - size * .35, py - size * .62, 2, 2, profile.bright);
    } else if (kind === 2) {
      path([[px - size, py + size], [px - size / 2, py - size], [px + size, py - size / 2], [px + size * .9, py + size / 2]], i % 3 ? profile.color : "#ffb7a7");
      r(px, py - size, 2, 2, profile.bright);
    } else if (kind === 3) {
      path([[px - size, py + size / 2], [px - size / 2, py - size], [px + size / 2, py - size * .65], [px + size, py + size]], "#85453e");
      fxLine([[px - size, py + size / 2], [px - size / 2, py - size], [px + size / 2, py - size * .65]], profile.color, 2);
    } else {
      fxLine([[px - direction * size * 3, py - size], [px - direction * size, py + size], [px, py]], profile.color, 2);
      star(px, py, size * .69, profile.bright);
    }
  }
  g.globalAlpha = 1;
}

function victorySeal(kind, x, y, phase, fade, moving) {
  const final = kind === 4, name = final ? "globe" : "earned-" + subjectIcons[kind];
  const halo = final ? "#ffd386" : bossClearEffects[kind].bright;
  icon(name);
  const badge = final ? schoolTiles.globe : iconTiles[name];
  const size = final ? 65 : 49;
  g.save();
  g.globalAlpha = fade;
  fxArc(x, y, size * .60, size * .60, "#242039", 0, Math.PI * 2, 4);
  fxArc(x, y, size * .60, size * .60, halo);
  if (final && moving) {
    for (let i = 0; i < 4; i++) {
      const angle = i * Math.PI / 2 + phase * 3.5;
      const radius = 55 + (1 - phase) * 32;
      const sealX = x + Math.cos(angle) * radius, sealY = y + Math.sin(angle) * radius * .82;
      const seal = "earned-" + subjectIcons[i];
      icon(seal);
      g.drawImage(iconTiles[seal], Math.round(sealX - 10), Math.round(sealY - 10), 20, 20);
    }
  }
  if (badge?.width) g.drawImage(badge, Math.round(x - size / 2), Math.round(y - size / 2), size, size);
  star(x + size * .42, y - size * .46, 3, halo);
  g.restore();
}

function drawBossClearFront(boss) {
  const profile = bossClearEffects[boss.kind], age = bossClearAge(boss), after = age - bossBurstAt;
  // Keep the fanfare in view with a narrow portrait camera or a long-distance final hit.
  const margin = Math.min(W / 2, boss.kind === 4 ? 64 : 38);
  const x = clamp(boss.x - cam, margin, W - margin);
  if (reducedMotion.matches) {
    if (age > .15) victorySeal(boss.kind, x, boss.y - boss.height * .61, 1, 1, false);
    return;
  }
  const origin = boss.x - cam;
  const crest = boss.y - boss.height * .53;
  if (after < 0) {
    bossClearLight(boss, origin, crest, profile, age);
    return;
  }
  const snap = clamp(1 - after / .16, 0, 1);
  const ripple = clamp(after / .70, 0, 1);
  g.save();
  if (snap > 0) {
    combatSprite(FX_BURST, Math.floor(after * 46), origin, crest, 1.24 + boss.height / 170, false, snap * .88);
  }
  if (ripple < 1) {
    g.globalAlpha = (1 - ripple) * .79;
    const radius = 25 + (1 - (1 - ripple) ** 2) * (boss.kind === 4 ? 334 : 230);
    fxArc(origin, boss.y - 2, radius, 4 + radius * .095, profile.color, 0, Math.PI * 2, 4);
    fxArc(origin, boss.y - 2, radius * .89, 3 + radius * .061, profile.bright, 0, Math.PI * 2, 2);
  }
  victoryFragments(boss.kind, origin, boss.y, boss.height, profile, after);
  g.restore();
  if (after > .31) {
    const rise = clamp((after - .31) / .52, 0, 1);
    const fade = Math.min(1, rise * 3, boss.dying / .18);
    victorySeal(boss.kind, x, crest + 18 - (1 - (1 - rise) ** 2) * 47, rise, fade, true);
  }
}
