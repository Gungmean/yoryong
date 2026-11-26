"use strict";

const sciencePulseLength = .72;
const reactionSamples = [
  [[4, 3], [8, 3], [8, 1]],
  [[10, 3], [2, 4], [6, 2]],
  [[6, 1], [4, 5], [6, 4]],
];
const oxygenSamples = [
  [[9, 7], [7, 2], [4, 5]],
  [[8, 3], [10, 8], [6, 6]],
  [[6, 7], [9, 7], [8, 3]],
];
const stationNames = ["A", "B", "C"];

function scienceTrial(plan, entries, brief, explanation, delay, spacing = 94) {
  const margin = 44 + spacing * (entries.length - 1) / 2;
  const center = clamp(player.x, margin, worldWidth - margin);
  const stations = entries.map((entry, i) => ({
    ...entry, name: stationNames[i], x: center + (i - (entries.length - 1) / 2) * spacing,
  }));
  const answer = stations.find(station => station.safe);
  plan.trial = {stations, radius: 31, brief, explanation: answer.name + " · " + explanation, delay, phase: "prepare", charge: 0};
  return plan.trial;
}

function planScienceAttack(plan, round) {
  const i = round % 3;
  const reversed = round % 2 !== 0;
  switch (plan.move.signature) {
    case "gravity": {
      const reference = [32, 48, 64][i];
      const values = [2, 4].map((distance, j) => {
        const force = reference / distance ** 2;
        const safe = j === Math.floor(round / 2) % 2;
        const limit = force + (safe ? 1 : -1);
        return {label: distance + " m · 한계 " + limit + " N", distance, force, limit, safe: force <= limit};
      });
      if (reversed) values.reverse();
      const winner = values.find(value => value.safe);
      const trial = scienceTrial(plan, values, "1 m에서 " + reference + " N · 장치의 한계 이하인 칸",
        reference + " ÷ " + winner.distance + "² = " + winner.force + " N", 1.08, 132);
      // Distance labels are readings from the experiment's centre. The midpoint
      // represents 2 m and 4 m using a shared scale of 22 field units per metre.
      const first = trial.stations[0];
      const x = first.x + 22 * first.distance;
      return [
        {...patch(0, 112, 95, 0, 1.08), x, field: true, anchors: trial.stations, anchorRadius: trial.radius},
        {...patch(0, 51, 147, 1.08, .32), x, collapse: true},
      ];
    }
    case "reaction": {
      const target = [4, 6, 2][i];
      const entries = reactionSamples[i].map(([hydrogen, oxygen]) => {
        const water = 2 * Math.min(hydrogen / 2, oxygen);
        return {label: "H₂ " + hydrogen + " · O₂ " + oxygen, water, safe: water === target};
      });
      if (reversed) entries.reverse();
      const {stations} = scienceTrial(plan, entries, "2H₂ + O₂ → 2H₂O · 물 " + target + " mol을 만드는 냉각기로",
        "2H₂ + O₂ → 2H₂O · 물 " + target + " mol", .49);
      return stations.map(({x, water}) =>
        ({...patch(0, 37, 14 + water * 9, .49, .82), x, water}));
    }
    case "light": {
      const entries = oxygenSamples[i].map(([production, use]) => ({
        label: "광합성 " + production + " · 호흡 " + use, production, use, net: production - use,
      }));
      const max = Math.max(...entries.map(entry => entry.net));
      for (const entry of entries) entry.safe = entry.net === max;
      if (reversed) entries.reverse();
      const winner = entries.find(entry => entry.safe);
      const {stations} = scienceTrial(plan, entries, "같은 시간 · 순산소 방출량이 가장 큰 배양기로",
        "같은 시간 동안 " + winner.production + " − " + winner.use + " = " + winner.net, .74);
      return stations.map(({x, safe}) =>
        ({...patch(0, 31, safe ? 30 : 115, .74, .64), x, lit: !safe}));
    }
    case "seismic": {
      const onlyP = i !== 1;
      const entries = [
        {label: "고체", liquid: false, safe: !onlyP},
        {label: "액체", liquid: true, safe: onlyP},
      ];
      if (reversed) entries.reverse();
      const reading = onlyP ? "P파만" : "P파와 S파를 모두";
      const explanation = onlyP ? "액체에서는 P파만 전달" : "고체에서는 P파와 S파 모두 전달";
      const {stations, radius} = scienceTrial(plan, entries, reading + " 받는 계측기로",
        explanation, .62, 126);
      const liquid = stations.find(station => station.liquid);
      plan.liquidX = liquid.x - plan.dir * radius;
      plan.liquidEnd = liquid.x + plan.dir * radius;
      plan.shearStopAt = .62;
      return stations.flatMap(({x, liquid}) => {
        const front = {...patch(0, radius, 32, .18, .28), x, wave: "P"};
        return liquid ? [front] : [front, {...patch(0, radius, 32, .62, .38), x, wave: "S"}];
      });
    }
    case "mirror": {
      const angle = [45, 30, 60][i];
      const slope = 1 / Math.tan(angle * Math.PI / 180);
      const span = Math.min(144, 150 / slope);
      const speed = 340 / Math.hypot(1, slope);
      const x = clamp(player.x, 184, worldWidth - 184);
      plan.mirror = {x, y: GROUND - 18, span, slope, speed};
      const entries = [30, 45, 60].map(value => ({label: value + "°", safe: value === angle}));
      if (reversed) entries.reverse();
      scienceTrial(plan, entries, "법선 기준 입사각 " + angle + "° · 반사각에 맞춰진 수신기로",
        "반사각도 법선 기준 " + angle + "°", span / speed + .10);
      return [];
    }
  }
}

function beginSciencePulse(boss) {
  const {trial, move} = boss.plan;
  trial.phase = "armed";
  bossZones.push({boss, trial, id: move.id, timer: -trial.delay, linger: sciencePulseLength, dmg: 18});
}

function stepSciencePulse(zone) {
  const {boss, trial} = zone;
  const protectedByStation = trial.stations.some(station => station.safe && Math.abs(player.x - station.x) <= trial.radius);
  if (zone.timer >= zone.linger) {
    trial.passed = protectedByStation && !zone.hit;
    trial.phase = "result";
    if (trial.passed && !boss.scienceCleared) {
      boss.scienceCleared = true;
      playEffect("correct");
      save();
    }
    return;
  }
  trial.charge = zone.timer;
  if (zone.timer < 0) return;
  if (trial.phase !== "active") {
    trial.phase = "active";
    playEffect(bossImpactSounds[zone.id], .89);
    if (!quietCombat()) shake = Math.max(shake, 5);
  }
  if (!zone.hit && !protectedByStation && !player.inv) {
    const previousHp = hp;
    hurt(zone.dmg);
    zone.hit = hp < previousHp;
  }
}

function scienceWarning(trial) {
  if (trial.phase === "result") return (trial.passed ? "충격 차단 · " : "안전 칸 · ") + trial.explanation;
  if (trial.phase === "active") return "충격이 지나갈 때까지 칸을 지키세요";
  return trial.brief;
}

function drawScienceStations(trial, color, warningRatio) {
  const {phase, stations, radius} = trial;
  const picked = stations.find(station => Math.abs(player.x - station.x) <= radius);
  const pulse = phase === "active";
  if (pulse) {
    // The narrow floor strips mark where the room-wide surge is interrupted.
    const gap = stations.find(station => station.safe).x - cam;
    const left = Math.max(0, Math.min(W, gap - radius));
    const right = Math.max(0, Math.min(W, gap + radius));
    const height = quietCombat() ? 32 : 30 + Math.min(1, trial.charge / .28) * 117;
    r(0, 0, left, GROUND, "#7a424020");
    r(right, 0, W - right, GROUND, "#7a424020");
    r(0, GROUND - height, left, height, "#8c4b4736");
    r(right, GROUND - height, W - right, height, "#8c4b4736");
  }
  for (const station of stations) {
    const x = station.x - cam;
    const resolved = pulse || phase === "result";
    const tint = resolved ? station.safe ? "#a6ebcf" : "#eea18d" : color;
    if (x < -radius || x > W + radius) continue;
    const left = x - radius, width = radius * 2;
    r(left, GROUND + 1, width, 4, "#262638");
    r(left, GROUND + 1, width, station === picked ? 3 : 2, tint);
    r(left, GROUND - 5, 2, 7, tint);
    r(left + width - 2, GROUND - 5, 2, 7, tint);
    if (phase === "prepare") r(left, GROUND + 4, width * warningRatio, 1, "#ffefae");
    if (x < 5 || x > W - 5) continue;
    const lines = station.label.split(" · ");
    const plateWidth = 64, height = lines.length === 2 ? 30 : 17, top = GROUND - 111;
    clearLetteringUnder(x - plateWidth / 2, top, plateWidth, height);
    r(x - plateWidth / 2, top, plateWidth, height, "#272839");
    r(x - plateWidth / 2, top, plateWidth, 1, tint);
    word(station.name + " · " + lines[0], x, top + 9, 7, "#fff3dc");
    if (lines[1]) word(lines[1], x, top + 22, 7, "#fff3dc");
  }
}
