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

function studyRound(boss) {
  const count = bossStudies[boss.kind].length;
  return Math.min(count - 1, Math.floor((boss.max - boss.hp) * count / boss.max));
}

function studyFloor(boss) {
  if (boss.hp > firstWardHP(boss) && boss.openStudy !== 0) return firstWardHP(boss);
  const count = bossStudies[boss.kind].length;
  return Math.floor(boss.max * (count - studyRound(boss) - 1) / count);
}

function firstWardHP(boss) {
  return Math.floor(boss.max * .85);
}

function wardClosed(boss) {
  return boss.boss && boss.hp > 0 && boss.hp <= firstWardHP(boss) && boss.openStudy !== studyRound(boss);
}

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
  const round = studyRound(boss);
  const stages = bossStudies[boss.kind];
  const [, question] = stages[round];
  contactPause = 0;
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
      boss.openStudy = round;
      boss.ultimates.push(round);
      player.inv = Math.max(player.inv, 1.2);
      closePanel();
      boss.wardBreak = .65;
      playEffect("correct");
      playEffect("phase");
      notify("보호막 해제 · " + question.why, 6500);
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
  const round = boss?.ultimates[0];
  button.hidden = round == null || boss.dying > 0 || modal === "ward";
  if (button.hidden) return;
  button.disabled = wardClosed(boss);
  const [id] = bossStudies[boss.kind][round];
  const name = scholars[id][1] + (boss.ultimates.length > 1 ? " ×" + boss.ultimates.length : "");
  if ($("ultimate-name").textContent !== name) $("ultimate-name").textContent = name;
}

let cutInRemaining = 0;

function showScholarCutIn(id) {
  const cutIn = $("scholar-cut-in");
  $("cut-in-portrait").src = portraitPath("scholar" + id);
  $("cut-in-scholar").textContent = scholars[id][0];
  $("cut-in-skill").textContent = scholars[id][1];
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
  const boss = foes.find(e => e.boss);
  if (modal || cutInRemaining || !boss?.ultimates.length || boss.dying || wardClosed(boss)) return;
  const [id] = bossStudies[boss.kind][boss.ultimates.shift()];
  const count = bossStudies[boss.kind].length;
  const round = studyRound(boss);
  const upper = round === 0 ? firstWardHP(boss) : Math.floor(boss.max * (count - round) / count);
  const damage = Math.ceil((upper - studyFloor(boss)) * .64);
  const dir = Math.sign(boss.x - player.x) || player.face;
  player.castTime = .42;
  player.inv = Math.max(player.inv, .85);
  showScholarCutIn(id);
  combatEvent("summon", player.x - dir * 36, player.y - 38, 1.15, {id, flip:dir < 0, ultimate:true});
  combatEvent("scholarUltimate", boss.x, boss.y, .95, {id, height:boss.height, dir});
  playEffect(skillSounds[id].cast);
  if (skillSounds[id].onGround) playEffect(skillSounds[id].impact);
  hitFoe(boss, damage, id, dir);
  if (!quietCombat()) {
    shake = Math.max(shake, 8);
    contactPause = Math.max(contactPause, .16);
  }
  refreshScholarUltimate(boss);
  save();
  $("world").focus({preventScroll:true});
}
