"use strict";

function lessonEntry(id) {
  const lesson = scienceLessons[id];
  return `<details class="lesson-entry"><summary>${scholars[id][0]}의 노트 · ${lesson.topic}</summary><p>${lesson.note}</p></details>`;
}

function studyQuestion({ title, art, question, lessonId }, onCorrect) {
  const choices = question.choices.map((choice, i) =>
    `<button class="opt" data-answer="${i}"><kbd>${i+1}</kbd>${choice}</button>`).join("");
  const extra = lessonId == null ? "" : lessonEntry(lessonId);
  show("quiz", title, `<div class="conversation"><img class="portrait" src="${portraitPath(art)}" alt="">
    <div><p class="quiz-question">${question.prompt}</p></div></div>
    ${choices}<p class="quiz-note" role="status"></p>${extra}`);
  $("panel").querySelectorAll("[data-answer]").forEach(button => {
    button.onclick = () => {
      const index = Number(button.dataset.answer);
      if (index === question.answer) {
        playEffect("correct");
        onCorrect();
      } else {
        playEffect("wrong");
        button.classList.add("reconsider");
        button.focus({ preventScroll: true });
        $("panel").querySelector(".quiz-note").textContent =
          Array.isArray(question.hint) ? question.hint[index] : question.hint;
      }
    };
  });
}

const classroomWardMarks = [72, 35], rooftopWardMarks = [80, 60, 38, 18];
const wardThresholds = kind => kind === 4 ? rooftopWardMarks : classroomWardMarks;
const nextWard = boss => (boss.openStudy ?? -1) + 1;
const studyFloor = boss => Math.floor(boss.max * (wardThresholds(boss.kind)[nextWard(boss)] ?? 0) / 100);
const wardTechniques = [
  "홍염 사과 낙하", "정지한 시계", "황금의 평형추", "자수정 원소진",
  "새싹의 용틀임", "황금 날개 군무", "대륙판 충돌", "내핵 공명",
];

function wardClosed(boss) {
  return boss.boss && boss.hp > 0 && boss.hp <= studyFloor(boss);
}

const wardPrimed = boss => boss.boss && boss.readyWard === nextWard(boss) && wardClosed(boss);

// Rates follow real time so lingering over a choice never stalls the recovery ramp.
let battleRate = 1;
function advanceBattleRate(dt, reading) {
  const target = reading ? .07 : 1;
  battleRate += (target - battleRate) * (1 - Math.exp(-dt * (reading ? 16 : 6)));
  if (Math.abs(target - battleRate) < .001) battleRate = target;
  return battleRate;
}

const wardTimeLimit = 16, wardRetryDelay = 4;
let wardAttempt = null;

function updateWardTimer(dt) {
  const attempt = wardAttempt;
  attempt.time = Math.max(0, attempt.time - dt);
  if (attempt.time < .001) attempt.time = 0;
  const seconds = Math.ceil(attempt.time);
  const timer = $("ward-seconds");
  if (timer.textContent !== seconds + "초") timer.textContent = seconds + "초";
  $("ward-question").style.setProperty("--ward-time", attempt.time / wardTimeLimit);
  $("ward-question").classList.toggle("urgent", seconds <= 5);
  if (!attempt.time) {
    attempt.boss.studyRetry = wardRetryDelay;
    player.inv = Math.max(player.inv, .55);
    closePanel();
    playEffect("wrong");
    notify("시간 초과 · 보스의 공격을 피하면 다시 기회가 옵니다.");
    statusBars();
  }
}

function challengeWard(boss) {
  const round = nextWard(boss);
  const stages = bossStudies[boss.kind];
  const [, question] = stages[round];
  contactPause = 0;
  boss.wardBreak = 0;
  wardAttempt = { boss, time: wardTimeLimit };
  const field = $("ward-question");
  beginPanel("ward", field);
  $("ward-layer").textContent = "보호막 " + (round + 1) + " / " + stages.length;
  $("ward-prompt").textContent = question.prompt;
  $("ward-hint").textContent = "";
  $("ward-answers").innerHTML = question.choices.map((choice, i) =>
    `<button data-answer="${i}"><kbd>${i + 1}</kbd><span>${choice}</span></button>`).join("");
  const choices = field.querySelectorAll("[data-answer]");
  for (const [index, button] of choices.entries()) {
    button.onclick = () => {
      if (wardAttempt?.boss !== boss || !wardAttempt.time) return;
      if (index !== question.answer) {
        playEffect("wrong");
        button.disabled = true;
        $("ward-hint").textContent = "−3초 · " + question.hint;
        field.querySelector("button:not(:disabled)")?.focus({preventScroll:true});
        updateWardTimer(3);
        return;
      }
      boss.readyWard = round;
      closePanel();
      playEffect("correct");
      notify("정답 · " + question.why, 6500);
      statusBars();
      save();
    };
  }
  updateWardTimer(0);
  field.hidden = false;
  field.scrollTop = 0;
  choices[0]?.focus({preventScroll:true});
}

function refreshScholarUltimate(boss) {
  const button = $("scholar-ultimate");
  button.hidden = !boss || !wardPrimed(boss) || Boolean(boss.wardCast) || Boolean(modal);
  if (button.hidden) return;
  const [id] = bossStudies[boss.kind][boss.readyWard];
  const name = wardTechniques[id];
  if ($("ultimate-name").textContent !== name) $("ultimate-name").textContent = name;
}

let cutInRemaining = 0;

function showScholarCutIn(id) {
  const cutIn = $("scholar-cut-in");
  $("cut-in-portrait").src = portraitPath("scholar" + id);
  $("cut-in-scholar").textContent = scholars[id][0];
  $("cut-in-skill").textContent = wardTechniques[id];
  const subject = id >> 1;
  cutIn.style.setProperty("--cut-in-color", subjects[subject].color);
  cutIn.style.setProperty("--cut-in-engraving", subject);
  cutIn.toggleAttribute("data-quiet", quietCombat());
  cutInRemaining = .94;
  cutIn.hidden = false;
}

function advanceScholarCutIn(dt) {
  if (!cutInRemaining) return;
  cutInRemaining = Math.max(0, cutInRemaining - dt);
  if (!cutInRemaining) $("scholar-cut-in").hidden = true;
}

function castScholarUltimate() {
  const boss = foes.find(wardPrimed);
  if (modal || cutInRemaining || !boss || boss.wardCast) return;
  const [id] = bossStudies[boss.kind][boss.readyWard];
  const dir = Math.sign(boss.x - player.x) || player.face;
  boss.wardCast = {id, dir, elapsed:0};
  player.castTime = .42;
  showScholarCutIn(id);
  combatEvent("summon", player.x - dir * 36, player.y - 38, 1.15, {id, flip:dir < 0, ultimate:true});
  playEffect(skillSounds[id].cast);
  statusBars();
  $("world").focus({preventScroll:true});
}

const wardImpactTime = .66;
function advanceWardCast(boss, dt) {
  const cast = boss.wardCast;
  if (!cast) return;
  cast.elapsed += dt;
  if (cast.elapsed < wardImpactTime) return;
  const {id, dir} = cast;
  boss.wardCast = null;
  boss.openStudy = boss.readyWard;
  boss.readyWard = null;
  boss.wardBreak = .65;
  boss.warn = 0;
  boss.rush = null;
  boss.action = 0;
  boss.bolts.length = 0;
  bossZones.length = 0;
  shots = shots.filter(shot => !shot.team);
  boss.time = 1;
  player.inv = Math.max(player.inv, 1.1);
  combatEvent("wardImpact", boss.x, boss.y, 1.12, {id, height:boss.height, half:boss.half, dir});
  playEffect("phase");
  if (skillSounds[id].onGround) playEffect(skillSounds[id].impact);
  hitFoe(boss, Math.ceil((boss.hp - studyFloor(boss)) * .22), id, dir);
  if (!quietCombat()) {
    shake = Math.max(shake, 10);
    contactPause = Math.max(contactPause, .085);
  }
  notify("보호막 파괴 · 지금 공격하세요!");
  statusBars();
  save();
}
