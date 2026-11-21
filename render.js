"use strict";
const cv = $("world"),
  g = cv.getContext("2d", { alpha: false }),
  mini = $("mapview").getContext("2d");
const r = (x, y, w, h, c) => {
  g.fillStyle = c;
  g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
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
function word(t, x, y, size = 9, col = "#fff3d6", align = "center") {
  g.font = size + "px Galmuri, monospace";
  g.textAlign = align;
  g.textBaseline = "middle";
  g.fillStyle = col;
  g.fillText(t, Math.round(x), Math.round(y));
}
function label(t, x, y, color = "#f6e6bb", bg = "#252936", size = 9) {
  g.font = size + "px Galmuri, monospace";
  let w = Math.ceil(g.measureText(t).width) + 12;
  r(x - w / 2 - 1, y - 1, w + 2, size + 7, "#222631");
  r(x - w / 2, y, w, size + 5, bg);
  word(t, x, y + (size + 5) / 2, size, color);
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
// Each packed cell shares a foot pivot; leaps and recoils keep their drawn silhouette.
function drawActor(id, frame, x, y, height, flip = false) {
  const sheet = assets["actor/" + id],
    spec = actorSheets[id];
  if (!sheet?.naturalWidth) {
    sprite(id, x, y, height, flip);
    return;
  }
  const cell = spec.cell,
    scale = height / spec.standingHeight,
    size = Math.round(cell * scale);
  g.save();
  g.translate(Math.round(x), Math.round(y));
  if (flip) g.scale(-1, 1);
  g.drawImage(
    sheet,
    (frame % 4) * cell,
    Math.floor(frame / 4) * cell,
    cell,
    cell,
    -Math.round(size / 2),
    -Math.round(spec.baseline * scale),
    size,
    size,
  );
  g.restore();
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
  if (e.dying > 0)
    return [8, 9, 10, 11][Math.min(3, Math.floor((0.7 - e.dying) * 6))];
  if (e.warn > 0) return e.warn > (e.boss ? 0.42 : 0.16) ? 4 : 5;
  if (e.action > 0) return e.action > 0.18 ? 6 : 7;
  if (e.hit > 0) return e.hit > 0.09 ? 8 : 9;
  if (e.moving) return [2, 0, 3, 1][Math.floor((clock + e.home) * 6) % 4];
  return Math.floor((clock + e.home) * 2) % 2;
}
function scholarFrame(o) {
  const close = Math.abs(player.x - o.x) < 75;
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
  const b = cv.getBoundingClientRect();
  W = Math.max(280, Math.round((b.width * H) / Math.max(1, b.height)));
  cv.width = W;
  cv.height = H;
  g.imageSmoothingEnabled = false;
  cam = clamp(player.x - W * 0.42, 0, Math.max(0, worldWidth - W));
}
new ResizeObserver(resize).observe(cv);
resize();
function backdrop(name, w, h, offset = 0) {
  const im = assets[name];
  if (!im?.naturalWidth) {
    r(0, 0, W, H, "#86b9c5");
    return;
  }
  for (let n = Math.floor(offset / w); n <= (offset + W) / w; n++) {
    let x = Math.round(n * w - offset);
    g.save();
    if (n % 2) {
      g.translate(x + w, 0);
      g.scale(-1, 1);
      g.drawImage(im, 0, 0, w, h);
    } else g.drawImage(im, x, 0, w, h);
    g.restore();
  }
}
function gate() {
  const w = Math.max(W, 670);
  backdrop("campus", w, H, cam * 0.58);
  for (let k = 0; k < 18; k++) {
    let range = W + 40,
      x =
        ((((k * 131 + clock * ((k % 3) + 1) * 4 - cam * 0.18) % range) +
          range) %
          range) -
        10,
      y = (k * 39 + clock * (2 + (k % 4))) % 275;
    if (k % 4 === 0) {
      r(x, y, 3, 1, "#ffde8d");
      r(x + 1, y - 1, 2, 1, "#e4bd65");
    } else if (k % 5 === 0) star(x, y, 1, "#fff0a2");
  }
  const sx = 650 - cam;
  shadow(sx, GROUND + 1, 23);
  for (let i = 0; i < 4; i++) {
    let phase = (clock * 0.6 + i / 4) % 1;
    g.globalAlpha = (1 - phase) * 0.6;
    g.strokeStyle = "#fff0a7";
    g.beginPath();
    g.ellipse(
      sx,
      GROUND - 1,
      13 + phase * 17,
      2 + phase * 2,
      0,
      0,
      Math.PI * 2,
    );
    g.stroke();
  }
  g.globalAlpha = 1;
  if (Math.abs(player.x - 650) > 60) {
    let y = GROUND - 32 + Math.sin(clock * 2) * 1.4;
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
function stair(x) {
  let y = GROUND - 141,
    w = 100,
    h = 119;
  r(x - w / 2 - 4, y - 4, w + 8, h + 8, "#4a463b");
  r(x - w / 2 - 2, y - 2, w + 4, h + 4, "#b9aa8b");
  r(x - w / 2, y, w, h, "#4a5d5c");
  r(x - w / 2 + 4, y + 4, w - 8, h - 6, "#657977");
  for (let i = 0; i < 11; i++) {
    let yy = y + 32 + i * 8,
      ww = 50 + i * 4;
    r(x - ww / 2, yy, ww, 7, i % 2 ? "#8a8879" : "#888577");
    r(x - ww / 2, yy, ww, 2, "#beb69d");
    r(x - ww / 2, yy + 6, ww, 1, "#565d56");
  }
  for (let side of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      let px = x + side * (26 + i * 5),
        py = y + 20 + i * 17;
      r(px, py, 2, 22, "#494f4a");
    }
    g.strokeStyle = "#dbc49a";
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(x + side * 26, y + 20);
    g.lineTo(x + side * 47, y + 90);
    g.stroke();
    g.lineWidth = 1;
  }
  label("↕ 중앙 계단", x, y - 20, "#f8edcd", "#3e524e", 10);
}
function hall() {
  const im = assets.corridor,
    arr = floors[scene.floor];
  if (!im?.naturalWidth) {
    r(0, 0, W, H, "#adbcab");
    return;
  }
  for (let j = 0; j < arr.length; j++) {
    const [x, name] = arr[j],
      left = j ? (arr[j - 1][0] + x) / 2 : 0,
      right = j < arr.length - 1 ? (arr[j + 1][0] + x) / 2 : worldWidth;
    if (right < cam || left > cam + W) continue;
    const half = im.width / 2,
      cut = j % 2 ? half : 0;
    g.drawImage(
      im,
      cut,
      0,
      half,
      im.height,
      Math.floor(left - cam),
      0,
      Math.ceil(right - left) + 1,
      H,
    );
    const sx = x - cam;
    if (name === "계단") stair(sx);
    else {
      label(name, sx, 99, "#e4ecdd", "#354e4e", 10);
      if (["물리지학실", "생명화학실", "중앙 현관", "매점"].includes(name))
        star(sx, GROUND - 46 + Math.sin(clock * 2) * 1.6, 3, "#ffe593");
    }
  }
  if (cam + W > worldWidth) r(worldWidth - cam, 0, W, H, "#777b72");
  for (let o of objects().filter((o) => o.type === "scholar")) {
    let sx = o.x - cam;
    if (sx < -50 || sx > W + 50) continue;
    shadow(sx, GROUND + 1, 15);
    drawActor(
      "scholar" + o.id,
      scholarFrame(o),
      sx,
      GROUND,
      56,
      player.x < o.x,
    );
    const known = progress.learned.includes(o.id);
    label(
      known ? "✓" : "!",
      sx,
      GROUND - 73 + Math.sin(clock * 3) * 1.3,
      known ? "#b5ddb4" : "#ffda80",
      "#363442",
      10,
    );
    label(o.name, sx, GROUND + 4, "#ffdfa5", "#32313c", 8);
  }
}
function battleBack() {
  const roof = scene.type === "roof";
  backdrop(roof ? "roof" : "lab", Math.max(680, W), H, cam * 0.32);
  if (!roof) {
    let c = ["#4188ad", "#a45ca7", "#4d9e5c", "#e29b4e"][scene.subject];
    g.globalAlpha = 0.085;
    r(0, 0, W, H, c);
    g.globalAlpha = 1;
  }
  if (Math.abs(player.x - 90) < 160)
    label(
      roof ? "‹  중앙 계단" : "‹  복도로",
      90 - cam,
      GROUND - 57,
      "#e9dfbd",
      "#292d3a",
      9,
    );
  for (let i = 0; i < 22; i++) {
    let x = (i * 107 - cam * 0.3 + W * 2) % W,
      y = (i * 37 - clock * (4 + (i % 4)) + H * 90) % H;
    g.globalAlpha = 0.3 + (0.4 * (1 + Math.sin(i + clock))) / 2;
    star(x, y, i % 7 === 0 ? 2 : 1, subjects[scene.subject].color);
  }
  g.globalAlpha = 1;
}
function drawPlatforms() {
  const wood = scene.type === "floor",
    roof = scene.type === "roof";
  for (const b of platforms()) {
    const x = Math.round(b.x - cam - b.w / 2),
      y = b.y;
    if (x > W || x + b.w < 0) continue;
    const edge = wood ? "#533c32" : "#273342",
      light = wood ? "#e3b373" : roof ? "#aa9eb2" : "#a9c1c3",
      face = wood ? "#926c4e" : roof ? "#67667e" : "#647c88";
    r(x + 1, GROUND - 2, b.w, 3, "#38344945");
    for (const side of [6, b.w - 12]) {
      r(x + side, y + 3, 6, GROUND - y - 2, edge);
      r(x + side + 1, y + 5, 2, GROUND - y - 6, face);
    }
    r(x, y, b.w, 6, edge);
    r(x + 1, y, b.w - 2, 2, light);
    r(x + 2, y + 2, b.w - 4, 2, face);
    if (wood) {
      r(x + 5, y - 14, 3, 14, edge);
      r(x + b.w - 8, y - 14, 3, 14, edge);
      r(x + 2, y - 13, b.w - 4, 6, edge);
      r(x + 3, y - 13, b.w - 6, 2, light);
      r(x + 3, y - 11, b.w - 6, 2, face);
    } else {
      r(x + 7, y + 8, b.w - 15, 4, face);
      r(x + 9, y + 9, b.w - 19, 1, light);
      for (let k = 9; k < b.w - 5; k += 15) r(x + k, y + 3, 2, 1, light);
    }
  }
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
  shadow(x, GROUND + 1, clamp(16 - (GROUND - p.y) / 10, 7, 16));
  const frame = heroFrame(p);
  if (p.dash > 0) {
    for (let i = 1; i <= 3; i++) {
      g.globalAlpha = 0.22 / i;
      drawActor("hero", frame, x - p.face * (i * 9), p.y, 60, f);
    }
    g.globalAlpha = 1;
  }
  if (p.inv > 0.1 && p.hurtTime > 0) g.filter = "brightness(1.28)";
  drawActor("hero", frame, x, p.y - bob, 60, f);
  g.filter = "none";
  if (p.swing > 0) {
    const sign = p.face,
      t = 1 - p.swing / 0.2;
    g.save();
    g.translate(x, p.y - 27);
    g.scale(sign, 1);
    const a = -1.45 + t * 1.7;
    for (let i = 0; i < 12; i++) {
      let angle = a + i * 0.1,
        xx = Math.cos(angle) * 47,
        yy = Math.sin(angle) * 38;
      r(xx, yy, 4, 3, i < 5 ? "#f5c477" : "#fff0c0");
    }
    g.restore();
  }
  if (!near || near.type === "scholar")
    label("요룡이", x, p.y + 5, "#fff4db", "#2c303b", 8);
  if (near) {
    const t =
      near.type === "scholar"
        ? "↑ 대화"
        : near.name === "계단"
          ? "↑ 층 이동"
          : near.name === "매점"
            ? "↑ 회복"
            : "↑ " + near.name;
    label(t, x, p.y - 79, "#ffdda0", "#282e3a", 9);
  }
}
function monsters() {
  for (let e of foes) {
    let x = e.x - cam,
      bob = e.boss ? Math.sin(clock * 2) * 2 : 0,
      h = e.boss ? (e.kind === 4 ? 113 : 86) : 27;
    shadow(x, GROUND + 2, e.boss ? 32 : 10);
    if (e.boss && e.warn > 0) {
      let cx = e.markedX - cam;
      g.globalAlpha = 0.45 + 0.2 * Math.sin(clock * 20);
      r(cx - 22, GROUND, 44, 2, "#ff9c80");
      g.globalAlpha = 1;
      label(subjects[e.kind].tell, x, e.y - h - 23, "#ffddb5", "#693e48", 8);
    }
    if (e.hit > 0) g.filter = "brightness(1.7)";
    if (e.dying > 0) g.globalAlpha = Math.min(1, e.dying * 5);
    drawActor("foe" + e.kind, monsterFrame(e), x, e.y + bob, h, e.dir > 0);
    g.globalAlpha = 1;
    g.filter = "none";
    if (!e.boss && e.hp < e.max) {
      r(x - 10, e.y - h - 5, 20, 3, "#38333c");
      r(x - 10, e.y - h - 5, (20 * e.hp) / e.max, 2, "#e4a28c");
    }
  }
}
function particles() {
  for (let s of shots) {
    let x = s.x - cam,
      y = s.y;
    if (s.team) {
      const c = subjects[s.id].color;
      g.globalAlpha = 0.28;
      r(x - 8, y - 6, 16, 12, c);
      g.globalAlpha = 1;
      path(
        [
          [x - 6, y],
          [x, y - 7],
          [x + 6, y],
          [x, y + 7],
        ],
        c,
      );
      star(x, y, 2, "#fff4d2");
      if (s.vx === 0) r(x - 2, y - 12, 3, 6, c);
      else r(x - Math.sign(s.vx) * 12, y - 1, 7, 2, c);
    } else {
      let sz = s.area ? 29 : s.id === 4 ? 29 : 22;
      g.globalAlpha = 0.3;
      for (let k = 1; k < 4; k++)
        star(
          x - (s.vx ? Math.sign(s.vx) * k * 6 : 0),
          y - (s.vy > 100 ? k * 7 : 0),
          3,
          subjects[Math.floor(s.id / 2)].color,
        );
      g.globalAlpha = 1;
      // The battle atlas supplies the same silhouettes used in the player's hotbar.
      const im = assets["effect" + s.id];
      if (im?.naturalWidth)
        sprite("effect" + s.id, x, y + sz / 2, sz, s.dir < 0 && !s.area);
      else sprite("skill" + s.id, x, y + sz / 2, sz);
    }
  }
  for (let e of effects) {
    let x = e.x - cam,
      y = e.y;
    if (e.type === "spark") {
      r(x, y, e.life > 0.2 ? 3 : 1, 2, e.color);
    }
    if (e.type === "summon") {
      g.globalAlpha = Math.min(0.84, e.life * 2);
      drawActor(
        "scholar" + e.id,
        4 + Math.min(3, Math.floor((1 - e.life / e.max) * 4)),
        x,
        y - (1 - e.life / e.max) * 14,
        49,
        e.flip,
      );
      star(x + 15, y - 19, 2, "#fff0a6");
      g.globalAlpha = 1;
    }
    if (e.type === "wave") {
      let t = 1 - e.life / e.max,
        c = subjects[Math.floor(e.id / 2)].color;
      if (e.id === 7) {
        g.globalAlpha = 1 - t;
        sprite("effect7", x, y - 3, 35 + t * 22);
        g.globalAlpha = 1;
      }
      for (let i = 0; i < 14; i++) {
        let d = (i - 7) * t * (e.id === 7 ? 30 : 10);
        let yy = y - Math.sin(i * 1.3 + t * 3) ** 2 * (1 - t) * 29;
        r(x + d, yy, 3, Math.max(2, y - yy), c);
        star(x + d, yy, 2, "#fff0bb");
      }
    }
    if (e.type === "bubble") {
      const count = 23,
        lines = e.msg.match(new RegExp(".{1," + count + "}", "g")) || [e.msg];
      g.font = "9px Galmuri";
      let ww = Math.min(
          W - 12,
          Math.max(...lines.map((l) => g.measureText(l).width)) + 14,
        ),
        hh = lines.length * 13 + 7;
      x = clamp(x, ww / 2 + 4, W - ww / 2 - 4);
      r(x - ww / 2 - 1, y - hh - 1, ww + 2, hh + 2, "#34323a");
      r(x - ww / 2, y - hh, ww, hh, "#fff1cb");
      lines.forEach((l, i) => word(l, x, y - hh + 8 + i * 13, 9, "#3c393c"));
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
  for (let t of texts) {
    word(String(t.n), t.x - cam + 1, t.y + 1, 15, "#493a35");
    word(String(t.n), t.x - cam, t.y, 15, "#ffe8a9");
  }
}
function miniMap() {
  const m = mini,
    w = 168,
    h = 47;
  const mr = (x, y, ww, hh, c) => {
    m.fillStyle = c;
    m.fillRect(Math.round(x), Math.round(y), ww, hh);
  };
  if (scene.type === "gate") {
    mr(0, 0, w, h, "#8db2bf");
    for (let j = 0; j < 15; j++) {
      let y = 20 - Math.floor(Math.abs(Math.sin(j * 0.54)) * 8);
      mr(j * 13, y, 16, 31, "#779a92");
      mr(j * 13 + 3, y - 3, 10, 4, "#779a92");
    }
    mr(39, 15, 91, 20, "#a28971");
    mr(37, 13, 95, 3, "#635f5c");
    for (let j = 0; j < 12; j++)
      for (let k = 0; k < 3; k++) mr(42 + j * 7, 18 + k * 5, 4, 3, "#b5cec4");
    mr(77, 26, 12, 8, "#467469");
    mr(0, 35, w, 12, "#c2b89a");
    for (let j = 0; j < 14; j++) {
      if (j > 3 && j < 10) continue;
      mr(j * 13, 29, 12, 7, "#6d8d70");
      mr(j * 13 + 2, 26, 8, 4, "#6d8d70");
    }
    mr(0, 42, w, 2, "#9c967e");
  } else {
    mr(0, 0, w, h, "#3e4959");
    mr(0, 26, w, 4, "#b4a888");
    const marks =
      scene.type === "floor"
        ? objects().filter((o) => o.type === "room")
        : [{ x: 90 }, { x: 650 }];
    for (let o of marks) {
      let px = (o.x / worldWidth) * w;
      mr(px - 4, 12, 9, 13, o.name === "계단" ? "#b5a780" : "#728791");
      mr(px - 2, 15, 5, 10, "#485561");
    }
    for (let o of objects().filter((o) => o.type === "scholar"))
      mr((o.x / worldWidth) * w - 1, 21, 3, 4, "#e8c477");
  }
  let px = clamp((player.x / worldWidth) * w, 4, w - 4),
    py = scene.type === "gate" ? 36 : 27;
  mr(px - 3, py - 3, 7, 6, "#424d4b");
  mr(px - 2, py - 3, 5, 5, "#ffdf87");
  mr(px, py - 5, 1, 8, "#fff1b4");
  mr(px - 1, py + 3, 3, 1, "#535a52");
}
function render() {
  g.imageSmoothingEnabled = false;
  g.save();
  if (shake > 0.5) g.translate(Math.round(Math.sin(clock * 93) * shake), 0);
  if (scene.type === "gate") gate();
  else if (scene.type === "floor") hall();
  else battleBack();
  drawPlatforms();
  monsters();
  character();
  particles();
  g.restore();
  miniMap();
}
let last = 0,
  acc = 0,
  hudTime = 0;
function tick(ms) {
  const elapsed = last ? Math.min((ms - last) / 1000, 0.08) : 0;
  last = ms;
  acc += elapsed;
  while (acc >= 1 / 60) {
    step(1 / 60);
    acc -= 1 / 60;
  }
  render();
  if (ms - hudTime > 95) {
    statusBars();
    hudTime = ms;
  }
  if (ms > toastUntil) $("toast").classList.remove("on");
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
