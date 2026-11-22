"use strict";

const scholarCourses = [
  { floor: 2, room: 8, name: "사과의 궤도", hint: "레일 발판이 가까워질 때 뛰어오르세요.",
    steps: [[245,282,77], [360,249,75,"rail",31], [472,220,66],
      [642,280,76], [745,245,69,"rail",32,2], [851,215,64]] },
  { floor: 2, room: 9, name: "빛의 승강기", hint: "승강기에 올라 높이가 맞을 때 건너가세요.",
    steps: [[240,279,74], [353,253,70,"lift",23], [460,215,64],
      [636,283,70], [748,248,71,"lift",21,1.8], [860,214,65]] },
  { floor: 3, room: 6, name: "증기의 징검다리", hint: "줄무늬가 뜨면 곧 발판이 꺼져요.",
    steps: [[237,278,73], [348,248,69,"steam",0,1], [456,221,66,"steam",0,.2],
      [638,280,73], [745,248,72,"steam",0,.8], [852,212,65]] },
  { floor: 3, room: 3, name: "반응의 박자", hint: "밝은 발판을 밟고 색이 바뀌기 전에 뛰세요.",
    steps: [[248,282,72], [356,251,70,"steam",0,1.8], [476,218,66],
      [650,276,72,"steam",0,.35], [754,244,63,"steam",0,1.45], [859,211,62]] },
  { floor: 4, room: 5, name: "완두콩 새싹", hint: "연두색 잎을 밟으면 위로 튀어 올라요.",
    steps: [[241,278,76], [356,254,68,"sprout"], [473,202,67],
      [643,277,74], [744,254,70,"sprout"], [858,203,66]] },
  { floor: 4, room: 2, name: "바람을 타는 씨앗", hint: "새싹에서 튀어 오른 뒤 공중 점프로 방향을 맞추세요.",
    steps: [[237,278,75,"sprout"], [367,220,69], [468,196,66],
      [642,278,67,"sprout"], [778,225,68], [869,199,61]] },
  { floor: 5, room: 6, name: "갈라지는 지층", hint: "금이 간 돌은 오래 밟으면 부서져요.",
    steps: [[239,281,74], [353,248,70,"shale"], [474,215,68,"shale"],
      [647,278,75,"shale"], [748,244,63,"shale"], [856,210,67]] },
  { floor: 5, room: 1, name: "단층의 여진", hint: "돌이 무너지기 전에 이어지는 선반으로 뛰세요.",
    steps: [[246,278,73,"shale"], [361,245,65,"shale"], [480,210,65],
      [646,278,72], [770,245,66,"shale"], [865,210,59,"shale"]] },
];
const courseStart = 182;
const courseRest = { left: 516, x: 554, right: 590, type: "checkpoint" };
const courseExit = 978;
const courseGoal = {x: 941, y: 195, w: 79, kind: "goal"};
const courseSign = {x:117, name:"시련 안내", type:"courseHint"};
let courseRun = null, savedCourse = null;

function beginCourse() {
  const id = scene.type === "classroom"
    ? scholarCourses.findIndex(c => c.floor === scene.floor && c.room === scene.room) : -1;
  if (id < 0) {
    courseRun = null;
    savedCourse = null;
    return;
  }
  const reached = savedCourse === id;
  if (savedCourse !== null) player.x = reached ? courseRest.x : sideStairs.classroom[0].x;
  savedCourse = null;
  const definition = scholarCourses[id];
  courseRun = {
    id, definition, reached, time: 0, support: null,
    platforms: definition.steps.concat([[courseGoal.x, courseGoal.y, courseGoal.w, courseGoal.kind]])
      .map(([x,y,w,kind = "shelf",range = 0,phase = 0], index) =>
        ({x,y,w,kind,range,phase,homeX:x,homeY:y,oldY:y,active:true,warning:false,breakAt:0,index})),
  };
  advanceCourse(0);
}

function courseHasFloor(x) {
  return !courseRun || x <= courseStart || (x >= courseRest.left && x <= courseRest.right) || x >= courseExit;
}

function advanceCourse(dt) {
  if (!courseRun) return;
  const run = courseRun;
  run.time += dt;
  for (const p of run.platforms) {
    const before = p.x;
    p.oldY = p.y;
    if (p.kind === "rail") p.x = p.homeX + Math.sin(run.time * 1.55 + p.phase) * p.range;
    if (p.kind === "lift") p.y = p.homeY + Math.sin(run.time * 1.65 + p.phase) * p.range;
    if (p.kind === "steam") {
      const cycle = (run.time + p.phase) % 4.1;
      p.active = cycle < 3;
      p.warning = p.active && cycle > 2.35;
    }
    if (p.kind === "shale" && p.breakAt) {
      p.active = run.time < p.breakAt;
      if (run.time >= p.breakAt + 1.1) {
        p.breakAt = 0;
        p.active = true;
      }
      p.warning = p.active && !!p.breakAt;
    }
    if (run.support === p && p.active) {
      player.x += p.x - before;
      player.y += p.y - p.oldY;
      p.oldY = p.y;
    }
  }
}

function courseLanded(platform) {
  const run = courseRun;
  run.support = platform || null;
  if (platform?.kind === "shale" && !platform.breakAt) platform.breakAt = run.time + .68;
  if (platform?.kind === "sprout") {
    player.vy = -298;
    player.jumps = 1;
    player.coyote = 0;
    player.grounded = false;
    run.support = null;
    spark(player.x, player.y, "#c9eb94", 8);
    combatEvent("doubleJump", player.x, player.y, .36);
    playEffect("doubleJump");
  }
}

function checkCourseRest() {
  if (courseRun.reached || player.y > GROUND || player.x < courseRest.left || player.x > courseRest.right) return;
  courseRun.reached = true;
  playEffect("select");
  notify("중간 지점에 도착했어요. 떨어지면 여기서 다시 시작해요.");
  syncQuest();
  save();
}

function retryCourse() {
  const x = courseRun.reached ? courseRest.x : sideStairs.classroom[0].x + 46;
  courseRun.support = null;
  Object.assign(player, {
    x, y: GROUND, vx: 0, vy: 0, jumps: 0, grounded: true, coyote: .09,
    dash: 0, dashCD: 0, drop: 0, buffer: 0, recover: .32,
  });
  cam = cameraTarget();
  near = findNear();
  playEffect("softStep");
  notify(courseRun.reached ? "중간 지점에서 다시 시작!" : "교실 앞에서 다시 시작!");
}
