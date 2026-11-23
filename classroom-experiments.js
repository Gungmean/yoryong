"use strict";

const classroomProps = new Image();
classroomProps.src = classroomPropAtlas.data;

function lessonSprite(name,x,y,w,h) {
  const [sx,sy,sw,sh] = classroomPropAtlas.regions[name];
  w ??= sw;
  h ??= sh;
  if (!classroomProps.naturalWidth || x+w/2<0 || x-w/2>W) return;
  drawFieldCell(classroomProps, sx, sy + classroomArtRow()*classroomPropAtlas.gradeStride,
    sw, sh, sw/2, 0, x, y, w/sw, h/sh, false);
}

function lessonCabinet(name,x,y,w) {
  groundContact(x+3,GROUND+1,w*1.19,8);
  lessonSprite(name,x,y,w,GROUND-y);
}

function lessonDesk(x,y,w,variation = 0) {
  if (x + w/2 < 0 || x - w/2 > W) return;
  groundContact(x+2,GROUND+1,w*1.15,8);
  if (assets.classrooms.naturalWidth)
    drawFieldCell(assets.classrooms, 2+136*variation, 1082, 132, 96, 66, 0,
      x, y-16, w/132, (GROUND-y+16)/96, false);
}

function lessonApple(x,y) {
  r(x-1,y-5,2,4,"#655341");
  r(x,y-5,4,2,"#779454");
  path([[x-5,y-1],[x-2,y-3],[x,y-2],[x+4,y-3],[x+6,y],[x+4,y+5],[x,y+6],[x-4,y+5]],"#872f2c");
  r(x-3,y-1,6,5,"#cd5941");
  r(x-2,y-1,2,2,"#ffd58e");
}

function weighScene(run, positions) {
  const [tree, scale] = positions;
  const lift = run.platforms[0], shelf = run.platforms[1];
  lessonCabinet("bookcase",shelf.x-cam,shelf.y,shelf.w);
  const lx=lift.x-cam;
  groundContact(lx+3,GROUND+1,82,8);
  lessonSprite("lift-rails",lx,GROUND-100);
  const weightY=236+(lift.homeY-lift.y)*.8;
  r(lx-29,231,1,weightY-231,"#b19473");
  r(lx-34,weightY,11,10,"#6d6656");
  r(lx-33,weightY,9,1,"#cbbe9b");
  lessonSprite("lift-deck",lx,lift.y,lift.w);
  lessonCabinet("lab-counter",scale,273,61);
  lessonSprite("balance",scale,236);
  const tilt = courseSolved() ? 4 : -3;
  strokePixels([[scale-19,249-tilt],[scale+19,249+tilt]],"#5a5145",3);
  strokePixels([[scale-19,248-tilt],[scale+19,248+tilt]],"#c5ae81",1);
  for (const d of [-1,1]) {
    const x=scale+d*19, y=257+d*tilt;
    strokePixels([[x-6,y],[x,249+d*tilt],[x+6,y]],"#9b8767");
    r(scale+d*19-8,257+d*tilt,16,3,"#92825f");
    r(scale+d*19-7,257+d*tilt,14,1,"#e0c292");
  }
  lessonPot(tree,26);
  strokePixels([[tree,293],[tree-2,262],[tree+6,221]],"#785138",5);
  strokePixels([[tree-2,250],[tree-16,236],[tree-25,234]],"#80593f",3);
  strokePixels([[tree-2,251],[tree+16,234],[tree+24,231]],"#80593f",3);
  strokePixels([[tree-2,289],[tree-4,264],[tree+4,222]],"#a5774f",1);
  lessonSprite("apple-crown",tree,203);
  const drop=clamp((run.time-run.changedAt)/.36,0,1);
  if (run.stage === 0) lessonApple(tree+14,231);
  else if (run.stage === 1 && drop < 1) lessonApple(tree+14,231+75*drop**2);
  else if (run.stage === 1) lessonApple(player.x-cam+player.face*17,player.y-24);
  else lessonApple(scale+19,254+tilt);
}

function opticalScene(run, positions) {
  const [a,b] = positions, source=170-cam, detector=786-cam;
  const points=[[source,241],[a,241]];
  if (run.settings[0] === 1) {
    points.push([b,233]);
    points.push(run.settings[1]===2 ? [detector,226] : [b+36,run.settings[1]===0 ? 194 : 271]);
  } else points.push([a+38,run.settings[0]===0 ? 191 : 277]);
  lessonDesk(source,274,61,0); lessonDesk(a,276,66,1); lessonDesk(b,276,66,2); lessonDesk(detector,271,64,0);
  lessonSprite("optics-light",source-13,235,28,37);
  lessonSprite("optics-detector",detector,215);
  r(detector-5,224,10,7,courseSolved() ? "#c5cf91" : "#87937c");
  r(detector-4,225,5,1,"#e6d9aa");
  for (const [i,x,y] of [[0,a,241],[1,b,233]]) {
    lessonSprite("mirror-stand",x,y-3,25,279-y);
    const span = [-11,5,12][run.settings[i]];
    strokePixels([[x-8,y+span],[x+8,y-span]],"#485551",5);
    strokePixels([[x-8,y+span],[x+8,y-span]],"#b7dbcf",2);
  }
  strokePixels(points,"#806046",4);
  strokePixels(points,courseSolved() ? "#fff2aa" : "#f7cc84",2);
  if (courseSolved()) star(detector,226,4,"#fff7c0");
}

function sealedScene(run, positions) {
  const [flask, recorder] = positions;
  const ratio = run.stage===1 ? clamp((run.deadline-run.time)/massWindow,0,1) : run.stage===2 ? 1 : 0;
  lessonCabinet("lab-counter",flask,276,90);
  lessonCabinet("lab-counter",recorder,276,86);
  lessonSprite("vessel",flask,228);
  const capX=run.stage===0 ? flask+26 : flask;
  const capY=run.stage===0 ? 269 : 225;
  r(capX-11,capY,22,5,"#8b704f");
  r(capX-10,capY,20,1,"#e8c58d");
  for (let i=-7;i<8;i+=3) r(capX+i,capY+2,1,2,"#b39664");
  lessonSprite("meter",recorder,243);
  r(recorder-19,256,38,3,"#64786b");
  r(recorder-19,256,38*ratio,3,ratio<.24?"#f4bb7b":"#d9e8a2");
  if (run.stage===2) word("같음",recorder,248,8,"#e6edbb");
  if (run.stage===1) {
    word(Math.ceil(ratio*massWindow)+"초",recorder,248,8,"#e6edbb");
    const x=clamp(player.x-cam,28,W-28), y=clamp(player.y-114,23,H-30);
    r(x-22,y,44,5,"#484a40");
    r(x-20,y+2,40*ratio,2,ratio<.24?"#f2b47d":"#d8e3a3");
  }
}

function cardsScene(run, positions) {
  const marks = [["He",2,"#dbc997"],["O",8,"#aabf9a"],["Ne",10,"#cba6a0"]];
  const board = classroomBoard.x-cam;
  word("2 → 8 → 10",board,158,13,"#f1e2aa");
  for (const [i,x] of positions.entries()) {
    const [symbol,n,color]=marks[i];
    lessonDesk(x,276,61,i);
    if (i>=run.stage) {
      lessonSprite("card",x,251);
      r(x-12,254,7,1,color);
      word(symbol,x-3,262,9,"#263747");
      word(String(n),x+8,258,6,"#263747");
    } else {
      const tx=board+(i-1)*28;
      lessonSprite("card",tx,171,23,13);
      r(tx-8,172,2,8,color);
      word(symbol,tx,177,8,"#283745");
    }
  }
}

function lessonPot(x,width) {
  groundContact(x+4,GROUND+1,width*1.5,7);
  lessonSprite("pot",x,293,width,25);
}

function pottedStem(x, top, width) {
  lessonPot(x,width);
  const joints=[[0,295],[-7,270],[8,248],[-5,224],[2,183]], stem=[[x,295]];
  for (let i=1;i<joints.length;i++) {
    const [a,base]=joints[i-1], [b,tip]=joints[i], y=Math.max(top,tip);
    stem.push([x+a+(b-a)*(base-y)/(base-tip),y]);
    if (y===top) break;
  }
  strokePixels(stem,"#3d6547",5);
  strokePixels(stem.map(([u,y])=>[u-1,y]),"#71925c",2);
}

function lessonLeaf(x,y,w,trunk) {
  strokePixels([[trunk,Math.min(GROUND-20,y+18)],[x+6,y+9],[x,y+4]],"#5c794b",4);
  lessonSprite("leaf",x,y,w,17);
}

function oxygenVessel(x, y, seeds) {
  r(x-16,y-31,32,30,"#374e4e");
  r(x-14,y-29,28,27,"#b2c3ac");
  r(x-11,y-26,22,22,"#d5d2aa");
  r(x-16,y-33,32,4,"#6c7c69");
  r(x-13,y-27,2,21,"#eef0cb");
  for (const dx of [-7,0,7]) {
    r(x+dx-2,y-9,5,4,seeds ? "#996640" : "#718b83");
    if (seeds) strokePixels([[x+dx,y-9],[x+dx+1,y-15],[x+dx+4,y-16]],"#6e894c",2);
  }
}

function plantScene(run, positions) {
  const [meter,plant] = positions;
  lessonCabinet("lab-counter",meter,269,74);
  oxygenVessel(meter,270,true);
  if (run.stage >= 1) label("어둠  O₂ −2",meter,223,"#ffedcc","#41534e",9);
  const height = courseSolved() ? clamp(.16+(run.time-run.changedAt)*1.6,0,1) : 0;
  const top = 287 - 103*height;
  const lamp = plant+57;
  strokePixels([[lamp,280],[lamp,226],[lamp-17,219]],"#615748",4);
  path([[lamp-28,219],[lamp-13,214],[lamp-4,223],[lamp-27,229]],"#ac8352");
  if (height) {
    g.save();
    g.globalAlpha = .26;
    path([[lamp-21,227],[lamp-7,224],[plant+17,292],[plant-27,292]],"#ffe7a0");
    g.restore();
    label("조명  O₂ +4",lamp+8,198,"#ffedcc","#41534e",9);
  }
  for (const xx of [plant-17,plant+17]) {
    r(xx,189,3,105,"#9a744e");
    r(xx+1,189,1,105,"#c39966");
  }
  for (const y of [201,232,263]) r(plant-17,y,35,2,"#ad8c60");
  pottedStem(plant,top,29);
  for (const p of run.platforms) if (p.active) lessonLeaf(p.x-cam,p.y,p.w,plant);
  if (height>.85) for (const dx of [-4,4]) star(plant+dx,185,3,"#e8cec0");
}

function respirationScene(run, [control, sample]) {
  const leaf = run.platforms[1], perch = run.platforms[2];
  const plant=leaf.x-cam, x=perch.x-cam, y=perch.y;
  lessonCabinet("lab-counter",control,269,73);
  oxygenVessel(control,270,false);
  if (run.stage >= 1) label("유리구슬  O₂ 0",control,223,"#ffedcc","#41534e",9);
  pottedStem(plant,leaf.y,35);
  lessonLeaf(plant,leaf.y,leaf.w,plant);
  const l=x-perch.w/2;
  for (const leg of [l+13,l+perch.w-15]) {
    strokePixels([[leg,y+3],[leg,y+23],[leg+10,y+5]],"#846247",4);
    strokePixels([[leg-1,y+5],[leg-1,y+20],[leg+6,y+8]],"#b29060");
  }
  lessonSprite("lift-deck",x,y,perch.w,7);
  oxygenVessel(sample,y,true);
  if (courseSolved()) label("발아 씨앗  O₂ −3",sample,y-44,"#ffedcc","#41534e",9);
}

function mapScene(run, positions) {
  const [left,right] = positions;
  const middle=542-cam, y=111;
  for (const x of [middle-126,middle+126]) {
    r(x,88,3,13,"#6b5840");
    r(x-3,88,9,3,"#dec493");
  }
  lessonSprite("map-frame",middle,y-15);
  for (let x=middle-140;x<middle+144;x+=16) {
    r(x,y-7,1,69,"#617a704f");
    r(x,y+61,1,3,"#ded0a1");
  }
  r(middle-2,y-8,1,72,"#eee0ae");
  for (const offset of [-1,0,1]) r(middle-149,y+29+offset*18,298,1,"#617a705c");
  const a=middle-33-(2-run.displaySettings[0])*31;
  const b=middle+32+(2-run.displaySettings[1])*31;
  const america=[[a-33,y+3],[a-13,y-1],[a-3,y+6],[a+6,y+3],[a+20,y+9],[a+27,y+17],[a+31,y+23],
    [a+25,y+29],[a+18,y+35],[a+13,y+45],[a+7,y+48],[a+3,y+60],[a-6,y+53],[a-10,y+35],[a-18,y+31],[a-29,y+16]];
  const africa=[[b-34,y-1],[b-12,y-6],[b+10,y-4],[b+19,y+4],[b+34,y+14],[b+15,y+32],[b+8,y+52],
    [b+2,y+57],[b-10,y+49],[b-15,y+36],[b-22,y+31],[b-34,y+29],[b-33,y+23],[b-39,y+17],[b-38,y+8]];
  for (const [i, shape] of [america,africa].entries()) {
    path(shape,i ? "#c5bc88" : "#caa56e");
    strokePixels([...shape,shape[0]],i ? "#838462" : "#8c7657");
    for (const [x,py] of shape.slice(2,13)) r(x+(i?-2:2),py+1,2,1,"#ebd49d");
  }
  for (const x of [left,right]) {
    lessonDesk(x,275,58,1);
    r(x-8,261,16,12,"#5e6456");
    strokePixels([[x-6,267],[x+5,262],[x+7,255]],"#d8bb87",3);
    r(x+5,253,6,4,"#b17d58");
  }
  if (courseSolved()) star(middle-3,y+24,4,"#fff0aa");
}

function tremorScene(run, positions) {
  const [lower,upper] = positions;
  const rack=run.platforms[1];
  lessonCabinet("steel-rack",rack.x-cam,rack.y,rack.w);
  lessonCabinet("lab-counter",lower,275,62);
  for (const [i,x,y] of [[0,lower,275],[1,upper,rack.y]]) {
    lessonSprite("meter",x,y-30,43,30);
    r(x-14,y-14,28,1,"#9eb09a");
    if (run.stage>i) strokePixels([[x-13,y-14],[x-7,y-14],[x-3,y-22],[x+1,y-8],[x+6,y-16],[x+13,y-14]],"#e7d193");
  }
  if (run.pulse) {
    const t = clamp((run.time-run.pulse.t)/.52,0,1);
    if (t<1 && !quietCombat()) {
      g.save();
      g.globalAlpha=1-t;
      const x=run.pulse.x-cam, y=run.pulse.y-21;
      fxArc(x,y,10+53*t,6+17*t,"#f6ce8c",0,Math.PI*2,2);
      g.restore();
    }
  }
}

const experimentScenes = [weighScene,opticalScene,sealedScene,cardsScene,plantScene,respirationScene,mapScene,tremorScene];

function drawScholarCourse() {
  const run = courseRun;
  experimentScenes[run.id](run,run.devices.map(d=>d.x-cam));
  const x=courseSign.x-cam;
  if (x>=-55 && x<=W+55) {
    r(x-2,279,4,21,"#745a46");
    label(run.definition.name,x,260,"#ffebbd","#425651",9);
  }
}
