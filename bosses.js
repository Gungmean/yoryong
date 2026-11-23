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
    { name: "중력 우물", hint: "표식 밖으로 이동", id: 0, lead: 1.1, zones: [patch(0, 90, 117)] },
    { name: "겹궤도", hint: "낮은 구체만 뛰어넘기", id: 0, lead: 1.0, bolts: [bolt(100), bolt(24, .3), bolt(100, .58)] },
  ],
  [
    { name: "시약 삼중 낙하", hint: "표식 사이로 이동", id: 1, lead: 1.08, zones: [patch(0, 27, 141), patch(-101, 27, 141, .20), patch(101, 27, 141, .20)] },
    { name: "플라스크 포말", hint: "거품을 뛰어넘기", id: 1, lead: .93, bolts: [bolt(29), bolt(29, .25, true)] },
    { name: "부식 웅덩이", hint: "착지할 곳 확인", id: 1, lead: 1.05, zones: [patch(0, 75, 24, 0, 1.9)] },
    { name: "연쇄 기포 폭발", hint: "폭발 순서에 맞춰 이동", id: 1, lead: 1.08, zones: [patch(0, 37, 122), patch(95, 32, 122, .34), patch(-95, 32, 122, .64)] },
  ],
  [
    { name: "덩굴 이중 파동", hint: "두 파동을 뛰어넘기", id: 2, lead: 1.0, bolts: [bolt(15), bolt(15, .28)] },
    { name: "숲의 울타리", hint: "붉은 뿌리 표식 피하기", id: 2, lead: 1.12, zones: [patch(0, 48, 136), patch(146, 37, 136, .24), patch(-146, 37, 136, .24)] },
    { name: "나선숲 돌진", hint: "사슴이 달려올 때 점프", id: 2, lead: 1.12, dash: 315 },
    { name: "꽃가루 폭풍", hint: "윗바람은 바닥에서 피하기", id: 2, lead: .96, bolts: [bolt(99), bolt(99, .28), bolt(99, .56, true)] },
  ],
  [
    { name: "유성 삼각 낙하", hint: "낙하 표식 사이로 이동", id: 3, lead: 1.11, zones: [patch(0, 31, 173), patch(-114, 31, 173, .22), patch(114, 31, 173, .22)] },
    { name: "운석 등껍질 돌진", hint: "돌진을 뛰어넘기", id: 3, lead: 1.14, dash: 350 },
    { name: "이중 지층 파열", hint: "지면 균열 위에서 점프", id: 3, lead: 1.07, zones: [patch(-89, 83, 37), patch(89, 83, 37, .40)] },
    { name: "운석 폭격", hint: "표식 사이의 빈 지대로 이동", id: 3, lead: 1.18, zones: [patch(0, 54, 187), patch(-167, 45, 187, .31), patch(167, 45, 187, .58)] },
  ],
  [
    { name: "망각의 파동", hint: "낮은 파동을 뛰어넘기", id: 0, lead: .98, bolts: [bolt(22), bolt(100, .25), bolt(22, .50)] },
    { name: "균열의 별비", hint: "빛 기둥이 없는 곳으로 이동", id: 3, lead: 1.15, zones: [patch(0, 40, 201), patch(-126, 35, 201, .21), patch(126, 35, 201, .21), patch(249, 29, 201, .44), patch(-249, 29, 201, .44)] },
    { name: "청룡 횡단", hint: "청룡이 덮칠 때 더블 점프", id: 2, lead: 1.18, dash: 395 },
    { name: "잠식하는 균열", hint: "두 균열 사이에서 착지", id: 1, lead: 1.14, zones: [patch(-150, 89, 29, 0, 1.5), patch(150, 89, 29, .18, 1.5)] },
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
  const index = phaseChanged ? (phase === 2 ? opening : 0)
    : e.remainingMoves.reduce((best, id) => fit(id) > fit(best) ? id : best);
  e.remainingMoves.splice(e.remainingMoves.indexOf(index), 1);
  e.phase = phase;
  e.lastMove = index;
  return moves[index];
}
function planBossMove(e) {
  const move = chooseBossMove(e, bossPhase(e));
  const dir = Math.sign(player.x - e.x) || e.dir;
  const strikes = (move.zones || []).map(zone => ({
    ...zone, x: player.x + zone.offset,
  })).filter(zone => zone.x + zone.radius >= 17 && zone.x - zone.radius <= worldWidth - 17);
  const limit = bossStats[e.kind].half;
  const end = move.dash ? clamp(e.x + dir * move.dash, limit, worldWidth - limit) : e.x;
  return { move, dir, start: e.x, end, strikes };
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
      y: GROUND - height, vx: aim * speed, vy: 0, rx: 24, ry: 15, scale: 1.24,
      life: 4.8, dmg: e.kind === 4 ? 16 : 12,
    });
  }
  e.bolts = e.bolts.filter(pending => pending.remaining > 0);
}

function releaseBossMove(e) {
  const { move, dir, start, end, strikes } = e.plan;
  e.action = .47;
  e.dir = dir;
  combatEvent("bossRelease", e.x, e.y, .48, { id: move.id, dir, rift: e.kind === 4, scale: e.height / 120 });
  for (const entry of move.bolts || []) e.bolts.push({ bolt: entry, dir, id: move.id, remaining: entry.delay });
  for (const zone of strikes) {
    bossZones.push({
      ...zone, id: move.id, rift: e.kind === 4, dmg: e.kind === 4 ? 19 : 14,
      timer: -zone.delay, hit: false, struck: false,
    });
  }
  if (move.dash) {
    e.rush = { start, end, elapsed: 0, duration: .65, hit: false, id: move.id };
    playEffect("bossRush");
  }
  if (!reducedMotion.matches) shake = Math.max(shake, e.kind === 4 ? 6 : 4);
}

function stepBoss(e, dt) {
  e.wardBreak = Math.max(0, (e.wardBreak || 0) - dt);
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
    if (t === 1) { e.rush = null; e.time = 1.0; }
    return;
  }
  if (e.warn > 0) {
    e.warn = Math.max(0, e.warn - dt);
    if (!e.warn) {
      releaseBossMove(e);
      e.time = e.phase === 2 ? (e.kind === 4 ? 1.30 : 1.55) : 2.05;
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
    if (zone.timer < 0) continue;
    if (!zone.struck) {
      zone.struck = true;
      const strength = clamp(1.12 - Math.abs(zone.x - player.x) / 570, .38, 1);
      playEffect(zone.rift ? "impactRoof" : bossImpactSounds[zone.id], strength);
      if (!reducedMotion.matches) shake = Math.max(shake, zone.rift ? 7 : 5);
    }
    if (!zone.hit && !player.inv && Math.abs(player.x - zone.x) < zone.radius && player.y > GROUND - zone.height) {
      zone.hit = true;
      hurt(zone.dmg);
      if (modal && modal !== "ward") return;
    }
  }
}
