"use strict";
const iconCache = {};
const iconTiles = {};
const schoolTiles = {};
for (const name of ["globe", "rose", "zelkova"]) {
  const tile = new Image();
  tile.src = "assets/ui/" + name + ".png";
  schoolTiles[name] = tile;
}
function icon(name) {
  if (schoolTiles[name]) return schoolTiles[name].src;
  if (iconCache[name]) return iconCache[name];
  const c = document.createElement("canvas");
  c.width = c.height = 24;
  const g = c.getContext("2d");
  const rect = (x, y, w, h, col) => {
    g.fillStyle = col;
    g.fillRect(x, y, w, h);
  };
  const dot = (x, y, col, s = 1) => rect(x, y, s, s, col);
  const line = (x, y, ex, ey, col, s = 1) => {
    const n = Math.max(Math.abs(ex - x), Math.abs(ey - y), 1);
    for (let k = 0; k <= n; k++)
      dot(
        Math.round(x + ((ex - x) * k) / n),
        Math.round(y + ((ey - y) * k) / n),
        col,
        s,
      );
  };
  const poly = (points, col) => {
    g.fillStyle = col;
    for (let y = 0; y < 24; y++) {
      let v = [];
      for (let j = 0; j < points.length; j++) {
        let a = points[j],
          b = points[(j + 1) % points.length];
        if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y))
          v.push(a[0] + ((y - a[1]) * (b[0] - a[0])) / (b[1] - a[1]));
      }
      v.sort((a, b) => a - b);
      for (let j = 0; j < v.length; j += 2)
        g.fillRect(
          Math.ceil(v[j]),
          y,
          Math.floor(v[j + 1]) - Math.ceil(v[j]) + 1,
          1,
        );
    }
  };
  const ring = (cx, cy, rx, ry, angle, col) => {
    for (let i = 0; i < 100; i++) {
      let t = (i * Math.PI) / 50,
        x = rx * Math.cos(t),
        y = ry * Math.sin(t);
      dot(
        Math.round(cx + x * Math.cos(angle) - y * Math.sin(angle)),
        Math.round(cy + x * Math.sin(angle) + y * Math.cos(angle)),
        col,
      );
    }
  };
  const gold = "#edc677",
    white = "#f9efce";
  const mint = "#d0de9c", deep = "#233d72", brass = "#aa7639";
  if (name.startsWith("seal-") || name.startsWith("earned-")) {
    const [state, subject] = name.split("-");
    const earned = state === "earned";
    // Each discipline hangs from a pair of school-blue ribbon tails.
    poly([[6,12],[12,13],[11,23],[8,20],[4,22]],earned ? "#456cb3" : "#697890");
    poly([[12,13],[18,12],[20,22],[16,20],[14,23]],earned ? "#30548e" : "#50637e");
    const rim = earned ? "#f8d27a" : "#a2b3c9";
    const disk = (radius, color) => {
      g.fillStyle = color;
      for (let y = -radius; y <= radius; y++) {
        const span = Math.floor(Math.sqrt(radius * radius - y * y));
        g.fillRect(12-span, 10+y, span*2+1, 1);
      }
    };
    disk(10,deep); disk(9,rim); disk(7,earned ? "#3b5078" : "#344563");
    icon(subject);
    g.imageSmoothingEnabled = false;
    g.drawImage(iconTiles[subject], 5, 3, 14, 14);
    rect(9,2,5,1,earned ? white : "#d3dae6");
    dot(18,15,earned ? white : "#c8cfda");
  }
  if (name === "slots") {
    poly([[4,5],[19,5],[22,8],[22,17],[19,20],[4,20],[1,17],[1,8]],deep);
    line(4,6,18,6,gold);
    for (const x of [4, 10, 16]) {
      rect(x,9,4,7,"#89a3c2");
      rect(x+1,10,2,4,x===4 ? gold : "#38517e");
    }
  }
  if (name === "map") {
    poly([[2,5],[8,3],[15,6],[22,3],[22,18],[15,21],[8,18],[2,21]], gold);
    line(8,5,8,16,brass);
    line(15,8,15,19,brass);
    line(4,14,10,10,deep);
    line(10,10,16,13,deep);
    dot(17,9,deep,3);
  }
  if (name === "stairs") {
    for (let i = 0; i < 4; i++) rect(3+i*5,16-i*4,5,5+i*4,i%2 ? gold : white);
  }
  if (name === "rift") {
    poly([[13,1],[7,10],[10,12],[5,22],[17,13],[14,11],[20,3]], "#d3a7ed");
    line(12,6,9,10,white);
  }
  if (name === "close") {
    line(6,6,16,16,white,2);
    line(16,6,6,16,white,2);
  }
  if (name === "left" || name === "right" || name === "interact") {
    const points = name === "left" ? [[4,11],[15,3],[15,8],[20,8],[20,15],[15,15],[15,20]]
      : name === "right" ? [[20,11],[9,3],[9,8],[4,8],[4,15],[9,15],[9,20]]
      : [[12,3],[21,13],[15,13],[15,20],[9,20],[9,13],[3,13]];
    poly(points,white);
  }
  if (name === "save") {
    rect(3,4,17,16,mint);
    rect(6,4,10,6,deep);
    rect(12,5,2,4,mint);
    rect(6,13,11,7,deep);
    rect(8,15,7,1,mint);
  }
  if (name === "crystal") {
    poly(
      [
        [12, 1],
        [21, 11],
        [12, 23],
        [3, 11],
      ],
      "#886642",
    );
    poly(
      [
        [12, 2],
        [19, 10],
        [12, 19],
        [5, 10],
      ],
      gold,
    );
    poly(
      [
        [12, 3],
        [13, 10],
        [6, 10],
      ],
      "#fff2b8",
    );
    poly(
      [
        [14, 10],
        [19, 10],
        [12, 19],
      ],
      "#c9883e",
    );
    line(3, 18, 8, 21, gold);
    line(16, 21, 21, 17, gold);
    dot(20, 3, white, 2);
    dot(1, 12, white);
  }
  if (name === "sound") {
    rect(2, 9, 5, 6, white);
    poly(
      [
        [6, 9],
        [12, 4],
        [12, 20],
        [6, 15],
      ],
      white,
    );
    line(15, 8, 18, 11, gold, 2);
    line(18, 12, 15, 15, gold, 2);
    line(18, 4, 22, 9, gold);
    line(22, 15, 18, 20, gold);
  }
  if (name === "mute") {
    rect(2, 9, 5, 6, white);
    poly(
      [
        [6, 9],
        [12, 4],
        [12, 20],
        [6, 15],
      ],
      white,
    );
    line(16, 9, 21, 14, "#cf9796", 2);
    line(21, 9, 16, 14, "#cf9796", 2);
  }
  if (name === "expand") {
    for (let x of [3, 14]) for (let y of [3, 18]) rect(x, y, 7, 2, white);
    for (let x of [3, 19]) for (let y of [4, 13]) rect(x, y, 2, 7, white);
  }
  if (name === "menu") {
    for (let y of [5, 11, 17]) rect(3, y, 18, 2, white);
  }
  if (name === "pin") {
    poly(
      [
        [8, 3],
        [16, 3],
        [19, 6],
        [19, 11],
        [12, 21],
        [5, 11],
        [5, 6],
      ],
      gold,
    );
    rect(9, 7, 6, 5, "#393443");
  }
  if (name === "quest") {
    rect(3,2,17,20,"#162952");
    rect(4,3,15,17,"#34528a");
    rect(5,3,2,16,gold);
    rect(8,4,10,1,"#809ac0");
    rect(5,19,14,2,white);
    rect(14,17,3,6,"#d78497");
    poly([[9,9],[10,7],[13,6],[15,7],[17,8],[16,12],[13,14],[10,13]],"#eea4b2");
    line(11,9,14,8,"#ffe2cf");
    rect(12,10,2,2,"#ae5975");
    line(12,15,15,13,"#c9dc90");
  }
  if (name === "sword") {
    line(4, 20, 18, 6, "#212735", 4);
    poly(
      [
        [8, 13],
        [17, 4],
        [21, 3],
        [20, 8],
        [11, 17],
      ],
      "#a0c3d2",
    );
    line(10, 13, 19, 4, "#f7f5df", 2);
    line(5, 13, 11, 19, gold, 2);
    line(4, 19, 7, 16, "#b87849", 2);
    dot(3, 20, gold, 2);
  }
  if (name === "atom") {
    for (let a of [0, 1.05, 2.1]) ring(12, 12, 9, 3, a, "#6fb9e4");
    dot(11, 11, "#ffe4a1", 3);
    dot(19, 11, "#c5f3ff", 2);
    dot(7, 4, "#e2f4ff", 2);
  }
  if (name === "flask") {
    rect(9, 3, 7, 2, "#e1c6f1");
    rect(10, 5, 5, 6, "#a88ccf");
    poly(
      [
        [10, 10],
        [14, 10],
        [21, 19],
        [20, 21],
        [4, 21],
        [3, 19],
      ],
      "#ddbbf8",
    );
    poly(
      [
        [8, 14],
        [16, 14],
        [19, 19],
        [6, 19],
      ],
      "#a667df",
    );
    dot(8, 16, "#e6a0ff", 2);
    dot(13, 12, "#9169bc");
    dot(17, 6, "#f2bcff");
  }
  if (name === "leaf") {
    poly(
      [
        [3, 20],
        [5, 11],
        [10, 6],
        [20, 3],
        [20, 11],
        [15, 17],
        [7, 19],
      ],
      "#609c71",
    );
    poly(
      [
        [5, 17],
        [7, 10],
        [13, 6],
        [19, 4],
        [13, 12],
      ],
      "#a6d793",
    );
    line(3, 21, 17, 7, "#d4e7a7");
    line(11, 13, 10, 8, "#d4e7a7");
    line(9, 15, 15, 15, "#b0d591");
  }
  if (name === "earth") {
    poly(
      [
        [3, 18],
        [8, 9],
        [12, 8],
        [16, 4],
        [21, 15],
        [20, 19],
        [9, 21],
      ],
      "#cb8662",
    );
    poly(
      [
        [6, 16],
        [9, 10],
        [13, 9],
        [11, 15],
      ],
      "#f7d39a",
    );
    poly(
      [
        [12, 14],
        [16, 5],
        [19, 13],
      ],
      "#e5b381",
    );
    line(5, 18, 10, 19, "#f3bd82");
    line(11, 18, 19, 15, "#926851");
  }
  if (name === "lock") {
    rect(7, 4, 10, 2, "#b1ad9d");
    rect(6, 6, 2, 6, "#b1ad9d");
    rect(16, 6, 2, 6, "#b1ad9d");
    rect(4, 11, 16, 10, "#b1ad9d");
    rect(11, 14, 3, 4, "#414652");
  }
  iconTiles[name] = c;
  const url = c.toDataURL();
  iconCache[name] = url;
  return url;
}
function decorate(root = document) {
  root.querySelectorAll("i[data-icon]").forEach((el) => {
    el.style.backgroundImage = "url(" + icon(el.dataset.icon) + ")";
  });
}
