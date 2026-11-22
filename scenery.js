"use strict";

const schoolPaint = new Image(), furniturePaint = new Image();
schoolPaint.src = campusAtlas.data;
furniturePaint.src = fixtureAtlas.data;
const roomsPaint = new Image();
roomsPaint.src = schoolRoomAtlas.data;
const hallArt = () => scene.floor >= 3 ? "hall" + scene.floor : "corridor";
const roomRegion = name => schoolRoomAtlas.regions[name];
const labPaint = ["physics", "chem", "bio", "earth"];
const panoramaWidth = rate => Math.max(680, W + Math.max(0, worldWidth - W) * rate + 12);
function furnishingTheme() {
  if (scene.type === "roof") return progress.won ? "roof-day" : "roof-night";
  return scene.type === "arena" ? labPaint[scene.subject] : "hall-case";
}
// Upper-left daylight in the school, cool skylight in the labs, and a warm rim from the rooftop rift.
const roomLight = {
  gate: ["#fff3d5","#c8e3ff","#937654","#fff9e6", 1],
  hall: ["#ffe2ae","#fce9ce","#94644b","#ffd490", 1],
  classroom: ["#ffe7b8","#fff1ce","#96745e","#ffda90", 1],
  physics: ["#fff0ca","#d2edee","#86745e","#ecd9a5", 1],
  chem: ["#fff0cc","#d9e7da","#86745e","#e7d5ae", 1],
  bio: ["#fff0c0","#e2edce","#81755d","#eed9a2", 1],
  earth: ["#fff1c8","#eae0cc","#84725a","#eed6a5", 1],
  "roof-night": ["#ffc29a","#ddd1ff","#66527f","#ea9cf1", -1],
  "roof-day": ["#ffe2a5","#ffdcd3","#967688","#ffe1a0", -1],
};
function environmentLight() {
  return roomLight[scene.type === "floor" ? "hall" :
    scene.type === "arena" || scene.type === "roof" ? furnishingTheme() : scene.type];
}
// Rear exhibits sit on a separate strip of floor, clear of foreground jumping platforms.
function exhibitStations() {
  if (scene.type === "floor") {
    if (scene.floor === 1) return [{x:775, feet:283, w:83, h:23, seal:true}];
    return [477,1730].map(x=>({x, feet:282, w:54, h:21, scale:.64, subject:scene.floor-2}));
  }
  if (scene.type === "arena") return [
    {x:228, feet:222, w:66, h:0, scale:.78, subject:scene.subject, onBench:true},
  ];
  return [];
}
function mapFixtures() {
  const items = [];
  const theme = furnishingTheme();
  if (scene.type==="classroom") for (const door of sideStairs.classroom)
    items.push({key:"sill",x:door.x,feet:scene.floor===5?257:260,w:64,h:7});
  if (scene.type === "arena" || scene.type === "roof") {
    for (const stair of sideStairs[scene.type]) {
      const key = "stairs-" + theme, [, , sw, sh] = fixtureAtlas.regions[key];
      const w = scene.type === "arena" ? 117 : 123;
      items.push({key, x:stair.x, feet:GROUND, w, h:Math.round(w*sh/sw), flip:stair.side==="east"});
    }
  }
  for (const station of exhibitStations()) items.push({...station, key:station.onBench ? null : theme});
  for (const b of platforms()) {
    if (scene.type === "classroom") {
      if (!courseRun || b.kind === "desk") items.push({x:b.x, feet:GROUND, w:b.w, h:0});
      continue;
    }
    const bench = scene.type === "floor" || scene.type === "arena";
    // The seat is 58% down the bench sprite; cabinet tops accept feet 8% down.
    const seat = bench ? .58 : .08;
    const h = Math.round((GROUND-b.y)/(1-seat));
    items.push({key:bench ? "bench" : theme, x:b.x, feet:GROUND, w:b.w, h});
  }
  return items;
}
const campusGarden = [
  ["tree",-16,288,188,.78,false], ["tree",920,287,164,.78,true], ["tree",1195,289,158,.78,true],
  ["fence",85,295,124,1,true], ["fence",483,295,135,1,false], ["fence",807,295,135,1,true],
  ["roses",114,299,70,1,false], ["roses",431,298,62,1,true], ["roses",862,299,71,1,false], ["roses",1080,300,69,1,true],
  ["lamp",181,296,23,1,false], ["lamp",548,296,25,1,false], ["lamp",746,296,25,1,true],
];
function cropStamp(image, regions, name, left, top, w, h, flip = false) {
  if (!image.naturalWidth) return;
  const [sx,sy,sw,sh] = regions[name];
  g.save();
  g.translate(Math.round(flip ? left+w : left), Math.round(top));
  if (flip) g.scale(-1,1);
  g.drawImage(image,sx,sy,sw,sh,0,0,Math.round(w),Math.round(h));
  g.restore();
}

function groundContact(x,feet,width,height,flip=false) {
  cropStamp(furniturePaint,fixtureAtlas.regions,"shadow",x-width/2,feet-height/2,width,height,flip);
}

// Each window and its sunlit floorboards use the same horizontal slice of the mural.
const hallSections = new Map();
function hallwaySections() {
  if (hallSections.has(scene.floor)) return hallSections.get(scene.floor);
  const result = [], bays = hallBays[scene.floor];
  for (let i=0;i<bays.length;i++) {
    const b=bays[i], l=i ? hallBoundary(bays[i-1],b) : 0;
    const r=i+1<bays.length ? hallBoundary(b,bays[i+1]) : worldWidth;
    const add=(x,end,u,v,asset=hallArt(),door=null)=>{
      if (end>x) result.push({x,w:end-x,u,v,asset,door});
    };
    if (b.type==="stair") {
      const east=b.side==="east";
      add(l,r,east?1:0,east?0:1,"stairhall");
      continue;
    }
    const span=Math.min(29,(b.x-l)*.7,(r-b.x)*.7);
    const left=Math.max(l,b.x-113), right=Math.min(r,b.x+113);
    for (const [a,end] of [[l,left],[right,r]]) {
      const count=Math.ceil((end-a)/145);
      for (let j=0;j<count;j++) {
        const w=(end-a)/count, half=.127*Math.min(1,w/132);
        add(a+j*w,a+(j+1)*w,.449-half,.449+half);
      }
    }
    add(left,b.x-span,0,.183);
    add(b.x+span,right,.297,.5);
    const inside = b.name==="물리지학실" ? "physics" : b.name==="생명화학실" ? "chem"
      : b.name==="중앙 현관" ? "entrance-view" : null;
    let door = null;
    if (inside) {
      const [,,iw,ih]=roomRegion(inside);
      door={x:b.x,inside,view:(span*2+4)*ih*.79/(132*iw)};
    } else if (b.room) {
      const sw=Math.round((span*2+4)*231/132);
      door={x:b.x,classroom:[b.room%2 ? 164 : 716,classroomArtRow()*H+72,sw,231]};
    }
    add(b.x-span,b.x+span,.183,.297,hallArt(),door);
  }
  hallSections.set(scene.floor,result);
  return result;
}
function doorTravel(doorX, width) {
  const near = Math.max(0,1-Math.abs(player.x-doorX)/87);
  return width*.825*near*near*(3-2*near);
}
// Keep one continuous parquet grain under every bay. The sunlit part of each
// painted floor sample feathers into that grain at cut edges and downstage.
const hallFloors = new Map();
function hallFloorPainting() {
  if (hallFloors.has(scene.floor)) return hallFloors.get(scene.floor);
  const floor=document.createElement("canvas");
  floor.width=worldWidth; floor.height=H-275;
  const ctx=floor.getContext("2d");
  ctx.imageSmoothingEnabled=false;
  const [sx,sy,sw,sh]=campusAtlas.regions.corridor;
  const top=275/H;
  for (let x=0;x<floor.width;x+=104)
    ctx.drawImage(schoolPaint,sx+sw*.558,sy+sh*top,sw*.141,sh*(1-top),x,0,104,floor.height);
  const pane=document.createElement("canvas");
  for (const {asset,x,w,u,v} of hallwaySections()) {
    const start=Math.round(x), width=Math.round(x+w)-start;
    if (width<1) continue;
    pane.width=width; pane.height=floor.height;
    const ink=pane.getContext("2d"); ink.imageSmoothingEnabled=false;
    const region=roomRegion(asset);
    const [rx,ry,rw,rh]=region || campusAtlas.regions[asset];
    ink.save();
    if (v<u) { ink.translate(width,0); ink.scale(-1,1); }
    ink.drawImage(region ? roomsPaint : schoolPaint,rx+Math.min(u,v)*rw,ry+top*rh,Math.abs(u-v)*rw,rh*(1-top),0,0,width,floor.height);
    ink.restore();
    ink.globalCompositeOperation="destination-in";
    const edge=Math.min(.45,11/width), blend=ink.createLinearGradient(0,0,width,0);
    blend.addColorStop(0,"transparent"); blend.addColorStop(edge,"black");
    blend.addColorStop(1-edge,"black"); blend.addColorStop(1,"transparent");
    ink.fillStyle=blend; ink.fillRect(0,0,width,pane.height);
    const depth=ink.createLinearGradient(0,0,0,pane.height);
    depth.addColorStop(0,"black"); depth.addColorStop(.63,"rgba(0,0,0,.92)"); depth.addColorStop(1,"transparent");
    ink.fillStyle=depth; ink.fillRect(0,0,width,pane.height);
    ctx.drawImage(pane,start,0);
  }
  hallFloors.set(scene.floor,floor);
  return floor;
}

// Local coordinates use the field's 360-pixel height. Scenery has no collision
// or hit targets and never consumes the combat clock or random-number stream.
let sceneryTime = 0;
const wrap = (value, span) => ((value % span) + span) % span;

function strokePixels(points, color, width = 1) {
  g.strokeStyle = color;
  g.lineWidth = width;
  g.beginPath();
  points.forEach(([x, y], index) => {
    if (index) g.lineTo(Math.round(x) + .5, Math.round(y) + .5);
    else g.moveTo(Math.round(x) + .5, Math.round(y) + .5);
  });
  g.stroke();
  g.lineWidth = 1;
}

function sparrow(x, y, phase) {
  const up = Math.sin(phase) > .1;
  r(x, y, 5, 2, "#495d5c");
  r(x + 4, y - 1, 2, 2, "#485758");
  r(x + 6, y, 1, 1, "#caa16a");
  r(x - 2, y - 1, 3, 1, "#5c695f");
  r(x + 1, y + (up ? -2 : 1), 2, 2, "#647775");
  r(x, y + (up ? -3 : 3), 2, 1, "#485e61");
}

function pennant(x, base, height, time, primary) {
  const top = base - height;
  r(x - 3, base - 2, 7, 2, "#536258");
  r(x, top, 2, height - 2, "#58695f");
  r(x, top, 1, height - 2, "#e5debb");
  r(x - 1, top - 2, 4, 3, "#e6c87a");
  for (let i = 0; i < 30; i++) {
    const wave = Math.sin(time * 2.5 - i * .23 + x * .006) * (i / 12);
    const y = top + 3 + wave + i * .06;
    const height = Math.ceil(13 * (1 - i / 31));
    r(x + 2 + i, y, 1, height, primary);
    r(x + 2 + i, y, 1, 1, "#e9d7a0");
    if (Math.sin(time * 2.5 - i * .23) > .6) r(x + 2 + i, y + 1, 1, height - 1, "#fcdf9c2b");
    if (i > 4 && i < 14) r(x + 2 + i, y + Math.abs(9 - i) * .6 + 2, 1, 2, "#f6d894");
  }
}

function campusAir(time) {
  // A distant flock crosses above the rooftops at a different depth from the leaves.
  const flight = wrap(time * 13 - cam * .12 + 283, W + 95) - 43;
  for (let i = 0; i < 5; i++) {
    const x = flight - i * 9;
    const y = 73 - Math.sin(i * 1.15) * 5 - Math.sin(time * .6 + i * .4) * 3;
    sparrow(x, y, time * 6 + i);
  }
  for (let i = 0; i < 13; i++) {
    const depth = i % 3, speed = 9 + depth * 6;
    const x = wrap(i * 73 + time * speed - cam * (.26 + depth * .16), W + 40) - 19;
    const y = 27 + wrap(i * 47 + time * (4 + depth) + 5 * Math.sin(time + i), 279);
    const tilt = Math.sin(time * 2 + i);
    r(x, y, tilt > 0 ? 4 : 2, 1, i % 3 ? "#ccac5d" : "#829254");
    r(x + (tilt > 0 ? 1 : 0), y - 1, 2, 1, i % 3 ? "#f5da8b" : "#a4bb72");
  }
  // Butterflies stay over the flowerbeds, below the distant birds.
  for (let i = 0; i < 3; i++) {
    const x = wrap(146 + i * 227 - cam * .65, W + 50) - 25 + Math.sin(time * .83 + i) * 12;
    const y = 241 + Math.cos(time * 1.4 + i * 2) * 5 + Math.sin(time * .63) * 5;
    const open = Math.sin(time * 7 + i) > -.2;
    r(x, y, 1, 3, "#62604d");
    r(x - (open ? 3 : 1), y - 2, open ? 3 : 1, 3, "#e8a955");
    r(x + 1, y - 3, open ? 3 : 1, 3, "#ffe8a3");
    if (open) r(x - 2, y + 1, 2, 2, "#d98e55");
  }
}

function corridorExhibit(x, width, roomIndex, time) {
  const floor = scene.floor;
  // Mount each piece on the wall next to its door, within that room's tile.
  const side = roomIndex % 2 ? 1 : -1;
  const mount = x + side * Math.min(66, width * .27);
  if (floor >= 3 && roomIndex % 2 === 0 && x + 62 > 0 && x + 62 < W + 35) {
    const px = x + Math.min(65,width * .29), y = 221;
    const ink = ["#517466","#556b89","#855e45"][floor-3];
    r(px-23,y-2,47,29,"#674d37");
    r(px-21,y,43,24,"#b69565");
    r(px-19,y+2,39,9,ink);
    word(["과학 신문","관찰 일지","탐구 기록"][floor-3],px,y+4,7,"#fff6d1");
    for (let j=0;j<3;j++) {
      r(px-16+j*12,y+13,9,8,j===1 ? "#e1c08d" : "#eae0bc");
      r(px-14+j*12,y+16,4,1,ink);
    }
  }
  if (mount > -30 && mount < W + 30) {
    if (roomIndex % 3 === 0) {
      const y = 86;
      r(mount - 6, y + 6, 13, 16, "#594f3f");
      r(mount - 4, y + 7, 9, 13, "#384e47");
      const endX = mount + Math.sin(time * 2.6 + roomIndex) * 2.5;
      strokePixels([[mount,y+6],[endX,y+16]], "#d1b674");
      r(endX-1,y+15,3,3,"#efc771");
      path([[mount-8,y-9],[mount+7,y-9],[mount+11,y-5],[mount+11,y+5],[mount+6,y+10],[mount-6,y+10],[mount-10,y+5],[mount-10,y-5]], "#675b45");
      r(mount-7,y-6,15,13,"#e5d6a9");
      for (const [dx,dy] of [[0,-5],[6,0],[0,5],[-6,0]]) r(mount+dx,y+dy,1,1,"#78654d");
      strokePixels([[mount-3,y-2],[mount,y],[mount+Math.sin(time*.105)*5,y-Math.cos(time*.105)*5]], "#405349");
    } else {
      const y = 69 + Math.sin(time * 1.5 + roomIndex) * .7;
      const color = ["#50796f","#50758c","#816889","#65825c","#97744e"][floor - 1];
      r(mount-10,64,22,2,"#7a674c");
      path([[mount-8,66],[mount+9,66],[mount+9,y+24],[mount+1,y+29],[mount-8,y+24]], color);
      r(mount-6,68,13,1,"#e2c999");
      const symbol = floor === 1 ? "globe" : subjectIcons[floor - 2];
      icon(symbol);
      const tile = schoolTiles[symbol] || iconTiles[symbol];
      if (tile.width) g.drawImage(tile, Math.round(mount - 5), Math.round(y + 2), 12, 12);
      word(floor + "F",mount+1,y+19,7,"#f8e7b8");
    }
  }
}

function ellipseLine(x, y, rx, ry, angle, color) {
  g.beginPath();
  g.ellipse(x, y, rx, ry, angle, 0, Math.PI * 2);
  g.strokeStyle = color;
  g.stroke();
}

function chalkExperiment(cx, cy, time, subject) {
  const chalk = subjects[subject].color;
  g.save();
  g.translate(Math.round(cx), Math.round(cy));
  if (subject === 0) {
    for (const tilt of [-.36,.36]) {
      ellipseLine(0, 0, 35, 11, tilt, chalk);
      const a = time * (tilt > 0 ? .9 : -1.3);
      const x = 35 * Math.cos(a), y = 11 * Math.sin(a);
      const dx = x * Math.cos(tilt) - y * Math.sin(tilt);
      const dy = x * Math.sin(tilt) + y * Math.cos(tilt);
      r(dx-2,dy-2,4,4,"#f5e2a8");
    }
    star(0,0,3,"#d5f0e1");
  } else if (subject === 1) {
    // Two bent water molecules with a dotted hydrogen bond between them.
    const drift = Math.sin(time * 1.2) * 2;
    for (const [x, side] of [[-22,1],[22,-1]]) {
      const ox = x + side * drift, oy = drift * side;
      const hx = ox + 12, hy = oy + 9 * side;
      strokePixels([[ox-10,oy+12*side],[ox,oy],[hx,hy]], "#decedd",2);
      for (const [ax,ay,radius] of [[ox,oy,6],[ox-10,oy+12*side,3],[hx,hy,3]]) {
        ellipseLine(ax,ay,radius,radius,0,radius===6 ? chalk : "#dfdcc0");
      }
    }
    for (let i=-6; i<12; i+=4) r(i,6-i*.22,2,1,"#cdbbd0");
  } else if (subject === 2) {
    const front = [], back = [];
    for (let x=-44; x<=44; x+=4) {
      const y = Math.sin(x*.088 + time*1.45) * 12;
      front.push([x,y]); back.push([x,-y]);
      if ((x+44)%12===0) strokePixels([[x,y],[x,-y]],"#7c9f83");
    }
    strokePixels(back,"#dac790",2);
    strokePixels(front,chalk,2);
  } else {
    // A scrolling seismogram with a quiet baseline between wave arrivals.
    strokePixels([[-46,-15],[-46,15],[47,15]], "#8da799");
    const signal=[];
    for (let x=-44; x<=46; x+=2) {
      const phase=wrap(x-time*16,78);
      const envelope=Math.max(0, 1-Math.abs(phase-31)/20);
      signal.push([x,3+Math.sin(phase*.89)*envelope*14]);
    }
    strokePixels(signal,chalk,2);
  }
  g.restore();
}

function flask(x, y, time) {
  path([[x-4,y-28],[x+4,y-28],[x+4,y-19],[x+12,y-4],[x+10,y],[x-10,y],[x-12,y-4],[x-4,y-19]], "#b1cfd1");
  path([[x-2,y-26],[x+2,y-26],[x+2,y-18],[x+10,y-4],[x+8,y-2],[x-8,y-2],[x-10,y-4],[x-2,y-18]], "#44526d");
  path([[x-6,y-10],[x-1,y-9+Math.sin(time*2)],[x+6,y-11],[x+9,y-4],[x+8,y-2],[x-8,y-2],[x-9,y-4]], "#b783c5");
  r(x-5,y-29,11,2,"#e0e4cd");
  for (let i=0; i<5; i++) {
    const rise = wrap(time*8+i*7,31);
    const px = x + Math.sin(time+i*2+rise*.12)*4;
    ellipseLine(px, y-31-rise, i%2+1, i%2+1, 0, "#dcc7e0a0");
  }
}

function labExhibit(x, y, time, subject) {
  r(x-20,y,41,3,"#3d3946");
  r(x-17,y-2,35,2,"#a19678");
  if (subject === 0) {
    // A working Newton's cradle, with the end balls swinging in turn.
    r(x-15,y-30,2,28,"#9a9686");
    r(x+14,y-30,2,28,"#757e7d");
    r(x-16,y-31,33,3,"#d2bd91");
    for (let i=0;i<5;i++) {
      const phase = Math.sin(time*2.1);
      const angle = i === 0 ? Math.min(0,phase)*.82 : i === 4 ? Math.max(0,phase)*.82 : 0;
      const peg = x-10+i*5, bx=peg+Math.sin(angle)*19, by=y-28+Math.cos(angle)*19;
      strokePixels([[peg,y-28],[bx,by]],"#b5bdad");
      r(bx-2,by,5,4,"#7195a0");
      r(bx-1,by,2,1,"#e8e8d3");
    }
  } else if (subject === 1) {
    flask(x,y-2,time);
  } else if (subject === 2) {
    path([[x-9,y-13],[x+9,y-13],[x+6,y-2],[x-6,y-2]],"#a57455");
    r(x-10,y-15,21,3,"#d69f73");
    let prev=[x,y-15];
    for (let i=1;i<=6;i++) {
      const nx=x+Math.sin(time*1.3+i*.45)*i*.55, ny=y-15-i*4;
      strokePixels([prev,[nx,ny]], "#a1b77d",2);
      const side=i%2 ? 1 : -1, reach=9-i*.65;
      path([[nx,ny],[nx+side*reach,ny-2],[nx+side*(reach+2),ny-6],[nx+side*3,ny-5]],side>0?"#8dae73":"#abc482");
      prev=[nx,ny];
    }
  } else {
    const tilt=-.3;
    ellipseLine(x,y-17,13,13,0,"#dec599");
    g.save();
    g.beginPath(); g.arc(x,y-17,11,0,Math.PI*2); g.clip();
    r(x-11,y-28,23,23,"#688f9d");
    for (let i=0;i<5;i++) {
      const tx = x-17+wrap(i*11+time*3,33), ty=y-25+(i*7)%17;
      r(tx,ty,7,3,"#a6b787"); r(tx+2,ty+2,4,3,"#8eab7e");
    }
    g.restore();
    ellipseLine(x,y-17,15,5,tilt,"#d3b87b");
    r(x-1,y-4,3,2,"#c1a278");
  }
}

function roofSky(x, tileWidth, time, won) {
  const cx=x+tileWidth*.646, cy=65;
  if (!won) {
    for (let i=0; i<6; i++) {
      const phase=time*.14+i*Math.PI/3;
      const px=cx+Math.cos(phase)*42, py=cy+Math.sin(phase)*12;
      path([[px-2,py],[px+1,py-5],[px+3,py],[px,py+4]],i%2 ? "#e9a9e7" : "#b69bdd");
    }
  }
  for (let i=0; i<20; i++) {
    const sx=x+wrap(i*127+19,tileWidth), sy=15+(i*37)%106;
    if (Math.sin(time*1.4+i*2)>.2) star(sx,sy,i%4===0?2:1, "#f5daeaab");
  }
  const flight=wrap(time*.095+.02,1);
  if (flight<.16) {
    const px=x+tileWidth*.28+flight*280, py=26+flight*130;
    strokePixels([[px-9,py-4],[px,py]],"#ddd2e3a8");
    r(px,py,2,1,"#fff3da");
  }
  pennant(x+tileWidth*.247,255,54,time+2,won?"#967357":"#776786");
}
