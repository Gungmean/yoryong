"use strict";
const $ = (id) => document.getElementById(id),
  clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const SAVE = "bugwang-quest-v1",
  GATE_START = 240,
  GROUND = 318,
  STAIR = 1110;
let W = 800,
  H = 360,
  cam = 0,
  clock = 0,
  modal = "",
  sound = true,
  toastUntil = 0,
  lastSaved = 0;
let scene = { type: "gate", floor: 0, subject: -1 },
  worldWidth = 1140;
let player = {
  x: GATE_START,
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
function newProgress() {
  return { learned: [], cleared: [], slots: [null, null, null, null], won: false, intro: false };
}
let progress = newProgress();
let runGeneration = 0;
let hp = 100,
  mp = 60,
  keys = new Set(),
  foes = [],
  shots = [],
  effects = [],
  texts = [],
  cool = Array(8).fill(0),
  shake = 0,
  contactPause = 0,
  near = null,
  resumeFoe = null;
const mapWidths = { gate: 1140, floor: 2290, arena: 1040, roof: 1040, classroom: 1080 };
const sideStairs = Object.fromEntries(
  Object.entries(mapWidths).map(([type, width]) => {
    const inside = type === "classroom", inset = inside ? 52 : 64;
    return [type, [
      { x: inset, name: inside ? "앞문" : "서쪽 계단", side: "west", type: "stair" },
      { x: width - inset, name: inside ? "뒷문" : "동쪽 계단", side: "east", type: "stair" },
    ]];
  }),
);
const hallBays = floors.map((layout) => [
  sideStairs.floor[0],
  ...layout.map(([x, name, room]) =>
    name === "계단"
      ? { x, name: "중앙 계단", side: "center", type: "stair" }
      : { x, name, room, type: "room" },
  ),
  sideStairs.floor[1],
]);
function classroomDoor(floor, room) {
  if (!Number.isInteger(floor) || !Number.isInteger(room)) return;
  return hallBays[floor]?.find(bay => bay.room === room);
}
const classroomBoard = { x: mapWidths.classroom / 2, name: "칠판 읽기", type: "board" };
function stairX(type, side) {
  return sideStairs[type].find((stair) => stair.side === side)?.x ?? STAIR;
}
function cameraTarget() {
  if (scene.type === "classroom" && W > worldWidth) return (worldWidth - W) / 2;
  const boss = foes.find(e => e.boss);
  if (boss && W < 410 && Math.abs(player.x - boss.x) < W * .78)
    return clamp((player.x + boss.x) / 2 - W / 2, 0, Math.max(0, worldWidth - W));
  return clamp(player.x - W * .42, 0, Math.max(0, worldWidth - W));
}
const assets = {};
assets.classrooms = new Image();
assets.classrooms.src = classroomAtlasURL;
assets.combat = new Image();
assets.combat.src = "assets/combat/effects.webp";
assets.spellFX = new Image();
assets.spellFX.src = "assets/combat/pixelfx.webp";
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
function floorName() {
  if (scene.type === "classroom") return classroomDoor(scene.floor, scene.room).name;
  if (scene.type === "gate") return "부광고등학교 정문";
  if (scene.type === "arena") return subjects[scene.subject].room;
  if (scene.type === "roof") return "옥상 · 기억의 균열";
  return scene.floor + "층 중앙 복도";
}
const hasKey = (i) =>
  progress.learned.includes(i * 2) && progress.learned.includes(i * 2 + 1);
function notify(msg) {
  $("toast").textContent = msg;
  $("toast").classList.add("on");
  toastUntil = performance.now() + 2600;
}
const musicTracks = { campus: $("campus-music"), battle: $("battle-music") };
let musicEnabled = true, musicUnlocked = false;
let musicTrack = "", musicFade = 0;
function sceneMusic() {
  return scene.type === "arena" || (scene.type === "roof" && !progress.won) ? "battle" : "campus";
}
function crossfadeMusic(incoming, outgoing) {
  const from = incoming.volume, other = outgoing.volume, start = performance.now();
  // Some mobile players reserve volume control for the device.
  if (from === 1 && !outgoing.paused && other === 1) outgoing.pause();
  function fade(now) {
    const t = clamp((now - start) / 320, 0, 1);
    incoming.volume = from + (1 - from) * t;
    outgoing.volume = other * (1 - t);
    if (t < 1) musicFade = requestAnimationFrame(fade);
    else outgoing.pause();
  }
  musicFade = requestAnimationFrame(fade);
}
function pauseMusic() {
  cancelAnimationFrame(musicFade);
  for (const track of Object.values(musicTracks)) track.pause();
}
function syncMusic() {
  if (!musicEnabled || !musicUnlocked || document.hidden) {
    pauseMusic();
    return;
  }
  const track = sceneMusic();
  const incoming = musicTracks[track], outgoing = track === "campus" ? musicTracks.battle : musicTracks.campus;
  if (musicTrack === track && !incoming.paused) return;
  cancelAnimationFrame(musicFade);
  musicTrack = track;
  if (!incoming.hasAttribute("src")) incoming.src = "assets/audio/" + track + ".mp3";
  if (incoming.paused) incoming.volume = 0;
  incoming.play().then(() => {
    if (musicTrack !== track || incoming.paused || !musicEnabled || document.hidden) return;
    cancelAnimationFrame(musicFade);
    crossfadeMusic(incoming, outgoing);
  }).catch(error => {
    if (musicTrack !== track || error.name === "AbortError") return;
    pauseMusic();
    if (error.name === "NotAllowedError") musicUnlocked = false;
  });
}
function unlockMusic(event) {
  if (!event.isTrusted || musicUnlocked) return;
  musicUnlocked = true;
  syncMusic();
}
// Touch grants media activation on release. A paused track keeps its playhead without an HTTP seek.
for (const event of ["keydown", "pointerup", "click"]) {
  document.addEventListener(event, unlockMusic, true);
}
document.addEventListener("visibilitychange", syncMusic);
window.addEventListener("pagehide", pauseMusic);
window.addEventListener("pageshow", syncMusic);
function parseSave(raw) {
  try { return JSON.parse(raw); } catch { return null; }
}
function save() {
  try {
    // A background tab can autosave or close before its storage event arrives.
    if (parseSave(localStorage.getItem(SAVE))?.generation > runGeneration) return;
    const boss = foes.find((e) => e.boss);
    const encounter =
      boss && hp > 0 ? { kind: boss.kind, x: boss.x, hp: boss.hp, max: boss.max } : null;
    localStorage.setItem(
      SAVE,
      JSON.stringify({
        generation: runGeneration,
        progress,
        scene,
        x: player.x,
        hp,
        mp,
        sound,
        musicEnabled,
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
    const d = parseSave(localStorage.getItem(SAVE));
    if (
      !d ||
      !Array.isArray(d.progress?.learned) ||
      !Array.isArray(d.progress?.slots)
    )
      return;
    runGeneration = Number.isSafeInteger(d.generation) ? d.generation : 0;
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
    progress.intro = !!d.progress.intro || progress.learned.length > 0;
    progress.won = d.progress.won && progress.cleared.length === 4;
    const s = d.scene || {};
    if (
      s.type === "floor" &&
      Number.isInteger(s.floor) &&
      s.floor >= 1 &&
      s.floor <= 5
    )
      scene = { type: "floor", floor: s.floor, subject: -1 };
    if (s.type === "classroom" && classroomDoor(s.floor, s.room))
      scene = { type: "classroom", floor: s.floor, room: s.room, subject: -1 };
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
    if (scene.type !== "gate") progress.intro = true;
    player.x = Number.isFinite(d.x) ? d.x : GATE_START;
    hp = clamp(Number(d.hp) || 100, 1, 100);
    mp = clamp(Number(d.mp) || 0, 0, 60);
    sound = d.sound !== false;
    musicEnabled = d.musicEnabled !== false;
    sceneryPaused = d.sceneryPaused === true;
    resumeFoe = d.encounter;
    return true;
  } catch {}
}
function refresh() {
  syncQuest();
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
  const meter = $("boss-meter");
  meter.hidden = !b;
  const warning = b?.warn > 0 ? b.plan.move.name + " · " + b.plan.move.hint : "";
  if ($("boss-warning").textContent !== warning) $("boss-warning").textContent = warning;
  if (b) {
    const health = (100 * b.hp) / b.max;
    const percent = Math.ceil(health);
    meter.style.setProperty("--boss-health", health + "%");
    meter.setAttribute("aria-label", subjects[b.kind].boss + " 체력");
    meter.setAttribute("aria-valuenow", String(percent));
    meter.setAttribute("aria-valuetext", percent + "% · " + bossPhase(b) + "단계");
  }
  document.querySelectorAll(".slot .timer").forEach((el, i) => {
    let cd = i ? cool[progress.slots[i - 1]] : 0;
    el.textContent = cd > 0 ? cd.toFixed(1) : "";
  });
}
function show(kind, title, body, canClose = true) {
  if (["menu", "map", "equip", "quest", "help", "seal"].includes(kind)) playEffect("select");
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
    lab: "flask", down: "rose", ending: "globe", seal: "globe",
    dialogue: "quest", quiz: "atom", help: "map", reset: "globe" };
  $("panel").innerHTML = `<div class="panel-head"><i data-icon="${marks[kind]}"></i>
    <div class="book-title"><h2 id="paneltitle">${title}</h2>
    ${kind === "menu" ? '<p>부광고등학교 <span>창의(創意)</span></p>' : ''}</div>
    ${canClose ? '<button class="close" aria-label="닫기" data-close><i data-icon="close"></i></button>' : ''}
    </div><div class="panel-body">${body}</div>`;
  decorate($("panel"));
  $("panel")
    .querySelector("[data-close]")
    ?.addEventListener("click", dismissPanel);
  $("panel").scrollTop = 0;
  ($("panel").querySelector(".panel-body button:not(:disabled)") || $("panel").querySelector("button"))?.focus({ preventScroll: true });
}
function dismissPanel() {
  if (modal === "reset") $("cancel").click();
  else closePanel();
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
      '<p class="small">' + (scene.type === "classroom"
        ? floorName() + "의 앞문이나 뒷문에서 ↑를 누르면 " + scene.floor + "층 복도로 돌아갑니다."
        : "서쪽·중앙·동쪽 계단 옆에서 ↑로 바로 위층, ↓로 바로 아래층에 갈 수 있습니다.") + "</p>",
  );
  miniMap();
  $("mapdetail").getContext("2d").drawImage($("mapview"), 0, 0);
}
function showQuest() {
  const q = trackedQuest;
  const cue = chooseQuestLeg()?.cue || freeExplore;
  const reward = q.reward + (q.kind === "trial" && progress.learned.includes(q.id ^ 1) ? " · " + subjects[Math.floor(q.id / 2)].key : "");
  show(
    "quest",
    "모험 일지",
    `<section class="quest-brief"><img src="assets/${q.art}.png" alt="">
      <div><small>${q === epilogue ? "탐험 완료" : "메인 퀘스트"} · ${q.chapter}</small><h3>${q.title}</h3><p>${q.story}</p></div>
      <dl><dt>목적지</dt><dd>${q.place}</dd><dt>지금 할 일</dt><dd>${cue}</dd>
      ${q.kind === "boss" ? "<dt>전투 단서</dt><dd>" + subjects[q.id].hint + "</dd>" : ""}
      <dt>${q === epilogue ? "이후" : "보상"}</dt><dd>${reward}</dd></dl></section>
      <h3 class="collection-heading">과학의 인장 <small>${progress.cleared.length} / 4</small></h3>` +
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
      <button class="rowbtn" id="toquest"><i data-icon="quest"></i>모험 일지 · 인장 <kbd>J</kbd></button>
      <button class="rowbtn" id="help"><i data-icon="globe"></i>조작 안내</button>
    </div>
    <section aria-labelledby="settings-title">
    <h3 class="choice-title" id="settings-title">설정</h3>
    <div class="settings-list">
      <button class="rowbtn" id="music" aria-pressed="${musicEnabled}">배경음악<b class="switch-state">${musicEnabled ? "켜짐" : "꺼짐"}</b></button>
      <button class="rowbtn" id="sound" aria-pressed="${sound}">효과음<b class="switch-state">${sound ? "켜짐" : "꺼짐"}</b></button>
      <button class="rowbtn" id="full">전체화면<b class="switch-state"></b></button>
      <button class="rowbtn" id="motion"><span>배경 움직임</span><b class="switch-state"></b></button>
      <button class="rowbtn" id="reset" aria-haspopup="dialog">게임 초기화</button>
    </div></section>
    <p class="save-note"><i data-icon="save"></i><span id="savestatus">${saveMessage}</span></p>`);
  $("resume").onclick = closePanel;
  $("tomap").onclick = showMap;
  $("toequip").onclick = () => showEquip();
  $("toquest").onclick = showQuest;
  $("help").onclick = showHelp;
  $("music").onclick = () => {
    musicEnabled = !musicEnabled;
    $("music").setAttribute("aria-pressed", String(musicEnabled));
    $("music").lastElementChild.textContent = musicEnabled ? "켜짐" : "꺼짐";
    syncMusic();
    save();
  };
  $("sound").onclick = () => {
    sound = !sound;
    $("sound").setAttribute("aria-pressed", String(sound));
    $("sound").lastElementChild.textContent = sound ? "켜짐" : "꺼짐";
    if (sound) {
      unlockEffects();
      playEffect("select");
    } else stopEffects();
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
  $("reset").onclick = confirmReset;
}
function confirmReset() {
  show("reset", "게임을 초기화할까요?",
    '<p>이 브라우저에서 배운 스킬과 배치, 모은 열쇠와 인장, 보스와 엔딩 기록을 모두 지웁니다. 새 모험은 학교 정문에서 시작합니다.</p>' +
    '<div class="grid"><button class="rowbtn" id="cancel">취소</button><button class="confirm" id="yes">초기화하고 시작</button></div>');
  $("cancel").onclick = () => {
    menu();
    $("reset").focus();
  };
  $("yes").onclick = () => {
    runGeneration++;
    progress = newProgress();
    resetQuestNotices();
    hp = 100;
    mp = 60;
    player.face = 1;
    shake = 0;
    closePanel();
    go("gate", 0, GATE_START);
    announceQuest();
    $("world").focus({ preventScroll: true });
    notify(saveMessage === "자동 저장" ? "새 모험을 시작했습니다." : "이 창에서 새 모험을 시작했습니다. 브라우저에 저장할 수 없습니다.");
  };
}
function showHelp() {
  show("help", "조작 안내", [
    ["← →", "좌우 이동"], ["Alt", "점프 · 공중에서 더블 점프"],
    ["↓ + Alt", "발판 내려오기"], ["Shift", "회피 대시"],
    ["A", "기본 공격"], ["Q W E R", "장착한 스킬 사용"], ["K", "스킬 배치"],
    ["↑", "대화 · 입장 · 계단 한 층 올라가기"], ["↓", "계단에서 한 층 내려가기"],
    ["숫자", "문제 답 고르기"], ["M", "캠퍼스 지도"], ["J", "모험 일지"], ["Esc", "메뉴 · 닫기"]
  ].map(([key, action]) => `<div class="help-row"><kbd>${key}</kbd><span>${action}</span></div>`).join(""));
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
            playEffect("wrong");
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
          announceQuest(trialQuests[id]);
          playEffect("correct");
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
            (trackedQuest === bossQuests[i] ? ' <em class="quest-choice">퀘스트 목적지</em>' : "") +
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
function scholarPoint(id) {
  return { x: id % 2 ? 1510 : 706, name: scholars[id][0], type: "scholar", id };
}
function objects() {
  if (scene.type === "classroom") return [...sideStairs.classroom, classroomBoard];
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
        a.push(scholarPoint(id));
      }
    return a;
  }
  return sideStairs[scene.type];
}
function travelStair(stair, direction) {
  if (scene.type === "classroom") {
    playEffect("door");
    go("floor", scene.floor, classroomDoor(scene.floor, scene.room).x);
    return;
  }
  if (scene.type === "arena") {
    playEffect("door");
    go("floor", 1, subjects[scene.subject].lab === "물리지학실" ? 1790 : 2090);
    return;
  }
  if (sceneTransition?.arrived === null && !reducedMotion.matches) return;
  if (scene.type === "roof") {
    if (direction < 0) {
      playEffect("stairs");
      go("floor", 5, stairX("floor", stair.side));
    } else notify("↓를 눌러 5층으로 내려갈 수 있어요.");
    return;
  }
  if (scene.type !== "floor") return;
  const next = scene.floor + direction;
  if (next === 6) {
    if (progress.cleared.length < 4) {
      playEffect("wrong");
      notify("옥상 문을 열려면 과학의 인장 4개가 필요해요. " + progress.cleared.length + "/4");
      return;
    }
    enterBattle(4, stair.side === "center" ? 190 : stairX("roof", stair.side));
  } else if (next === 0) {
    if (stair.side !== "center") {
      playEffect("stairs");
      go("gate", 0, stairX("gate", stair.side));
    } else notify("교문으로 가려면 중앙 현관이나 양끝 계단을 이용하세요.");
  } else {
    playEffect("stairs");
    go("floor", next, stair.x);
  }
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
  if (scene.type === "gate") {
    playEffect(o.type === "stair" ? "stairs" : "door");
    const firstEntry = !progress.intro;
    progress.intro = true;
    go("floor", 1, o.type === "stair" ? stairX("floor", o.side) : 580);
    if (firstEntry) {
      announceQuest(entranceQuest);
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
    travelStair(o, 1);
    return;
  }
  if (o.type === "scholar") {
    playEffect("talk");
    quiz(o.id);
    return;
  }
  if (o.room) {
    playEffect("door");
    go("classroom", scene.floor, sideStairs.classroom[0].x, -1, o.room);
    return;
  }
  if (o.type === "board") {
    playEffect("page");
    bubble(classroomNotes[scene.floor - 3][scene.room - 1]);
    return;
  }
  if (o.name.endsWith("학실") || o.name === "물리지학실") {
    playEffect("select");
    labChoice(o.name);
    return;
  }
  if (o.name === "중앙 현관") {
    playEffect("door");
    go("gate", 0, 640);
    return;
  }
  if (o.name === "매점") {
    playEffect("recovery");
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
  const stats = bossStats[kind];
  const health = boss ? stats.hp : 34;
  return {
    x,
    y: GROUND,
    kind,
    boss,
    height: boss ? stats.height : 27,
    half: boss ? stats.half : 18,
    hp: health,
    max: health,
    time: 1.8,
    warn: 0,
    bolts: [],
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
  if (scene.type === "classroom") return [
    { x: 278 + (scene.room % 3) * 15, y: GROUND - 39, w: 80 },
    { x: 732 + (scene.room % 4) * 13, y: GROUND - 39, w: 80 },
  ];
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
// Source rectangles, world positions and depths are shared by WebGL and Canvas 2D.
function classroomPanels() {
  return [
    { sx: 0, sy: (scene.floor - 3) * H, sw: 1080, sh: H, x: 0, y: 0, w: worldWidth, h: H, z: -200 },
    ...platforms().map((desk, index) => ({
      sx: 2 + 136 * ((scene.room - 1 + index) % 3), sy: 1082, sw: 132, sh: 96,
      x: desk.x - desk.w / 2, y: desk.y - 19, w: desk.w, h: 58, z: 0,
    })),
  ];
}
function setScene() {
  contactPause = 0;
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
    stepDistance: 0,
  });
  cam = cameraTarget();
  shots = [];
  bossZones.length = 0;
  effects = [];
  texts = [];
  foes = [];
  cool.fill(0);
  keys.clear();
  if (scene.type === "floor" && scene.floor >= 2)
    foes = [enemy(440, 5), enemy(1840, 5)];
  if (scene.type === "arena" || (scene.type === "roof" && !progress.won))
    foes = [enemy(scene.type === "roof" ? 638 : 603, scene.subject, true)];
  near = findNear();
  refresh();
  syncMusic();
}
// Travel commits immediately for saves, dialogue and controls. The renderer keeps
// the last field frame on screen until the departure fade reaches full opacity.
let sceneTransition = null;
function go(type, f, x, sub = -1, room) {
  if (scene.type !== type || scene.floor !== f || scene.subject !== sub || scene.room !== room) {
    sceneTransition = {
      started: performance.now(),
      initialShade: Number($("scene-shade").style.opacity),
      arrived: null,
    };
    $("scene-arrival").style.opacity = "0";
  }
  scene = { type, floor: f, subject: sub, room };
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
  playEffect("door");
  go(i === 4 ? "roof" : "arena", i === 4 ? 6 : 1, entryX, i);
  if (i === 4 && progress.won) return;
  dialogue("요룡이", "hero", subjects[i].intro, "전투 시작");
}
function winBoss(i) {
  playEffect("bossVictory");
  hp = 100;
  mp = 60;
  shots = [];
  if (i === 4) {
    progress.won = true;
    syncMusic();
    save();
    refresh();
    announceQuest(bossQuests[i]);
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
          '</div><p>요룡이의 과학 모험을 완주했습니다.</p><div class="floorrow"><b>과학의 인장</b><span>4 / 4</span></div><div class="floorrow"><b>학자의 시련</b><span>8 / 8</span></div><button class="confirm" id="afterend">옥상 둘러보기</button>',
          false,
        );
        $("afterend").onclick = closePanel;
      },
    );
    return;
  }
  if (!progress.cleared.includes(i)) progress.cleared.push(i);
  const room = subjects[i].lab;
  go("floor", 1, room === "물리지학실" ? 1790 : 2090);
  announceQuest(bossQuests[i]);
  dialogue(
    "요룡이",
    "hero",
    "<b>" +
      subjects[i].seal +
      "</b>을 되찾았다! " +
      (progress.cleared.length === 4
        ? "네 인장이 모두 빛난다. 5층을 지나 열린 옥상으로 올라가자!"
        : "다른 실험실에도 아직 과학의 기억이 남아 있어."),
    "모험 계속하기",
  );
}
function hitFoe(e, n, skill = -1, dir = player.face) {
  if (e.dying || !foes.includes(e)) return;
  const wasAboveHalf = e.boss && bossPhase(e) === 1;
  e.hp = Math.max(0, e.hp - n);
  e.hit = 0.19;
  const chest = e.y - (e.boss ? e.height * .42 : 20);
  texts.push({ x: e.x, y: chest - (e.boss ? 33 : 14), n, life: 0.68 });
  spark(e.x, chest - 8, "#ffe39b", 8);
  if (!effects.some(fx => fx.type === "impact" && fx.target === e && fx.id === skill && fx.max - fx.life < .065)) {
    playEffect("hit", skill >= 0 ? .82 : 1);
    combatEvent("impact", e.x, chest, .36, { id: skill, dir, target: e });
    if (!reducedMotion.matches) contactPause = Math.max(contactPause, e.hp === 0 && e.boss ? .05 : 1 / 60);
  }
  shake = Math.max(shake, 2);
  if (wasAboveHalf && e.hp > 0 && bossPhase(e) === 2) {
    combatEvent("bossPhaseShift", e.x, e.y, .8, { kind: e.kind, height: e.height });
    if (!reducedMotion.matches) shake = Math.max(shake, 8);
    playEffect("phase");
  }
  if (e.hp <= 0) {
    e.dying = 0.7;
    e.warn = 0;
    e.action = 0;
    combatEvent("defeat", e.x, chest, .68, { kind: e.kind, boss: e.boss, scale: e.boss ? e.height / 110 : .62 });
    if (e.boss) {
      shots = [];
      bossZones.length = 0;
      e.rush = null;
      player.celebrate = 0.7;
      player.inv = 0.75;
    } else {
      mp = Math.min(60, mp + 7);
      playEffect("defeat");
    }
  }
}
function hurt(n) {
  if (player.inv > 0 || modal) return;
  hp = Math.max(0, hp - n);
  player.inv = 0.95;
  player.hurtTime = 0.26;
  shake = 4;
  playEffect("hurt");
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
        scene.room,
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
  playEffect("slash");
  for (const e of [...foes])
    if (
      (e.x - player.x) * player.face >= -19 - (e.boss ? e.half : 0) &&
      (e.x - player.x) * player.face < (e.boss ? 64 + e.half : 100) &&
      Math.abs(e.y - player.y) < (e.boss ? e.height : 90)
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
  playEffect(skillSounds[id]);
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
    playEffect("recovery", .65);
    combatEvent("heal", x, player.y, .55);
  }
  statusBars();
}
function step(dt) {
  if (modal) return;
  if (contactPause > 0) {
    contactPause = Math.max(0, contactPause - dt);
    return;
  }
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
  const oldX = p.x;
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
    playEffect(p.jumps === 1 ? "jump" : "doubleJump");
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
      playEffect(footstepSound(!!landing), 1.55);
    }
    p.y = landing ? landing.y : GROUND;
    p.vy = 0;
    p.jumps = 0;
    p.grounded = true;
  }
  if (axis && p.grounded && wasGrounded && p.dash <= 0) {
    p.stepDistance += Math.abs(p.x - oldX);
    if (p.stepDistance >= 34) {
      p.stepDistance -= 34;
      playEffect(footstepSound(p.y < GROUND));
    }
  } else if (!p.grounded) p.stepDistance = 0;
  if (keys.has("KeyA")) attack();
  if (modal) return;
  cam +=
    (cameraTarget() - cam) *
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
    if (!e.boss) {
      e.dir = d;
      if (e.slow <= 0) {
        if (Math.abs(dist) < 186 && Math.abs(p.x - e.home) < 245)
          e.x += d * dt * 31;
        else e.x += (e.home + Math.sin(clock * 0.9 + e.home) * 36 - e.x) * dt;
      }
      e.y = GROUND - Math.abs(Math.sin(clock * 3 + e.home)) * 5;
    } else stepBoss(e, dt);
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
    if (!e.boss && Math.abs(dist) < 19 && Math.abs(e.y - p.y) < 37) hurt(5);
    if (e.boss && !e.rush && Math.abs(e.x - p.x) < 23 && p.y > GROUND - 31) hurt(8);
  }
  if (modal) return;
  stepBossZones(dt);
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
    }
    // Sample world positions before movement so trails follow turns, camera motion and falling shots.
    if (!reducedMotion.matches && s.id !== 6 && (!s.trail || Math.floor(s.age * 25) !== Math.floor((s.age - dt) * 25))) {
      s.trail ??= [];
      s.trail.unshift({ x: s.x, y: s.y, flip: s.vx < 0 });
      if (s.trail.length > 8) s.trail.pop();
    }
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    if (s.team) {
      const contact = Math.abs(s.x - p.x) < (s.rx ?? 21) && Math.abs(s.y - (p.y - 23)) < (s.ry ?? 24);
      if (contact || s.y > GROUND) {
        if (contact) hurt(s.dmg);
        s.life = 0;
        combatEvent("enemyImpact", s.x, Math.min(GROUND - 3, s.y), .47, { id: s.id, rift: s.rift, dir: Math.sign(s.vx) || 1 });
        playEffect(s.rift ? "impactRoof" : bossImpactSounds[s.id], .74);
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
          if (Math.abs(e.x - s.x) < s.area + (e.boss ? e.half : 0)) hitFoe(e, s.dmg, s.id, s.dir);
      }
    } else {
      let e = foes.find(
        (f) =>
          Math.abs(f.x - s.x) < f.half &&
          s.y >= f.y - (f.boss ? f.height : 53) && s.y <= f.y + 7,
      );
      if (e) {
        if (s.id === 4) e.slow = 2.2;
        hitFoe(e, s.dmg, s.id, Math.sign(s.vx) || s.dir);
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
      dismissPanel();
    else if (!repeat && code === "Enter" && modal === "dialogue")
      $("continue").click();
    return;
  }
  if (repeat) return;
  keys.add(code);
  if (code === "Escape") menu();
  if (code === "KeyK") showEquip();
  if (code === "KeyM") showMap();
  if (code === "KeyJ") showQuest();
  if (code === "AltLeft" || code === "AltRight" || code === "Space")
    player.buffer = 0.11;
  if (code === "ShiftLeft" || code === "ShiftRight") {
    if (player.dashCD <= 0) {
      player.dash = 0.19;
      player.inv = 0.25;
      player.dashCD = 0.75;
      spark(player.x, player.y - 7, "#abd9ec", 7);
      playEffect("dash");
    }
  }
  if (code === "KeyA") attack();
  if (["KeyQ", "KeyW", "KeyE", "KeyR"].includes(code))
    cast(slotKeys.indexOf(code.slice(-1)));
  if (code === "ArrowUp" || code === "Enter") interact();
  if (code === "ArrowDown" && !foes.some(e => e.boss && e.dying)) {
    const stair = findNear();
    if (stair?.type === "stair") travelStair(stair, -1);
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
  "KeyJ",
  "KeyK",
  "Escape",
  "Space",
  "Enter",
]);
window.addEventListener("keydown", (e) => {
  if (modal === "quest" && e.code === "KeyJ") {
    e.preventDefault();
    if (!e.repeat) closePanel();
    return;
  }
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
  if (digit && modal === "quiz") {
    if (!e.repeat) {
      $("panel").querySelector('[data-answer="' + (Number(digit[1]) - 1) + '"]')?.click();
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
window.addEventListener("storage", (event) => {
  if (event.key === SAVE && parseSave(event.newValue)?.generation > runGeneration) location.reload();
});
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
const continuingRun = load();
setScene();
if (!continuingRun) announceQuest();
if (resumeFoe) {
  const boss = foes.find((e) => e.boss && e.kind === resumeFoe.kind);
  if (boss && Number.isFinite(resumeFoe.hp) && Number.isFinite(resumeFoe.x)) {
    const savedMax = resumeFoe.max > 0 ? resumeFoe.max : bossStats[boss.kind].oldHp;
    boss.hp = clamp(resumeFoe.hp / savedMax, 0, 1) * boss.max;
    if (!boss.hp) boss.dying = 0.35;
    boss.x = clamp(resumeFoe.x, boss.half, worldWidth - boss.half);
  }
  resumeFoe = null;
}
