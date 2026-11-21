/* School scenery. World x and screen y use the same units as the 2D controller. */
const campusWorld = (() => {
  const T = globalThis.CampusThree;
  if (!T || typeof campusAtlas === "undefined") return { draw: () => false };
  const canvas = document.getElementById("map-depth");
  const pitch = 0.31,
    sin = Math.sin(pitch),
    cos = Math.cos(pitch);
  const worldY = (screenY, z) => (H / 2 - screenY + z * sin) / cos;
  const image = new Image();
  image.src = campusAtlas.data;
  let renderer,
    camera,
    stage,
    texture,
    classroomTexture,
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
            c*=.985+.035*sweep;
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
      const y = worldY(GROUND, 0),
        zFront = (H + 7 - GROUND) / sin,
        zBack = (backY - GROUND) / sin;
      for (let x = start, n = 0; x < end; x += span, n++) {
        const uv = n % 2 ? [crop[2], crop[1], crop[0], crop[3]] : crop;
        this.quad(
          name,
          [
            [x, y, zFront],
            [x + span, y, zFront],
            [x, y, zBack],
            [x + span, y, zBack],
          ],
          uv,
          4,
        );
      }
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
          flatShading: true,
          roughness: 0.73,
          metalness: 0.12,
          emissive: color,
          emissiveIntensity: glow,
        }),
      );
    return materials.get(k);
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
    part(globe, "stone", "#448c9c", 0, 0, 0, 19, 18, 19);
    for (let i = 0; i < 7; i++) {
      const a = i * 2.4,
        y = -13 + i * 4,
        rr = Math.sqrt(Math.max(0, 18 * 18 - y * y));
      const rock = part(
        globe,
        "gem",
        i % 2 ? "#939767" : "#ad9463",
        rr * Math.cos(a),
        y,
        rr * Math.sin(a),
        7,
        4,
        8,
      );
      rock.rotation.y = -a;
    }
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
    part(base, "drum", "#42555c", 0, 2, 0, 22, 4, 16);
    part(base, "drum", "#b88c52", 0, 5, 0, 17, 2, 13);
    part(base, "drum", "#78634f", 0, 12, 0, 3, 13, 3);
    const figure = new T.Group();
    base.add(figure);
    figure.position.y = 41;
    figureType(figure);
  }
  function displayStand(x, feet, z, width, height) {
    const root = group(x, feet, z),
      body = "#484650",
      trim = "#b38756";
    part(root, "box", "#343943", 0, 2, 0, width, 4, 20);
    part(root, "box", body, 0, height / 2, 0, width - 6, height - 4, 16);
    for (const side of [-1, 1])
      part(root, "box", trim, side * (width / 2 - 5), height / 2, 8, 1.5, height - 4, 1.5);
    part(root, "box", "#865f46", 0, height - 1, 0, width, 3, 22);
    part(root, "box", "#e0ba80", 0, height + 0.7, 0, width, 1.2, 22);
    return feet - (height + 1.3) * cos;
  }
  function sealDisplay(x) {
    const z = -93,
      top = displayStand(x, 288, z, 79, 15),
      frame = group(x, top, z);
    part(frame, "box", "#a08052", 0, 12, 0, 72, 24, 5);
    part(frame, "box", "#273e4b", 0, 12, 3, 69, 21, 2);
    for (let i = 0; i < 4; i++) {
      const col = ["#8ed9fe", "#ce97ee", "#a5d884", "#ffc777"][i];
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
  function pennant3D(x, feet, z, scale, seed) {
    const root = group(x, feet, z);
    root.scale.setScalar(scale);
    part(root, "drum", "#64594b", 0, 47, 0, 1.35, 94, 1.35);
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
  function bench(b, hall) {
    const root = group(b.x, b.y, 0),
      wood = hall ? "#a77346" : "#657a87",
      edges = hall ? "#664732" : "#344352";
    // The front lip coincides with the one-way collision surface.
    part(root, "box", wood, 0, -2, -4, b.w, 4, 8);
    for (const side of [-1, 1])
      part(root, "box", edges, side * (b.w / 2 - 7), -(GROUND - b.y) / 2, -4, 4, GROUND - b.y, 5);
    part(root, "box", edges, 0, -9, -6, b.w - 12, 2, 3);
    if (hall) {
      for (const s of [-1, 1]) part(root, "box", edges, s * (b.w / 2 - 7), 6, -9, 3, 13, 3);
      part(root, "box", "#bb8752", 0, 10, -9, b.w - 3, 5, 2);
    }
  }
  function steps(build) {
    for (const stair of sideStairs[scene.type]) {
      const w = scene.type === "arena" ? 122 : 126;
      build.prop("steps-" + scene.type, stair.x, GROUND, w, -1, stair.side === "east");
    }
  }
  function panoramic(name, rate, top, bottom, depth, fx) {
    const width = Math.max(680, W + Math.max(0, worldWidth - W) * rate + 12);
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
    ground.floor("pavers", -200, Math.max(worldWidth, W) + 220, 293, 175, full);
    const sides = new Surfaces(),
      garden = new Surfaces();
    const z = -78;
    for (const [x, h] of [
      [-25, 211],
      [655, 180],
      [1080, 216],
    ]) {
      const reg = campusAtlas.regions.tree;
      sides.prop("tree", x, 286, (h * reg[2]) / reg[3], z, x > 600, 2);
    }
    parallax.push([sides.finish(), 0.74]);
    for (const [x, flip] of [
      [80, false],
      [572, true],
      [1071, false],
    ])
      garden.prop("fence", x, 298, 157, -48, flip);
    for (const [x, w] of [
      [-16, 76],
      [154, 74],
      [510, 70],
      [845, 88],
      [1127, 72],
    ])
      garden.prop("roses", x, 306, w, -31);
    for (const x of [130, 553, 970]) garden.prop("lamp", x, 296, 32, -52);
    parallax.push([garden.finish(), 0.93]);
    steps(ground);
    ground.finish();
    pennant3D(170, 294, -60, 0.85, 0.4);
    pennant3D(519, 294, -60, 0.85, 2.4);
    particles3D("leaves", 31, Math.max(W, worldWidth));
  }
  function hallway() {
    const art = new Surfaces(),
      bays = hallBays[scene.floor],
      back = -139;
    art.floor("corridor", -260, Math.max(worldWidth, W) + 260, 274.5, 232, [0.07, 0.775, 0.94, 0.99]);
    for (let x = -160; x < Math.max(worldWidth, W) + 160; x += 158)
      art.wall("corridor", x, 0, 158, 80, back, [0, 0, 0.265, 80 / H], 3);
    for (let i = 0; i < bays.length; i++) {
      const b = bays[i],
        l = i ? hallBoundary(bays[i - 1], b) : 0,
        r = i + 1 < bays.length ? hallBoundary(b, bays[i + 1]) : worldWidth;
      if (b.type === "stair") {
        art.wall(
          "stairhall",
          l,
          80,
          r - l,
          195,
          back,
          b.side === "east" ? [1, 80 / H, 0, 275 / H] : [0, 80 / H, 1, 275 / H],
          3,
        );
        continue;
      }
      // The door slides behind its right jamb as the player approaches.
      const span = Math.min(29, (b.x - l) * 0.7, (r - b.x) * 0.7),
        doorL = b.x - span,
        doorR = b.x + span;
      const left = Math.max(l, b.x - 113),
        right = Math.min(r, b.x + 113);
      for (const [a, e] of [
        [l, left],
        [right, r],
      ]) {
        const num = Math.ceil((e - a) / 145);
        for (let j = 0; j < num; j++) {
          const w = (e - a) / num,
            halfCrop = 0.127 * Math.min(1, w / 132);
          art.wall(
            "corridor",
            a + w * j,
            80,
            w,
            195,
            back,
            [0.449 - halfCrop, 80 / H, 0.449 + halfCrop, 275 / H],
            3,
          );
        }
      }
      art.wall("corridor", left, 80, doorL - left, 195, back, [0, 80 / H, 0.183, 275 / H], 3);
      art.wall("corridor", doorR, 80, right - doorR, 195, back, [0.297, 80 / H, 0.5, 275 / H], 3);
      art.wall("corridor", doorL, 80, span * 2, 64, back, [0.183, 80 / H, 0.297, 0.4], 3);
      const inside = b.name === "물리지학실" ? "physics" : b.name === "생명화학실" ? "chem" : "classroom";
      art.wall(inside, doorL - 2, 143, span * 2 + 4, 132, back - 8, [0.19, 0, 0.86, 1], 3);
      const door = new Surfaces();
      door.wall("corridor", doorL, 144, span * 2, 131, back - 3, [0.183, 0.4, 0.297, 0.763], 3);
      const slab = door.finish();
      moving.push(() => {
        const f = Math.max(0, 1 - Math.abs(player.x - b.x) / 87);
        slab.position.x = span * 1.65 * f * f * (3 - 2 * f);
      });
    }
    art.finish();
    if (scene.floor === 1) sealDisplay(775);
    else {
      const discipline = scene.floor - 2;
      for (const x of [477, 1730]) {
        const top = displayStand(x, 285, back + 35, 48, 19);
        specimen(discipline, x, top, back + 35, 0.67, discipline === 0 ? cradle : specimens[discipline]);
      }
    }
    // Window light falls on the floor at the same intervals as classroom bays.
    const sunMat = new T.MeshBasicMaterial({
      color: ["#ffe6a2", "#ffe6a2", "#ffe0a1", "#edc2e1", "#dbefab", "#f3c388"][scene.floor],
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
      side: T.DoubleSide,
    });
    for (const b of bays.filter((b) => b.type === "room")) {
      const y = worldY(GROUND, 0) + 0.18;
      const g = new T.BufferGeometry();
      g.setAttribute(
        "position",
        new T.Float32BufferAttribute(
          [b.x - 87, y, -125, b.x - 63, y, -125, b.x - 139, y, 93, b.x - 111, y, 93],
          3,
        ),
      );
      g.setIndex([0, 1, 2, 2, 1, 3]);
      const patch = new T.Mesh(g, sunMat);
      stage.add(patch);
      moving.push((t) => {
        patch.position.x = Math.sin(t * 0.25 + b.x * 0.002) * 4;
      });
    }
    moving.push((t) => {
      sunMat.opacity = 0.1 + 0.06 * (0.5 + 0.5 * Math.sin(t * 0.42));
    });
    particles3D("dust", 23, worldWidth);
  }
  function classroom() {
    const art = assets.classrooms;
    if (!classroomTexture) {
      classroomTexture = new T.Texture(art);
      classroomTexture.colorSpace = T.SRGBColorSpace;
      classroomTexture.magFilter = classroomTexture.minFilter = T.NearestFilter;
      classroomTexture.generateMipmaps = false;
      classroomTexture.needsUpdate = true;
    }
    for (const p of classroomPanels()) {
      const plane = new T.PlaneGeometry(p.w, p.h / cos);
      const uv = plane.getAttribute("uv");
      for (let i = 0; i < uv.count; i++) {
        const u = (p.sx + .5 + uv.getX(i) * (p.sw - 1)) / art.width;
        const v = 1 - (p.sy + .5 + (1 - uv.getY(i)) * (p.sh - 1)) / art.height;
        uv.setXY(i, u, v);
      }
      const mat = new T.MeshBasicMaterial({map: classroomTexture, transparent: p.z === 0, toneMapped: false});
      const planeMesh = new T.Mesh(plane, mat);
      planeMesh.position.set(p.x + p.w / 2, worldY(p.y + p.h / 2, p.z), p.z);
      stage.add(planeMesh);
    }

    // A student-made mobile hangs in the window. Its pieces swing from fixed strings.
    const mobile = group(268 + 5 * scene.room, 49, -160);
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
    const name = ["physics", "chem", "bio", "earth"][scene.subject];
    panoramic(name, 0.51, -12, 343, -270, 6);
    const tiles = new Surfaces();
    tiles.panoramaFloor(
      name,
      -12,
      343,
      [0.75, 0.75, 0.77, 0.73][scene.subject],
      [0.892, 0.89, 0.891, 0.851][scene.subject],
    );
    steps(tiles);
    tiles.finish();
    for (const [x, size] of [
      [336, 1.06],
      [883, 0.7],
    ]) {
      const z = -110,
        top = displayStand(x, 285, z, 69 * size, 21);
      specimen(
        scene.subject,
        x,
        top,
        z,
        size,
        scene.subject === 0 && x === 336 ? cradle : specimens[scene.subject],
      );
    }
    particles3D(["sparks", "bubbles", "pollen", "stars"][scene.subject], 35, worldWidth);
  }
  function rooftop() {
    const sky = progress.won ? "morning" : "roof",
      width = panoramic(sky, 0.38, -5, 352, -340, 5);
    const tiles = new Surfaces();
    tiles.panoramaFloor(sky, -5, 352, 0.785, 0.885);
    steps(tiles);
    tiles.finish();
    pennant3D(179, 263, -135, 0.7, 0.6);
    if (!progress.won) {
      const rift = group(width * 0.662, 58, -252);
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
      stone: new T.IcosahedronGeometry(1, 1),
      gem: new T.OctahedronGeometry(),
      drum: new T.CylinderGeometry(1, 1, 1, 12),
      ring: new T.TorusGeometry(1, 0.036, 5, 40),
    };
    stage = new T.Scene();
    stage.background = new T.Color(
      scene.type === "floor" ? "#cab99c" : scene.type === "gate" ? "#a1cbe2" : "#28283f",
    );
    const sky = new T.HemisphereLight(scene.type === "arena" ? "#c5d8ff" : "#fff3d6", "#8b796e", 1.75);
    stage.add(sky);
    const sun = new T.DirectionalLight(scene.type === "roof" && !progress.won ? "#f1b5cf" : "#fff0ca", 2.0);
    sun.position.set(-180, 340, 280);
    stage.add(sun);
    if (scene.type === "gate") campus();
    else if (scene.type === "floor") hallway();
    else if (scene.type === "classroom") classroom();
    else if (scene.type === "arena") laboratory();
    else rooftop();
    if (scene.type !== "classroom") for (const b of platforms()) bench(b, scene.type === "floor");
    if (canvas.width !== W || canvas.height !== H) renderer.setSize(W, H, false);
    camera.left = -W / 2;
    camera.right = W / 2;
    camera.updateProjectionMatrix();
  }
  function draw(shakeX) {
    if (unavailable || lost || !image.complete || !image.naturalWidth) return false;
    if (scene.type === "classroom" && !assets.classrooms.naturalWidth) {
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
