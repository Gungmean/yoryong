"use strict";

const oak = {edge:"#543b2d", face:"#a47247", shade:"#755237", top:"#d6ab70", light:"#f2cd90"};
const metal = {edge:"#3d4744", face:"#677b73", shade:"#515f5a", top:"#a8af93", light:"#d4d7ad"};

function lessonGrain(x,y,w,h,material,opacity) {
  if (!assets.classrooms.naturalWidth || w<1 || h<1) return;
  const sy = classroomArtRow()*H;
  const source = material === oak ? [546,sy+204,25,47] : [29,sy+194,31,39];
  g.save();
  g.globalAlpha=opacity;
  g.drawImage(assets.classrooms,...source,Math.round(x),Math.round(y),Math.round(w),Math.round(h));
  g.restore();
}

function lessonCabinet(x, y, w, feet = GROUND, material = oak) {
  if (x + w/2 < 0 || x - w/2 > W) return;
  const l = Math.round(x-w/2), h = feet-y;
  shadow(x,feet+1,w*.52);
  r(l+3,y+5,w-6,h-5,material.edge);
  r(l+5,y+7,w-10,h-11,material.face);
  lessonGrain(l+5,y+7,w-10,h-11,material,.52);
  r(l+5,feet-8,w-10,5,material.shade);
  for (let i=0; i<2 && h>24; i++) {
    const door = l+10+i*(w-18)/2, width = (w-23)/2;
    r(door,y+11,width,h-23,material.shade);
    r(door+1,y+12,width-2,h-25,material.face);
    lessonGrain(door+1,y+12,width-2,h-25,material,.72);
    r(door+3,y+14,Math.max(0,width-6),1,material.top);
    r(door+width-8,y+17,5,2,material.light);
    if (h>60 && material!==oak) for (let j=0;j<3;j++) {
      r(door+4+j*7,y+22+j*4,1,h-46-j*5,material.shade);
      r(door+4+j*7,y+24+j*4,1,h-53-j*4,material.top);
    }
  }
  if (h>60 && material===oak) {
    const spines=["#596e65","#a06c4b","#ba9867","#675752","#8b7b59"];
    for (const row of [y+12,y+36]) {
      r(l+9,row,w-18,20,"#54413a");
      lessonGrain(l+9,row,w-18,20,oak,.42);
      for (let j=0;j<Math.floor((w-26)/7);j++) {
        const x=l+13+j*7, length=11+((j*3+row)%7);
        if ((j+row)%6===0) continue;
        r(x,row+18-length,6,length,spines[j%5]);
        r(x+1,row+19-length,1,length-2,"#e0b984");
        r(x+2,row+14,3,1,"#c9a67e");
      }
      r(l+7,row+18,w-14,3,oak.shade);
      r(l+8,row+18,w-16,1,oak.light);
    }
  }
  r(l,y,w,6,material.edge);
  r(l+2,y,w-4,2,material.light);
  r(l+3,y+2,w-6,2,material.top);
}

function lessonDesk(x,y,w,variation = 0) {
  if (x + w/2 < 0 || x - w/2 > W) return;
  const l=x-w/2;
  shadow(x,GROUND+1,w*.52);
  if (assets.classrooms.naturalWidth)
    g.drawImage(assets.classrooms,2+136*variation,1082,132,96,Math.round(l),y-16,w,GROUND-y+16);
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
  lessonCabinet(shelf.x-cam,shelf.y,shelf.w);
  const lx=lift.x-cam;
  for (const x of [lx-26,lx+24]) {
    r(x,223,4,GROUND-223,"#50463d");
    r(x+1,225,1,GROUND-228,"#aca087");
    r(x-2,GROUND-4,8,4,"#726457");
  }
  r(lx-34,lift.y,lift.w-6,9,metal.edge);
  r(lx-33,lift.y,lift.w-8,2,metal.light);
  r(lx-30,lift.y+3,lift.w-14,3,metal.face);
  r(lx-32,226,12,16,metal.face);
  if (courseSolved()) r(lx-31,227+(290-lift.y)*.8,10,13,metal.top);
  lessonCabinet(scale,273,61,GROUND,metal);
  const tilt = courseSolved() ? 4 : -3;
  r(scale-2,249,4,24,"#55554a");
  strokePixels([[scale-19,254-tilt],[scale+19,254+tilt]],"#74664d",3);
  for (const d of [-1,1]) {
    r(scale+d*19-8,257+d*tilt,16,3,"#92825f");
    r(scale+d*19-7,257+d*tilt,14,1,"#e0c292");
  }
  lessonPot(tree,26);
  strokePixels([[tree,293],[tree-2,262],[tree+6,221]],"#785138",5);
  strokePixels([[tree-2,250],[tree-16,236],[tree-25,234]],"#80593f",3);
  strokePixels([[tree-2,251],[tree+16,234],[tree+24,231]],"#80593f",3);
  for (const [dx,dy,w] of [[-26,222,19],[-13,215,22],[7,208,23],[18,222,18],[-9,229,25]]) {
    const x=tree+dx;
    path([[x-2,dy+8],[x,dy+2],[x+4,dy-1],[x+9,dy-3],[x+w-4,dy],[x+w,dy+6],
      [x+w-2,dy+11],[x+w-7,dy+14],[x+3,dy+13]],"#4d6c45");
    for (let j=0;j<w-7;j+=3) {
      const lift=(j*13+dy)%6;
      r(x+3+j,dy+1+lift,4,3,["#748b51","#8d9e59","#5c7a4c","#a7aa60"][j%4]);
      r(x+3+j,dy+1+lift,2,1,"#c1bb75");
      if (j%2===0) r(x+5+j,dy+8,3,2,"#617e50");
    }
  }
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
  r(source-12,237,21,9,"#4c655d");
  r(source+7,238,5,6,"#ead39a");
  r(detector-8,217,16,46,metal.edge);
  r(detector-6,220,12,11,courseSolved() ? "#c5df88" : "#8d9074");
  for (const [i,x,y] of [[0,a,241],[1,b,233]]) {
    r(x-2,y,4,275-y,metal.edge);
    r(x-7,271,14,5,metal.face);
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
  lessonCabinet(flask,276,90,GROUND,metal);
  lessonCabinet(recorder,276,86,GROUND,metal);
  r(flask-16,228,32,45,"#405d58");
  r(flask-14,231,28,40,"#91ac99");
  r(flask-12,233,24,35,"#abc5ab");
  r(flask-11,251,22,16,"#738b71");
  r(flask-10,251,20,2,"#b2c293");
  r(flask-13,235,2,29,"#deebc7");
  r(flask-17+(run.stage===0?15:0),223,34,6,"#b19564");
  r(flask-17+(run.stage===0?15:0),223,34,1,"#e5c589");
  r(recorder-24,241,48,31,"#5c675a");
  r(recorder-21,244,42,19,"#3c554d");
  r(recorder-19,256,38,3,"#64786b");
  r(recorder-19,256,38*ratio,3,ratio<.24?"#f4bb7b":"#d9e8a2");
  if (run.stage===2) word("같음",recorder,248,8,"#e6edbb");
  if (run.stage===1) {
    word(Math.ceil(ratio*massWindow)+"초",recorder,248,8,"#e6edbb");
    const x=clamp(player.x-cam,28,W-28), y=clamp(player.y-114,23,H-30);
    r(x-22,y,44,5,"#484a40");
    r(x-20,y+2,40*ratio,2,ratio<.24?"#f2b47d":"#d8e3a3");
  }
  r(recorder+12,265,6,3,"#d1af77");
}

function cardsScene(run, positions) {
  const marks = [["He",2,"#dbc997"],["O",8,"#aabf9a"],["Ne",10,"#cba6a0"]];
  const board = classroomBoard.x-cam;
  word("2 → 8 → 10",board,158,13,"#f1e2aa");
  for (const [i,x] of positions.entries()) {
    const [symbol,n,color]=marks[i];
    lessonDesk(x,276,61,i);
    if (i>=run.stage) {
      r(x-15,253,30,21,"#6d604b");
      r(x-14,253,28,19,color);
      word(symbol,x-3,262,9,"#263747");
      word(String(n),x+8,258,6,"#263747");
    } else {
      const tx=board+(i-1)*28;
      r(tx-11,171,22,13,color);
      word(symbol,tx,177,8,"#283745");
    }
  }
}

function lessonPot(x,width) {
  shadow(x,GROUND+1,width*.7);
  const l=x-width/2;
  path([[l,296],[l+width,296],[l+width-3,313],[l+width-7,317],[l+5,317],[l+2,312]],"#805443");
  path([[l+2,298],[l+width-3,298],[l+width-5,308],[l+width-8,314],[l+6,313]],"#a27058");
  r(l-2,294,width+4,5,"#bb8565");
  r(l-1,294,width+1,1,"#e3aa7f");
  r(l+3,299,3,10,"#cc906a");
  r(l+5,309,4,2,"#cb8e6a");
  for (let j=7;j<width-5;j+=3) r(l+j,303+(j*7)%9,2,1,"#9d654e");
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
  const l=x-w/2;
  strokePixels([[trunk,Math.min(GROUND-20,y+18)],[x+6,y+9],[x,y+4]],"#5c794b",4);
  path([[l,y+4],[l+7,y],[l+w-9,y],[l+w,y+4],[l+w-14,y+10],[x,y+15],[l+9,y+10]],"#425e43");
  path([[l+3,y+4],[l+9,y],[l+w-11,y],[l+w-4,y+4],[l+w-16,y+8],[x,y+11],[l+11,y+8]],"#87a259");
  r(l+11,y,w-22,2,"#c1d28a");
  strokePixels([[l+9,y+5],[x,y+7],[l+w-12,y+5]],"#637f4c",1);
  for (let j=12;j<w-11;j+=7) {
    const end=l+j;
    r(end,y+1+(j%3),4,1,"#a6bc6f");
    strokePixels([[end,y+3],[end+(end<x?5:-5),y+7]],"#789754",1);
  }
}

function plantScene(run, positions) {
  const [sink,plant] = positions;
  lessonCabinet(sink,269,74,GROUND,metal);
  r(sink-23,270,41,3,"#455b55");
  r(sink-22,269,39,1,"#b4c2a7");
  strokePixels([[sink-2,268],[sink-2,252],[sink+10,252],[sink+10,257]],"#537169",3);
  const height = courseSolved() ? clamp((run.time-run.changedAt)*1.6,0,1) : 0;
  const top = 287 - 103*height;
  for (const xx of [plant-17,plant+17]) {
    r(xx,189,3,105,"#9a744e");
    r(xx+1,189,1,105,"#c39966");
  }
  for (const y of [201,232,263]) r(plant-17,y,35,2,"#ad8c60");
  pottedStem(plant,top,29);
  for (const p of run.platforms) if (p.active) lessonLeaf(p.x-cam,p.y,p.w,plant);
  if (run.stage===1) {
    const x = player.x-cam+player.face*17, y=player.y-20;
    r(x-5,y,12,8,"#618a80");
    r(x+3,y+1,8,2,"#9cb6a2");
    r(x-3,y-3,5,3,"#679285");
  }
  if (height>.85) for (const dx of [-4,4]) star(plant+dx,185,3,"#e8cec0");
}

function birdScene(run) {
  const leaf = run.platforms[1], perch = run.platforms[2];
  const plant=leaf.x-cam, x=perch.x-cam, y=perch.y, nest=x+13;
  pottedStem(plant,leaf.y,35);
  lessonLeaf(plant,leaf.y,leaf.w,plant);
  const l=x-perch.w/2;
  r(l,y,perch.w,6,oak.edge);
  r(l+2,y,perch.w-4,2,oak.light);
  for (const leg of [l+13,l+perch.w-15]) {
    strokePixels([[leg,y+3],[leg,y+23],[leg+10,y+5]],oak.shade,3);
  }
  path([[nest-17,y-7],[nest+17,y-7],[nest+11,y],[nest-11,y]],"#88603a");
  r(nest-14,y-6,28,2,"#c29560");
  r(nest-9,y-12,12,7,"#806b59");
  r(nest-2,y-16,8,8,"#9b8269");
  r(nest+4,y-12,5,2,"#eac184");
  r(nest+2,y-14,1,1,"#2c332e");
  if (courseSolved()) r(nest-3,y-13,2,1,"#3f362e");
}

function mapScene(run, positions) {
  const [left,right] = positions;
  const middle=542-cam, y=111;
  for (const x of [middle-126,middle+126]) {
    r(x,88,3,13,"#6b5840");
    r(x-3,88,9,3,"#dec493");
  }
  r(middle-156,y-15,312,85,"#64533f");
  r(middle-152,y-12,304,80,"#bda574");
  r(middle-149,y-9,298,74,"#6e887f");
  for (let x=middle-140;x<middle+144;x+=16) {
    r(x,y-7,1,69,"#79988a");
    r(x,y+61,1,3,"#d8c99c");
  }
  r(middle-2,y-8,1,72,"#eee0ae");
  for (const offset of [-1,0,1]) r(middle-149,y+29+offset*18,298,1,"#79988a");
  const a=middle-33-(2-run.displaySettings[0])*31;
  const b=middle+32+(2-run.displaySettings[1])*31;
  path([[a-33,y+3],[a-13,y-1],[a-3,y+6],[a+6,y+3],[a+20,y+9],[a+27,y+17],[a+31,y+23],
    [a+25,y+29],[a+18,y+35],[a+13,y+45],[a+7,y+48],[a+3,y+60],[a-6,y+53],[a-10,y+35],[a-18,y+31],[a-29,y+16]],"#d3ac72");
  path([[b-34,y-1],[b-12,y-6],[b+10,y-4],[b+19,y+4],[b+34,y+14],[b+15,y+32],[b+8,y+52],
    [b+2,y+57],[b-10,y+49],[b-15,y+36],[b-22,y+31],[b-34,y+29],[b-33,y+23],[b-39,y+17],[b-38,y+8]],"#c6c390");
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
  lessonCabinet(rack.x-cam,rack.y,rack.w,GROUND,metal);
  lessonCabinet(lower,275,62);
  for (const [i,x,y] of [[0,lower,275],[1,upper,rack.y]]) {
    r(x-18,y-26,36,25,"#695c4b");
    r(x-16,y-24,32,19,"#3f5b55");
    r(x-14,y-14,28,1,"#9eb09a");
    if (run.stage>i) strokePixels([[x-13,y-14],[x-7,y-14],[x-3,y-22],[x+1,y-8],[x+6,y-16],[x+13,y-14]],"#e7d193");
    r(x-16,y-3,32,3,"#b88d6c");
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

const experimentScenes = [weighScene,opticalScene,sealedScene,cardsScene,plantScene,birdScene,mapScene,tremorScene];

function drawScholarCourse() {
  const run = courseRun;
  experimentScenes[run.id](run,run.devices.map(d=>d.x-cam));
  const x=courseSign.x-cam;
  if (x>=-55 && x<=W+55) {
    r(x-2,279,4,21,"#745a46");
    label(run.definition.name,x,260,"#ffebbd","#425651",9);
  }
}
