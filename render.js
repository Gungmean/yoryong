"use strict";
const cv = $("world"),
  fieldFrame = $("field-frame"),
  g = cv.getContext("2d", { alpha: true }),
  lettering = $("field-lettering"),
  ink = lettering.getContext("2d"),
  mini = $("mapview").getContext("2d");
let inkScaleX = 1, inkScaleY = 1, fieldDpr = 1;
let fieldScaleX = 1, fieldScaleY = 1;
const snapX = x => Math.round(x * fieldScaleX) / fieldScaleX;
const snapY = y => Math.round(y * fieldScaleY) / fieldScaleY;
const r = (x, y, w, h, c) => {
  g.fillStyle = c;
  const left = snapX(x), top = snapY(y);
  g.fillRect(left, top, snapX(x+w)-left, snapY(y+h)-top);
};
function path(p, col) {
  g.fillStyle = col;
  g.beginPath();
  p.forEach(([x, y], i) =>
    i
      ? g.lineTo(Math.round(x), Math.round(y))
      : g.moveTo(Math.round(x), Math.round(y)),
  );
  g.closePath();
  g.fill();
}
function fieldFont(size) {
  // Galmuri11 uses a 12-unit em. Each font dot covers whole device pixels.
  const target = size < 8 ? size : Math.max(size, 11);
  const dots = Math.max(1, Math.round(Math.max(target * inkScaleY, target * fieldDpr) / 12));
  const pixels = 12 * dots;
  ink.font = pixels + "px Galmuri, monospace";
  return pixels / inkScaleY;
}
// Sample the center of each font dot once. Browser antialiasing at the outlines
// must not become a colored fringe when a glyph is enlarged for the field.
const glyphRuns = new Map();
document.fonts.load("12px Galmuri", "중앙 현관").then(() => glyphRuns.clear(), () => {});
function pixelLettering(text, color) {
  const key = color + ":" + text;
  if (glyphRuns.has(key)) return glyphRuns.get(key);
  const sample = document.createElement("canvas");
  const source = sample.getContext("2d", { willReadFrequently: true });
  source.font = "48px Galmuri, monospace";
  const metrics = source.measureText(text);
  const width = Math.max(1, Math.ceil(metrics.width / 4));
  const top = Math.ceil(metrics.actualBoundingBoxAscent / 4);
  const height = Math.max(1, top + Math.ceil(metrics.actualBoundingBoxDescent / 4));
  sample.width = width * 4;
  sample.height = height * 4;
  source.font = "48px Galmuri, monospace";
  source.fillStyle = color;
  source.fillText(text, 0, top * 4);
  const pixels = source.getImageData(0, 0, sample.width, sample.height).data;
  const run = document.createElement("canvas");
  run.width = width;
  run.height = height;
  const ctx = run.getContext("2d");
  ctx.fillStyle = color;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (pixels[((4 * y + 2) * sample.width + 4 * x + 2) * 4 + 3] >= 128)
        ctx.fillRect(x, y, 1, 1);
    }
  }
  glyphRuns.set(key, run);
  return run;
}
function word(t, x, y, size = 9, col = "#fff3d6") {
  const dots = Math.round(fieldFont(size) * inkScaleY / 12);
  const run = pixelLettering(t, col), width = run.width * dots, height = run.height * dots;
  ink.drawImage(run, Math.round(Math.round(x) * inkScaleX - width / 2),
    Math.round(Math.round(y) * inkScaleY - height / 2), width, height);
}
function clearLetteringUnder(x, y, w, h) {
  ink.clearRect(Math.round(x * inkScaleX), Math.round(y * inkScaleY),
    Math.ceil(w * inkScaleX), Math.ceil(h * inkScaleY));
}
function label(t, x, y, color = "#f6e6bb", bg = "#252936", size = 9) {
  const h = Math.ceil(fieldFont(size)) + 6;
  const w = Math.ceil(ink.measureText(t).width / inkScaleX) + 12;
  const left = x - w / 2;
  clearLetteringUnder(left, y, w, h);
  r(left + 1, y, w - 2, h, "#bba16c");
  r(left, y + 1, w, h - 2, "#243658");
  r(left + 1, y + 1, w - 2, h - 2, bg);
  r(left + 2, y + 1, 3, 1, "#f3ce83");
  word(t, x, y + h / 2, size, color);
  return w;
}
function img(n, x, y, w, h, flip = false) {
  let im = assets[n];
  if (!im?.complete || !im.naturalWidth) return;
  g.save();
  g.translate(Math.round(x), Math.round(y));
  if (flip) g.scale(-1, 1);
  g.drawImage(
    im,
    Math.round(-w / 2),
    Math.round(-h),
    Math.round(w),
    Math.round(h),
  );
  g.restore();
}
function sprite(n, x, y, h, flip = false) {
  let im = assets[n];
  if (im?.naturalWidth)
    img(n, x, y, (h * im.naturalWidth) / im.naturalHeight, h, flip);
}
// Snap both edges relative to the pivot. A flipped cell covers the mirror of
// the same pixels, including asymmetric effects whose pivot lies outside it.
function drawFieldCell(sheet, sx, sy, w, h, px, py, x, y, scaleX, scaleY, flip) {
  const left = snapX(-px * scaleX), top = snapY(-py * scaleY);
  const right = snapX((w - px) * scaleX), bottom = snapY((h - py) * scaleY);
  g.save();
  g.translate(snapX(x), snapY(y));
  if (flip) g.scale(-1, 1);
  g.drawImage(sheet, sx, sy, w, h, left, top, right-left, bottom-top);
  g.restore();
}
function drawActor(id, frame, x, y, height, flip = false) {
  const sheet = assets["actor/" + id],
    spec = actorSheets[id];
  if (!sheet?.naturalWidth) {
    sprite(id, x, y, height, flip);
    return;
  }
  const {cell, baseline, standingHeight} = spec;
  const scale = height / standingHeight;
  drawFieldCell(sheet, (frame % 4)*cell, Math.floor(frame/4)*cell, cell, cell,
    Math.round(cell/2), baseline, x, y, scale, scale, flip);
}
function heroFrame(p) {
  const panelTime = (performance.now() - panelSince) / 1000;
  if (modal === "down")
    return [20, 21, 22][Math.min(2, Math.floor(panelTime * 6))];
  if (modal === "ending")
    return [24, 25, 26, 27][Math.floor(panelTime * 3) % 4];
  if (p.celebrate > 0)
    return 24 + Math.min(3, Math.floor((0.7 - p.celebrate) * 6));
  if (p.recover > 0) return 23;
  if (p.hurtTime > 0) return p.hurtTime > 0.17 ? 15 : 20;
  if (p.dash > 0) return 12;
  if (p.swing > 0) return p.swing > 0.135 ? 13 : 14;
  if (p.castTime > 0)
    return 16 + Math.min(3, Math.floor((0.42 - p.castTime) * 10));
  if (!p.grounded) {
    if (p.leapTime > 0.055 && p.jumps === 1) return 8;
    if (p.jumps === 2 && p.vy < 20) return 10;
    return p.vy < 0 ? 9 : 11;
  }
  if (p.landTime > 0) return 8;
  if (p.vx) return 4 + (Math.floor(clock * 9) % 4);
  const phase = clock % 2.4;
  return phase < 0.8 ? 0 : phase < 0.94 ? 1 : phase < 1.65 ? 2 : 3;
}
function monsterFrame(e) {
  if (e.boss && e.dying > 0) {
    const duration = e.clearDuration;
    const offset = duration < 1 ? 0 : bossBurstAt - .10;
    return 8 + clamp(Math.floor((bossClearAge(e) - offset) * 8), 0, 3);
  }
  if (e.dying > 0)
    return [8, 9, 10, 11][Math.min(3, Math.floor((0.7 - e.dying) * 6))];
  if (e.warn > 0) return (e.boss ? bossWarningProgress(e) < .54 : e.warn > .16) ? 4 : 5;
  if (e.rush) return e.rush.elapsed < .35 ? 6 : 7;
  if (e.action > 0) return e.action > 0.18 ? 6 : 7;
  if (e.hit > 0) return e.hit > 0.09 ? 8 : 9;
  if (e.moving) return [2, 0, 3, 1][Math.floor((clock + e.home) * 6) % 4];
  return Math.floor((clock + e.home) * 2) % 2;
}
function scholarFrame(o) {
  const close = Math.abs(player.x - o.x) < 75 && Math.abs(player.y - o.y) < 30;
  if (close && (modal === "dialogue" || modal === "quiz")) {
    const t = (performance.now() - panelSince) / 1000;
    return [2, 3, 4, 3][Math.floor(t * 2) % 4];
  }
  if (close) return [2, 3, 3, 0][Math.floor(clock * 2) % 4];
  return (clock + o.id * 0.39) % 2.9 < 0.45 ? 1 : 0;
}
function shadow(x, y, w) {
  g.fillStyle = "#282c3d58";
  g.beginPath();
  g.ellipse(Math.round(x), Math.round(y), w, 3.1, 0, 0, Math.PI * 2);
  g.fill();
}
function star(x, y, s, col) {
  r(x - s, y, 2 * s + 1, 1, col);
  r(x, y - s, 1, 2 * s + 1, col);
  if (s > 2) r(x - 1, y - 1, 3, 3, col);
}
function resize() {
  const b = fieldFrame.getBoundingClientRect();
  fieldDpr = window.devicePixelRatio || 1;
  const pitch = Math.max(1, Math.round(b.height * fieldDpr / H));
  const left = Math.floor(b.left * fieldDpr), top = Math.floor(b.top * fieldDpr);
  const cols = Math.max(1, Math.ceil((b.right * fieldDpr - left) / pitch));
  const rows = Math.max(1, Math.ceil((b.bottom * fieldDpr - top) / pitch));
  // Crop only the last partial dot. Both artwork layers use the same physical
  // grid, while lettering still gets one backing pixel per device pixel.
  fieldFrame.style.setProperty("--art-left", (left / fieldDpr - b.left) + "px");
  fieldFrame.style.setProperty("--art-top", (top / fieldDpr - b.top) + "px");
  fieldFrame.style.setProperty("--art-width", cols * pitch / fieldDpr + "px");
  fieldFrame.style.setProperty("--art-height", rows * pitch / fieldDpr + "px");
  W = Math.max(1, Math.round(cols * H / rows));
  cv.width = cols;
  cv.height = rows;
  fieldScaleX = cols / W;
  fieldScaleY = rows / H;
  g.setTransform(fieldScaleX, 0, 0, fieldScaleY, 0, 0);
  lettering.width = cols * pitch;
  lettering.height = rows * pitch;
  ink.imageSmoothingEnabled = false;
  inkScaleX = lettering.width / W;
  inkScaleY = lettering.height / H;
  g.imageSmoothingEnabled = false;
  cameraFollowX = cameraTarget();
  cam = snapX(cameraFollowX);
}
new ResizeObserver(resize).observe(fieldFrame);
resize();
function backdrop(name, w, h, offset, dressTile) {
  const im = assets[name];
  if (!im?.naturalWidth) {
    r(0, 0, W, H, "#86b9c5");
    return;
  }
  for (let n = Math.floor(offset / w); n <= (offset + W) / w; n++) {
    let x = Math.round(n * w - offset);
    g.save();
    g.translate(n % 2 ? x + w : x, 0);
    if (n % 2) g.scale(-1, 1);
    g.drawImage(im, 0, 0, w, h);
    dressTile(w);
    g.restore();
  }
}
// Draw a matching slice of the scenery atlas when WebGL is unavailable.
function paintedSlice(name,x,y,w,h,u=0,t=0,v=1,b=1) {
  const region = roomRegion(name), image = region ? roomsPaint : schoolPaint;
  if (!image.naturalWidth || x+w<0 || x>W) return;
  const [sx,sy,sw,sh]=region || campusAtlas.regions[name], left=Math.round(x), right=Math.round(x+w);
  g.save();
  g.translate(u>v ? right : left,Math.round(y));
  if (u>v) g.scale(-1,1);
  g.drawImage(image,sx+Math.min(u,v)*sw,sy+t*sh,Math.abs(v-u)*sw,(b-t)*sh,
    0,0,right-left,Math.round(y+h)-Math.round(y));
  g.restore();
}
function gate(depth) {
  if (!depth) {
    if (schoolPaint.naturalWidth) {
      paintedSlice("school",-6-cam*.34,-7,panoramaWidth(.34),322);
      for (let x=-240+Math.floor((cam+240)/202)*202;x<cam+W;x+=202) {
        paintedSlice("pavers",x-cam,293,202,H+2-293,.31,.01,.99,.79);
        paintedSlice("pavers",x-cam,289,202,5,.31,.82,.99,.99);
      }
      for (const [name,wx,feet,w,rate,flip] of campusGarden) {
        const x=wx-cam*rate,[,,sw,sh]=campusAtlas.regions[name],h=w*sh/sw;
        if (x+w/2<0 || x-w/2>W) continue;
        const shade=name==="tree"?w*.7:name==="lamp"?16:w;
        groundContact(x+shade*.035,feet,shade,Math.max(5,shade*.12));
        cropStamp(schoolPaint,campusAtlas.regions,name,x-w/2,feet-h,w,h,flip);
      }
      for (const x of [566,729]) pennant(x-cam,294,55,sceneryTime+x,"#44638c");
    } else backdrop("campus",clamp(W,670,920),H,cam*.58,()=>{});
    campusAir(sceneryTime);
    for (const stair of sideStairs.gate) {
      const x=stair.x-cam, [,,sw,sh]=campusAtlas.regions["steps-gate"], h=126*sh/sw;
      groundContact(x+4,GROUND,132,12);
      cropStamp(schoolPaint,campusAtlas.regions,"steps-gate",x-63,GROUND-h,126,h,stair.side==="east");
    }
  }
  const sx = 650 - cam;
  entranceLight(sx, GROUND, sceneryTime);
  if (Math.abs(player.x - 650) > 60) {
    let y = GROUND - 105 + Math.sin(sceneryTime * 2) * 1.4;
    label("중앙 현관  ›", sx, y, "#fff2c8", "#343c42", 9);
    path(
      [
        [sx - 3, y + 15],
        [sx + 3, y + 15],
        [sx, y + 18],
      ],
      "#e3c582",
    );
  }
}
function hallBoundary(left, right) {
  if (left.type === "stair")
    return left.x + (left.side === "center" ? 115 : 64);
  if (right.type === "stair")
    return right.x - (right.side === "center" ? 115 : 64);
  return (left.x + right.x) / 2;
}
function hallPlaque(bay, x) {
  const title =
    bay.type === "stair" ? scene.floor + "F · " + bay.name : bay.name;
  const height = Math.ceil(fieldFont(9)) + 5;
  const width = Math.ceil(ink.measureText(title).width / inkScaleX) + 13;
  const left = Math.round(x - width / 2), top = Math.round(97 - height / 2);
  clearLetteringUnder(left, top, width, height);
  r(left, top, width, height, "#706747");
  r(left + 1, top + 1, width - 2, height - 2, "#405b51");
  r(left + 2, top + 1, width - 4, 1, "#829180");
  r(left + 2, 96, 1, 1, "#dfc995");
  r(left + width - 3, 96, 1, 1, "#dfc995");
  word(title, x, 97, 9, "#faf0d8");
}
function hallBackdrop() {
  if (!schoolPaint.naturalWidth || !roomsPaint.naturalWidth || (scene.floor >= 2 && !assets.classrooms.naturalWidth)) {
    backdrop("corridor",540,H,cam,()=>{});
    return;
  }
  g.drawImage(hallFloorPainting(),Math.round(-cam),275,worldWidth,H-275);
  for (let x=-160+Math.floor((cam+160)/158)*158; x<cam+W; x+=158)
    paintedSlice("corridor",x-cam,0,158,80,0,0,.265,80/H);
  for (const {asset,x:wx,w,u,v,door} of hallwaySections()) {
    const x=wx-cam;
    if (x+w<0 || x>W) continue;
    if (!door) {
      paintedSlice(asset,x,80,w,195,u,80/H,v,275/H);
      continue;
    }
    paintedSlice(asset,x,80,w,64,u,80/H,v,144/H);
    if (door.classroom && assets.classrooms.naturalWidth)
      g.drawImage(assets.classrooms,...door.classroom,Math.round(x),144,Math.round(w),131);
    else paintedSlice(door.inside,x,144,w,131,.48-door.view/2,.12,.48+door.view/2,.91);
    const slide=doorTravel(door.x,w);
    paintedSlice(asset,x+slide,144,w-slide,131,u,144/H,v-(v-u)*slide/w,275/H);
  }
  drawFixtures2D();
}
function hall(depth) {
  if (!depth) hallBackdrop();
  const bays=hallBays[scene.floor];
  for (const [i,bay] of bays.entries()) {
    const x = Math.round(bay.x - cam);
    if (x < -90 || x > W + 90) continue;
    if (bay.type!=="stair") corridorExhibit(x,hallBoundary(bay,bays[i+1])-hallBoundary(bays[i-1],bay),i-1,sceneryTime);
    hallPlaque(bay, x);
    if (["물리지학실", "생명화학실", "중앙 현관", "매점"].includes(bay.name))
      star(x, GROUND - 46 + Math.sin(sceneryTime * 2) * 1.4, 5, "#ffe593");
  }
}
function classroomScholar(o) {
  const x = o.x - cam;
  if (x < -80 || x > W+80) return;
  shadow(x,o.y+1,15);
  drawActor("scholar"+o.id,scholarFrame(o),x,o.y,56,player.x<o.x);
  if (near?.type === "scholar") return;
  const known = progress.learned.includes(o.id);
  const bob = reducedMotion.matches ? 0 : Math.sin(clock*3)*1.3;
  const half = Math.min(78,W/2);
  label((known ? "✓ " : "! ") + o.name,clamp(x,half,W-half),o.y-74+bob,
    known ? "#b5ddb4" : "#ffda80","#363442",9);
}
function classroomInterior(depth) {
  if (!depth) {
    r(0, 0, W, H, "#28283f");
    const art = assets.classrooms;
    if (art.naturalWidth) for (const p of classroomPanels()) {
      g.drawImage(art,p.sx,p.sy,p.sw,p.sh,Math.round(p.x-cam),p.y,p.w,p.h);
      if (p.z<0) drawFixtures2D();
    }
    for (let i = 0; i < 16; i++) {
      const x = (i*141 + sceneryTime*3) % worldWidth - cam;
      const y = 145 + Math.sin(sceneryTime*.55+i)*13 + (i*23)%95;
      r(x,y,2,1,"#fbe7af");
    }
  }
  if (courseRun) {
    drawScholarCourse();
    if (courseSolved()) classroomScholar(scholarPoint(courseRun.id));
  }
  for (const door of sideStairs.classroom) {
    const x = door.x - cam;
    if (x < -45 || x > W+45) continue;
    label(door.name,x,48,"#f5e8c4","#41534b",8);
  }
  const boardX = classroomBoard.x - cam;
  if (courseRun?.id !== 6 && boardX > -120 && boardX < W+120) {
    g.save();
    g.translate(Math.round(boardX+62),153);
    g.scale(.44,.44);
    g.globalAlpha=.65;
    chalkExperiment(0,0,sceneryTime,courseRun ? courseRun.id >> 1 : (scene.floor+scene.room)%4);
    g.restore();
    word(courseRun?.definition.name || floorName(),boardX,132,13,"#ebead9");
  }
}

function battleBack() {
  if (scene.type === "arena") {
    r(0,0,W,H,"#655a50");
    paintedSlice(labPaint[scene.subject],-cam,0,worldWidth,H);
    drawFixtures2D();
    return;
  }
  const name=progress.won ? "morning" : "roof";
  const rate=.38, width=panoramaWidth(rate), top=-5, bottom=352;
  const left=-6-cam*rate;
  if (schoolPaint.naturalWidth) {
    paintedSlice(name,left,top,width,bottom-top);
    const [start,end]=[.785,.885];
    const back=top+(bottom-top)*start;
    for (let y=back;y<H;y+=4) {
      const strip=Math.min(4,H-y), t=(y-back)/(H+2-back), u=(y+strip-back)/(H+2-back);
      const offset=left-t*.16*(cam+W*.5-width*.5);
      const a=start+t*(end-start), b=start+u*(end-start);
      paintedSlice(name,offset,y,width,strip,0,a,1,b);
      if (offset>0) paintedSlice(name,offset-width,y,width,strip,1,a,0,b);
      if (offset+width<W) paintedSlice(name,offset+width,y,width,strip,1,a,0,b);
    }
    roofSky(left,width,sceneryTime,progress.won);
  } else backdrop("roof",width,H,cam*rate,()=>{});
  drawFixtures2D();
  for (let i = 0; i < 22; i++) {
    let x = wrap(i * 107 - cam * 0.3, W),
      y = wrap(i * 37 - sceneryTime * (4 + (i % 4)), 212);
    g.globalAlpha = 0.22 + (0.24 * (1 + Math.sin(i + sceneryTime))) / 2;
    star(x, y, i % 7 === 0 ? 2 : 1, subjects[scene.subject].color);
  }
  g.globalAlpha = 1;
}
function drawFixtures2D() {
  const dir=environmentLight()[4];
  for (const item of mapFixtures()) {
    const {key,feet,w,h,flip}=item,x=item.x-cam;
    if (x+w<0 || x-w>W) continue;
    const width=w*1.18;
    if (key && fixtureAtlas.regions["reflection-"+key])
      cropStamp(furniturePaint,fixtureAtlas.regions,"reflection-"+key,x-w/2,feet,w,Math.min(15,h*.37),flip);
    if (!item.onBench) groundContact(x+dir*width*.035,feet,width,Math.max(7,w*.14),dir<0);
    if (key) cropStamp(furniturePaint,fixtureAtlas.regions,key,x-w/2,feet-h,w,h,flip);
    if (item.seal) {
      r(x-34,feet-h-19,68,20,"#a37c50"); r(x-32,feet-h-17,64,16,"#344951");
      for (let i=0;i<4;i++) {
        const cx=x+(i-1.5)*15,cy=feet-h-9;
        path([[cx,cy-5],[cx+4,cy],[cx,cy+5],[cx-4,cy]],progress.cleared.includes(i)?subjects[i].color:"#62666a");
      }
    } else if (item.subject!==undefined) labExhibit(x,feet-h*.88,sceneryTime,item.subject);
  }
}
// One pixel per cell. The same cut-gold pointer rotates only in quarter turns.
const compassArrow = (() => {
  const rows = [
    "          nn        ",
    "          nwn       ",
    "          nwwn      ",
    "  nn nnnnnnwwwn     ",
    " ntntnwwwwwwwwwn    ",
    "naantnffffffffffn   ",
    "nttntnfffffffffffn  ",
    " naananbbbbbbbbbn   ",
    "  nn nnnnnnbbbbn    ",
    "          nbbbn     ",
    "          nbbn      ",
    "          nbn       ",
    "          nn        ",
  ];
  const colors = { n: "#293045", w: "#fff5c4", f: "#ffd264", b: "#d99735", t: "#80c6b7", a: "#558986" };
  const sprite = document.createElement("canvas");
  sprite.width = rows[0].length; sprite.height = rows.length;
  const brush = sprite.getContext("2d");
  rows.forEach((row, y) => [...row].forEach((pixel, x) => {
    if (colors[pixel]) { brush.fillStyle = colors[pixel]; brush.fillRect(x, y, 1, 1); }
  }));
  return sprite;
})();
function besideQuestTarget() {
  return near && activeLeg && near.type === activeLeg.point.type && near.x === activeLeg.point.x;
}
function drawQuestArrow(x) {
  const leg = activeLeg;
  if (!leg || modal || leg.point.dying ||
      (courseRun?.id===3 && leg.point.type==="board" && (courseRun.readBoard || courseRun.stage))) return;
  const dx = leg.point.x - player.x;
  const atPoint = besideQuestTarget();
  const bossInReach = leg.point.boss && Math.abs(dx) < leg.point.half + 25;
  const above = leg.point.y < player.y - 24 && Math.abs(dx) < 32;
  const turn = atPoint ? -(leg.direction || 1) : above ? -1 : (Math.abs(dx) < 10 || bossInReach) ? 1 : dx < 0 ? 2 : 0;
  const bob = reducedMotion.matches ? 0 : Math.round(Math.sin(clock * 3.5) * 1.5);
  const y = Math.max(13, player.y - (atPoint ? 96 : 72) + bob);
  g.save();
  g.translate(Math.round(x), Math.round(y));
  g.rotate(turn * Math.PI / 2);
  g.drawImage(compassArrow, -10, -6);
  g.restore();
}
function character() {
  const p = player,
    x = p.x - cam,
    f = p.face < 0,
    bob = p.jumps
      ? 0
      : p.vx
        ? Math.abs(Math.sin(clock * 13)) * 2
        : Math.sin(clock * 2) * 0.9;
  shadow(x, (courseRun?.support?.y ?? GROUND) + 1, clamp(16 - (GROUND - p.y) / 10, 7, 16));
  const frame = heroFrame(p);
  if (p.dash > 0) {
    const dashFrame = Math.min(7, Math.floor((1 - p.dash / .19) * 8));
    if (p.grounded) spellClip("dust", 1 - p.dash / .19, x - p.face * 28, p.y, .68, .76, f);
    combatSprite(FX_DASH, dashFrame, x, p.y - 22, 1, f, reducedMotion.matches ? .55 : .93);
    for (let i = 1; i <= (reducedMotion.matches ? 0 : 3); i++) {
      g.globalAlpha = 0.29 / i;
      drawActor("hero", frame, x - p.face * (i * 13), p.y, 60, f);
    }
    g.globalAlpha = 1;
  }
  if (p.inv > 0.1 && p.hurtTime > 0) g.filter = "brightness(1.28)";
  drawActor("hero", frame, x, p.y - bob, 60, f);
  g.filter = "none";
  const targetHere = besideQuestTarget();
  if (!near || (near.type === "scholar" && targetHere))
    label("요룡이", x, p.y + 5, "#fff4db", "#2c303b", 8);
  if (near) {
    let action = near.name;
    let key = near.type === "courseStrike" ? "A " : "↑ ";
    if (near.type === "scholar") action = near.name + " · 대화";
    else if (near.room) action += " 입장";
    else if (near.name === "매점") action = "회복";
    else if (near.type === "stair") {
      if (scene.type === "classroom") action += " · 복도로";
      else if (scene.type === "roof") { key = "↓ "; action = "5층으로"; }
      else if (scene.type === "gate") action = "본관 1층으로";
      else if (scene.type === "arena") action = "복도로";
      else if (targetHere) {
        key = activeLeg.direction < 0 ? "↓ " : "↑ ";
        action = floorLabel(activeLeg.next) + "으로";
      } else {
        const up = scene.floor === 5 && progress.cleared.length < 4 ? "옥상 잠김" : floorLabel(scene.floor + 1);
        const down = scene.floor > 1 || near.side !== "center" ? " · ↓ " + floorLabel(scene.floor - 1) : "";
        action = up + down;
      }
    }
    const secondary = activeLeg && !targetHere;
    const prompt = key + action;
    fieldFont(9);
    const margin = Math.ceil(ink.measureText(prompt).width / inkScaleX / 2) + 8;
    label(prompt, clamp(x, margin, W - margin), p.y + (secondary ? 5 : -79), secondary ? "#e0e3ea" : "#ffdda0", "#282e3a", 9);
  }
}
function monsters() {
  for (let e of foes) {
    let x = e.x - cam,
      bob = e.boss ? Math.sin(clock * 2) * 2 : 0,
      h = e.height;
    shadow(x, GROUND + 2, e.boss ? e.half * .92 : 10);
    if (e.rush && !reducedMotion.matches) {
      for (const trail of [3, 2, 1]) {
        g.globalAlpha = .27 / trail;
        drawActor("foe" + e.kind, 6, x - e.dir * trail * 17, e.y + bob, h, e.dir > 0);
      }
      g.globalAlpha = 1;
    }
    if (e.hit > 0) g.filter = "brightness(1.7)";
    if (e.dying > 0) {
      g.globalAlpha = e.boss && e.clearDuration > 1
        ? clamp(1 - (bossClearAge(e) - bossBurstAt) / .43, 0, 1)
        : Math.min(1, e.dying * 5);
    }
    drawActor("foe" + e.kind, monsterFrame(e), x, e.y + bob, h, e.dir > 0);
    g.globalAlpha = 1;
    g.filter = "none";
    if (e.boss && !e.dying && (wardClosed(e) || e.wardBreak > 0)) {
      const gone = e.wardBreak > 0 ? 1 - e.wardBreak / .65 : 0;
      const spread = quietCombat() ? 0 : gone * 24;
      const y = e.y - h * .51, rx = e.half + 12 + spread, ry = h * .53 + 4 + spread;
      g.save();
      g.globalAlpha = (1 - gone) * .86;
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3;
        const edge = [a + .08, a + .51, a + .96].map(t => [x + rx*Math.cos(t), y + ry*Math.sin(t)]);
        fxLine(edge, subjects[e.kind].color, 3);
        r(edge[1][0]-1, edge[1][1]-1, 3, 3, "#fff2d2");
      }
      g.restore();
    }
    if (!e.boss && e.hp < e.max) {
      r(x - 10, e.y - h - 5, 20, 3, "#38333c");
      r(x - 10, e.y - h - 5, (20 * e.hp) / e.max, 2, "#e4a28c");
    }
  }
}
function friendlyEffects() {
  g.save();
  if (quietCombat()) g.globalAlpha = .53;
  for (const s of shots) if (!s.team) drawCombatShot(s);
  for (const e of effects) {
    let x = e.x - cam, y = e.y;
    if (e.type === "spark") {
      const size = e.life > 0.22 ? 3 : 1;
      r(x, y, size + 1, size, e.color);
    } else {
      drawCombatAccent(e);
    }
    if (e.type === "bubble") {
      const lineHeight = Math.ceil(fieldFont(9)) + 4;
      const widthOf = line => ink.measureText(line).width / inkScaleX;
      const lines = [""];
      for (const ch of e.msg) {
        const last = lines.length - 1, line = lines[last] + ch;
        if (lines[last] && (line.length > 23 || widthOf(line) > W - 26)) lines.push(ch);
        else lines[last] = line;
      }
      const ww = Math.ceil(Math.max(...lines.map(widthOf))) + 14;
      const hh = lines.length * lineHeight + 7;
      x = clamp(x, ww / 2 + 4, W - ww / 2 - 4);
      clearLetteringUnder(x - ww / 2, y - hh, ww, hh);
      r(x - ww / 2 - 1, y - hh - 1, ww + 2, hh + 2, "#34323a");
      r(x - ww / 2, y - hh, ww, hh, "#fff1cb");
      lines.forEach((l, i) => word(l, x, y - hh + 3 + (i + 0.5) * lineHeight, 9, "#3c393c"));
      path(
        [
          [x - 3, y],
          [x + 3, y],
          [x, y + 4],
        ],
        "#fff1cb",
      );
    }
  }
  g.restore();
}
function threatEffects() {
  // Threat outlines and enemy cores sit over the player and friendly effects.
  for (const e of foes) if (e.boss && e.warn > 0) {
    bossCharge(e);
    warningPath(e);
  }
  for (const zone of bossZones) {
    drawBossZone(zone, zone.timer < 0, zone.timer < 0 ? 1 + zone.timer / zone.delay : 1);
  }
  for (const s of shots) {
    if (!s.team) continue;
    if (!s.vx) warningMark(s.x - cam, 1, subjects[s.id].color);
    drawCombatShot(s);
  }
  for (let t of texts) {
    word(String(t.n), t.x - cam + 1, t.y + 1, 19, "#493a35");
    word(String(t.n), t.x - cam, t.y, 19, "#ffe8a9");
  }
}
function miniMap() {
  const w = mini.canvas.width, h = mini.canvas.height;
  const rect = (x, y, width, height, color) => {
    mini.fillStyle = color;
    mini.fillRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height));
  };
  const u = x => 5 + x * (w - 10) / worldWidth;
  const ink = "#435879", grass = "#a3b783", paper = "#f3e6c8", road = "#fbd88f";
  mini.imageSmoothingEnabled = false;
  rect(0, 0, w, h, paper);
  for (let i = 0; i < w; i += 9) rect(i, 0, 1, h, "#e3d5b5");
  for (let i = 0; i < h; i += 9) rect(0, i, w, 1, "#e3d5b5");
  let routeY = 32;
  const route = () => {
    rect(0, routeY-2, w, 6, ink);
    rect(0, routeY-1, w, 4, road);
  };
  const building = (x,y,bw,bh) => {
    rect(x+1,y+2,bw,bh,"#9cb093");
    rect(x,y,bw,bh,ink);
    rect(x+1,y+1,bw-2,bh-2,grass);
  };
  if (scene.type === "gate") {
    building(32,7,112,13);
    building(23,7,15,19);
    building(139,7,15,19);
    for (let i = 44; i < 136; i += 9) rect(i,10,5,3,"#d7ddbc");
    rect(u(650)-4,16,9,9,ink);
    rect(u(650)-2,18,5,19,road);
    route();
    if (schoolTiles.zelkova.naturalWidth) {
      for (const x of [1, 14, 148, 160])
        mini.drawImage(schoolTiles.zelkova, x, x % 2 ? 9 : 3, 15, 12);
    }
    for (const x of [4,18,144,158]) {
      rect(x,24,13,3,"#82945c");
      rect(x+2,23,2,2,"#d98b99"); rect(x+8,24,2,2,"#f0adae");
    }
  } else if (scene.type === "floor") {
    for (const [x,name] of floors[scene.floor]) {
      const dx = u(x);
      building(dx-6,10,13,13);
      if (name === "계단") for (let k=0; k<3; k++) rect(dx-3,13+k*3,7,1,ink);
      rect(dx-1,22,3,11,road);
    }
    route();
  } else if (scene.type === "classroom") {
    rect(5,5,w-10,h-11,ink);
    rect(7,7,w-14,h-15,paper);
    rect(u(classroomBoard.x)-15,8,30,4,"#406448");
    if (courseRun) {
      route();
      for (const d of courseRun.devices) {
        const y=routeY-(GROUND-d.y)*.14;
        rect(u(d.x)-1,y-3,3,3,"#8d9868");
      }
      for (const p of courseRun.platforms) {
        if (p.active) rect(u(p.x-p.w/2),routeY-(GROUND-p.y)*.14,u(p.w)-u(0),2,ink);
      }
    } else {
      for (let x=30; x<w-20; x+=19) {
        rect(x,17,10,5,"#a68257");
        rect(x+3,23,5,2,"#87948b");
      }
      route();
    }
  } else {
    rect(6,6,w-12,h-12,ink);
    rect(8,8,w-16,h-16,scene.type === "roof" ? "#a4b0ae" : paper);
    for (const x of [22, 47, 128, 148]) building(x,11,12,7);

    routeY = 28;
    route();
    const boss = foes.find(e => e.boss);
    if (boss) { rect(u(boss.x)-2,24,5,5,"#744758"); rect(u(boss.x)-1,25,3,3,"#ed9b9b"); }
  }
  for(const stair of objects().filter(o=>o.type==="stair")){
    const dx=Math.round(u(stair.x));
    rect(dx-4,routeY-10,9,8,ink);
    for(let k=0;k<3;k++)rect(dx-3+2*k,routeY-5-k,2,1,"#f7d28c");
  }
  const px = u(player.x);
  const leg = chooseQuestLeg();
  if (leg) {
    const target = u(leg.point.x);
    const markY = courseRun ? clamp(routeY-10-(GROUND-(leg.point.y??GROUND))*.14,5,routeY-10) : routeY-14;
    rect(target-1,markY,3,routeY-markY,"#775425");
    for (let k=-4; k<=4; k++) rect(target-(4-Math.abs(k)),markY+k,9-2*Math.abs(k),"#835a26");
    for (let k=-2; k<=2; k++) rect(target-(2-Math.abs(k)),markY+k,5-2*Math.abs(k),"#fff0a0");
  }
  const py = courseRun ? clamp(routeY-(GROUND-player.y)*.14,5,routeY+4) : routeY;
  rect(px-4,py-4,9,8,"#183646");
  rect(px-3,py-3,7,6,"#5ddef0");
  rect(px-1,py-2,3,3,"#e9fcff");
}
function holdDepartureFrame() {
  if (!sceneTransition || sceneTransition.arrived !== null || reducedMotion.matches) return false;
  const t = clamp((performance.now() - sceneTransition.started) / 160, 0, 1);
  const start = sceneTransition.initialShade;
  $("scene-shade").style.opacity = start + (1 - start) * t;
  return t < 1;
}

function revealArrival() {
  if (!sceneTransition) return;
  const now = performance.now();
  if (sceneTransition.arrived === null) {
    sceneTransition.arrived = now;
    let place = floorName(), detail;
    if (scene.type === "classroom") {
      detail = "본관 " + scene.floor + "층 · " + (courseRun?.definition.name || "교실");
    } else if (scene.type === "floor") {
      detail = scene.floor === 1 ? "중앙 현관 · 과학실" : subjects[scene.floor - 2].name + "의 시련";
    } else if (scene.type === "arena") {
      detail = "1층 · " + subjects[scene.subject].lab;
    } else if (scene.type === "roof") {
      place = "옥상";
      detail = progress.won ? "부광의 아침" : "기억의 균열";
    } else {
      place = "학교 정문";
      detail = "부광고등학교";
    }
    $("arrival-place").textContent = place;
    $("arrival-detail").textContent = detail;
  }
  const elapsed = now - sceneTransition.arrived;
  $("scene-shade").style.opacity = reducedMotion.matches ? 0 : 1 - clamp((elapsed - 40) / 250, 0, 1);
  const remaining = clamp((1500 - elapsed) / 200, 0, 1);
  $("scene-arrival").style.opacity = reducedMotion.matches ? Number(remaining > 0) : remaining;
  if (remaining === 0) sceneTransition = null;
}

function render() {
  if (holdDepartureFrame()) return;
  const defeated = foes.find(e => e.boss && e.dying);
  const stage = $("stage");
  if (stage.hasAttribute("data-fanfare") !== !!defeated) stage.toggleAttribute("data-fanfare", !!defeated);
  const wider = !!defeated && !quietCombat() && stage.clientWidth * H / Math.max(1, stage.clientHeight) < 310;
  if (stage.hasAttribute("data-wide-clear") !== wider) {
    if (wider) {
      const span = clamp(Math.abs(player.x - defeated.x) + 145, 310, 450);
      stage.style.setProperty("--clear-height", H / span * 100 + "vw");
    }
    stage.toggleAttribute("data-wide-clear", wider);
    resize();
  }
  if (fieldDpr !== (window.devicePixelRatio || 1)) resize();
  cam = snapX(cameraFollowX);
  ink.clearRect(0, 0, lettering.width, lettering.height);
  ink.save();
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, W, H);
  g.save();
  const offset = !quietCombat() && shake > 0.5 ? Math.round(Math.sin(clock * 93) * Math.min(shake, 5)) : 0;
  const depth = typeof campusWorld !== "undefined" && campusWorld.draw(offset);
  if (offset) {
    g.translate(offset, 0);
    ink.translate(Math.round(offset * inkScaleX), 0);
  }
  if (scene.type === "gate") gate(depth);
  else if (scene.type === "floor") hall(depth);
  else if (scene.type === "classroom") classroomInterior(depth);
  else if (!depth) battleBack();
  if (scene.type === "arena") {
    const x = 494 - cam;
    if (x > -85 && x < W + 85) label(subjects[scene.subject].room, x, 91, "#e9e4ca", "#485953", 9);
  }
  if (defeated) drawBossClearBack(defeated);
  drawCombatGround();
  monsters();
  chooseQuestLeg();
  friendlyEffects();
  character();
  threatEffects();
  if (defeated) drawBossClearFront(defeated);
  drawQuestArrow(player.x - cam);
  g.restore();
  ink.restore();
  if (!$("mapview").hidden) miniMap();
  revealArrival();
}
let last = 0,
  acc = 0,
  hudTime = 0;
function tick(ms) {
  const elapsed = last ? Math.min((ms - last) / 1000, 0.08) : 0;
  last = ms;
  if (!modal && !document.hidden && !sceneryPaused && !reducedMotion.matches) sceneryTime += elapsed;
  acc += elapsed;
  while (acc >= 1 / 60) {
    if (!sceneTransition || sceneTransition.arrived !== null || reducedMotion.matches) step(1 / 60);
    acc -= 1 / 60;
  }
  render();
  advanceQuestNotice(elapsed);
  if (ms - hudTime > 95) {
    refreshPractice();
    statusBars();
    hudTime = ms;
  }
  if (ms > toastUntil) $("toast").classList.remove("on");
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
