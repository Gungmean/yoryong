"use strict";

// Device locations and climbable surfaces follow the classroom furniture.
const scholarCourses = [
  {floor:2,room:8,name:"사과와 평형추", scholar:[528,222], stages:2,
    steps:[[416,290,74,"lift"],[516,222,116,"cabinet"],[815,280,80,"desk"]],
    devices:[[774,"나무 모형의 사과","apple"],[340,"평형 저울","balance"]],
    cues:["창가의 나무 모형에서 사과를 내려 받으세요.","사과를 왼쪽 저울에 올리세요."],
    finish:"저울 옆 승강기를 타고 책장 위로 올라가세요."},
  {floor:2,room:9,name:"창가의 빛 실험", scholar:[847], stages:1,
    steps:[[468,279,80,"desk"]],
    devices:[[312,"첫 번째 거울 돌리기","mirror"],[630,"두 번째 거울 돌리기","mirror"]],
    cues:["첫 거울로 빛을 다음 거울까지 보내세요.","두 번째 거울로 빛을 오른쪽 수광기에 보내세요."],
    finish:"빛을 따라 오른쪽 창가에서 아인슈타인과 대화하세요."},
  {floor:3,room:6,name:"밀폐 용기의 무게", scholar:[835], stages:2,
    steps:[[460,277,89,"desk"]],
    devices:[[244,"밀폐 용기 닫기","flask"],[657,"측정값 기록하기","gauge"]],
    cues:["왼쪽 실험대에서 투명 용기를 닫으세요.","표시등이 꺼지기 전에 오른쪽 기록계에서 ↑. 길면 회피 대시를 쓰세요."],
    finish:"용기 옆 기록을 들고 오른쪽의 라부아지에에게 가세요."},
  {floor:3,room:3,name:"뒤섞인 원소 카드", scholar:[370], stages:3,
    steps:[[440,279,82,"desk"]],
    devices:[[775,"He · 2번 카드","card"],[252,"O · 8번 카드","card"],[600,"Ne · 10번 카드","card"]],
    cues:["칠판의 2 → 8 → 10 순서대로 교실에서 원소 카드를 찾으세요."],
    finish:"카드를 맞췄어요. 교실 왼쪽의 멘델레예프에게 돌아가세요."},
  {floor:4,room:5,name:"창가의 완두", scholar:[775,199], stages:2,
    steps:[[752,279,76,"vine"],[824,241,68,"vine"],[761,199,100,"vine"]],
    devices:[[196,"싱크대에서 물 받기","sink"],[761,"완두 화분에 물 주기","plant"]],
    cues:["교실 앞 싱크대에서 물뿌리개를 채우세요.","창가의 완두 화분에 물을 주세요."],
    finish:"화분에서 올라온 덩굴의 넓은 잎을 밟고 올라가세요."},
  {floor:4,room:2,name:"창가의 새 관찰", scholar:[233], stages:1,
    steps:[[491,278,81,"desk"],[618,230,78,"spring"],[729,155,92,"perch"]],
    devices:[[745,"새의 부리 관찰하기","nest",155]],
    cues:["책상에서 큰 잎으로 뛰세요. 잎이 튕겨 올리면 위쪽 둥지에서 ↑를 누르세요."],
    finish:"관찰을 끝냈어요. 교실 앞쪽의 다윈에게 돌아가세요."},
  {floor:5,room:6,name:"맞물리는 두 대륙", scholar:[552], stages:1,
    devices:[[260,"남아메리카 지도 이동","mapCrank"],[826,"아프리카 지도 이동","mapCrank"]],
    steps:[[958,280,80,"desk"]],
    cues:["왼쪽 손잡이를 눌러 남아메리카를 중앙 눈금에 맞추세요.","오른쪽 손잡이로 아프리카를 움직여 해안선을 맞추세요."],
    finish:"맞닿은 대륙 지도 앞에서 베게너와 대화하세요."},
  {floor:5,room:1,name:"지진계 두드리기", scholar:[876], stages:2,
    devices:[[286,"첫 번째 진동판 두드리기","drum"],[685,"위쪽 진동판 두드리기","drum",235]],
    steps:[[541,277,84,"desk"],[669,235,109,"rack"]],
    cues:["첫 진동판 옆에서 기본 공격 A로 신호를 보내세요.","책상과 선반을 밟고 올라 위쪽 진동판을 A로 두드리세요."],
    finish:"두 파형을 기록했어요. 오른쪽의 레만에게 가세요."},
];
const courseSign = {x:118, name:"실험 안내", type:"courseHint"};
const massWindow = 2.35;
let courseRun = null, savedCourse = null;

function beginCourse() {
  const id = scene.type === "classroom"
    ? scholarCourses.findIndex(c => c.floor === scene.floor && c.room === scene.room) : -1;
  courseRun = null;
  if (id >= 0) {
    const definition = scholarCourses[id];
    const record = savedCourse?.id === id ? savedCourse : null;
    const known = progress.learned.includes(id);
    const stage = known ? definition.stages : clamp(Number.isInteger(record?.stage) ? record.stage : 0, 0, definition.stages);
    const settings = [0,1].map(i => {
      if (known) return id === 1 && i === 0 ? 1 : 2;
      return [0,1,2].includes(record?.settings?.[i]) ? record.settings[i] : 0;
    });
    courseRun = {
      id, definition, stage: id === 2 && stage === 1 ? 0 : stage, settings, displaySettings:[...settings],
      time: 0, changedAt: -5, deadline: 0, support: null, pulse: null,
      platforms: definition.steps.map(([x,y,w,kind],index) =>
        ({x,y,w,kind,index,homeY:y,oldY:y,active:true})),
      devices: definition.devices.map(([x,name,gear,y = GROUND],index) =>
        ({x,name,gear,y,index,type:gear === "drum" ? "courseStrike" : "courseDevice"})),
    };
    advanceCourse(0);
  }
  savedCourse = null;
}

function courseSolved() {
  return courseRun && courseRun.stage === courseRun.definition.stages;
}

function courseRecord() {
  if (!courseRun) return null;
  return {id:courseRun.id, stage:courseRun.stage, settings:courseRun.settings};
}

function courseDevices() {
  if (courseRun.id === 1 || courseRun.id === 6) return courseRun.devices;
  return courseRun.devices.filter(d => d.index >= courseRun.stage);
}

function courseObjective() {
  const run = courseRun;
  if (courseSolved()) return {point:scholarPoint(run.id), cue:run.definition.finish, short:"학자와 대화"};
  let index = run.stage, cue = run.definition.cues[index] || run.definition.cues[0];
  if (run.id === 1 || run.id === 6) {
    index = run.settings[0] === (run.id === 1 ? 1 : 2) ? 1 : 0;
    cue = run.definition.cues[index];
  }
  // Leave the order on the board so finding the right card is part of play.
  if (run.id === 3) return {point:classroomBoard, cue, short:"칠판의 원소 카드 순서"};
  const point = run.devices[index];
  return {point, cue, short:(point.type === "courseStrike" ? "A · " : "↑ · ") + point.name};
}

function courseChanged(message) {
  courseRun.changedAt = courseRun.time;
  if (message) notify(message);
  playEffect(courseSolved() ? "correct" : "select");
  syncQuest();
  save();
}

function useCourseDevice(device) {
  const run = courseRun;
  if (courseSolved()) return;
  const i = device.index;
  if (run.id === 1 || run.id === 6) {
    run.settings[i] = (run.settings[i] + 1) % 3;
    const aligned = run.settings[0] === (run.id === 1 ? 1 : 2) && run.settings[1] === 2;
    if (aligned) run.stage = 1;
    courseChanged(aligned ? (run.id === 1 ? "빛이 수광기에 닿았어요." : "두 대륙의 해안선이 맞물렸어요.") : "");
    return;
  }
  if (i !== run.stage) {
    if (run.id === 3) {
      run.stage = 0;
      courseChanged("카드가 책상으로 돌아갔어요. 2 → 8 → 10 순서를 확인하세요.");
    } else notify(run.definition.cues[run.stage]);
    return;
  }
  run.stage++;
  if (run.id === 2 && i === 0) run.deadline = run.time + massWindow;
  if (run.id === 7) run.pulse = {x:device.x,y:device.y,t:run.time};
  const feedback = [
    ["사과를 받았어요. 왼쪽 저울로 가져가세요.","평형추가 내려가며 승강기가 움직여요."],
    [],
    ["밀폐 완료. 표시등이 꺼지기 전에 기록하세요.","반응 전후의 질량이 같아요."],
    ["He 카드를 놓았어요.","O 카드를 놓았어요.","원소 카드 세 장을 순서대로 놓았어요."],
    ["물뿌리개를 채웠어요.","완두 줄기가 창가를 타고 자라요."],
    ["둥지에서 새의 부리를 관찰했어요."],
    [],
    ["첫 진동을 기록했어요.","두 지진계에 모두 신호가 잡혔어요."],
  ];
  courseChanged(feedback[run.id][i]);
}

function strikeCourseDevice() {
  if (courseRun?.id !== 7 || courseSolved()) return;
  const device = courseRun.devices[courseRun.stage];
  if (player.grounded && Math.abs(player.y - device.y) < 12 && Math.abs(player.x - device.x) < 48)
    useCourseDevice(device);
}

function advanceCourse(dt) {
  if (!courseRun) return;
  const run = courseRun;
  run.time += dt;
  if (run.id === 2 && run.stage === 1 && run.time >= run.deadline) {
    run.stage = 0;
    courseChanged("측정 시간이 끝났어요. 왼쪽 용기를 다시 닫으세요.");
  }
  if (run.id === 6) for (let i=0;i<2;i++) {
    run.displaySettings[i] += (run.settings[i]-run.displaySettings[i]) *
      (reducedMotion.matches ? 1 : 1-Math.exp(-dt*15));
  }
  for (const p of run.platforms) {
    p.oldY = p.y;
    if (p.kind === "lift" && courseSolved()) {
      const trip = (run.time - run.changedAt) % 4.8;
      const rise = clamp((trip - .65) / 1.25,0,1) * (1-clamp((trip - 3.1) / 1.2,0,1));
      p.y = p.homeY - 53 * rise;
    }
    if (p.kind === "vine") p.active = !!courseSolved() && run.time - run.changedAt >= p.index * .25;
    if (run.support === p && p.active) {
      player.y += p.y - p.oldY;
      p.oldY = p.y;
    }
  }
}

function courseLanded(platform) {
  courseRun.support = platform || null;
  if (platform?.kind !== "spring") return;
  player.vy = -312;
  player.jumps = 1;
  player.coyote = 0;
  player.grounded = false;
  courseRun.support = null;
  spark(player.x,player.y,"#c9eb94",8);
  combatEvent("doubleJump",player.x,player.y,.36);
  playEffect("doubleJump");
}
