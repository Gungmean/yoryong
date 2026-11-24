"use strict";

const bossStats = [
  { height: 153, half: 58, hp: 560, oldHp: 160 },
  { height: 163, half: 55, hp: 630, oldHp: 178 },
  { height: 180, half: 67, hp: 700, oldHp: 196 },
  { height: 158, half: 81, hp: 760, oldHp: 214 },
  { height: 219, half: 82, hp: 1260, oldHp: 345 },
];

// Projectile heights are measured from the floor. Zones use the same x/width for
// their preview, active effect and damage so a safe gap stays safe.
const bolt = (height, delay = 0, reverse = false) => ({ height, delay, reverse });
const patch = (offset, radius, height, delay = 0, linger = .24) => ({ offset, radius, height, delay, linger });
const bossMoves = [
  [
    { name: "궤도 연사", hint: "두 발을 뛰어넘기", id: 0, lead: .95, bolts: [bolt(25), bolt(25, .24)] },
    { name: "반중력 궤도", hint: "바닥에 머물기", id: 0, lead: .92, bolts: [bolt(94), bolt(94, .27, true)] },
    { name: "중력핵 붕괴", hint: "핵에 가까울수록 끌려가요. 바깥으로 대시하세요", id: 0, lead: 1.30, signature: "gravity" },
    { name: "겹궤도", hint: "낮은 구체만 뛰어넘기", id: 0, lead: 1.0, bolts: [bolt(100), bolt(24, .3), bolt(100, .58)] },
  ],
  [
    { name: "시약 삼중 낙하", hint: "표식 사이로 이동", id: 1, lead: 1.08, zones: [patch(0, 27, 141), patch(-101, 27, 141, .20), patch(101, 27, 141, .20)] },
    { name: "플라스크 포말", hint: "거품을 뛰어넘기", id: 1, lead: .93, bolts: [bolt(29), bolt(29, .25, true)] },
    { name: "시약 연쇄 반응", hint: "물이 많이 생기는 곳에서 포말이 높게 솟아요", id: 1, lead: 1.42, signature: "reaction" },
    { name: "급격한 기화", hint: "좁은 분출구 사이에 서기", id: 1, lead: 1.05,
      zones: [patch(-62, 24, 107, 0, .33), patch(62, 24, 107, 0, .33), patch(0, 30, 121, .60, .34)] },
  ],
  [
    { name: "덩굴 이중 파동", hint: "두 파동을 뛰어넘기", id: 2, lead: 1.0, bolts: [bolt(15), bolt(15, .28)] },
    { name: "숲의 울타리", hint: "붉은 뿌리 표식 피하기", id: 2, lead: 1.12, zones: [patch(0, 48, 136), patch(146, 37, 136, .24), patch(-146, 37, 136, .24)] },
    { name: "빛과 그늘의 덩굴", hint: "돌진을 피한 뒤 그늘의 낮은 덩굴을 넘으세요", id: 2, lead: 1.36, dash: 320, signature: "light" },
    { name: "꽃가루 폭풍", hint: "윗바람은 바닥에서 피하기", id: 2, lead: .96, bolts: [bolt(99), bolt(99, .28), bolt(99, .56, true)] },
  ],
  [
    { name: "유성 삼각 낙하", hint: "낙하 표식 사이로 이동", id: 3, lead: 1.11, zones: [patch(0, 31, 173), patch(-114, 31, 173, .22), patch(114, 31, 173, .22)] },
    { name: "운석 등껍질 돌진", hint: "돌진을 뛰어넘기", id: 3, lead: 1.14, dash: 350 },
    { name: "외핵을 가르는 지진파", hint: "P파가 먼저 와요. 액체층에서는 S파가 멈춰요", id: 3, lead: 1.46, signature: "seismic" },
    { name: "운석 폭격", hint: "표식 사이의 빈 지대로 이동", id: 3, lead: 1.18, zones: [patch(0, 54, 187), patch(-167, 45, 187, .31), patch(167, 45, 187, .58)] },
  ],
  [
    { name: "망각의 파동", hint: "낮은 파동을 뛰어넘기", id: 0, lead: .98, bolts: [bolt(22), bolt(100, .25), bolt(22, .50)] },
    { name: "균열의 별비", hint: "빛 기둥이 없는 곳으로 이동", id: 3, lead: 1.15, zones: [patch(0, 40, 201), patch(-126, 35, 201, .21), patch(126, 35, 201, .21), patch(249, 29, 201, .44), patch(-249, 29, 201, .44)] },
    { name: "청룡 횡단", hint: "청룡이 덮칠 때 더블 점프", id: 2, lead: 1.18, dash: 395 },
    { name: "월광 반사", hint: "빛이 거울에서 같은 각도로 꺾여요. 두 경로를 피하세요", id: 0, lead: 1.45, signature: "mirror" },
    { name: "청룡의 삼중 숨결", hint: "가운데를 비우고 낮은 숨결은 뛰어넘으세요", id: 1, lead: 1.37,
      zones: [patch(0, 69, 192, 0, .39), patch(-110, 53, 31, .56, .43), patch(110, 53, 31, .56, .43),
        patch(0, 66, 211, 1.11, .40)] },
    { name: "학교를 삼키는 균열", hint: "가운데 표식을 벗어나기", id: 0, lead: 1.31, zones: [patch(0, 120, 218), patch(-221, 54, 106, .43), patch(221, 54, 106, .68)] },
  ],
];

const bossZones = [];
function bossPhase(e) {
  return e.hp <= e.max * .5 ? 2 : 1;
}
function bossWarningProgress(e) {
  return e.plan && e.warn > 0 ? 1 - e.warn / e.plan.move.lead : 0;
}
// A round uses each available move once. Between teaching the opening move
// and the next phase, spacing determines which remaining threat fits.
function chooseBossMove(e, phase) {
  const moves = bossMoves[e.kind];
  const opening = e.kind === 4 ? 3 : 2;
  const count = phase === 2 ? moves.length : opening;
  const phaseChanged = e.phase !== phase;
  if (phaseChanged || !e.remainingMoves?.length)
    e.remainingMoves = Array.from({ length: count }, (_, i) => i);
  const distance = Math.abs(player.x - e.x);
  const airborne = player.y < GROUND - 50;
  function fit(id) {
    const move = moves[id];
    if (id === e.lastMove) return -1;
    if (move.dash) return distance > 90 && distance < move.dash ? 4 : 0;
    if (move.bolts) return (move.bolts[0].height > 65) === airborne ? 3 : 1;
    return distance < 115 ? 4 : 2;
  }
  const index = phase === 2 && !e.usedSignature ? opening : phaseChanged ? 0
    : e.remainingMoves.reduce((best, id) => fit(id) > fit(best) ? id : best);
  e.remainingMoves = e.remainingMoves.filter(id => id !== index);
  e.phase = phase;
  e.lastMove = index;
  return moves[index];
}
function planBossMove(e) {
  const move = chooseBossMove(e, bossPhase(e));
  let dir = Math.sign(player.x - e.x) || e.dir;
  const limit = bossStats[e.kind].half;
  if (move.dash && Math.abs(clamp(e.x + dir * move.dash, limit, worldWidth - limit) - e.x) < 120) dir *= -1;
  const end = move.dash ? clamp(e.x + dir * move.dash, limit, worldWidth - limit) : e.x;
  const plan = {move, dir, start:e.x, end, strikes:[]};
  plan.strikes = move.signature ? planScienceAttack(plan) : (move.zones || []).map(zone => ({...zone, x:player.x + zone.offset}));
  plan.strikes = plan.strikes.filter(zone => zone.x + zone.radius >= 17 && zone.x - zone.radius <= worldWidth - 17);
  const beats = [...new Set(plan.strikes.map(zone => zone.delay))].sort((a,b) => a-b);
  if (beats.length > 1) for (const zone of plan.strikes) zone.beat = beats.indexOf(zone.delay) + 1;
  return plan;
}

function planScienceAttack(plan) {
  switch (plan.move.signature) {
    case "gravity": {
      const x = clamp(player.x, 119, worldWidth - 119);
      return [
        {...patch(0, 112, 95, 0, 1.08), x, field: true},
        {...patch(0, 51, 147, 1.08, .32), x, collapse: true, marker: "핵 붕괴"},
      ];
    }
    case "reaction": {
      // 2 H₂ + O₂ → 2 H₂O. The earlier exhausted reactant fixes the yield.
      const center = clamp(player.x, 146, worldWidth - 146);
      return [[4,1], [6,2], [2,3]].map(([hydrogen, oxygen], i) => {
        const water = 2 * Math.min(hydrogen / 2, oxygen);
        const x = center + plan.dir * (i - 1) * 102;
        return {...patch(0, 39, 14 + water * 9, i * .31, .82), x, water,
          marker:`H₂ ${hydrogen} · O₂ ${oxygen}`};
      });
    }
    case "light":
      return [.22, .52, .81].map((fraction, i) => {
        const lit = i !== 1;
        const x = plan.start + fraction * (plan.end - plan.start);
        return {...patch(0, 28, lit ? 115 : 30, .33 + i * .23, .39), x, lit,
          marker: lit ? "빛" : "그늘"};
      });
    case "seismic": {
      const roomAhead = plan.dir > 0 ? worldWidth - plan.start : plan.start;
      if (roomAhead < 470) plan.dir *= -1;
      const boundary = 186;
      const shearSpeed = 235;
      plan.liquidX = plan.start + plan.dir * boundary;
      plan.liquidEnd = plan.start + plan.dir * 464;
      plan.shearStopAt = boundary / shearSpeed;
      return [58, 132, 214, 291, 367, 437].flatMap(distance => {
        const x = plan.start + plan.dir * distance;
        const throughLiquid = distance > boundary;
        const pTime = Math.min(boundary, distance) / 510 + Math.max(0, distance - boundary) / 374;
        const p = {...patch(0, 31, 32, pTime, .13), x, wave:"P", marker:throughLiquid ? "P" : "P→S"};
        return throughLiquid ? [p] : [p, {...patch(0, 31, 32, distance / shearSpeed, .23), x, wave:"S", marker:"S"}];
      });
    }
    case "mirror": {
      const x = clamp(player.x + plan.dir * 30, 171, worldWidth - 171);
      plan.mirror = {x, y:GROUND - 18, span:154};
      return [];
    }
  }
}

function gravityAcceleration(p, x) {
  const dx = x - p.x, dy = GROUND - 60 - (p.y - 22);
  const radius = Math.max(38, Math.hypot(dx, dy));
  // The core has a finite radius. Outside it the force follows 1/r².
  return 930 * (70 / radius) ** 2 * dx / radius;
}

function gravityDrift(p, dt, reading) {
  const field = bossZones.find(zone => zone.field && zone.timer >= 0);
  if (!field || p.dash > 0 || reading) return 0;
  return clamp((p.gravityVX + gravityAcceleration(p, field.x) * dt) * Math.exp(-dt * 6), -115, 115);
}

function launchBossBolts(e, dt) {
  for (const pending of e.bolts) {
    pending.remaining -= dt;
    if (pending.remaining > 0) continue;
    const { height, reverse } = pending.bolt;
    const { id, dir } = pending;
    const aim = reverse ? -dir : dir;
    const speed = [230, 205, 212, 220][id];
    playEffect(bossBoltSounds[id]);
    shots.push({
      team: 1, rift: e.kind === 4, id, x: e.x + aim * bossStats[e.kind].half * .72,
      y: GROUND - height, vx: aim * speed, vy: 0, rx: 24, ry: 15,
      life: 4.8, dmg: e.kind === 4 ? 16 : 12,
    });
  }
  e.bolts = e.bolts.filter(pending => pending.remaining > 0);
}

function releaseBossMove(e) {
  const { move, dir, start, end, strikes, mirror } = e.plan;
  if (move.signature) e.usedSignature = true;
  e.action = .47;
  e.dir = dir;
  combatEvent("bossRelease", e.x, e.y, .48, { id: move.id, dir, rift: e.kind === 4, scale: e.height / 120 });
  for (const entry of move.bolts || []) e.bolts.push({ bolt: entry, dir, id: move.id, remaining: entry.delay });
  if (mirror) {
    const speed = 248;
    shots.push({team:1, rift:true, id:move.id, mirror, x:mirror.x - dir * mirror.span, y:mirror.y - mirror.span,
      vx:dir * speed, vy:speed, rx:16, ry:11, life:2 * mirror.span / speed, dmg:16});
    playEffect(bossBoltSounds[move.id]);
  }
  if (e.plan.shearStopAt) {
    const delay = e.plan.shearStopAt;
    combatEvent("scienceFx", e.plan.liquidX, GROUND, delay + .34,
      {clip:"shearStop", delay, dir, plan:e.plan});
  }
  for (const zone of strikes) {
    bossZones.push({
      ...zone, dir, id: move.id, rift: e.kind === 4, dmg: e.kind === 4 ? 19 : 14,
      timer: -zone.delay, hit: false, struck: false,
    });
  }
  if (move.dash) {
    e.rush = { start, end, elapsed: 0, duration: .65, hit: false, id: move.id };
    playEffect("bossRush");
  }
  if (!quietCombat() && move.dash) shake = Math.max(shake, e.kind === 4 ? 6 : 4);
}

function stepBoss(e, dt) {
  e.wardBreak = Math.max(0, (e.wardBreak || 0) - dt);
  if (e.wardCast) return;
  launchBossBolts(e, dt);
  if (e.rush) {
    const rush = e.rush, before = e.x;
    rush.elapsed += dt;
    const t = Math.min(1, rush.elapsed / rush.duration);
    e.x = rush.start + (rush.end - rush.start) * (t * t * (3 - 2 * t));
    const reach = bossStats[e.kind].half * .56;
    if (!rush.hit && player.y > GROUND - 39 &&
        player.x > Math.min(before, e.x) - reach && player.x < Math.max(before, e.x) + reach) {
      rush.hit = true;
      hurt(e.kind === 4 ? 22 : 17);
    }
    if (t === 1) { e.rush = null; e.time = 1.13; }
    return;
  }
  if (e.warn > 0) {
    e.warn = Math.max(0, e.warn - dt);
    if (!e.warn) {
      releaseBossMove(e);
      const recovery = e.phase === 2 ? (e.kind === 4 ? 1.30 : 1.55) : 2.05;
      const lastStrike = e.plan.strikes.reduce((last, zone) => Math.max(last, zone.delay + zone.linger), 0);
      e.time = Math.max(recovery, lastStrike + .28);
    }
    return;
  }
  const dist = player.x - e.x;
  const reach = bossStats[e.kind].half;
  e.dir = Math.sign(dist) || e.dir;
  if (Math.abs(dist) > reach + 20 && e.slow <= 0)
    e.x = clamp(e.x + e.dir * (e.kind === 4 ? 42 : 27) * dt, reach, worldWidth - reach);
  if ((e.time -= dt) <= 0) {
    if (modal === "ward" || wardPrimed(e)) return;
    e.plan = planBossMove(e);
    e.dir = e.plan.dir;
    e.warn = e.plan.move.lead;
    playEffect(e.kind === 4 ? "bossWarningRoof" : "bossWarning");
  }
}

function stepBossZones(dt) {
  for (let i = bossZones.length - 1; i >= 0; i--) {
    const zone = bossZones[i];
    zone.timer += dt;
    if (zone.timer >= zone.linger) { bossZones.splice(i, 1); continue; }
    if (zone.timer < 0 || zone.field) continue;
    if (!zone.struck) {
      zone.struck = true;
      const strength = clamp(1.12 - Math.abs(zone.x - player.x) / 570, .38, 1);
      playEffect(zone.rift ? "impactRoof" : bossImpactSounds[zone.id], strength);
      if (!quietCombat() && zone.height > 40) shake = Math.max(shake, zone.rift || zone.collapse ? 7 : 4);
    }
    if (!zone.hit && !player.inv && Math.abs(player.x - zone.x) < zone.radius && player.y > GROUND - zone.height) {
      zone.hit = true;
      hurt(zone.dmg);
      if (modal && modal !== "ward") return;
    }
  }
}
