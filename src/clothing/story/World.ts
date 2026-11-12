import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { CLOTH, Cloth } from "./cloth";
import { AMP_FLAT, AMP_PRESSED, FOLDED, Tee, teeTextures, type TeeTextures } from "./tee";
import * as tx from "./textures";
import { clamp01, easeInOut, easeOut, seg, sub, T } from "./timeline";

/* One continuous studio, shot in a single camera move as you scroll:
   spools of yarn → a loom weaving cloth → the cloth on a rail → a cutting
   table where a tee is assembled, sewn and folded → the finished stack. */

const COLOR = { loden: "#5b6446", ecru: "#e9e0cc", clay: "#a46b4b", char: "#3a3835", bg: "#efe8dc", thread: "#848c6b" };
const LOOM_X = 6;
const CLOTH_X = 12;
const TABLE_X = 18;
const TABLE_Y = -0.6;
const GROUND_Y = -1.25;

type Shot = { pos: THREE.Vector3; look: THREE.Vector3 };
const shot = (px: number, py: number, pz: number, lx: number, ly: number, lz: number): Shot => ({
  pos: new THREE.Vector3(px, py, pz),
  look: new THREE.Vector3(lx, ly, lz),
});
const mix = (a: Shot, b: Shot, t: number, out: Shot) => {
  out.pos.lerpVectors(a.pos, b.pos, t);
  out.look.lerpVectors(a.look, b.look, t);
  return out;
};

const SHOTS = {
  intro0: shot(-0.3, 0.3, 2.65, -0.42, -0.1, 0),
  intro1: shot(0.3, 0.05, 1.7, 0.06, -0.16, 0.06),
  weave0: shot(LOOM_X - 0.66, -0.76, 0.6, LOOM_X - 0.5, -0.86, 0),
  weave1: shot(LOOM_X + 0.08, 0.06, 3.45, LOOM_X, 0, 0),
  cloth: shot(CLOTH_X + 0.32, 0.1, 5.1, CLOTH_X, 0.04, 0),
  // the tee sits right of frame so the caption has the left
  sew: shot(TABLE_X - 0.66, 1.62, 2.32, TABLE_X - 0.66, TABLE_Y, 0.08),
  fold: shot(TABLE_X - 0.25, 1.05, 2.25, TABLE_X - 0.42, 0.0, 0.1),
  ready0: shot(TABLE_X + 1.55, 0.14, 1.5, TABLE_X + 0.9, -0.27, -0.22),
  ready1: shot(TABLE_X + 0.42, 0.16, 1.45, TABLE_X + 0.9, -0.27, -0.22),
};
// Portrait screens put captions underneath, so subjects are centred instead.
const SHOTS_PORTRAIT: typeof SHOTS = {
  ...SHOTS,
  intro0: shot(0.05, 0.3, 2.65, 0.02, -0.1, 0),
  sew: shot(TABLE_X - 0.24, 1.62, 2.32, TABLE_X - 0.24, TABLE_Y, 0.08),
  fold: shot(TABLE_X - 0.1, 1.05, 2.25, TABLE_X - 0.1, 0.0, 0.1),
};
const FOLLOW = new THREE.Vector3(-0.12, 0.22, 1.5);

export class World {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(30, 1, 0.02, 60);
  private key!: THREE.DirectionalLight;
  private target = 0;
  private p = 0;
  private time = 0;
  private last = 0;
  private raf = 0;
  private running = false;
  private reduced: boolean;
  private fit = 1;
  private portrait = false;
  private aim = new THREE.Vector3();
  private pointer = new THREE.Vector2();
  private pointerSmooth = new THREE.Vector2();
  private shotNow = shot(0, 0, 0, 0, 0, 0);
  private tmpA = shot(0, 0, 0, 0, 0, 0);
  private tmpB = shot(0, 0, 0, 0, 0, 0);
  private cleanup: (() => void)[] = [];
  private textMaps: { draw: () => void }[] = [];

  // materials
  private wood!: THREE.MeshStandardMaterial;
  private brass!: THREE.MeshStandardMaterial;

  // sets
  private spoolSet = new THREE.Group();
  private spools: THREE.Object3D[] = [];
  private threadCurve!: THREE.CatmullRomCurve3;
  private thread!: THREE.Mesh;
  private threadCount = 0;
  private loomSet = new THREE.Group();
  private weft: { mesh: THREE.Mesh; count: number; dir: number }[] = [];
  private weftY: number[] = [];
  private shuttle = new THREE.Group();
  private beater!: THREE.Mesh;
  private clothSet = new THREE.Group();
  private cloth = new Cloth();
  private clothGeo!: THREE.PlaneGeometry;
  private clothMesh!: THREE.Mesh;
  private wind = new THREE.Vector3();
  private tableSet = new THREE.Group();
  private coarse = false;
  private teeTex!: TeeTextures;
  private hero!: Tee;
  private needle = new THREE.Group();
  private band!: THREE.Mesh;
  private bandY = 0;
  private stack = new THREE.Group();
  private stackTop = 0;

  constructor(private canvas: HTMLCanvasElement, onReady: () => void) {
    this.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    this.coarse = coarse;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: "high-performance" });
    const r = this.renderer;
    r.setPixelRatio(Math.min(window.devicePixelRatio, coarse ? 1.5 : 2));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.NeutralToneMapping;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;

    const scene = this.scene;
    scene.background = new THREE.Color(COLOR.bg);
    scene.fog = new THREE.Fog(COLOR.bg, 6.5, 17);
    const pmrem = new THREE.PMREMGenerator(r);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.42;
    this.cleanup.push(() => {
      env.dispose();
      pmrem.dispose();
    });

    this.buildLights(coarse);
    this.buildMaterials();
    this.buildGround();
    this.buildSpools();
    this.buildThread();
    this.buildLoom();
    this.buildClothSet();
    this.buildTable();

    // Labels and prints use the site's web fonts: redraw once they're ready.
    document.fonts.ready.then(() => this.textMaps.forEach((m) => m.draw()));

    this.resize();
    const ro = new ResizeObserver(() => this.resize());
    ro.observe(canvas);
    this.cleanup.push(() => ro.disconnect());

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      this.pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -(((e.clientY - rect.top) / rect.height) * 2 - 1));
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    this.cleanup.push(() => window.removeEventListener("pointermove", onMove));

    const io = new IntersectionObserver(([entry]) => (entry.isIntersecting ? this.start() : this.stop()));
    io.observe(canvas);
    this.cleanup.push(() => io.disconnect());
    const onVis = () => (document.hidden ? this.stop() : this.start());
    document.addEventListener("visibilitychange", onVis);
    this.cleanup.push(() => document.removeEventListener("visibilitychange", onVis));

    this.update(0);
    r.render(scene, this.camera);
    onReady();
  }

  /* --- public ------------------------------------------------------------ */

  setProgress(p: number) {
    this.target = clamp01(p);
    if (this.reduced) {
      this.p = this.target;
      if (!this.running) this.frame(performance.now());
    }
  }

  dispose() {
    this.stop();
    this.cleanup.forEach((fn) => fn());
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
      mats.forEach((mat) => {
        Object.values(mat).forEach((v) => v instanceof THREE.Texture && v.dispose());
        mat.dispose();
      });
    });
    this.renderer.dispose();
  }

  /* --- loop -------------------------------------------------------------- */

  private start() {
    if (this.running || document.hidden) return;
    this.running = true;
    this.last = performance.now();
    const loop = (now: number) => {
      if (!this.running) return;
      this.frame(now);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  private stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private frame(now: number) {
    const dt = Math.min(0.05, (now - this.last) / 1000 || 0);
    this.last = now;
    if (!this.reduced) {
      this.time += dt;
      // ease the scrubbed progress so scrolling feels like a dolly, not a jump
      this.p += (this.target - this.p) * (1 - Math.exp(-dt * 5.5));
    }
    this.update(dt);
    this.renderer.render(this.scene, this.camera);
  }

  private resize() {
    const { clientWidth: w, clientHeight: h } = this.canvas;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // Portrait screens step back so each set still fits.
    this.fit = this.camera.aspect >= 1.2 ? 1 : Math.pow(1.2 / this.camera.aspect, 0.72);
    this.portrait = this.camera.aspect < 0.9;
    this.camera.updateProjectionMatrix();
  }

  /* --- build ------------------------------------------------------------- */

  private buildLights(coarse: boolean) {
    this.scene.add(new THREE.HemisphereLight(0xfff8ee, 0xc8b89a, 0.85));
    const key = new THREE.DirectionalLight(0xfff1de, 2.6);
    key.castShadow = true;
    key.shadow.mapSize.set(coarse ? 1024 : 2048, coarse ? 1024 : 2048);
    key.shadow.radius = 5;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.012;
    const sc = key.shadow.camera;
    sc.left = sc.bottom = -2.2;
    sc.right = sc.top = 2.2;
    sc.near = 0.5;
    sc.far = 14;
    this.scene.add(key, key.target);
    this.key = key;
    const fill = new THREE.DirectionalLight(0xe8eeff, 0.35);
    fill.position.set(6, 2, 6);
    this.scene.add(fill);
  }

  private buildMaterials() {
    const oak = tx.oak();
    this.wood = new THREE.MeshStandardMaterial({ map: oak, roughness: 0.62 });
    this.brass = new THREE.MeshStandardMaterial({ color: 0xc9a66b, metalness: 1, roughness: 0.32 });
  }

  private buildGround() {
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(48, 14), new THREE.ShadowMaterial({ opacity: 0.12 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(10, GROUND_Y, 0);
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  private makeSpool(color: string) {
    const g = new THREE.Group();
    const profile = [
      [0.0, -0.2],
      [0.17, -0.2],
      [0.172, -0.186],
      [0.155, -0.177],
      [0.072, -0.17],
      [0.072, 0.17],
      [0.155, 0.177],
      [0.172, 0.186],
      [0.17, 0.2],
      [0.0, 0.2],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    const body = new THREE.Mesh(new THREE.LatheGeometry(profile, 64), this.wood);
    body.castShadow = body.receiveShadow = true;
    const threadMat = new THREE.MeshStandardMaterial({
      map: tx.spoolThread(color),
      normalMap: tx.spoolNormal(),
      normalScale: new THREE.Vector2(0.7, 0.7),
      roughness: 0.92,
    });
    const wound = new THREE.Mesh(new THREE.CylinderGeometry(0.152, 0.152, 0.33, 72, 1, true), threadMat);
    wound.castShadow = wound.receiveShadow = true;
    g.add(body, wound);
    return g;
  }

  private buildSpools() {
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.8, 0.83, 96), this.wood);
    plinth.position.y = -0.42 - 0.415;
    plinth.castShadow = plinth.receiveShadow = true;
    this.spoolSet.add(plinth);
    const spec: [string, number, number][] = [
      [COLOR.ecru, -0.46, -0.04],
      [COLOR.loden, 0, 0.14],
      [COLOR.clay, 0.46, -0.08],
    ];
    for (const [color, x, z] of spec) {
      const s = this.makeSpool(color);
      s.position.set(x, -0.22, z);
      this.spools.push(s);
      this.spoolSet.add(s);
    }
    this.scene.add(this.spoolSet);
  }

  private yarnMaterial(color: string, repeat: number) {
    const n = tx.yarnNormal();
    n.repeat.set(repeat, 1);
    return new THREE.MeshStandardMaterial({ color, roughness: 0.88, normalMap: n, normalScale: new THREE.Vector2(0.8, 0.8) });
  }

  private buildThread() {
    const pts = [
      [0.11, -0.2, 0.25],
      [0.45, -0.04, 0.42],
      [1.0, 0.22, 0.3],
      [1.7, -0.08, 0.42],
      [2.4, 0.18, 0.2],
      [3.2, -0.22, 0.36],
      [4.0, 0.12, 0.18],
      [4.7, -0.5, 0.22],
      [5.2, -0.86, 0.06],
      [LOOM_X - 0.92, -0.9, 0],
    ].map(([x, y, z]) => new THREE.Vector3(x, y, z));
    this.threadCurve = new THREE.CatmullRomCurve3(pts);
    const geo = new THREE.TubeGeometry(this.threadCurve, 700, 0.0075, 6, false);
    this.threadCount = geo.index!.count;
    this.thread = new THREE.Mesh(geo, this.yarnMaterial(COLOR.loden, 900));
    this.thread.castShadow = true;
    this.scene.add(this.thread);
  }

  private buildLoom() {
    const NW = 34;
    const NR = 46;
    const XW = 0.86;
    const amp = 0.011;
    const xs = (i: number) => -XW + (2 * XW * i) / (NW - 1);
    const ys = (j: number) => -0.9 + (1.8 * j) / (NR - 1);
    const weftMat = this.yarnMaterial(COLOR.loden, 260);
    const warpMat = this.yarnMaterial(COLOR.ecru, 300);

    for (let j = 0; j < NR; j++) {
      const y = ys(j);
      const pts = [new THREE.Vector3(-XW - 0.05, y, 0)];
      for (let i = 0; i < NW; i++) pts.push(new THREE.Vector3(xs(i), y, (i + j) % 2 ? amp : -amp));
      pts.push(new THREE.Vector3(XW + 0.05, y, 0));
      const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), NW * 5, 0.0105, 6, false);
      const mesh = new THREE.Mesh(geo, weftMat);
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.visible = false;
      this.weft.push({ mesh, count: geo.index!.count, dir: j % 2 ? -1 : 1 });
      this.weftY.push(y);
      this.loomSet.add(mesh);
    }
    for (let i = 0; i < NW; i++) {
      const x = xs(i);
      const pts = [new THREE.Vector3(x, -1.1, 0)];
      for (let j = 0; j < NR; j++) pts.push(new THREE.Vector3(x, ys(j), (i + j) % 2 ? -amp : amp));
      pts.push(new THREE.Vector3(x, 1.12, 0));
      const mesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), NR * 5, 0.0097, 6, false), warpMat);
      mesh.castShadow = mesh.receiveShadow = true;
      this.loomSet.add(mesh);
    }

    // Frame: breast beam, cloth beam, posts.
    const top = new THREE.Mesh(new THREE.BoxGeometry(2.08, 0.09, 0.09), this.wood);
    top.position.set(0, 1.16, 0);
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 2.08, 40), this.wood);
    roll.rotation.z = Math.PI / 2;
    roll.position.set(0, -1.14, 0);
    const postGeo = new THREE.BoxGeometry(0.08, 2.62, 0.08);
    const postL = new THREE.Mesh(postGeo, this.wood);
    postL.position.set(-1.04, 0.06, 0);
    const postR = postL.clone();
    postR.position.x = 1.04;
    for (const m of [top, roll, postL, postR]) {
      m.castShadow = m.receiveShadow = true;
      this.loomSet.add(m);
    }

    // Shuttle carrying a pirn of weft yarn, and the beater that packs each row.
    const darkWood = new THREE.MeshStandardMaterial({ map: this.wood.map, color: 0x8a6a48, roughness: 0.45 });
    const boat = new THREE.Mesh(new THREE.SphereGeometry(0.03, 32, 16), darkWood);
    boat.scale.set(3.4, 0.62, 0.95);
    const pirn = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.075, 20), weftMat);
    pirn.rotation.z = Math.PI / 2;
    pirn.position.z = 0.02;
    boat.castShadow = true;
    this.shuttle.add(boat, pirn);
    this.loomSet.add(this.shuttle);
    this.beater = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.02, 0.034), darkWood);
    this.beater.castShadow = true;
    this.loomSet.add(this.beater);

    this.loomSet.position.x = LOOM_X;
    this.scene.add(this.loomSet);
  }

  private buildClothSet() {
    const set = this.clothSet;
    const { width: W, height: H, gather: G, railY } = CLOTH;
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, W * G + 0.5, 40), this.brass);
    rail.rotation.z = Math.PI / 2;
    rail.position.set(0, railY, 0.025);
    rail.castShadow = true;
    set.add(rail);
    for (const side of [-1, 1]) {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.042, 32, 16), this.brass);
      cap.position.set(side * ((W * G) / 2 + 0.25), railY, 0.025);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.6, 16), this.brass);
      arm.rotation.x = Math.PI / 2;
      arm.position.set(side * ((W * G) / 2 + 0.17), railY, -0.27);
      cap.castShadow = arm.castShadow = true;
      set.add(cap, arm);
    }
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(5, 4), new THREE.ShadowMaterial({ opacity: 0.16 }));
    wall.position.set(0, 0, -0.55);
    wall.receiveShadow = true;
    set.add(wall);

    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = Math.round(1024 * (H / W));
    const map = new THREE.CanvasTexture(c);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 8;
    const draw = () => {
      tx.drawHangingCloth(c, COLOR.loden, "Loden");
      map.needsUpdate = true;
    };
    draw();
    this.textMaps.push({ draw });
    const normal = tx.weaveNormal();
    normal.repeat.set(5, 7);
    const mat = new THREE.MeshPhysicalMaterial({
      map,
      normalMap: normal,
      normalScale: new THREE.Vector2(0.32, 0.32),
      roughness: 0.94,
      sheen: 1,
      sheenRoughness: 0.55,
      sheenColor: new THREE.Color(COLOR.loden).lerp(new THREE.Color(0xffffff), 0.45),
      side: THREE.DoubleSide,
    });
    this.clothGeo = new THREE.PlaneGeometry(W, H, CLOTH.cols, CLOTH.rows);
    this.clothMesh = new THREE.Mesh(this.clothGeo, mat);
    this.clothMesh.castShadow = this.clothMesh.receiveShadow = true;
    set.add(this.clothMesh);
    // settle into its folds before anyone sees it
    for (let i = 0; i < 150; i++) {
      this.wind.set(0.4, 0, -1.2);
      this.cloth.step(this.wind, i > 4 ? this.clothGeo.attributes.normal.array : null);
      this.syncCloth();
    }
    set.position.x = CLOTH_X;
    this.scene.add(set);
  }

  private syncCloth() {
    const pos = this.clothGeo.attributes.position as THREE.BufferAttribute;
    (pos.array as Float32Array).set(this.cloth.pos);
    pos.needsUpdate = true;
    this.clothGeo.computeVertexNormals();
  }

  private buildTable() {
    const set = this.tableSet;
    const oakTop = this.wood.map!.clone();
    oakTop.repeat.set(2, 1);
    oakTop.needsUpdate = true;
    const topMat = new THREE.MeshStandardMaterial({ map: oakTop, roughness: 0.55 });
    const top = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.07, 2.1), topMat);
    top.position.set(0, TABLE_Y - 0.035, 0);
    top.receiveShadow = top.castShadow = true;
    set.add(top);
    const legGeo = new THREE.BoxGeometry(0.08, TABLE_Y - 0.07 - GROUND_Y, 0.08);
    for (const [x, z] of [
      [-1.6, -0.95],
      [1.6, -0.95],
      [-1.6, 0.95],
      [1.6, 0.95],
    ]) {
      const leg = new THREE.Mesh(legGeo, this.wood);
      leg.position.set(x, (TABLE_Y - 0.07 + GROUND_Y) / 2, z);
      leg.castShadow = true;
      set.add(leg);
    }

    // a tailor's tape and a spool of the same yarn, left on the table
    const tapeMap = tx.tape();
    const tapeMat = new THREE.MeshStandardMaterial({ map: tapeMap, roughness: 0.7 });
    this.textMaps.push({
      draw: () => {
        tapeMat.map = tx.tape();
        tapeMat.needsUpdate = true;
        tapeMap.dispose();
      },
    });
    const tapeGeo = new THREE.PlaneGeometry(1.5, 0.035, 160, 1);
    const tp = tapeGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < tp.count; i++) {
      const x = tp.getX(i);
      tp.setZ(i, Math.sin(x * 2.4) * 0.16 + tp.getY(i) * 0.3);
    }
    tapeGeo.computeVertexNormals();
    const tapeMesh = new THREE.Mesh(tapeGeo, tapeMat);
    tapeMesh.rotation.x = -Math.PI / 2;
    tapeMesh.rotation.z = 0.25;
    tapeMesh.position.set(1.08, TABLE_Y + 0.003, 0.8);
    tapeMesh.receiveShadow = true;
    set.add(tapeMesh);
    const spool = this.makeSpool(COLOR.loden);
    spool.scale.setScalar(0.7);
    spool.position.set(-1.22, TABLE_Y + 0.14, -0.5);
    set.add(spool);

    this.buildTee();
    this.buildStack();
    this.buildNeedle();

    set.position.x = TABLE_X;
    this.scene.add(set);
  }

  /** The tee that gets sewn and folded. */
  private buildTee() {
    this.teeTex = teeTextures(this.coarse);
    this.hero = new Tee(this.teeTex, COLOR.loden, { coarse: this.coarse, label: tx.wovenLabel() });
    this.textMaps.push({ draw: () => this.hero.setLabelMap(tx.wovenLabel()) });
    this.hero.root.position.set(-0.24, TABLE_Y + 0.0018, 0.12);
    this.tableSet.add(this.hero.root);
  }

  /** Finished tees, folded the same way, waiting for the last one. */
  private buildStack() {
    const colors = [COLOR.ecru, COLOR.char, COLOR.clay];
    colors.forEach((color, i) => {
      const tee = new Tee(this.teeTex, color, { seed: 3 + i * 2, coarse: this.coarse });
      tee.set({ join: 1, sew: 1, fold: [1, 1, 1, 1, 1], amp: AMP_PRESSED });
      tee.root.position.set((i - 1) * 0.005, TABLE_Y + FOLDED.below + i * FOLDED.thick, 0.3);
      tee.root.rotation.y = [0.012, -0.016, 0.007][i];
      this.stack.add(tee.root);
    });
    this.stackTop = TABLE_Y + colors.length * FOLDED.thick;
    this.stack.position.set(0.9, 0, -0.22);
    this.stack.rotation.y = -0.12;

    // the paper band slips over the finished stack
    const bandMap = tx.band();
    const kraft = new THREE.MeshStandardMaterial({ map: bandMap, roughness: 0.85 });
    this.textMaps.push({
      draw: () => {
        kraft.map = tx.band();
        kraft.needsUpdate = true;
        bandMap.dispose();
      },
    });
    const plain = new THREE.MeshStandardMaterial({ color: 0xc9ad85, roughness: 0.85 });
    const hidden = new THREE.MeshBasicMaterial({ visible: false });
    const bandH = (colors.length + 1) * FOLDED.thick + 0.008;
    this.band = new THREE.Mesh(new THREE.BoxGeometry(0.478, bandH, 0.14), [plain, plain, kraft, plain, hidden, hidden]);
    this.bandY = TABLE_Y + bandH / 2;
    this.band.position.y = this.bandY;
    this.band.castShadow = true;
    this.band.visible = false;
    this.stack.add(this.band);
    this.tableSet.add(this.stack);
  }

  private buildNeedle() {
    const steel = new THREE.MeshStandardMaterial({ color: 0xd9dbe0, metalness: 1, roughness: 0.22 });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.0024, 0.0024, 0.085, 12), steel);
    shaft.position.y = 0.05;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.0024, 0.016, 12), steel);
    tip.rotation.x = Math.PI;
    tip.position.y = 0.0;
    const yarn = new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0012, 0.12, 6), new THREE.MeshStandardMaterial({ color: COLOR.thread, roughness: 0.8 }));
    yarn.position.set(0.02, 0.1, 0);
    yarn.rotation.z = -0.5;
    shaft.castShadow = true;
    this.needle.add(shaft, tip, yarn);
    this.needle.rotation.z = 0.35;
    this.needle.visible = false;
    this.scene.add(this.needle);
  }

  /* --- per-frame --------------------------------------------------------- */

  private update(dt: number) {
    const p = this.p;
    const t = this.time;

    // Only draw what the camera can reach.
    this.spoolSet.visible = p < T.toLoom[1] + 0.02;
    this.thread.visible = p < T.weave[0] + 0.06;
    this.loomSet.visible = p > T.thread[1] - 0.02 && p < T.toCloth[1] + 0.02;
    this.clothSet.visible = p > T.weave[1] - 0.03 && p < T.toTable[1] + 0.02;
    this.tableSet.visible = p > T.cloth[1] - 0.03;

    // 01 · Spools turn; the loden one pays out thread.
    const threadG = easeInOut(clamp01((p - T.thread[0]) / (T.toLoom[1] - T.thread[0])));
    this.spools.forEach((s, i) => (s.rotation.y = t * (0.15 + i * 0.05) + (i === 1 ? threadG * 14 : 0)));
    const visible = Math.floor((this.threadCount * threadG) / 6) * 6;
    this.thread.geometry.setDrawRange(0, visible);

    // 02 · Weaving, row by row.
    const w = sub(seg(p, "weave"), 0, 0.92);
    const rowsF = w * this.weft.length;
    const full = Math.floor(rowsF);
    const frac = rowsF - full;
    this.weft.forEach((row, j) => {
      if (j < full) {
        row.mesh.visible = true;
        row.mesh.geometry.setDrawRange(0, Infinity);
      } else if (j === full && frac > 0) {
        row.mesh.visible = true;
        const count = Math.floor((row.count * frac) / 6) * 6;
        row.mesh.geometry.setDrawRange(row.dir > 0 ? 0 : row.count - count, count);
      } else {
        row.mesh.visible = false;
      }
    });
    const weaving = w > 0 && w < 1;
    this.shuttle.visible = weaving;
    this.beater.visible = p > T.weave[0] - 0.02 && p < T.toCloth[1];
    if (full < this.weft.length) {
      const row = this.weft[full];
      const span = 0.86 + 0.05;
      const x = row.dir > 0 ? -span + frac * span * 2 : span - frac * span * 2;
      this.shuttle.position.set(x, this.weftY[full], 0.065 + Math.sin(t * 6) * 0.002);
      this.shuttle.rotation.y = row.dir > 0 ? 0 : Math.PI;
      this.beater.position.set(0, this.weftY[full] + 0.05 + 0.02 * Math.sin(frac * Math.PI), 0.034);
    } else {
      this.beater.position.set(0, this.weftY[this.weftY.length - 1] + 0.06, 0.034);
    }

    // 03 · The cloth moves in a slow, gusty breeze.
    if (this.clothSet.visible && dt > 0) {
      const gust = 0.55 + 0.45 * Math.sin(t * 0.7) * Math.sin(t * 0.23 + 1.3);
      this.wind.set(0.5 * Math.sin(t * 0.4), 0.05 * Math.sin(t * 1.1), -1.6 * gust - 0.35);
      this.cloth.step(this.wind, this.clothGeo.attributes.normal.array);
      this.syncCloth();
    }

    // 04 · Sleeves join the body, then each seam is sewn, tone on tone.
    // 05 · Lift and fold: sleeves, left, right, then the hem half under.
    const s = seg(p, "sew");
    const f = seg(p, "fold");
    const sewn = sub(s, 0.26, 0.96);
    const amp = THREE.MathUtils.lerp(AMP_FLAT, AMP_PRESSED, easeInOut(sub(f, 0.02, 0.3)));
    if (this.tableSet.visible) {
      const sleeves = easeInOut(sub(f, 0.12, 0.3));
      this.hero.set({
        join: easeInOut(sub(s, 0, 0.28)),
        sew: sewn,
        amp,
        fold: [sleeves, sleeves, easeInOut(sub(f, 0.3, 0.46)), easeInOut(sub(f, 0.44, 0.6)), easeInOut(sub(f, 0.6, 0.76))],
      });
    }
    const lift = easeInOut(sub(f, 0, 0.14));
    const move = easeInOut(sub(f, 0.78, 1));
    const base = new THREE.Vector3(-0.24, TABLE_Y + 0.0018, 0.12);
    // high enough that the hem half can fold under without touching the table
    const lifted = new THREE.Vector3(-0.1, TABLE_Y + 0.68, 0.14);
    const stackRot = this.stack.rotation.y;
    const offset = new THREE.Vector3(0, 0, -0.3).applyAxisAngle(new THREE.Vector3(0, 1, 0), stackRot);
    const landed = new THREE.Vector3(this.stack.position.x - offset.x, this.stackTop + FOLDED.below + 0.001, this.stack.position.z - offset.z);
    const root = this.hero.root;
    root.position.lerpVectors(base, lifted, lift);
    if (move > 0) {
      root.position.lerpVectors(lifted, landed, move);
      root.position.y += Math.sin(move * Math.PI) * 0.12;
    }
    root.rotation.y = stackRot * move;

    const sewing = s > 0.26 && s < 0.96 && p < T.fold[0];
    this.needle.visible = sewing && this.hero.stitchHead(sewn, amp, this.needle.position) !== null;
    if (this.needle.visible) {
      root.updateWorldMatrix(true, false);
      this.needle.position.applyMatrix4(root.matrixWorld);
      this.needle.position.y += Math.abs(Math.sin(t * 14)) * 0.02;
    }

    // 06 · The band slips over the stack.
    const r = seg(p, "ready");
    this.band.visible = r > 0.02;
    this.band.position.y = this.bandY + (1 - easeOut(sub(r, 0.05, 0.5))) * 0.42;

    this.updateCamera(p);
  }

  private updateCamera(p: number) {
    const out = this.shotNow;
    const SH = this.portrait ? SHOTS_PORTRAIT : SHOTS;
    if (p < T.intro[1]) {
      mix(SH.intro0, SH.intro1, easeInOut(seg(p, "intro")), out);
    } else if (p < T.toLoom[1]) {
      const g = easeInOut(clamp01((p - T.thread[0]) / (T.toLoom[1] - T.thread[0])));
      const head = this.threadCurve.getPointAt(Math.min(0.999, g));
      this.tmpA.look.copy(head);
      this.tmpA.pos.copy(head).add(FOLLOW);
      mix(SH.intro1, this.tmpA, easeInOut(sub(p, T.thread[0], T.thread[0] + 0.035)), this.tmpB);
      mix(this.tmpB, SH.weave0, easeInOut(sub(p, T.toLoom[0] + 0.005, T.toLoom[1])), out);
    } else if (p < T.weave[1]) {
      const w = easeInOut(seg(p, "weave"));
      out.look.set(LOOM_X - 0.5 * (1 - w), THREE.MathUtils.lerp(-0.86, 0, w), 0);
      const pull = Math.pow(w, 1.7);
      out.pos.set(
        out.look.x + THREE.MathUtils.lerp(-0.16, 0.08, w),
        out.look.y + THREE.MathUtils.lerp(0.1, 0.06, w),
        THREE.MathUtils.lerp(0.6, 3.45, pull),
      );
    } else if (p < T.toCloth[1]) {
      mix(SH.weave1, SH.cloth, easeInOut(seg(p, "toCloth")), out);
    } else if (p < T.cloth[1]) {
      mix(SH.cloth, SH.cloth, 0, out);
      out.pos.x += Math.sin(seg(p, "cloth") * Math.PI) * 0.35;
    } else if (p < T.toTable[1]) {
      mix(SH.cloth, SH.sew, easeInOut(seg(p, "toTable")), out);
    } else if (p < T.sew[1]) {
      mix(SH.sew, SH.sew, 0, out);
    } else if (p < T.fold[1]) {
      const f = seg(p, "fold");
      mix(SH.sew, SH.fold, easeInOut(sub(f, 0, 0.22)), this.tmpA);
      mix(this.tmpA, SH.ready0, easeInOut(sub(f, 0.8, 1)), out);
    } else {
      mix(SH.ready0, SH.ready1, easeInOut(seg(p, "ready")), out);
    }

    // breathe a little, lean towards the pointer, and step back on tall screens
    this.pointerSmooth.lerp(this.pointer, 0.05);
    const dir = this.tmpB.pos.copy(out.pos).sub(out.look).multiplyScalar(this.fit);
    const cam = this.camera;
    cam.position.copy(out.look).add(dir);
    const dist = dir.length();
    cam.position.x += this.pointerSmooth.x * 0.03 * dist + Math.sin(this.time * 0.3) * 0.006 * dist;
    cam.position.y += this.pointerSmooth.y * 0.02 * dist + Math.sin(this.time * 0.4) * 0.004 * dist;
    // on portrait screens, aim a little low so the subject sits above the captions
    this.aim.copy(out.look);
    if (this.portrait && p < T.fold[1]) this.aim.y -= dist * 0.16;
    cam.lookAt(this.aim);

    // the key light follows the action so shadows stay crisp
    this.key.position.copy(out.look).add(new THREE.Vector3(-2.6, 3.6, 2.8));
    this.key.target.position.copy(out.look);
    this.key.target.updateMatrixWorld();
  }
}
