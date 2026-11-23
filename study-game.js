"use strict";

function lessonEntry(id) {
  const lesson = scienceLessons[id];
  return `<details class="lesson-entry"><summary>${scholars[id][0]}의 노트 · ${lesson.topic}</summary><p>${lesson.note}</p></details>`;
}

function studyQuestion({ title, art, question, lessonId, ward = false }, onCorrect) {
  const choices = question.choices.map((choice, i) =>
    `<button class="opt" data-answer="${i}"><kbd>${i+1}</kbd>${choice}</button>`).join("");
  const extra = lessonId == null ? "" : lessonEntry(lessonId);
  show(ward ? "ward" : "quiz", title,
    `<div class="conversation"><img class="portrait" src="${portraitPath(art)}" alt="">
      <div><p class="quiz-question">${question.prompt}</p></div></div>${choices}
      <p class="quiz-note" role="status"></p>${extra}
      ${ward ? '<button class="leave-study" id="leave-study">전투를 끝내고 복도로</button>' : ""}`, !ward);
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
  const count = bossStudies[boss.kind].length;
  return Math.floor(boss.max * (count - studyRound(boss) - 1) / count);
}

function wardClosed(boss) {
  return boss.boss && boss.hp > 0 && boss.openStudy !== studyRound(boss);
}

function challengeWard(boss) {
  const round = studyRound(boss);
  const stages = bossStudies[boss.kind];
  const [id, question] = stages[round];
  const title = subjects[boss.kind].boss + " · 보호막 " + (round + 1) + "/" + stages.length;
  // Every new band begins at a clean attack boundary. Never resume a warning
  // or a projectile that the player saw before reading the question.
  shots.length = 0;
  bossZones.length = 0;
  boss.bolts.length = 0;
  boss.rush = boss.plan = null;
  boss.warn = boss.action = 0;
  boss.time = 1.8;
  studyQuestion({ title, art: "foe" + boss.kind, question, lessonId: id, ward: true }, () => {
    boss.openStudy = round;
    player.inv = Math.max(player.inv, 1.2);
    save();
    dialogue(scholars[id][0], "scholar" + id, question.why +
      (round === stages.length - 1 ? "<br>마지막 보호막이 깨졌어. 이제 마무리할 수 있어!" : "<br>보호막이 깨졌어. 다음 체력 눈금까지 공격할 수 있어!"),
      "공격하러 가기", () => {
        boss.wardBreak = .65;
        playEffect("phase");
        statusBars();
      });
  });
}
