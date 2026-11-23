"use strict";

const entranceQuest = {
  title: "고요한 교문", chapter: "프롤로그", floor: 1,
  story: "종이 울렸는데 운동장은 조용하다. 중앙 현관 너머에서 희미한 빛이 새어 나온다.",
  place: "정문 · 중앙 현관", reward: "본관 탐험", art: "hero", kind: "entrance",
};
const trialTitles = ["떨어지는 사과", "빛의 약속", "저울 위의 비밀", "빈칸이 있는 표", "완두콩의 편지", "섬새의 부리", "갈라진 대륙", "지구의 심장"];
const bossTitles = ["어긋난 궤도", "끓어오르는 실험실", "나선숲의 울림", "쏟아지는 별의 파편", "옥상의 마지막 균열"];
const trialQuests = scholars.map((scholar, id) => {
  const subject = subjects[Math.floor(id / 2)];
  const course = scholarCourses[id];
  const roomName = floors[course.floor].find(([, , room]) => room === course.room)[1];
  return { kind: "trial", id, title: trialTitles[id], chapter: subject.name + " 편", floor: subject.floor,
    place: subject.floor + "층 · " + roomName + " · " + scholar[0], art: "scholar" + id, reward: scholar[1], story: "“" + scholar[3] + "”" };
});
const bossQuests = subjects.map((subject, id) => ({
  kind: "boss", id, title: bossTitles[id], chapter: id === 4 ? "종장" : subject.name + " 편",
  floor: id === 4 ? 6 : 1, place: id === 4 ? "옥상 · 기억의 균열" : "1층 " + subject.lab + " · " + subject.room,
  reward: subject.seal || "부광의 아침", story: subject.intro, art: "foe" + id,
}));
const epilogue = {
  kind: "ending", title: "부광의 아침", chapter: "에필로그", story: "다시 종이 울리고 교실에 햇살이 든다.",
  place: "부광고등학교 전역", reward: "자유 탐험", art: "hero",
};

function currentQuest() {
  if (progress.won) return epilogue;
  if (!progress.intro && scene.type === "gate") return entranceQuest;
  if (scene.type === "arena" || scene.type === "roof") return bossQuests[scene.subject];
  for (let i = 0; i < 4; i++) {
    for (const id of [2 * i, 2 * i + 1]) {
      if (!progress.learned.includes(id)) return trialQuests[id];
    }
    if (!progress.cleared.includes(i)) return bossQuests[i];
  }
  return bossQuests[4];
}

let trackedQuest, routeLegs = [], activeLeg;
const freeExplore = "학자들을 다시 만나거나 교실을 둘러보세요.";
const floorLabel = f => f === 6 ? "옥상" : f === 0 ? "교문" : f + "층";

// Only the immediate, usable doorway belongs on the compass. Rebuild the legs
// on travel or progression; the player and a moving boss can change x every frame.
function buildQuestRoute(q) {
  if (q === epilogue) return [];
  const points = objects();
  const passage = (point, cue, short) => ({point, cue, short, onward: 0});
  const stairs = points.filter(p => p.type === "stair");
  if (scene.type === "gate")
    return [passage(points.find(p => p.type === "entrance"), "중앙 현관 앞에서 ↑를 눌러 본관에 들어가세요.", "중앙 현관 · ↑ 입장")];
  if (scene.type === "classroom") {
    if (q.kind === "trial" && courseRun?.id === q.id) {
      const {point,cue,short} = courseObjective();
      return [passage(point,cue,short)];
    }
    return stairs.map(p => passage(p, p.name + "에서 ↑를 눌러 " + scene.floor + "층 복도로 나가세요.", p.name + " · ↑ 나가기"));
  }
  if (scene.type === "arena" || scene.type === "roof") {
    const boss = foes.find(e => e.boss);
    return boss ? [passage(boss, "먼저 보스를 공격하세요. 보호막이 나타나면 관측 문제를 풀어 공격을 이어 가세요.", "보호막 돌파")] : [];
  }
  const destination = q.kind === "trial"
    ? classroomDoor(q.floor, scholarCourses[q.id].room)
    : q.floor === 1 ? hallBays[1].find(p => p.name === subjects[q.id].lab) : null;
  if (scene.floor !== q.floor) {
    const direction = Math.sign(q.floor - scene.floor);
    const next = scene.floor + direction;
    const key = direction > 0 ? "↑" : "↓";
    return stairs.map(point => ({
      point, direction, next,
      short: point.name + " · " + key + " " + floorLabel(next),
      cue: point.name + " · " + key + " " + floorLabel(next) +
        (next === q.floor ? "" : " · 최종 " + floorLabel(q.floor)),
      onward: destination ? Math.abs(point.x - destination.x) : 0,
    }));
  }
  if (q.kind === "trial")
    return [passage(destination, destination.name + "에서 ↑를 눌러 들어가 실험을 시작하세요.", destination.name + " · ↑ 입장")];
  if (destination)
    return [passage(destination, destination.name + "에서 ↑를 누르고 " + subjects[q.id].room + "을 선택하세요.", destination.name + " · ↑ 입장")];
  return [];
}

function chooseQuestLeg() {
  let best, shortest = Infinity;
  for (const leg of routeLegs) {
    const walk = Math.abs(player.x - leg.point.x);
    const distance = walk + leg.onward;
    if (distance < shortest || (distance === shortest && walk < Math.abs(player.x - best.point.x))) {
      best = leg;
      shortest = distance;
    }
  }
  if (activeLeg !== best) {
    activeLeg = best;
    $("qaction").textContent = (scene.type === "classroom" ? best?.cue : best?.short) || freeExplore;
  }
  return best;
}
function syncQuest() {
  trackedQuest = currentQuest();
  routeLegs = buildQuestRoute(trackedQuest);
  $("qtitle").textContent = trackedQuest.title;
  $("quest").setAttribute("aria-label", "모험 일지 열기 (J) · " + trackedQuest.title);
  if (!chooseQuestLeg()) $("qaction").textContent = freeExplore;
}

const questNotices = [];
let shownNotice = null;
function announceQuest(completed) {
  questNotices.push({ completed, next: currentQuest(), remaining: 3.4 });
}
function resetQuestNotices() {
  questNotices.length = 0;
  shownNotice = null;
  $("quest-notice").hidden = true;
}
function advanceQuestNotice(dt) {
  const notice = $("quest-notice");
  if (modal || sceneTransition || document.hidden) { notice.hidden = true; return; }
  if (!shownNotice && questNotices.length) {
    shownNotice = questNotices.shift();
    const {completed, next} = shownNotice;
    $("qn-status").textContent = "퀘스트 완료";
    $("qn-finished").textContent = completed.title;
    $("qn-caption").textContent = next === epilogue ? "자유 탐험" : "다음 퀘스트";
    $("qn-title").textContent = next.title;
    $("qn-portrait").src = portraitPath(next.art);
    playEffect("questComplete");
  }
  if (!shownNotice) return;
  const action = shownNotice.next === trackedQuest && activeLeg ? activeLeg.short : shownNotice.next.place;
  if ($("qn-place").textContent !== action) $("qn-place").textContent = action;
  notice.hidden = false;
  shownNotice.remaining -= dt;
  if (shownNotice.remaining <= 0) { notice.hidden = true; shownNotice = null; }
}
