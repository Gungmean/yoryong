"use strict";

function lessonEntry(id) {
  const lesson = scienceLessons[id];
  return `<details class="lesson-entry"><summary>${scholars[id][0]}의 노트 · ${lesson.topic}</summary><p>${lesson.note}</p></details>`;
}

function studyQuestion({ title, art, question, lessonId, ward = false }, onCorrect) {
  const choices = question.choices.map((choice, i) =>
    `<button class="opt" data-answer="${i}"><kbd>${i+1}</kbd>${choice}</button>`).join("");
  const extra = lessonId == null ? "" : lessonEntry(lessonId);
  const prompt = `<p class="quiz-question">${question.prompt}</p>`;
  const lead = ward ? prompt : `<div class="conversation"><img class="portrait" src="${portraitPath(art)}" alt=""><div>${prompt}</div></div>`;
  show(ward ? "ward" : "quiz", title,
    `${lead}${ward ? '<div class="ward-choices">' + choices + '</div>' : choices}<p class="quiz-note" role="status"></p>${extra}
      ${ward ? '<button class="leave-study" id="leave-study">복도로 돌아가기</button>' : ""}`, !ward);
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
  if (ward) $("leave-study").onclick = () => {
    closePanel();
    travelStair(sideStairs[scene.type][0], -1);
  };
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

function challengeWard(boss) {
  const round = studyRound(boss);
  const stages = bossStudies[boss.kind];
  const [id, question] = stages[round];
  const title = subjects[boss.kind].boss + " · 보호막 " + (round + 1) + "/" + stages.length;
  contactPause = 0;
  studyQuestion({ title, art: "foe" + boss.kind, question, lessonId: id, ward: true }, () => {
    boss.openStudy = round;
    player.inv = Math.max(player.inv, 1.2);
    closePanel();
    boss.wardBreak = .65;
    playEffect("phase");
    notify("보호막 해제 · " + question.why, 6500);
    statusBars();
    save();
  });
}
