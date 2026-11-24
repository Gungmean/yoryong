"use strict";

const techniqueInk = [
  ["#802d29", "#ff7040", "#ffe3a0"], ["#244471", "#57cfff", "#e3fbff"],
  ["#6d4b25", "#ffbd4c", "#fff0b4"], ["#4a3879", "#bca0ff", "#f7dbff"],
  ["#295544", "#8be26c", "#eaffb3"], ["#7c4528", "#ffa957", "#fff1a0"],
  ["#654331", "#ff9853", "#ffdf99"], ["#7b3d4a", "#ffc365", "#fff2c5"],
];
const techniqueShade = ["#401822", "#102647", "#3c291b", "#2d204c", "#1c3a32", "#3c2a20", "#362129", "#372438"];
const cutInBeds = ["#301c25", "#172943", "#32261a", "#2c2045", "#183323", "#38221a", "#352620", "#382128"];

function drawWardTechniqueBack() {
  if (quietCombat()) return;
  const cast = foes.find(e => e.wardCast)?.wardCast;
  const impact = effects.find(fx => fx.type === "wardImpact");
  if (!cast && !impact) return;
  const opacity = cast ? Math.min(.23, cast.elapsed * .9) : .22 * impact.life / impact.max;
  g.save();
  g.globalAlpha *= opacity;
  r(-18, 0, W + 36, H, techniqueShade[(cast ?? impact).id]);
  g.restore();
}

function drawWardSprite(id, x, y, height, dir, progress, impact) {
  const width = 240, cellHeight = 128, frames = 12;
  const sheet = id < 4 ? assets.wardMotionA : assets.wardMotionB;
  if (!sheet.naturalWidth) return;
  const quiet = quietCombat();
  const frame = quiet ? (impact ? 3 : 9) : Math.min(frames - 1, Math.floor(progress * frames));
  const row = (id % 4) * 2 + Number(impact);
  const scale = clamp(2.02 * height / 170, 1.83, 2.32);
  g.save();
  if (quiet) g.globalAlpha *= impact ? .73 * (1 - progress) : .65;
  drawFieldCell(sheet, frame * width, row * cellHeight, width, cellHeight,
    width / 2, 116, x, y, scale, scale, dir < 0);
  g.restore();
}

function drawWardTechniques() {
  for (const boss of foes) {
    const cast = boss.wardCast;
    if (!cast) continue;
    drawWardSprite(cast.id, boss.x - cam, boss.y, boss.height, cast.dir, cast.elapsed / wardChoreography[cast.id].impact, false);
  }
  for (const fx of effects) {
    if (fx.type !== "wardImpact") continue;
    drawWardSprite(fx.id, fx.x - cam, fx.y, fx.height, fx.dir, 1 - fx.life / fx.max, true);
  }
}

const cutInBolts = $("cut-in-bolts");
const cutInBand = document.querySelector(".cut-in-band");
const cutInInk = cutInBolts.getContext("2d");

function drawCutInLightning() {
  if (!cutInRemaining) return;
  const cutIn = $("scholar-cut-in");
  const boundsWidth = cutIn.clientWidth;
  if (!boundsWidth) return;
  const tilt = clamp(boundsWidth * .145, 28, 196);
  const tiltValue = tilt + "px";
  if (cutIn.style.getPropertyValue("--cut-in-tilt") !== tiltValue) cutIn.style.setProperty("--cut-in-tilt", tiltValue);
  const px = boundsWidth < 600 ? 2 : 3;
  const width = Math.ceil(boundsWidth / px), height = Math.ceil(cutInBolts.clientHeight / px);
  if (cutInBolts.width !== width) cutInBolts.width = width;
  if (cutInBolts.height !== height) cutInBolts.height = height;
  cutInInk.clearRect(0, 0, width, height);
  if (!assets.cutInMotion.naturalWidth) return;
  const slant = tilt / px;
  const pad = (cutInBolts.clientHeight - cutInBand.clientHeight) / (2 * px);
  const scale = (height - slant - pad * 2) / 58;
  if (scale <= 0) return;
  const quiet = quietCombat();
  const id = Number(cutIn.dataset.technique);
  const frame = quiet ? 3 : Math.min(7, Math.floor((1 - cutInRemaining / .94) * 8));
  cutInInk.save();
  cutInInk.imageSmoothingEnabled = false;
  cutInInk.globalAlpha = quiet ? .68 : 1;
  cutInInk.transform(1, -slant / width, 0, 1, 0, slant);
  cutInInk.drawImage(assets.cutInMotion, frame * 320, id * 108, 320, 108, 0, pad - 25 * scale, width, 108 * scale);
  cutInInk.restore();
}

const cutInLettering = $("cut-in-lettering");
const cutInType = cutInLettering.parentElement;
const cutInTitle = $("cut-in-skill");
const cutInScholar = $("cut-in-scholar");
let cutInLetteringKey = "";

function drawCutInLettering() {
  if (!cutInRemaining || !document.fonts.check("12px Galmuri")) return;
  const title = cutInTitle.textContent, scholar = cutInScholar.textContent;
  const available = cutInType.clientWidth;
  if (!available) return;
  const color = $("scholar-cut-in").style.getPropertyValue("--cut-in-color");
  const face = $("scholar-cut-in").style.getPropertyValue("--cut-in-face");
  const bandDepth = cutInBand.clientHeight - (parseFloat($("scholar-cut-in").style.getPropertyValue("--cut-in-tilt")) || 0);
  const key = [title, scholar, available, bandDepth, color, face].join("|");
  if (cutInLetteringKey === key) return;
  cutInLetteringKey = key;

  const wholeTitle = pixelLettering(title, face);
  const words = title.split(" ");
  const titleLines = wholeTitle.width * 2 + 5 > available && words.length > 1
    ? [words.slice(0, Math.ceil(words.length / 2)).join(" "), words.slice(Math.ceil(words.length / 2)).join(" ")]
    : [title];
  const glyphs = titleLines.map(line => pixelLettering(line, face));
  const largest = Math.max(...glyphs.map(run => run.width));
  const headlineDots = Math.max(1, Math.min(5, Math.floor(bandDepth / 31), Math.floor((available - 5) / largest)));
  const caption = pixelLettering(scholar, color);
  const captionDots = available >= 245 && caption.width * 2 + 16 <= available ? 2 : 1;
  const titleGap = 5;
  const headerHeight = caption.height * captionDots;
  cutInLettering.width = Math.max(largest * headlineDots + 4, caption.width * captionDots + 4);
  cutInLettering.height = headerHeight + titleGap + glyphs.reduce((sum, run) => sum + run.height * headlineDots + 3, 0) + 2;
  const ctx = cutInLettering.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  const captionWidth = caption.width * captionDots;
  ctx.drawImage(caption, 0, 0, captionWidth, headerHeight);
  ctx.fillStyle = color;
  const trimWidth = Math.max(0, Math.min(46, cutInLettering.width - captionWidth - 11));
  if (trimWidth > 4) {
    ctx.globalAlpha = .65;
    ctx.fillRect(captionWidth + 9, Math.floor(headerHeight / 2), trimWidth, captionDots);
    ctx.globalAlpha = 1;
  }
  let y = headerHeight + titleGap;
  const weight = Math.max(1, Math.floor(headlineDots / 2));
  for (const [index, run] of glyphs.entries()) {
    const width = run.width * headlineDots, height = run.height * headlineDots;
    ctx.drawImage(pixelLettering(titleLines[index], "#101b2b"), 2, y + 3, width, height);
    ctx.globalAlpha = .47;
    ctx.drawImage(pixelLettering(titleLines[index], color), 0, y + 2, width, height);
    ctx.globalAlpha = 1;
    ctx.drawImage(run, weight, y, width, height);
    ctx.drawImage(run, 0, y, width, height);
    y += height + 3;
  }
  cutInLettering.hidden = false;
}
