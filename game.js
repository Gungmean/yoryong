"use strict";
const $ = (id) => document.getElementById(id),
  clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const SAVE = "bugwang-quest-v1",
  GROUND = 318,
  STAIR = 1110;
let W = 800,
  H = 360,
  cam = 0,
  clock = 0,
  modal = "",
  sound = false,
  audio,
  toastUntil = 0,
  lastSaved = 0;
let scene = { type: "gate", floor: 0, subject: -1 },
  worldWidth = 1140;
let player = {
  x: 240,
  y: GROUND,
  vy: 0,
  vx: 0,
  face: 1,
  jumps: 0,
  dash: 0,
  inv: 0,
  dashCD: 0,
  swing: 0,
  attackCD: 0,
  buffer: 0,
};
let progress = {
  learned: [],
  cleared: [],
  slots: [null, null, null, null],
  won: false,
  intro: false,
};
let hp = 100,
  mp = 60,
  keys = new Set(),
  foes = [],
  shots = [],
  effects = [],
  texts = [],
  cool = Array(8).fill(0),
  shake = 0,
  near = null,
  resumeFoe = null;
const mapWidths = { gate: 1140, floor: 2290, arena: 1040, roof: 1040 };
const sideStairs = Object.fromEntries(
  Object.entries(mapWidths).map(([type, width]) => [
    type,
    [
      { x: 64, name: "서쪽 계단", side: "west", type: "stair" },
      { x: width - 64, name: "동쪽 계단", side: "east", type: "stair" },
    ],
  ]),
);
const hallBays = floors.map((layout) => [
  sideStairs.floor[0],
  ...layout.map(([x, name]) =>
    name === "계단"
      ? { x, name: "중앙 계단", side: "center", type: "stair" }
      : { x, name, type: "room" },
  ),
  sideStairs.floor[1],
]);
function stairX(type, side) {
  return sideStairs[type].find((stair) => stair.side === side)?.x ?? STAIR;
}
const assets = {};
assets.combat = new Image();
assets.combat.src = "assets/combat/effects.webp";
for (const theme of ["hall", "gate", "arena", "roof"]) {
  const tile = new Image();
  tile.src = "assets/stairs/" + theme + ".webp";
  assets["stair/" + theme] = tile;
}
let panelSince = 0;
let returnFocus = null;
let saveMessage = "자동 저장";
const subjectIcons = ["atom", "flask", "leaf", "earth"];
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let sceneryPaused = false;
for (const id of Object.keys(actorSheets)) {
  const sheet = new Image();
  sheet.src = "assets/actors/" + id + ".png";
  assets["actor/" + id] = sheet;
}
for (const name of [
  "hero",
  "campus",
  "corridor",
  "lab",
  "roof",
  ...Array.from({ length: 8 }, (_, i) => "scholar" + i),
  ...Array.from({ length: 6 }, (_, i) => "foe" + i),
  ...Array.from({ length: 8 }, (_, i) => "skill" + i),
]) {
  const im = new Image();
  im.src =
    "assets/" +
    name +
    (["campus", "corridor", "lab", "roof"].includes(name) ? ".webp" : ".png");
  assets[name] = im;
}
const floorName = () =>
  scene.type === "gate"
    ? "부광고등학교 정문"
    : scene.type === "arena"
      ? subjects[scene.subject].room
      : scene.type === "roof"
        ? "옥상 · 기억의 균열"
        : scene.floor + "층 중앙 복도";
const hasKey = (i) =>
  progress.learned.includes(i * 2) && progress.learned.includes(i * 2 + 1);
function notify(msg) {
  $("toast").textContent = msg;
  $("toast").classList.add("on");
  toastUntil = performance.now() + 2600;
}
function tone(freq = 360, duration = 0.1, type = "sine") {
  if (!sound) return;
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    audio.resume();
    let osc = audio.createOscillator(),
      gain = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audio.currentTime);
    osc.frequency.exponentialRampToValueAtTime(
      freq * 0.76,
      audio.currentTime + duration,
    );
    gain.gain.setValueAtTime(0.055, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      audio.currentTime + duration,
    );
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + duration);
  } catch {}
}
function save() {
  try {
    const boss = foes.find((e) => e.boss);
    const encounter =
      boss && hp > 0 ? { kind: boss.kind, x: boss.x, hp: boss.hp } : null;
    localStorage.setItem(
      SAVE,
      JSON.stringify({
        progress,
        scene,
        x: player.x,
        hp,
        mp,
        sound,
        sceneryPaused,
        encounter,
      }),
    );
    saveMessage = "자동 저장";
  } catch {
    if (saveMessage !== "저장 사용 불가") notify("이 브라우저에서는 진행 상황을 저장할 수 없습니다.");
    saveMessage = "저장 사용 불가";
  }
  if ($("savestatus")) $("savestatus").textContent = saveMessage;
}
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(SAVE));
    if (
      !d ||
      !Array.isArray(d.progress?.learned) ||
      !Array.isArray(d.progress?.slots)
    )
      return;
    const ids = (a, n) => [
      ...new Set(
        (Array.isArray(a) ? a : []).filter(
          (i) => Number.isInteger(i) && i >= 0 && i < n,
        ),
      ),
    ];
    progress.learned = ids(d.progress.learned, 8);
    progress.cleared = ids(d.progress.cleared, 4).filter(hasKey);
    progress.slots = slotKeys.map((_, k) =>
      progress.learned.includes(d.progress.slots[k])
        ? d.progress.slots[k]
        : null,
    );
    progress.intro = !!d.progress.intro;
    progress.won = d.progress.won && progress.cleared.length === 4;
    const s = d.scene || {};
    if (
      s.type === "floor" &&
      Number.isInteger(s.floor) &&
      s.floor >= 1 &&
      s.floor <= 5
    )
      scene = { type: "floor", floor: s.floor, subject: -1 };
    if (
      s.type === "arena" &&
      Number.isInteger(s.subject) &&
      s.subject >= 0 &&
      s.subject < 4 &&
      hasKey(s.subject) &&
      !progress.cleared.includes(s.subject)
    )
      scene = { type: "arena", floor: 1, subject: s.subject };
    if (s.type === "roof" && progress.cleared.length === 4)
      scene = { type: "roof", floor: 6, subject: 4 };
    player.x = Number.isFinite(d.x) ? d.x : 240;
    hp = clamp(Number(d.hp) || 100, 1, 100);
    mp = clamp(Number(d.mp) || 0, 0, 60);
    sound = !!d.sound;
    sceneryPaused = d.sceneryPaused === true;
    resumeFoe = d.encounter;
  } catch {}
}
function questInfo() {
  if (progress.won)
    return [
      "학교의 기억을 되찾다",
      "네 인장과 함께 캠퍼스를 자유롭게 탐험하세요.",
    ];
  if (scene.type === "gate")
    return ["학교 안으로", "오른쪽 중앙 현관으로 이동하세요."];
  if (scene.type === "arena" || scene.type === "roof")
    return [
      subjects[scene.subject].boss + " 격파",
      subjects[scene.subject].hint,
    ];
  if (progress.cleared.length === 4)
    return ["옥상에 열린 균열", "가까운 계단에서 옥상으로 올라가세요."];
  const local = scene.floor - 2;
  if (local >= 0 && !hasKey(local)) {
    const id = progress.learned.includes(local * 2) ? local * 2 + 1 : local * 2;
    return [
      scholars[id][0] + "의 시련",
      scene.floor +
        "층 중앙 계단 " +
        (id % 2 ? "오른쪽" : "왼쪽") +
        "에서 학자를 만나세요.",
    ];
  }
  const next = subjects.findIndex(
    (s, i) => i < 4 && hasKey(i) && !progress.cleared.includes(i),
  );
  if (next >= 0)
    return [
      subjects[next].boss + " 격파",
      "1층 " + subjects[next].lab + "에서 " + subjects[next].room + "으로.",
    ];
  const needed = subjects.findIndex((s, i) => i < 4 && !hasKey(i));
  return [
    subjects[needed].name + "의 열쇠를 찾아서",
    "가까운 계단에서 " + subjects[needed].floor + "층으로 올라가세요.",
  ];
}
function refresh() {
  const q = questInfo();
  $("qtitle").textContent = q[0];
  $("quest").ariaLabel = "모험 일지 · " + q[0];
  $("maptitle").textContent = scene.type === "gate" ? "부광고 정문" : floorName();
  $("minimap").ariaLabel = floorName() + " · 캠퍼스 지도 열기";
  $("level").textContent =
    "Lv. " +
    String(1 + progress.learned.length + progress.cleared.length).padStart(
      2,
      "0",
    );
  const sbutton = (key, id) => {
    const basic = key === "A", empty = !basic && id == null;
    const name = basic ? "기본 공격" : empty ? "빈 슬롯 · 스킬 배치" : scholars[id][1];
    const src = basic ? icon("sword") : empty ? null : "assets/skill" + id + ".png";
    return `<button class="slot ${empty ? "locked" : "active"}" data-slot="${key}"
       aria-label="${key} · ${name}" data-tip="${name}">
       ${src ? `<img class="slot-art" src="${src}" alt="">` : ""}<kbd>${key}</kbd><span class="timer"></span></button>`;
  };
  $("slots").innerHTML =
    sbutton("A", -1) +
    slotKeys.map((k, i) => sbutton(k, progress.slots[i])).join("");
  decorate();
  statusBars();
}
function statusBars() {
  for (let [id, n, max] of [
    ["hp", hp, 100],
    ["mp", mp, 60],
  ]) {
    $(id + "bar").style.width = (100 * n) / max + "%";
    $(id + "val").textContent = Math.ceil(n) + "/" + max;
  }
  const b = foes.find((e) => e.boss);
  $("bossbar").hidden = !b;
  if (b) {
    $("bossname").textContent = subjects[b.kind].boss;
    $("bossfill").style.width = (100 * b.hp) / b.max + "%";
  }
  document.querySelectorAll(".slot .timer").forEach((el, i) => {
    let cd = i ? cool[progress.slots[i - 1]] : 0;
    el.textContent = cd > 0 ? cd.toFixed(1) : "";
  });
}
function show(kind, title, body, canClose = true) {
  if (!modal) {
    returnFocus = document.activeElement?.closest("#shell button") || $("world");
    for (const child of $("shell").children) child.inert = child !== $("overlay");
  }
  modal = kind;
  panelSince = performance.now();
  $("overlay").dataset.kind = kind;
  keys.clear();
  player.vx = 0;
  player.buffer = 0;
  $("overlay").hidden = false;
  const marks = { menu: "globe", map: "zelkova", equip: "slots", quest: "quest",
    stairs: "stairs", lab: "flask", down: "rose", ending: "globe", seal: "globe",
    dialogue: "quest", quiz: "atom", help: "map", reset: "globe" };
  $("panel").innerHTML = `<div class="panel-head"><i data-icon="${marks[kind]}"></i>
    <div class="book-title"><h2 id="paneltitle">${title}</h2>
    ${kind === "menu" ? '<p>부광고등학교 <span>창의(創意)</span></p>' : ''}</div>
    ${canClose ? '<button class="close" aria-label="닫기" data-close><i data-icon="close"></i></button>' : ''}
    </div><div class="panel-body">${body}</div>`;
  decorate($("panel"));
  $("panel")
    .querySelector("[data-close]")
    ?.addEventListener("click", closePanel);
  $("panel").scrollTop = 0;
  ($("panel").querySelector(".panel-body button:not(:disabled)") || $("panel").querySelector("button"))?.focus({ preventScroll: true });
}
function closePanel() {
  modal = "";
  $("overlay").hidden = true;
  for (const child of $("shell").children) child.inert = false;
  (returnFocus?.isConnected ? returnFocus : $("world")).focus({ preventScroll: true });
  returnFocus = null;
  keys.clear();
}
function dialogue(name, asset, line, button, fn) {
  show(
    "dialogue",
    name,
    '<div class="conversation"><img class="portrait" src="assets/' +
      asset +
      '.png" alt=""><div><p>' +
      line +
      '</p><button class="confirm" id="continue">' +
      button +
      "</button></div></div>",
    false,
  );
  $("continue").onclick = () => {
    closePanel();
    fn?.();
  };
}
function showMap() {
  let entries = [
    "옥상 · 기억의 균열",
    "5층 · 지구과학",
    "4층 · 생명과학",
    "3층 · 화학",
    "2층 · 물리",
    "1층 · 중앙 현관",
    "정문 · 운동장",
  ];
  show(
    "map",
    "캠퍼스 지도",
    '<canvas class="atlas-preview" id="mapdetail" width="176" height="48" aria-label="현재 지역의 지도"></canvas>' + entries
      .map((s, i) => {
        let f = 6 - i,
          sub = f - 2;
        let status =
          f === 6
            ? progress.cleared.length === 4
              ? "개방"
              : "인장 4개 필요"
            : f >= 2
              ? hasKey(sub)
                ? "열쇠 획득"
                : "학자 " +
                  progress.learned.filter((n) => Math.floor(n / 2) === sub)
                    .length +
                  "/2"
              : f === 1
                ? "도서관 · 매점 · 과학실"
                : "모험의 출발점";
        return (
          '<div class="floorrow map-floor' + (scene.floor === f ? " current" : "") + '"><b>' +
          s +
          "</b><span>" +
          (scene.floor === f ? '<em class="here">현 위치</em> ' : "") +
          status +
          "</span></div>"
        );
      })
      .join("") +
      '<p class="small">층 이동은 각 층의 서쪽·중앙·동쪽 계단에서 ↑를 누르세요.</p>',
  );
  miniMap();
  $("mapdetail").getContext("2d").drawImage($("mapview"), 0, 0);
}
function showQuest() {
  let q = questInfo();
  show(
    "quest",
    "모험 일지",
    '<div class="journal-note"><strong>' +
      q[0] +
      "</strong><p>" +
      q[1] +
      '</p></div><h3 class="collection-heading">과학의 인장 <small>' + progress.cleared.length + ' / 4</small></h3>' +
      subjects
        .slice(0, 4)
        .map(
          (s, i) =>
            '<button class="rowbtn journal-seal" data-seal="' + i + '"><b><i data-icon="' +
            (progress.cleared.includes(i) ? "earned-" : "seal-") + subjectIcons[i] + '"></i>' +
            s.name +
            " · " +
            s.boss +
            "</b><span>" +
            (progress.cleared.includes(i)
              ? "인장 획득"
              : hasKey(i)
                ? "열쇠 획득"
                : s.floor + "층 시련") +
            "</span></button>",
        )
        .join(""),
  );
  $("panel").querySelectorAll("[data-seal]").forEach(button => {
    button.onclick = () => showSeal(Number(button.dataset.seal));
  });
}
function showEquip(activeSlot = 0) {
  const equipped = progress.slots[activeSlot];
  const imageFor = (id) => id == null ? icon("lock") : "assets/skill" + id + ".png";
  const sockets = slotKeys.map((key, i) => {
    const id = progress.slots[i];
    return `<button class="socket" data-equip="${i}" aria-pressed="${i === activeSlot}">
      <kbd>${key}</kbd><img src="${imageFor(id)}" alt="">
      <span>${id == null ? "미장착" : scholars[id][2]}</span></button>`;
  }).join("");
  const options = progress.learned.map((id) => {
    const s = scholars[id], index = progress.slots.indexOf(id);
    const state = index < 0 ? "장착" : index === activeSlot ? "장착 중" : slotKeys[index] + "에서 교환";
    return `<button class="skill-choice" data-skill="${id}" aria-pressed="${id === equipped}">
      <img src="${imageFor(id)}" alt=""><span><b>${s[1]}</b><small>피해 ${s[9]} · 재사용 ${s[10]}초</small></span><em>${state}</em></button>`;
  }).join("");
  show("equip", "스킬 배치",
    `<div class="sockets" role="group" aria-label="배치할 슬롯">${sockets}</div>
    <h3 class="choice-title"><kbd>${slotKeys[activeSlot]}</kbd> 슬롯에 배치할 스킬</h3>
    ${options || '<p class="empty-note">아직 배운 스킬이 없어요. 위층의 학자를 만나 시련에 도전하세요.</p>'}
    ${equipped != null ? '<button class="rowbtn" data-unequip>이 슬롯 비우기</button>' : ''}`);
  $("panel").querySelector(`[data-equip="${activeSlot}"]`).focus({ preventScroll: true });
  $("panel").querySelectorAll("[data-equip]").forEach(button => {
    button.onclick = () => showEquip(Number(button.dataset.equip));
  });
  function assign(id) {
    const old = progress.slots.indexOf(id);
    if (id != null && old >= 0) progress.slots[old] = equipped;
    progress.slots[activeSlot] = id;
    save();
    refresh();
    showEquip(activeSlot);
  }
  $("panel").querySelectorAll("[data-skill]").forEach(button => {
    button.onclick = () => assign(Number(button.dataset.skill));
  });
  const remove = $("panel").querySelector("[data-unequip]");
  if (remove) remove.onclick = () => assign(null);
}
function syncMotionSwitch() {
  const button = $("motion");
  if (!button) return;
  const enabled = !sceneryPaused && !reducedMotion.matches;
  button.disabled = reducedMotion.matches;
  button.setAttribute("aria-pressed", String(enabled));
  button.lastElementChild.textContent = reducedMotion.matches ? "기기 설정 · 줄임" : enabled ? "켜짐" : "꺼짐";
}
reducedMotion.addEventListener("change", syncMotionSwitch);
function menu() {
  show("menu", "요룡이의 과학 모험",
    `<button class="confirm" id="resume">모험 계속하기</button>
    <div class="menu-links">
      <button class="rowbtn" id="tomap"><i data-icon="map"></i>캠퍼스 지도<kbd>M</kbd></button>
      <button class="rowbtn" id="toequip"><i data-icon="slots"></i>스킬 배치<kbd>K</kbd></button>
      <button class="rowbtn" id="toquest"><i data-icon="quest"></i>모험 일지 · 인장</button>
      <button class="rowbtn" id="help"><i data-icon="globe"></i>조작 안내</button>
    </div>
    <div class="settings-list">
      <button class="rowbtn" id="sound" aria-pressed="${sound}">효과음<b class="switch-state">${sound ? "켜짐" : "꺼짐"}</b></button>
      <button class="rowbtn" id="full">전체화면<b class="switch-state"></b></button>
      <button class="rowbtn" id="motion"><span>배경 움직임</span><b class="switch-state"></b></button>
    </div>
    <p class="save-note"><i data-icon="save"></i><span id="savestatus">${saveMessage}</span></p>
    <button class="text-action" id="reset">처음부터 다시 시작</button>`);
  $("resume").onclick = closePanel;
  $("tomap").onclick = showMap;
  $("toequip").onclick = () => showEquip();
  $("toquest").onclick = showQuest;
  $("help").onclick = showHelp;
  $("sound").onclick = () => {
    sound = !sound;
    $("sound").setAttribute("aria-pressed", String(sound));
    $("sound").lastElementChild.textContent = sound ? "켜짐" : "꺼짐";
    tone(650);
    save();
  };
  $("full").onclick = toggleFullscreen;
  syncFullscreen();
  syncMotionSwitch();
  $("motion").onclick = () => {
    sceneryPaused = !sceneryPaused;
    syncMotionSwitch();
    save();
  };
  $("reset").onclick = () => {
    show(
      "reset",
      "처음부터 시작할까요?",
      '<p>이 브라우저에 저장된 스킬과 인장이 초기화됩니다.</p><div class="grid"><button class="rowbtn" id="cancel">취소</button><button class="confirm" id="yes">새 모험 시작</button></div>',
    );
    $("cancel").onclick = menu;
    $("yes").onclick = () => {
      progress = {
        learned: [],
        cleared: [],
        slots: [null, null, null, null],
        won: false,
        intro: false,
      };
      hp = 100;
      mp = 60;
      closePanel();
      go("gate", 0, 240);
      save();
    };
  };
}
function showHelp() {
  show("help", "조작 안내", [
    ["← →", "좌우 이동"], ["Alt", "점프 · 공중에서 더블 점프"],
    ["↓ + Alt", "발판 내려오기"], ["Shift", "회피 대시"],
    ["A", "기본 공격"], ["Q W E R", "장착한 스킬 사용"], ["K", "스킬 배치"],
    ["↑", "대화 · 입장 · 계단"], ["↓", "계단에서 한 층 내려가기"],
    ["1–6", "답 또는 층 선택"], ["M", "캠퍼스 지도"], ["Esc", "메뉴 · 닫기"]
  ].map(([key, action]) => `<div class="help-row"><kbd>${key}</kbd><span>${action}</span></div>`).join(""));
}
function showStairs(stair) {
  show(
    "stairs",
    stair.name,
    '<p class="small">이동할 층을 선택하세요. 현재 ' +
      scene.floor +
      "층입니다.</p>" +
      [6, 5, 4, 3, 2, 1]
        .map(
          (f) =>
            '<button class="rowbtn" data-floor="' +
            f +
            '" ' +
            (f === scene.floor || (f === 6 && progress.cleared.length < 4)
              ? "disabled"
              : "") +
            "><b>" +
            (f === 6 ? "옥상" : f + "층") +
            "</b><span>" +
            (f === 6
              ? progress.cleared.length < 4
                ? "잠김 · 인장 " + progress.cleared.length + "/4"
                : "기억의 균열"
              : f === 1
                ? "중앙 현관 · 과학실"
                : subjects[f - 2].name + "의 시련") +
            (f === scene.floor ? "　◆" : "") +
            "</span></button>",
        )
        .join("") +
      (scene.floor === 1 && stair.side !== "center"
        ? '<button class="rowbtn" data-floor="0"><b>교문</b><span>바깥 계단으로</span></button>'
        : ""),
  );
  document.querySelectorAll("[data-floor]").forEach(
    (el) =>
      (el.onclick = () => {
        let f = Number(el.dataset.floor);
        closePanel();
        if (f === 6)
          enterBattle(
            4,
            stair.side === "center" ? 190 : stairX("roof", stair.side),
          );
        else if (f === 0) go("gate", 0, stairX("gate", stair.side));
        else go("floor", f, stair.x);
      }),
  );
}
function quiz(id) {
  const s = scholars[id];
  if (progress.learned.includes(id)) {
    dialogue(
      s[0],
      "scholar" + id,
      s[7] +
        " " +
        (hasKey(Math.floor(id / 2))
          ? "열쇠는 자네에게 있네. 1층 과학실로 가 보게."
          : "이 층의 다른 학자도 만나 보게."),
      "대화 마치기",
    );
    return;
  }
  const ask = (feedback = "") => {
    show(
      "quiz",
      s[0],
      '<div class="conversation"><img class="portrait" src="assets/scholar' +
        id +
        '.png" alt="' +
        s[0] +
        '"><div><div class="tag">' +
        subjects[Math.floor(id / 2)].name +
        "의 시련</div><p>" +
        s[4] +
        "</p></div></div>" +
        s[5]
          .map(
            (t, n) =>
              '<button class="opt" data-answer="' +
              n +
              '"><kbd>' +
              (n + 1) +
              "</kbd>" +
              t +
              "</button>",
          )
          .join("") +
        (feedback ? '<p class="small" role="status">' + feedback + "</p>" : ""),
    );
    document.querySelectorAll("[data-answer]").forEach(
      (el) =>
        (el.onclick = () => {
          if (+el.dataset.answer !== s[6]) {
            tone(140);
            ask("조금 더 생각해 보자. 다른 답을 골라 보세요.");
            return;
          }
          progress.learned.push(id);
          combatEvent("discovery", player.x, player.y, .95, { id });
          let empty = progress.slots.indexOf(null);
          if (empty >= 0) progress.slots[empty] = id;
          const n = Math.floor(id / 2);
          save();
          refresh();
          tone(820, 0.25);
          dialogue(
            s[0],
            "scholar" + id,
            s[7] +
              "<br><b>「" +
              s[1] +
              "」 습득!</b> " +
              s[8] +
              (hasKey(n)
                ? "<br>두 시련을 마쳐 <b>" + subjects[n].key + "</b>를 얻었다."
                : ""),
            "스킬 받기",
          );
        }),
    );
  };
  dialogue(s[0], "scholar" + id, s[3], "시련에 도전", () => ask());
}
function labChoice(name) {
  const ids = name === "물리지학실" ? [0, 3] : [1, 2];
  show(
    "lab",
    name,
    '<p class="small">실험실 안쪽에 두 공간으로 이어지는 문이 있다.</p>' +
      ids
        .map(
          (i) =>
            '<button class="rowbtn" data-lab="' +
            i +
            '" ' +
            (!hasKey(i) || progress.cleared.includes(i) ? "disabled" : "") +
            "><b>" +
            subjects[i].room +
            "</b><span>" +
            (progress.cleared.includes(i)
              ? "인장 획득"
              : hasKey(i)
                ? "열쇠로 열기"
                : subjects[i].floor + "층 열쇠 필요") +
            "</span></button>",
        )
        .join(""),
  );
  document.querySelectorAll("[data-lab]").forEach(
    (el) =>
      (el.onclick = () => {
        closePanel();
        enterBattle(+el.dataset.lab);
      }),
  );
}
function objects() {
  if (scene.type === "gate")
    return [
      ...sideStairs.gate,
      { x: 650, name: "중앙 현관", type: "entrance" },
    ];
  if (scene.type === "floor") {
    let a = [...hallBays[scene.floor]];
    if (scene.floor >= 2)
      for (let j = 0; j < 2; j++) {
        let id = (scene.floor - 2) * 2 + j;
        a.push({
          x: j ? 1510 : 706,
          name: scholars[id][0],
          type: "scholar",
          id,
        });
      }
    return a;
  }
  return sideStairs[scene.type];
}
function leaveByStair(stair) {
  if (scene.type === "roof") go("floor", 5, stairX("floor", stair.side));
  else if (scene.type === "arena")
    go("floor", 1, subjects[scene.subject].lab === "물리지학실" ? 1790 : 2090);
  else if (scene.floor > 1) go("floor", scene.floor - 1, stair.x);
  else if (scene.type === "floor" && stair.side !== "center")
    go("gate", 0, stairX("gate", stair.side));
}
function findNear() {
  return objects()
    .filter((o) => Math.abs(o.x - player.x) < 58 && player.y > GROUND - 65)
    .sort((a, b) => Math.abs(a.x - player.x) - Math.abs(b.x - player.x))[0];
}
function interact() {
  if (foes.some((e) => e.boss && e.dying)) return;
  let o = findNear();
  if (!o) {
    notify(
      scene.type === "gate"
        ? "오른쪽 중앙 현관 표식 가까이 이동하세요."
        : "문이나 학자 옆에서 ↑를 누르세요.",
    );
    return;
  }
  tone(470);
  if (scene.type === "gate") {
    go("floor", 1, o.type === "stair" ? stairX("floor", o.side) : 580);
    if (!progress.intro) {
      progress.intro = true;
      save();
      dialogue(
        "요룡이",
        "hero",
        "종이 울렸는데 학교가 너무 조용해. 과학실 문에는 네 개의 낯선 무늬가 있어. 위층의 학자들이라면 이 비밀을 알고 있을 거야!",
        "학자들을 찾아서",
      );
    }
    return;
  }
  if (o.type === "stair") {
    if (scene.type === "floor") showStairs(o);
    else leaveByStair(o);
    return;
  }
  if (o.type === "scholar") {
    quiz(o.id);
    return;
  }
  if (o.name.endsWith("학실") || o.name === "물리지학실") {
    labChoice(o.name);
    return;
  }
  if (o.name === "중앙 현관") {
    go("gate", 0, 640);
    return;
  }
  if (o.name === "매점") {
    hp = 100;
    mp = 60;
    combatEvent("heal", player.x, player.y, .55);
    save();
  }
  bubble(campusNotes[o.name] || o.name + "에서 분필 냄새가 난다.");
}
function bubble(t) {
  effects = effects.filter((e) => e.type !== "bubble");
  effects.push({
    type: "bubble",
    x: player.x,
    y: GROUND - 75,
    msg: t,
    life: 3.7,
    max: 3.7,
  });
}
function enemy(x, kind, boss = false) {
  let health = boss ? (kind === 4 ? 345 : 160 + kind * 18) : 34;
  return {
    x,
    y: GROUND,
    kind,
    boss,
    hp: health,
    max: health,
    time: 1.8,
    warn: 0,
    markedX: x,
    step: 0,
    hit: 0,
    action: 0,
    dying: 0,
    moving: false,
    slow: 0,
    home: x,
    dir: -1,
  };
}
function platforms() {
  if (scene.type === "gate") return [];
  if (scene.type === "floor")
    return [
      { x: 335, y: GROUND - 22, w: 74 },
      { x: 1260, y: GROUND - 22, w: 74 },
      { x: 1970, y: GROUND - 22, w: 74 },
    ];
  return [
    { x: 350, y: GROUND - 27, w: 85 },
    { x: 825, y: GROUND - 40, w: 76 },
  ];
}
function setScene() {
  worldWidth = mapWidths[scene.type];
  player.x = clamp(player.x, 20, worldWidth - 20);
  Object.assign(player, {
    y: GROUND,
    vy: 0,
    vx: 0,
    jumps: 0,
    dash: 0,
    inv: 0,
    dashCD: 0,
    attackCD: 0,
    swing: 0,
    buffer: 0,
    coyote: 0.09,
    grounded: true,
    drop: 0,
    castTime: 0,
    hurtTime: 0,
    landTime: 0,
    leapTime: 0,
    celebrate: 0,
    recover: 0,
  });
  cam = clamp(player.x - W * 0.42, 0, Math.max(0, worldWidth - W));
  shots = [];
  effects = [];
  texts = [];
  foes = [];
  cool.fill(0);
  keys.clear();
  if (scene.type === "floor" && scene.floor >= 2)
    foes = [enemy(440, 5), enemy(1840, 5)];
  if (scene.type === "arena" || (scene.type === "roof" && !progress.won))
    foes = [enemy(650, scene.subject, true)];
  near = findNear();
  refresh();
}
// Travel commits immediately for saves, dialogue and controls. The renderer keeps
// the last field frame on screen until the departure fade reaches full opacity.
let sceneTransition = null;
function go(type, f, x, sub = -1) {
  if (scene.type !== type || scene.floor !== f || scene.subject !== sub) {
    sceneTransition = {
      started: performance.now(),
      initialShade: Number($("scene-shade").style.opacity),
      arrived: null,
    };
    $("scene-arrival").style.opacity = "0";
  }
  scene = { type, floor: f, subject: sub };
  player.x = x;
  setScene();
  save();
}
function enterBattle(i,entryX=190) {
  if (
    i === 4
      ? progress.cleared.length !== 4
      : !hasKey(i) || progress.cleared.includes(i)
  )
    return;
  go(i === 4 ? "roof" : "arena", i === 4 ? 6 : 1, entryX, i);
  if (i === 4 && progress.won) return;
  dialogue("요룡이", "hero", subjects[i].intro, "전투 시작");
}
function winBoss(i) {
  tone(980, 0.4);
  hp = 100;
  mp = 60;
  shots = [];
  if (i === 4) {
    progress.won = true;
    save();
    refresh();
    dialogue(
      "요룡이",
      "hero",
      "옥상 위의 균열이 닫히고, 멈췄던 학교 종이 다시 울린다.<br>물리·화학·생명·지구, 여덟 학자의 지식이 부광의 아침을 되찾았다!",
      "엔딩 보기",
      () => {
        show(
          "ending",
          "부광의 아침을 되찾았다!",
          '<div class="award-seals">' + subjectIcons.map(name => '<i data-icon="earned-' + name + '"></i>').join("") +
          '</div><p>요룡이의 과학 모험을 완주했습니다.</p><div class="floorrow"><b>과학의 인장</b><span>4 / 4</span></div><div class="floorrow"><b>학자의 시련</b><span>8 / 8</span></div><button class="confirm" id="afterend">학교로 돌아가기</button>',
          false,
        );
        $("afterend").onclick = () => {
          closePanel();
          go("floor", 1, 580);
        };
      },
    );
    return;
  }
  if (!progress.cleared.includes(i)) progress.cleared.push(i);
  const room = subjects[i].lab;
  go("floor", 1, room === "물리지학실" ? 1790 : 2090);
  dialogue(
    "요룡이",
    "hero",
    "<b>" +
      subjects[i].seal +
      "</b>을 되찾았다! " +
      (progress.cleared.length === 4
        ? "네 인장이 모두 빛난다. 계단 위, 옥상 문이 열렸다!"
        : "다른 실험실에도 아직 과학의 기억이 남아 있어."),
    "모험 계속하기",
  );
}
function hitFoe(e, n, skill = -1) {
  if (e.dying || !foes.includes(e)) return;
  e.hp = Math.max(0, e.hp - n);
  e.hit = 0.19;
  texts.push({ x: e.x, y: e.y - (e.boss ? 83 : 34), n, life: 0.68 });
  spark(e.x, e.y - 28, "#ffe39b", 8);
  if (!effects.some(fx => fx.type === "impact" && fx.target === e && fx.max - fx.life < .065)) {
    combatEvent("impact", e.x, e.y - (e.boss ? 39 : 20), .31, { id: skill, target: e });
  }
  shake = Math.max(shake, 2);
  if (e.hp <= 0) {
    e.dying = 0.7;
    e.warn = 0;
    e.action = 0;
    combatEvent("defeat", e.x, e.y - (e.boss ? 48 : 15), .68, { kind: e.kind, boss: e.boss });
    if (e.boss) {
      shots = [];
      player.celebrate = 0.7;
      player.inv = 0.75;
    } else {
      mp = Math.min(60, mp + 7);
      tone(610);
    }
  }
}
function hurt(n) {
  if (player.inv > 0 || modal) return;
  hp = Math.max(0, hp - n);
  player.inv = 0.95;
  player.hurtTime = 0.26;
  shake = 4;
  tone(110, 0.18, "triangle");
  spark(player.x, player.y - 25, "#ffac9b", 9);
  combatEvent("hurt", player.x, player.y - 24, .3);
  if (!hp) {
    show(
      "down",
      "잠시 숨을 고르자",
      '<div class="conversation"><img class="portrait" src="assets/hero.png" alt=""><p>요룡이가 지쳤다. 익힌 스킬과 모은 인장을 간직한 채 다시 도전할 수 있다.</p></div><button class="confirm" id="retry">체력 회복 후 다시 도전</button>',
      false,
    );
    $("retry").onclick = () => {
      closePanel();
      hp = 100;
      mp = 60;
      go(
        scene.type,
        scene.floor,
        scene.type === "floor" ? STAIR : 190,
        scene.subject,
      );
      player.recover = 0.35;
    };
  }
}
function spark(x, y, color, num = 10) {
  for (let k = 0; k < num; k++)
    effects.push({
      type: "spark",
      x,
      y,
      vx: (Math.random() - 0.5) * 125,
      vy: -15 - Math.random() * 80,
      color,
      life: 0.22 + Math.random() * 0.35,
      max: 0.57,
    });
}
function attack() {
  if (player.attackCD > 0 || modal) return;
  player.attackCD = 0.34;
  player.swing = 0.2;
  combatEvent("slash", player.x, player.y - 29, .24, { dir: player.face });
  tone(260, 0.075, "triangle");
  for (const e of [...foes])
    if (
      (e.x - player.x) * player.face >= -19 &&
      (e.x - player.x) * player.face < 100 &&
      Math.abs(e.y - player.y) < 90
    )
      hitFoe(e, 16);
}
function cast(slot) {
  if (modal) return;
  let id = progress.slots[slot];
  if (id == null) {
    notify("학자의 시련으로 스킬을 배우고 K에서 배치하세요.");
    return;
  }
  if (cool[id] > 0) {
    notify("스킬이 다시 준비되고 있어요.");
    return;
  }
  if (mp < 7) {
    notify("마력이 회복될 때까지 기다리세요.");
    return;
  }
  player.castTime = 0.42;
  mp -= 7;
  cool[id] = scholars[id][10];
  const dir = player.face,
    x = player.x,
    y = player.y - 24,
    target = foes
      .filter((e) => (e.x - x) * dir >= -30 && Math.abs(e.x - x) < 390)
      .sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x))[0],
    tx = target?.x ?? clamp(x + dir * 132, 0, worldWidth);
  effects.push({
    type: "summon",
    x: clamp(x - dir * 38, 20, worldWidth - 20),
    y: player.y - 40,
    id,
    flip: dir < 0,
    max: 0.7,
    life: 0.7,
  });
  tone(420 + id * 51, 0.23, "triangle");
  const dmg = scholars[id][9];
  if ([0, 2].includes(id)) {
    shots.push({
      id,
      x: tx,
      y: GROUND - 155,
      vx: 0,
      vy: 245,
      life: 0.85,
      dir,
      dmg,
      area: 65,
      team: 0,
    });
  } else if (id === 6) {
    for (let k = 0; k < 3; k++)
      shots.push({
        id,
        x: tx + (k - 1) * dir * 28,
        y: GROUND - 33 - k * 34,
        vx: 0,
        vy: 205,
        life: 0.8,
        dir,
        dmg: k === 1 ? 14 : 12,
        area: 60,
        team: 0,
      });
  } else if (id === 7) {
    effects.push({
      type: "wave",
      x,
      y: player.y - 8,
      id,
      life: 0.65,
      max: 0.65,
    });
    for (const e of [...foes]) if (Math.abs(e.x - x) < 230) hitFoe(e, dmg, id);
  } else {
    let count = id === 3 ? 3 : 1;
    for (let i = 0; i < count; i++)
      shots.push({
        id,
        x: x + dir * 20,
        y: y + (i - 1) * (count > 1 ? 9 : 0),
        vx: dir * (id === 4 ? 240 : 340),
        lane: i,
        vy: count > 1 ? (i - 1) * 20 : 0,
        life: 1.55,
        dir,
        dmg,
        team: 0,
      });
  }
  if (id === 2) {
    hp = Math.min(100, hp + 10);
    combatEvent("heal", x, player.y, .55);
  }
  statusBars();
}
function attackPattern(e) {
  return e.kind === 4 ? e.step % 4 : e.kind;
}
function enemyShot(e) {
  e.action = 0.38;
  const k = attackPattern(e);
  if (e.kind === 4) e.step++;
  let dir = player.x >= e.x ? 1 : -1;
  if (k === 1 || k === 3) {
    for (let n = 0; n < (k === 3 ? 3 : 1); n++)
      shots.push({
        team: 1,
        rift: e.kind === 4,
        id: k,
        x: e.markedX + (k === 3 ? (n - 1) * 51 : 0),
        y: GROUND - 205 - n * 13,
        vx: 0,
        vy: 158 + n * 7,
        life: 2,
        dmg: 12,
      });
  } else
    shots.push({
      team: 1,
      rift: e.kind === 4,
      id: k,
      x: e.x + dir * 28,
      y: GROUND - (k === 2 ? 10 : 29),
      vx: dir * (k === 2 ? 186 : 162),
      vy: 0,
      life: 4,
      dmg: e.kind === 4 ? 16 : 12,
    });
  tone(160, 0.09, "triangle");
}
function step(dt) {
  if (modal) return;
  clock += dt;
  const p = player;
  for (const k of [
    "inv",
    "dashCD",
    "swing",
    "attackCD",
    "dash",
    "buffer",
    "castTime",
    "hurtTime",
    "landTime",
    "leapTime",
    "celebrate",
    "recover",
  ])
    p[k] = Math.max(0, p[k] - dt);
  cool = cool.map((n) => Math.max(0, n - dt));
  shake = Math.max(0, shake - dt * 12);
  mp = Math.min(60, mp + dt * 2.5);
  let axis = Number(keys.has("ArrowRight")) - Number(keys.has("ArrowLeft"));
  if (axis && p.dash <= 0) p.face = axis;
  p.vx = p.dash > 0 ? p.face * 420 : axis * 158;
  p.x = clamp(p.x + p.vx * dt, 17, worldWidth - 17);
  p.coyote = p.grounded ? 0.09 : Math.max(0, p.coyote - dt);
  p.drop = Math.max(0, p.drop - dt);
  if (p.buffer > 0 && keys.has("ArrowDown") && p.grounded && p.y < GROUND) {
    p.drop = 0.2;
    p.buffer = 0;
  }
  if (!p.grounded && !p.coyote && !p.jumps) p.jumps = 1;
  if (p.buffer > 0 && p.jumps < 2) {
    p.vy = p.jumps === 0 ? -213 : -192;
    p.jumps++;
    p.leapTime = 0.1;
    p.buffer = 0;
    spark(p.x, p.y, "#d5f5ff", 5);
    combatEvent(p.jumps === 2 ? "doubleJump" : "jump", p.x, p.y, .36);
    tone(p.jumps === 1 ? 520 : 710, 0.07);
  }
  const oldY = p.y,
    wasGrounded = p.grounded;
  p.grounded = false;
  p.vy += (p.vy > 0 ? 680 : 510) * dt;
  p.y += p.vy * dt;
  const landing =
    p.vy >= 0 && !p.drop
      ? platforms().find(
          (b) => Math.abs(p.x - b.x) < b.w / 2 + 2 && oldY <= b.y && p.y >= b.y,
        )
      : null;
  if (landing || p.y >= GROUND) {
    if (!wasGrounded && p.vy > 70) {
      p.landTime = 0.09;
      combatEvent("land", p.x, landing ? landing.y : GROUND, .29);
    }
    p.y = landing ? landing.y : GROUND;
    p.vy = 0;
    p.jumps = 0;
    p.grounded = true;
  }
  if (keys.has("KeyA")) attack();
  if (modal) return;
  cam +=
    (clamp(p.x - W * 0.42, 0, Math.max(0, worldWidth - W)) - cam) *
    (1 - Math.exp(-dt * 7));
  for (let e of [...foes]) {
    if (e.dying) {
      e.dying = Math.max(0, e.dying - dt);
      if (!e.dying) {
        foes = foes.filter((f) => f !== e);
        if (e.boss) {
          winBoss(e.kind);
          return;
        }
      }
      continue;
    }
    const previousX = e.x;
    e.action = Math.max(0, e.action - dt);
    e.hit = Math.max(0, e.hit - dt);
    e.slow = Math.max(0, e.slow - dt);
    const dist = p.x - e.x,
      d = Math.sign(dist) || 1;
    e.dir = d;
    if (!e.boss) {
      if (e.slow <= 0) {
        if (Math.abs(dist) < 186 && Math.abs(p.x - e.home) < 245)
          e.x += d * dt * 31;
        else e.x += (e.home + Math.sin(clock * 0.9 + e.home) * 36 - e.x) * dt;
      }
      e.y = GROUND - Math.abs(Math.sin(clock * 3 + e.home)) * 5;
    } else {
      if (!e.warn && Math.abs(dist) > 69 && e.slow <= 0)
        e.x += d * (e.kind === 4 ? 42 : 29) * dt;
      if (e.warn > 0) {
        e.warn -= dt;
        if (e.warn <= 0) {
          e.warn = 0;
          enemyShot(e);
          e.time = e.kind === 4 ? 1.45 : 2.15;
        }
      } else if ((e.time -= dt) <= 0) {
        e.warn = 0.85;
        e.markedX = p.x;
      }
    }
    e.moving = Math.abs(previousX - e.x) > 0.04;
    if (!e.boss) {
      e.time -= dt;
      if (e.warn > 0) {
        e.warn = Math.max(0, e.warn - dt);
        if (!e.warn) {
          e.action = 0.32;
          e.time = 1.35;
        }
      } else if (Math.abs(dist) < 55 && e.time <= 0) e.warn = 0.32;
    }
    if (Math.abs(dist) < (e.boss ? 34 : 19) && Math.abs(e.y - p.y) < 37)
      hurt(e.boss ? 12 : 5);
  }
  if (modal) return;
  for (let s of [...shots]) {
    s.life -= dt;
    s.age = (s.age || 0) + dt;
    if (s.id === 5 && !s.team) {
      let t = foes.find((e) => Math.abs(e.x - s.x) < 225);
      if (t) {
        let a = Math.atan2(t.y - 22 - s.y, t.x - s.x);
        s.vx = Math.cos(a) * 290;
        s.vy = Math.sin(a) * 290;
      }
      if (!reducedMotion.matches && Math.floor(s.age * 18) !== Math.floor((s.age - dt) * 18)) {
        s.trail ??= [];
        s.trail.unshift({ x: s.x, y: s.y, flip: s.vx < 0 });
        if (s.trail.length > 5) s.trail.pop();
      }
    }
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    if (s.team) {
      const contact = Math.abs(s.x - p.x) < 21 && Math.abs(s.y - (p.y - 23)) < 24;
      if (contact || s.y > GROUND) {
        if (contact) hurt(s.dmg);
        s.life = 0;
        combatEvent("enemyImpact", s.x, Math.min(GROUND - 3, s.y), .32, { id: s.id, rift: s.rift });
      }
    } else if (s.area) {
      if (s.y >= GROUND - 25) {
        s.life = 0;
        effects.push({
          type: "wave",
          id: s.id,
          x: s.x,
          y: GROUND - 6,
          life: 0.45,
          max: 0.45,
        });
        for (let e of [...foes])
          if (Math.abs(e.x - s.x) < s.area) hitFoe(e, s.dmg, s.id);
      }
    } else {
      let e = foes.find(
        (f) =>
          Math.abs(f.x - s.x) < (f.boss ? 38 : 18) &&
          Math.abs(f.y - 23 - s.y) < (f.boss ? 54 : 30),
      );
      if (e) {
        if (s.id === 4) e.slow = 2.2;
        hitFoe(e, s.dmg, s.id);
        s.life = 0;
      }
    }
    if (modal) break;
  }
  shots = shots.filter((s) => s.life > 0);
  for (let e of effects) {
    e.life -= dt;
    if (e.type === "spark") {
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.vy += 160 * dt;
    }
  }
  effects = effects.filter((e) => e.life > 0);
  for (let t of texts) {
    t.life -= dt;
    t.y -= dt * 31;
  }
  texts = texts.filter((t) => t.life > 0);
  near = findNear();
  if (clock - lastSaved > 2) {
    lastSaved = clock;
    save();
  }
}
function press(code, repeat = false) {
  if (modal) {
    if (
      !repeat &&
      code === "Escape" &&
      !["down", "ending", "dialogue"].includes(modal)
    )
      closePanel();
    else if (!repeat && code === "Enter" && modal === "dialogue")
      $("continue").click();
    return;
  }
  if (repeat) return;
  keys.add(code);
  if (code === "Escape") menu();
  if (code === "KeyK") showEquip();
  if (code === "KeyM") showMap();
  if (code === "AltLeft" || code === "AltRight" || code === "Space")
    player.buffer = 0.11;
  if (code === "ShiftLeft" || code === "ShiftRight") {
    if (player.dashCD <= 0) {
      player.dash = 0.19;
      player.inv = 0.25;
      player.dashCD = 0.75;
      spark(player.x, player.y - 7, "#abd9ec", 7);
      tone(310, 0.09);
    }
  }
  if (code === "KeyA") attack();
  if (["KeyQ", "KeyW", "KeyE", "KeyR"].includes(code))
    cast(slotKeys.indexOf(code.slice(-1)));
  if (code === "ArrowUp" || code === "Enter") interact();
  if(code==="ArrowDown" && !foes.some(e=>e.boss&&e.dying)){
    const stair=findNear();
    if(stair?.type==="stair" && scene.type!=="gate") leaveByStair(stair);
  }
}
const gameKeys = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "AltLeft",
  "AltRight",
  "ShiftRight",
  "ShiftLeft",
  "KeyA",
  "KeyQ",
  "KeyW",
  "KeyE",
  "KeyR",
  "KeyM",
  "KeyK",
  "Escape",
  "Space",
  "Enter",
]);
window.addEventListener("keydown", (e) => {
  if (modal && e.key === "Tab") {
    const buttons = $("panel").querySelectorAll("button:not(:disabled)");
    const first = buttons[0], last = buttons[buttons.length - 1];
    if ((e.shiftKey && document.activeElement === first) || (!e.shiftKey && document.activeElement === last)) {
      e.preventDefault();
      (e.shiftKey ? last : first)?.focus();
    }
    return;
  }
  const digit = /^(?:Digit|Numpad)([0-6])$/.exec(e.code);
  if (digit && (modal === "quiz" || modal === "stairs")) {
    if (!e.repeat) {
      const n = Number(digit[1]);
      const selector =
        modal === "quiz"
          ? '[data-answer="' + (n - 1) + '"]'
          : '[data-floor="' + n + '"]';
      $("panel").querySelector(selector)?.click();
    }
    e.preventDefault();
    return;
  }
  if (!gameKeys.has(e.code)) return;
  if (
    modal &&
    e.code !== "Escape" &&
    !(e.code === "Enter" && modal === "dialogue")
  )
    return;
  if (!modal && ["Enter", "Space"].includes(e.code) && e.target.closest?.("button"))
    return;
  e.preventDefault();
  press(e.code, e.repeat);
});
window.addEventListener("keyup", (e) => {
  keys.delete(e.code);
  if (
    (e.code === "AltLeft" || e.code === "AltRight" || e.code === "Space") &&
    player.vy < 0
  )
    player.vy *= 0.72;
});
window.addEventListener("blur", () => {
  keys.clear();
  save();
});
window.addEventListener("pagehide", save);
document.querySelectorAll("[data-key]").forEach((b) => {
  b.onpointerdown = (e) => {
    e.preventDefault();
    b.setPointerCapture(e.pointerId);
    b.classList.add("held");
    press(b.dataset.key);
  };
  b.onpointerup = b.onpointercancel = b.onlostpointercapture = () => {
    keys.delete(b.dataset.key);
    b.classList.remove("held");
  };
  b.onclick = (event) => { if (event.detail === 0) { press(b.dataset.key); keys.delete(b.dataset.key); } };
});
$("menu").onclick = menu;
$("minimap").onclick = showMap;
$("quest").onclick = showQuest;
$("loadout").onclick = () => showEquip();
$("controls").onclick = showHelp;
const smallField = window.matchMedia("(max-width: 600px), (max-height: 490px)");
let userMapExpanded = null;
function syncMinimap() {
  const expanded = userMapExpanded ?? !smallField.matches;
  $("mapview").hidden = !expanded;
  $("mapfold").setAttribute("aria-expanded", String(expanded));
  $("mapfold").ariaLabel = expanded ? "미니맵 접기" : "미니맵 펼치기";
}
$("mapfold").onclick = () => {
  userMapExpanded = $("mapview").hidden;
  syncMinimap();
};
smallField.addEventListener("change", syncMinimap);
syncMinimap();
async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await $("shell").requestFullscreen();
  } catch {
    if ($("full")) $("full").lastElementChild.textContent = "브라우저 전체화면을 이용하세요";
  }
}
function syncFullscreen() {
  if (!$("full")) return;
  const active = !!document.fullscreenElement;
  $("full").setAttribute("aria-pressed", String(active));
  $("full").lastElementChild.textContent = active ? "켜짐" : "꺼짐";
}
document.addEventListener("fullscreenchange", syncFullscreen);
$("slots").onclick = (e) => {
  let b = e.target.closest("[data-slot]");
  if (!b) return;
  let k = b.dataset.slot;
  if (k === "A") attack();
  else if (progress.slots[slotKeys.indexOf(k)] == null) showEquip(slotKeys.indexOf(k));
  else cast(slotKeys.indexOf(k));
};
function showSeal(i) {
  const s = subjects[i];
  show(
    "seal",
    s.seal,
    '<div class="seal-detail"><i data-icon="' + (progress.cleared.includes(i) ? "earned-" : "seal-") + subjectIcons[i] + '"></i><p>' +
      s.floor +
      "층에서 " +
      scholars[2 * i][0] +
      "와 " +
      scholars[2 * i + 1][0] +
      "의 시련을 통과하세요. " +
      s.key +
      "로 1층 " +
      s.lab +
      "에 들어가 " +
      s.boss +
      '을 물리치면 얻습니다.</p></div><div class="floorrow"><b>수집 상태</b><span>' +
      (progress.cleared.includes(i) ? "획득" : "미획득") +
      '</span></div><button class="rowbtn" id="backjournal">모험 일지로 돌아가기</button>',
  );
  $("backjournal").onclick = showQuest;
}
load();
setScene();
if (resumeFoe) {
  const boss = foes.find((e) => e.boss && e.kind === resumeFoe.kind);
  if (boss && Number.isFinite(resumeFoe.hp) && Number.isFinite(resumeFoe.x)) {
    boss.hp = clamp(resumeFoe.hp, 0, boss.max);
    if (!boss.hp) boss.dying = 0.35;
    boss.x = clamp(resumeFoe.x, 20, worldWidth - 20);
  }
  resumeFoe = null;
}
