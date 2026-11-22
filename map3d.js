/* School scenery. World x and screen y use the same units as the 2D controller. */
const campusWorld = (() => {
  const T = globalThis.CampusThree;
  if (!T || typeof campusAtlas === "undefined") return { draw: () => false };
  const canvas = document.getElementById("map-depth");
  const pitch = 0.31,
    sin = Math.sin(pitch),
    cos = Math.cos(pitch);
  const worldY = (screenY, z) => (H / 2 - screenY + z * sin) / cos;
  const image = schoolPaint;
  let renderer,
    camera,
    stage,
    texture,
    classroomTexture,
    furnitureTexture, paintedFurniture, contactMat,
    paper,
    unavailable = false,
    lost = false;
  let lastKey = "",
    moving = [],
    parallax = [],
    geometry,
    materials;
  let lastTime, lastCameraX, lastPlayerX, lastWarning, lastSeals;
  const full = [0, 0, 1, 1];
  const uniforms = {
    atlas: { value: null },
    time: { value: 0 },
    seals: { value: 0 },
    warning: { value: 0 },
    theme: { value: 0 },
    viewX: { value: 0 },
    panoramaWidth: { value: 1 },
    panoramaRate: { value: 1 },
    viewWidth: { value: 1 },
    discipline: { value: 0 },
  };

  function initialize() {
    const options = {
      alpha: false,
      antialias: false,
      depth: true,
      stencil: false,
      powerPreference: "low-power",
    };
    const gl = canvas.getContext("webgl2", options);
    if (!gl) {
      unavailable = true;
      return;
    }
    renderer = new T.WebGLRenderer({ ...options, canvas, context: gl });
    renderer.setPixelRatio(1);
    camera = new T.OrthographicCamera(-1, 1, H / 2, -H / 2, 0.1, 2600);
    texture = new T.Texture(image);
    texture.magFilter = texture.minFilter = T.NearestFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
    uniforms.atlas.value = texture;
    paper = new T.ShaderMaterial({
      uniforms,
      side: T.DoubleSide,
      vertexShader: `
        attribute vec4 region;
        attribute float kind;
        varying vec2 tileUV;
        varying vec4 bounds;
        varying float effect;
        varying vec3 stagePos;
        uniform float time;
        void main(){
          tileUV=uv;bounds=region;effect=kind;
          vec3 p=position;
          if(kind>1.5 && kind<2.5){
            p.x+=sin(time*1.32+p.y*.017+p.x*.006)*uv.y*uv.y*3.7;
            p.y+=cos(time*1.12+p.x*.007)*uv.y*1.15;
          }
          stagePos=p;
          gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
        }`,
      fragmentShader: `
        uniform sampler2D atlas;
        uniform float time,seals,warning,theme,viewX,panoramaWidth,panoramaRate,viewWidth,discipline;
        varying vec2 tileUV;
        varying vec4 bounds;
        varying float effect;
        varying vec3 stagePos;
        void main(){
          vec2 uv=tileUV;
          if(effect>6.5 && effect<7.5){
            // Match the mural at the back edge. The near edge travels faster as the camera moves.
            float x=(stagePos.x+6.-viewX*(1.-panoramaRate))/panoramaWidth;
            float front=1.-uv.y;
            x+=front*.16*(viewX+viewWidth*.5-panoramaWidth*.5)/panoramaWidth;
            uv.x=1.-abs(mod(x,2.)-1.);
          }
          if(effect>.5 && effect<1.5){
            float sky=smoothstep(.65,.88,uv.y);
            uv.x+=sky*.022*sin(time*.13+uv.y*3.);
          }
          if(effect>4.5 && effect<5.5){
            float sky=smoothstep(.54,.84,uv.y);
            uv.x+=sky*.012*sin(time*.32+uv.y*9.);
          }
          if(effect>5.5 && effect<6.5 && discipline<.5){
            vec2 center=vec2(.487,.796),d=uv-center;
            float core=1.-smoothstep(.045,.117,length(d*vec2(1.3,.86)));
            float spin=core*.14*sin(time*.84);
            uv=center+mat2(cos(spin),-sin(spin),sin(spin),cos(spin))*d;
          }
          vec4 tex=texture2D(atlas,bounds.xy+clamp(uv,0.,1.)*bounds.zw);
          if(tex.a<.40)discard;
          vec3 c=tex.rgb;
          if(effect>.5 && effect<2.5){
            float gust=sin(stagePos.x*.009+time*.35+stagePos.y*.004);
            c*=.975+.045*gust;
            c=mix(c,c*vec3(1.09,.94,.83),seals*.6);
          }
          if(effect>2.5 && effect<3.5){
            float sunlight=.5+.5*sin(stagePos.x*.009+stagePos.y*.012+time*.42);
            c*=mix(vec3(.93,.94,.97),vec3(1.055,1.032,.994),sunlight);
          }
          if(effect>3.5 && effect<4.5){
            float sweep=sin(stagePos.x*.014-stagePos.z*.019+time*.40);
            float sunlit=smoothstep(.38,.79,dot(c,vec3(.32,.55,.13)));
            c*=1.+sunlit*.045*sweep;
          }
          if(effect>4.5)c+=vec3(.062,.031,.091)*warning;
          if(effect>5.5 && effect<6.5){
            if(discipline<.5){
              float cyan=smoothstep(.10,.46,c.g-c.r)*smoothstep(.48,.68,uv.y);
              c+=vec3(.015,.10,.12)*cyan*(.5+.5*sin(time*2.-length(uv-vec2(.487,.796))*105.));
            }else if(discipline<1.5){
              float glass=smoothstep(.12,.48,c.b-c.g)*smoothstep(.24,.42,uv.y);
              c+=vec3(.12,.025,.14)*glass*(.5+.5*sin(uv.y*86.-time*2.2));
            }else if(discipline<2.5){
              float sun=smoothstep(.46,.84,uv.y)*smoothstep(.22,.7,c.g);
              c+=vec3(.105,.088,.028)*sun*(.5+.5*sin(uv.x*29.+uv.y*9.+time*.35));
            }else{
              vec2 start=vec2(.57,.77);
              float flight=fract(time*.083);
              vec2 head=start+vec2(-.35,-.13)*flight;
              vec2 d=uv-head;
              float trail=(1.-smoothstep(.001,.004,abs(d.y-d.x*.37)))*smoothstep(-.002,.004,d.x)*(1.-smoothstep(.001,.042,d.x));
              c+=vec3(.54,.46,.31)*trail*(1.-smoothstep(.20,.28,flight));
            }
          }
          if(theme>1.5 && theme<2.5)c*=vec3(.98,1.,1.025);
          if(theme>2.5 && theme<3.5)c*=vec3(1.025,.97,1.);
          if(theme>3.5 && theme<4.5)c*=vec3(.96,1.02,.96);
          gl_FragColor=vec4(c,1.);
        }`,
    });
    canvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      lost = true;
      canvas.hidden = true;
    });
    canvas.addEventListener("webglcontextrestored", () => {
      lost = false;
      lastKey = "";
      texture.needsUpdate = true;
      if (classroomTexture) classroomTexture.needsUpdate = true;
      if (furnitureTexture) furnitureTexture.needsUpdate = true;
    });
  }

  // Atlas kinds in the shader: 0 plain, 1 sky, 2 foliage, 3 hall, 4 floor,
  // 5 rooftop, 6 laboratory mural, 7 floor joined to a panoramic mural.
  class Surfaces {
    constructor() {
      this.vertices = [];
      this.uv = [];
      this.regions = [];
      this.kinds = [];
      this.indices = [];
    }
    quad(name, points, crop = full, kind = 0) {
      const [x, y, w, h] = campusAtlas.regions[name],
        [l, t, r, b] = crop,
        side = 2048;
      const u0 = (x + 0.5 + l * (w - 1)) / side,
        v0 = 1 - (y + 0.5 + b * (h - 1)) / side;
      const du = ((r - l) * (w - 1)) / side,
        dv = ((b - t) * (h - 1)) / side;
      const off = this.vertices.length / 3;
      for (const point of points) {
        this.vertices.push(...point);
        this.regions.push(u0, v0, du, dv);
        this.kinds.push(kind);
      }
      this.uv.push(0, 0, 1, 0, 0, 1, 1, 1);
      this.indices.push(off, off + 1, off + 2, off + 2, off + 1, off + 3);
    }
    wall(name, left, top, width, height, z, crop = full, kind = 0) {
      const base = worldY(top + height, z),
        cap = worldY(top, z);
      this.quad(
        name,
        [
          [left, base, z],
          [left + width, base, z],
          [left, cap, z],
          [left + width, cap, z],
        ],
        crop,
        kind,
      );
    }
    prop(name, x, feet, width, z, flip = false, kind = 0) {
      const reg = campusAtlas.regions[name],
        h = (width * reg[3]) / reg[2];
      this.wall(name, x - width / 2, feet - h, width, h, z, flip ? [1, 0, 0, 1] : full, kind);
    }
    panoramaFloor(name, top, bottom, start, end) {
      const y = worldY(GROUND, 0),
        back = (top + (bottom - top) * start - GROUND) / sin,
        front = (H + 2 - GROUND) / sin;
      const l = -60,
        r = Math.max(W, worldWidth) + 60;
      this.quad(
        name,
        [
          [l, y, front],
          [r, y, front],
          [l, y, back],
          [r, y, back],
        ],
        [0, start, 1, end],
        7,
      );
    }
    floor(name, start, end, backY, span, crop) {
      for (let x = start; x < end; x += span)
        this.floorSection(name,x,Math.min(end,x+span),backY,crop);
    }
    floorSection(name,l,r,backY,crop) {
      const y=worldY(GROUND,0), front=(H+2-GROUND)/sin, back=(backY-GROUND)/sin;
      this.quad(name,[[l,y,front],[r,y,front],[l,y,back],[r,y,back]],crop,4);
    }
    finish(parent = stage) {
      if (!this.indices.length) return;
      const g = new T.BufferGeometry();
      for (const [name, array, size] of [
        ["position", this.vertices, 3],
        ["uv", this.uv, 2],
        ["region", this.regions, 4],
        ["kind", this.kinds, 1],
      ])
        g.setAttribute(name, new T.Float32BufferAttribute(array, size));
      g.setIndex(this.indices);
      const mesh = new T.Mesh(g, paper);
      parent.add(mesh);
      return mesh;
    }
  }
  function group(x, y, z, parent = stage) {
    const root = new T.Group();
    root.position.set(x, worldY(y, z), z);
    parent.add(root);
    return root;
  }
  function material(color, glow = 0) {
    const k = color + ":" + glow;
    if (!materials.has(k))
      materials.set(
        k,
        new T.MeshStandardMaterial({
          color,
          roughness: .67,
          metalness: .08,
          emissive: color,
          emissiveIntensity: glow * .57,
        }),
      );
    return materials.get(k);
  }
  function atlasUV(shape, name, flip = false) {
    const [sx,sy,sw,sh] = fixtureAtlas.regions[name];
    const uv = shape.getAttribute("uv");
    for (let i=0; i<uv.count; i++) {
      const u=uv.getX(i), v=uv.getY(i);
      uv.setXY(i,(sx+.5+(flip?1-u:u)*(sw-1))/furniturePaint.width,
        1-(sy+.5+(1-v)*(sh-1))/furniturePaint.height);
    }
    return shape;
  }
  function fixturePlane(name,width,height,flip=false) {
    return atlasUV(new T.PlaneGeometry(width,height),name,flip);
  }
  function contact(x, feet, z, width, height, parent = stage) {
    const dir = environmentLight()[4];
    const patch = new T.Mesh(fixturePlane("shadow", width, height/sin, dir<0), contactMat);
    patch.rotation.x = -Math.PI/2;
    patch.position.set(x+dir*width*.035,worldY(feet,z)+.35,z+1);
    parent.add(patch);
  }
  function dressFloor() {
    for (const item of mapFixtures()) {
      const {key,x,feet,w,h,flip} = item, z=(feet-GROUND)/sin;
      if (key && fixtureAtlas.regions["reflection-"+key]) {
        const length=Math.min(15,h*.37);
        const sheen=new T.Mesh(fixturePlane("reflection-"+key,w,length/sin,flip),contactMat);
        sheen.rotation.x=-Math.PI/2;
        sheen.position.set(x,worldY(feet,z)+.22,z+length/(2*sin));
        stage.add(sheen);
      }
      contact(x,feet,z,w*1.18,Math.max(7,w*.14));
      if (!key) continue;
      const piece = new T.Mesh(fixturePlane(key,w,h/cos,flip), paintedFurniture);
      piece.position.set(x,worldY(feet-h/2,z),z);
      stage.add(piece);
    }
  }
  function part(parent, shape, color, x, y, z, w, h, d, glow = 0) {
    const m = new T.Mesh(geometry[shape], material(color, glow));
    m.position.set(x, y, z);
    m.scale.set(w, h, d);
    parent.add(m);
    return m;
  }
  function rod(root, a, b, width, color) {
    const start = new T.Vector3(...a),
      end = new T.Vector3(...b),
      dir = end.clone().sub(start);
    const mid = start.add(end).multiplyScalar(0.5);
    const m = part(root, "box", color, mid.x, mid.y, mid.z, width, dir.length(), width);
    m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir.normalize());
    return m;
  }
  function armillary(root, small = false) {
    const movingRing = new T.Group();
    root.add(movingRing);
    part(root, "orb", small ? "#67c7c6" : "#f2b05c", 0, 0, 0, 9, 9, 9, 0.33);
    for (let i = 0; i < 3; i++) {
      const radius = 15 + 7 * i;
      const orbit = new T.Group();
      movingRing.add(orbit);
      orbit.rotation.set(0.55 + i * 0.47, 0.36 * i, i * 0.65);
      part(orbit, "ring", i % 2 ? "#78b4be" : "#d2a358", 0, 0, 0, radius, radius, radius, 0.12);
      const moon = part(
        orbit,
        "orb",
        ["#ab7252", "#80d4de", "#e3c287"][i],
        0,
        0,
        0,
        3 + i,
        3 + i,
        3 + i,
        0.2,
      );
      moving.push((t) => {
        const a = t * (0.68 - i * 0.12) + i * 1.7;
        moon.position.set(Math.cos(a) * radius, Math.sin(a) * radius, 0);
      });
    }
    moving.push((t) => {
      movingRing.rotation.y = t * 0.29;
    });
  }
  function molecule(root) {
    const fragment = new T.Group();
    root.add(fragment);
    const nodes = [
      [0, 0, 0],
      [15, 10, 12],
      [-14, 10, -11],
      [12, -12, -14],
      [-13, -13, 11],
    ];
    for (let i = 0; i < nodes.length; i++) {
      const [x, y, z] = nodes[i],
        radius = i ? 5.5 : 9;
      if (i) rod(fragment, nodes[0], nodes[i], 2.5, "#b9a2ba");
      part(
        fragment,
        "orb",
        i ? ["", "#8ccad8", "#f1d6aa", "#dc93c9", "#7ec5bb"][i] : "#a56cba",
        x,
        y,
        z,
        radius,
        radius,
        radius,
        0.16,
      );
    }
    moving.push((t) => {
      fragment.rotation.y = t * 0.58;
      fragment.rotation.z = 0.2 * Math.sin(t * 0.75);
    });
  }
  function cradle(root) {
    part(root, "box", "#76513b", 0, -21, 0, 59, 4, 25);
    part(root, "box", "#c39355", 0, -18.5, 0, 56, 1.3, 23);
    for (const z of [-9, 9]) {
      for (const x of [-24, 24]) part(root, "drum", "#bca675", x, 0, z, 1.3, 37, 1.3);
      rod(root, [-24, 18, z], [24, 18, z], 2.6, "#d8be87");
    }
    for (let i = 0; i < 5; i++) {
      const wire = new T.Group();
      wire.position.set((i - 2) * 7.8, 18, 0);
      root.add(wire);
      for (const z of [-9, 9]) rod(wire, [0, 0, z], [0, -29, 0], 0.8, "#e6d6ad");
      part(wire, "orb", "#a3c6ca", 0, -30, 0, 3.9, 3.9, 3.9, 0.09);
      if (i === 0 || i === 4)
        moving.push((t) => {
          const swing = Math.sin(t * 2.65);
          wire.rotation.z = 0.74 * (i === 0 ? Math.min(0, swing) : Math.max(0, swing));
        });
    }
  }
  function helix(root) {
    const blades = new T.Group();
    root.add(blades);
    let prev = [];
    for (let i = 0; i < 10; i++) {
      const a = i * 0.69,
        y = i * 5 - 22,
        x = 13 * Math.cos(a),
        z = 13 * Math.sin(a);
      const pair = [
        [x, y, z],
        [-x, y, -z],
      ];
      rod(blades, pair[0], pair[1], 1.8, "#c5aa7a");
      pair.forEach((v, j) => {
        if (i) rod(blades, prev[j], v, 2.4, j ? "#558e87" : "#8db870");
        part(blades, "orb", j ? "#87d7b7" : "#e7d083", ...v, 3, 3, 3, 0.15);
      });
      prev = pair;
    }
    moving.push((t) => {
      blades.rotation.y = t * 0.42;
    });
  }
  function geology(root) {
    const globe = new T.Group();
    root.add(globe);
    const surface=new T.MeshStandardMaterial({map:furnitureTexture,roughness:.77,metalness:.04});
    globe.add(new T.Mesh(atlasUV(new T.SphereGeometry(18,28,18),"globe"),surface));
    const ring = part(root, "ring", "#cda66b", 0, 0, 0, 24, 24, 24, 0.08);
    ring.rotation.set(0.2, 0.1, 0.39);
    moving.push((t) => {
      globe.rotation.y = t * 0.36;
      globe.rotation.z = 0.31;
    });
  }
  const specimens = [armillary, molecule, helix, geology];
  function specimen(subject, x, tableY, z, scale, figureType = specimens[subject]) {
    const base = group(x, tableY, z);
    base.scale.setScalar(scale);
    if (figureType === cradle) {
      const figure = new T.Group();
      base.add(figure);
      figure.position.y = 23;
      cradle(figure);
      return;
    }
    part(base, "drum", "#443745", 0, 1.8, 0, 18, 3.6, 12);
    part(base, "drum", "#b08452", 0, 4.2, 0, 16, 1.6, 10.5);
    part(base, "drum", "#674d46", 0, 12, 0, 2.5, 15, 2.5);
    for (const y of [6,15,19]) part(base,"drum","#d3ad6f",0,y,0,4,1.6,4);
    const figure = new T.Group();
    base.add(figure);
    figure.position.y = 38;
    figureType(figure);
  }
  function sealDisplay(x, top, z) {
    const frame = group(x, top, z);
    part(frame, "box", "#79563c", 0, 12, 0, 72, 24, 5);
    part(frame, "box", "#344756", 0, 12, 3, 69, 20, 2);
    for (const y of [2.3,21.7]) part(frame,"box","#cba171",0,y,4,70,1.4,2);
    for (let i = 0; i < 4; i++) {
      const col = ["#8ed9fe", "#ce97ee", "#a5d884", "#ffc777"][i];
      part(frame,"ring","#be9969",(i-1.5)*15.5,12,5,6,7.2,6);
      const gem = part(
        frame,
        "gem",
        progress.cleared.includes(i) ? col : "#55606a",
        (i - 1.5) * 15.5,
        12,
        6,
        5,
        7,
        3,
        progress.cleared.includes(i) ? 0.55 : 0,
      );
      if (progress.cleared.includes(i))
        moving.push((t) => {
          gem.rotation.y = t * 0.55 + i;
        });
    }
  }
  function mountExhibits() {
    for (const s of exhibitStations()) {
      const z=(s.feet-GROUND)/sin+2, top=s.feet-s.h*.88;
      if (s.seal) sealDisplay(s.x,top,z);
      else specimen(s.subject,s.x,top,z,s.scale,
        s.subject===0 && (scene.type==="floor" || s.x<worldWidth/2) ? cradle : specimens[s.subject]);
    }
  }
  function pennant3D(x, feet, z, scale, seed) {
    const root = group(x, feet, z);
    root.scale.setScalar(scale);
    part(root, "drum", "#64594b", 0, 47, 0, 1.35, 94, 1.35);
    part(root,"drum","#745d48",0,1.5,0,4.4,3,4.4);
    part(root, "orb", "#ebc87b", 0, 96, 0, 2.3, 2.3, 2.3, 0.15);
    const cloth = new T.PlaneGeometry(30, 14, 9, 3);
    cloth.translate(15, 84, 0);
    const clothMat = new T.MeshStandardMaterial({ roughness: 1, side: T.DoubleSide, vertexColors: true });
    const pos = cloth.getAttribute("position"),
      cols = [],
      rest = new Float32Array(pos.array);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i),
        y = pos.getY(i);
      const c = new T.Color(
        y < 79 || y > 89 ? "#eac77b" : Math.abs(x - 13) + Math.abs(y - 84) < 4.4 ? "#fff1c4" : "#638fcb",
      );
      cols.push(c.r, c.g, c.b);
    }
    cloth.setAttribute("color", new T.Float32BufferAttribute(cols, 3));
    root.add(new T.Mesh(cloth, clothMat));
    moving.push((t) => {
      for (let i = 0; i < pos.count; i++) {
        const x = rest[3 * i],
          y = rest[3 * i + 1],
          weight = x / 30,
          phase = t * 2.8 - x * 0.17 + seed;
        pos.setXYZ(
          i,
          x - 2 * weight * (1 + Math.cos(phase)),
          y + weight * 2.6 * Math.sin(phase),
          weight * 5 * Math.cos(phase),
        );
      }
      pos.needsUpdate = true;
      cloth.computeVertexNormals();
    });
    return root;
  }
  function particles3D(kind, count, range) {
    const root = new T.InstancedMesh(
      geometry[kind === "leaves" ? "gem" : "orb"],
      material(
        {
          leaves: "#dec56e",
          dust: "#ffd99c",
          bubbles: "#dda7ed",
          pollen: "#e5e8a4",
          stars: "#f8dcac",
          sparks: "#99dfdc",
        }[kind],
        kind === "leaves" ? 0.12 : 0.48,
      ),
      count,
    );
    root.instanceMatrix.setUsage(T.DynamicDrawUsage);
    root.frustumCulled = false;
    stage.add(root);
    const dummy = new T.Object3D();
    moving.push((t) => {
      for (let i = 0; i < count; i++) {
        const flow = kind === "leaves" ? 15 : kind === "stars" ? 1.8 : 3.2;
        const x = ((i * 139.37 + t * flow) % (range + 120)) - 60,
          period = kind === "leaves" ? 245 : 190;
        const sy =
          kind === "stars"
            ? 12 + ((i * 17.31) % 135)
            : kind === "leaves"
              ? 18 + ((i * 27.8 + t * (7 + (i % 4))) % period)
              : 265 - ((i * 37.4 + t * (5 + (i % 5))) % period);
        const z = -115 + ((i * 17) % 103),
          size = kind === "leaves" ? 3 : kind === "bubbles" ? 2.6 : 1.45;
        dummy.position.set(x + Math.sin(t * (0.45 + (i % 3) * 0.14) + i) * 6, worldY(sy, z), z);
        const pulse = 0.72 + 0.28 * Math.sin(t * 1.3 + i);
        dummy.scale.set(
          size * (kind === "leaves" ? 2.2 : 1) * pulse,
          size * 0.84 * pulse,
          size * 0.64 * pulse,
        );
        dummy.rotation.set(t * 0.8 + i, t + i, Math.sin(t + i));
        dummy.updateMatrix();
        root.setMatrixAt(i, dummy.matrix);
      }
      root.instanceMatrix.needsUpdate = true;
    });
  }
  function panoramic(name, rate, top, bottom, depth, fx) {
    const width = panoramaWidth(rate);
    const back = new Surfaces();
    back.wall(name, -6, top, width, bottom - top, depth, full, fx);
    uniforms.panoramaWidth.value = width;
    uniforms.panoramaRate.value = rate;
    parallax.push([back.finish(), rate]);
    return width;
  }
  function campus() {
    panoramic("school", 0.34, -7, 315, -360, 1);
    const ground = new Surfaces();
    const end=Math.max(worldWidth,W)+240;
    ground.floor("pavers",-240,end,293,202,[.31,.01,.99,.79]);
    for (let x=-240;x<end;x+=202)
      ground.wall("pavers",x,289,202,5,-83,[.31,.82,.99,.99],4);
    for (const stair of sideStairs.gate) {
      ground.prop("steps-gate",stair.x,GROUND,126,0,stair.side==="east");
      contact(stair.x,GROUND,0,132,12);
    }
    ground.finish();
    for (const rate of [.78,1]) {
      const layer = new T.Group(), planting = new Surfaces();
      stage.add(layer);
      for (const [name,x,feet,w,speed,flip] of campusGarden) {
        if (speed !== rate) continue;
        const z=(feet-GROUND)/sin;
        planting.prop(name,x,feet,w,z,flip,name==="tree"?2:0);
        const shade = name==="tree" ? w*.7 : name==="lamp" ? 16 : w;
        contact(x,feet,z,shade,Math.max(5,shade*.12),layer);
      }
      planting.finish(layer);
      parallax.push([layer,rate]);
    }
    pennant3D(566, 294, -78, .59, .4);
    pennant3D(729, 294, -78, .59, 2.4);
    particles3D("leaves", 31, Math.max(W, worldWidth));
  }
  function hallway() {
    const art = new Surfaces(), back = -139;
    const boards=new T.Texture(hallFloorPainting());
    boards.colorSpace=T.SRGBColorSpace;
    boards.minFilter=boards.magFilter=T.NearestFilter;
    boards.generateMipmaps=false; boards.needsUpdate=true;
    const groundMat=new T.MeshBasicMaterial({map:boards,toneMapped:false});
    groundMat.addEventListener("dispose",()=>boards.dispose());
    const boardsMesh=new T.Mesh(new T.PlaneGeometry(worldWidth,(H+2-275)/sin),groundMat);
    boardsMesh.rotation.x=-Math.PI/2;
    boardsMesh.position.set(worldWidth/2,worldY(GROUND,0),((H+2+275)/2-GROUND)/sin);
    stage.add(boardsMesh);
    for (let x = -160; x < Math.max(worldWidth,W)+160; x+=158)
      art.wall("corridor",x,0,158,80,back,[0,0,.265,80/H],3);
    for (const {asset,x,w,u,v,door} of hallwaySections()) {
      if (!door) {
        art.wall(asset,x,80,w,195,back,[u,80/H,v,275/H],3);
        continue;
      }
      art.wall(asset,x,80,w,64,back,[u,80/H,v,144/H],3);
      if (door.classroom) {
        const [sx,sy,sw,sh]=door.classroom;
        classroomPanel({sx,sy,sw,sh,x:x-2,y:143,w:w+4,h:132,z:back-8});
      } else art.wall(door.inside,x-2,143,w+4,132,back-8,[.48-door.view/2,.12,.48+door.view/2,.91],3);
      const panel=new Surfaces();
      panel.wall(asset,x,144,w,131,back-3,[u,144/H,v,275/H],3);
      const slab=panel.finish();
      moving.push(()=>{slab.position.x=doorTravel(door.x,w)});
    }
    art.finish();
    mountExhibits();
    particles3D("dust", 23, worldWidth);
  }
  function classroomPanel(p) {
    const art = assets.classrooms;
    if (!classroomTexture) {
      classroomTexture = new T.Texture(art);
      classroomTexture.colorSpace = T.SRGBColorSpace;
      classroomTexture.magFilter = classroomTexture.minFilter = T.NearestFilter;
      classroomTexture.generateMipmaps = false;
      classroomTexture.needsUpdate = true;
    }
    const plane = new T.PlaneGeometry(p.w, p.h / cos);
    const uv = plane.getAttribute("uv");
    for (let i = 0; i < uv.count; i++) {
      const u = (p.sx + .5 + uv.getX(i) * (p.sw - 1)) / art.width;
      const v = 1 - (p.sy + .5 + (1 - uv.getY(i)) * (p.sh - 1)) / art.height;
      uv.setXY(i, u, v);
    }
    const mat = new T.MeshBasicMaterial({map: classroomTexture, alphaTest: p.z === 0 ? .35 : 0, toneMapped: false});
    const planeMesh = new T.Mesh(plane, mat);
    planeMesh.position.set(p.x + p.w / 2, worldY(p.y + p.h / 2, p.z), p.z);
    stage.add(planeMesh);
  }
  function classroom() {
    for (const p of classroomPanels()) classroomPanel(p);
    // A student-made mobile hangs in the window. Its pieces swing from fixed strings.
    const mobile = group(268 + 5 * scene.room, 53, -160);
    part(mobile, "drum", "#775a3d", 0, 0, 0, 2.6, 2, 2.6);
    part(mobile, "box", "#997a54", 0, -6, 0, 1, 12, 1);
    const bar = new T.Group(); bar.position.y = -12; mobile.add(bar);
    part(bar, "box", "#ac8963", 0, 0, 0, 30, 1.4, 1.4);
    const colors = ["#edb667", "#88b67b", "#9aa9cc"];
    for (let i = 0; i < 3; i++) {
      const x = (i - 1) * 13, length = [14, 23, 17][(i + scene.room) % 3];
      part(bar, "box", "#bda887", x, -length / 2, 0, .8, length, .8);
      const charm = part(bar, scene.floor === 5 ? "orb" : "gem", colors[(i + scene.floor) % 3],
        x, -length, 0, 4.4, scene.floor === 4 ? 6.5 : 4.4, 2.7);
      moving.push(t => { charm.rotation.y = t * .7 + i; });
    }
    moving.push(t => { bar.rotation.z = Math.sin(t * .85 + scene.room) * .075; });
    particles3D("dust", 22, worldWidth);
  }
  function laboratory() {
    const name = labPaint[scene.subject];
    panoramic(name, 0.51, -12, 343, -270, 6);
    const tiles = new Surfaces();
    tiles.panoramaFloor(
      name,
      -12,
      343,
      ...labFloorCuts[scene.subject],
    );
    tiles.finish();
    mountExhibits();
    particles3D(["sparks", "bubbles", "pollen", "stars"][scene.subject], 35, worldWidth);
  }
  function rooftop() {
    const sky = progress.won ? "morning" : "roof",
      width = panoramic(sky, 0.38, -5, 352, -340, 5);
    const tiles = new Surfaces();
    tiles.panoramaFloor(sky, -5, 352, 0.785, 0.885);
    tiles.finish();
    // Bolt the mast onto the painted fence post. They share the panorama's scroll rate.
    const flag = pennant3D(width*.247-6,255,-235,.57,.6);
    parallax.push([flag,.38,flag.position.x]);
    if (!progress.won) {
      const rift = group(width*.646-6,65,-252);
      parallax.push([rift, 0.38, rift.position.x]);
      const orbit = new T.Group();
      rift.add(orbit);
      orbit.rotation.x = 0.42;
      orbit.rotation.z = 0.22;
      const shards = [];
      for (let i = 0; i < 9; i++)
        shards.push(part(orbit, "gem", i % 3 ? "#c983e3" : "#ffc99d", 0, 0, 0, 4.8, 9.2, 4, 0.43));
      moving.push((t) =>
        shards.forEach((rock, i) => {
          const a = t * 0.26 + (i * 2 * Math.PI) / 9;
          rock.position.set(55 * Math.cos(a), 16 * Math.sin(a), 19 * Math.sin(a));
          rock.rotation.set(0.21, a * 2, a * 0.42);
        }),
      );
    }
    particles3D(progress.won ? "dust" : "stars", 36, worldWidth);
  }
  function release() {
    if (!stage) return;
    const geos = new Set(Object.values(geometry)),
      mats = new Set(materials.values());
    stage.traverse((o) => {
      if (o.geometry) geos.add(o.geometry);
      if (o.material && o.material !== paper) mats.add(o.material);
      if (o.isInstancedMesh) o.dispose();
    });
    geos.forEach((g) => g.dispose());
    mats.forEach((m) => m.dispose());
    stage.clear();
  }
  function build() {
    release();
    moving = [];
    parallax = [];
    materials = new Map();
    geometry = {
      box: new T.BoxGeometry(),
      orb: new T.SphereGeometry(1, 12, 8),
      gem: new T.OctahedronGeometry(),
      drum: new T.CylinderGeometry(1, 1, 1, 12),
      ring: new T.TorusGeometry(1, 0.036, 5, 40),
    };
    stage = new T.Scene();
    stage.background = new T.Color(
      scene.type === "floor" ? "#cab99c" : scene.type === "gate" ? "#a1cbe2" : "#28283f",
    );
    if (!furnitureTexture) {
      furnitureTexture=new T.Texture(furniturePaint);
      furnitureTexture.colorSpace=T.SRGBColorSpace;
      furnitureTexture.minFilter=furnitureTexture.magFilter=T.NearestFilter;
      furnitureTexture.generateMipmaps=false;
      furnitureTexture.needsUpdate=true;
    }
    paintedFurniture=new T.MeshBasicMaterial({map:furnitureTexture,alphaTest:.35,toneMapped:false});
    contactMat=new T.MeshBasicMaterial({map:furnitureTexture,transparent:true,depthWrite:false,toneMapped:false});
    materials.set("furniture",paintedFurniture);
    materials.set("contact",contactMat);
    const [key,fill,bounce,rim,dir]=environmentLight();
    const sky = new T.HemisphereLight(fill,bounce,1.04);
    stage.add(sky);
    const sun = new T.DirectionalLight(key,2.25);
    sun.position.set(-dir*210,320,225);
    stage.add(sun);
    const edge = new T.DirectionalLight(rim, .68);
    edge.position.set(dir*180,140,-110);
    stage.add(edge);
    if (scene.type === "gate") campus();
    else if (scene.type === "floor") hallway();
    else if (scene.type === "classroom") classroom();
    else if (scene.type === "arena") laboratory();
    else rooftop();
    dressFloor();
    if (canvas.width !== W || canvas.height !== H) renderer.setSize(W, H, false);
    camera.left = -W / 2;
    camera.right = W / 2;
    camera.updateProjectionMatrix();
  }
  function draw(shakeX) {
    if (unavailable || lost || !image.naturalWidth || !furniturePaint.naturalWidth) return false;
    if ((scene.type === "classroom" || (scene.type === "floor" && scene.floor >= 3)) && !assets.classrooms.naturalWidth) {
      canvas.hidden = true;
      lastKey = "";
      return false;
    }
    try {
      if (!renderer) initialize();
      if (!renderer) return false;
      const key = [scene.type, scene.floor, scene.room, scene.subject, scene.type === "roof" && progress.won, W].join(
        "/",
      );
      if (key !== lastKey) {
        build();
        lastKey = key;
        lastTime = undefined;
      }
      const cx = cam + W / 2 - shakeX;
      const boss = foes.find((e) => e.boss),
        seals = progress.cleared.length;
      const warning =
        !sceneryPaused && !reducedMotion.matches && boss?.warn > 0 ? 1 - Math.min(1, boss.warn / 0.85) : 0;
      if (
        lastTime === sceneryTime &&
        lastCameraX === cx &&
        lastPlayerX === player.x &&
        lastWarning === warning &&
        lastSeals === seals
      )
        return true;
      camera.position.set(cx, 650 * sin, 650 * cos);
      camera.lookAt(cx, 0, 0);
      uniforms.viewX.value = cam;
      uniforms.viewWidth.value = W;
      uniforms.time.value = sceneryTime;
      uniforms.seals.value = seals / 4;
      uniforms.theme.value = scene.type === "floor" ? scene.floor : 0;
      uniforms.discipline.value = scene.subject;
      uniforms.warning.value = warning;
      // Reflected room light also reaches the painted wood and metal on the walking plane.
      paintedFurniture.color.setRGB(1+.052*warning,1+.014*warning,1+.065*warning);
      parallax.forEach(([mesh, rate, base = 0]) => {
        mesh.position.x = base + cam * (1 - rate);
      });
      moving.forEach((fn) => fn(sceneryTime));
      renderer.render(stage, camera);
      canvas.hidden = false;
      lastTime = sceneryTime;
      lastCameraX = cx;
      lastPlayerX = player.x;
      lastWarning = warning;
      lastSeals = seals;
      return true;
    } catch (err) {
      console.warn("Three.js campus scenery unavailable", err);
      unavailable = true;
      canvas.hidden = true;
      release();
      renderer?.dispose();
      return false;
    }
  }
  return { draw };
})();
