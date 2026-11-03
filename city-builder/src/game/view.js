// Grafica 3D: harta, clădirile, mașinile, camera izometrică.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { N, ANIMALS } from './config.js';
import { animalGeometries, TINTS } from './animals.js';
import { GRASS, WATER, FOREST, ZONES } from './city.js';

const COL = {
  grass: [0x8fd14f, 0x89cc4a, 0x96d657], forest: 0x7cc444, water: 0x3fb6e8, road: 0x70757d, mark: 0xe9e4c8,
  R: 0xb5e8ad, H: 0x9fdcc8, C: 0xb3d4f3, I: 0xf0dd9a, park: 0x7fcc4a, base: 0x9b6b43, sand: 0xf3dc9c,
  lot: { R: 0x9ad85e, H: 0xd9d4ca, C: 0xe6e0d4, I: 0xcac3b6 }, paving: 0xe8dfcf, stone: 0xd9d2c5, edge: 0xf2c230, curb: 0xf3ebe2,
  trunk: 0x8a5a32, tree: [0x2f8f3a, 0x3a9a3a, 0x2a7e2e], leaf: [0x5cbf4a, 0x6ccf44, 0x4cb050, 0x82d04e],
  walls: [0xffd36b, 0xff9fb0, 0xc3a6f0, 0x8fcaf5, 0xffc89a, 0xa8e3b0, 0xfff6e6], roofs: [0x7e57c2, 0xe0453a, 0x2a9d8f, 0x2f6fd6, 0xf08a24, 0x5c6bc0],
  apt: [0xffcf73, 0xff9e9e, 0xb99cf0, 0x8fd0f5, 0xffb37a, 0x9ee0a8], plinth: [0x8a7f74, 0x6f7b86, 0x9a8470, 0x5d6670],
  awning: [0xf04e3e, 0x2f80ed, 0x3cbf5a, 0xffa726, 0xab47bc, 0x1cc1c1], office: [0xbfe3fb, 0xe3cfff, 0xffe0b0, 0xc3efd5],
  fence: 0xf7f3ea, pants: [0x2f3b52, 0x3b5b8c, 0x4a4a4a, 0x6b5a45, 0x1f2a37, 0x7c8c99], skins: [0xffffff, 0xeac7a6, 0xc4906c, 0x8d5f43],
  glass: [0x6fa8d8, 0x7fb6e0, 0x5d93c4, 0x8cc0e6], factory: [0xd9b77e, 0xc9a77a, 0xe0c08c], metal: 0x9aa0a6,
  bridge: 0xb9b2a4, pillar: 0x8d8678, abandoned: 0x8a8a8a, car: [0xc0392b, 0xf1f1f1, 0x2c3e50, 0x9aa3ab, 0x2e6fc4, 0x1d1d1f, 0xd35400, 0x27ae60, 0xe8c547],
  gravel: 0xb9a88e, sleeper: 0x7a5232, rail: 0xa7adb5,
  train: [0x2e7d32, 0xc62828, 0x1e3a8a, 0x3a3a3a], wagon: [0x1e4fa8, 0xc0392b, 0x2e8b57, 0xe0a030, 0x6a3d9a],
  blocks: [0xfff3e0, 0xffd9a0, 0xcfe8f7, 0xf7c9c9, 0xe0d4f5, 0xd5efd5], brick: [0xc0654a, 0xb5533c, 0xcf7a52],
  panels: [0xff8a65, 0x4fc3f7, 0xffd54f, 0x81c784, 0xba68c8],
  sidewalk: 0xe39b7b, garden: 0x6cbf4f, hedge: 0x2e7d32, path: 0xdccfae, soil: 0x7a5233, furrow: 0x5b3a20,
  flowers: [0xe53950, 0xffd23f, 0xff7eb6, 0xffffff, 0x9b5de5, 0xff8c42, 0x4d9de0],
  shirts: [0xe74c3c, 0x3498db, 0xf1c40f, 0x2ecc71, 0xffffff, 0x9b59b6, 0xe67e22, 0x1abc9c, 0x34495e, 0xff7eb6],
};

// colorează o geometrie (pentru piesele care nu își schimbă culoarea: geamuri, roți, faruri)
function paint(geo, hex) {
  const c = new THREE.Color(hex), n = geo.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) c.toArray(a, i * 3);
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return geo;
}
const boxAt = (w, h, l, x, y, z, hex = 0xffffff) => paint(new THREE.BoxGeometry(w, h, l).translate(x, y + h / 2, z), hex);
const wheels = (x, z, r) => [[-x, -z], [x, -z], [-x, z], [x, z]].map(([a, b]) =>
  paint(new THREE.CylinderGeometry(r, r, .028, 10).rotateZ(Math.PI / 2).translate(a, r, b), 0x161616));
const plain = geos => mergeGeometries(geos.map(g => { g.deleteAttribute('color'); return g; }));

// vehiculele: caroseria (colorată diferit la fiecare mașină) și detaliile (geamuri, roți, lumini)
function vehicleModels() {
  const glass = 0x26323f, light = 0xfff3c4, stop = 0xd0281e;
  const sedan = {
    body: plain([boxAt(.18, .06, .37, 0, .03, 0), boxAt(.15, .016, .17, 0, .142, -.015)]),
    detail: mergeGeometries([
      boxAt(.152, .052, .175, 0, .09, -.015, glass),
      boxAt(.172, .012, .375, 0, .028, 0, 0x2a2a2a),
      boxAt(.04, .02, .01, -.06, .065, .186, light), boxAt(.04, .02, .01, .06, .065, .186, light),
      boxAt(.04, .018, .01, -.06, .065, -.186, stop), boxAt(.04, .018, .01, .06, .065, -.186, stop),
      ...wheels(.085, .115, .034),
    ]),
  };
  const van = {
    body: plain([boxAt(.19, .145, .42, 0, .03, 0)]),
    detail: mergeGeometries([
      boxAt(.172, .05, .01, 0, .11, .211, glass),
      boxAt(.196, .036, .26, 0, .118, -.03, glass),
      boxAt(.182, .014, .424, 0, .028, 0, 0x2a2a2a),
      boxAt(.04, .02, .01, -.065, .07, .212, light), boxAt(.04, .02, .01, .065, .07, .212, light),
      boxAt(.04, .02, .01, -.065, .07, -.212, stop), boxAt(.04, .02, .01, .065, .07, -.212, stop),
      ...wheels(.09, .13, .036),
    ]),
  };
  return [sedan, van];
}

// trenul: o locomotivă cu aburi și vagoane de călători (fața spre +z)
function trainModels() {
  const dark = 0x2b2b2b, red = 0xc62828, gold = 0xd4a64a;
  const tube = (r, l, x, y, z, hex) => paint(new THREE.CylinderGeometry(r, r, l, 12).rotateX(Math.PI / 2).translate(x, y, z), hex);
  const wheel = (x, z, r, hex) => paint(new THREE.CylinderGeometry(r, r, .025, 12).rotateZ(Math.PI / 2).translate(x, r, z), hex);
  const wheelsAt = (zs, r, hex) => zs.flatMap(z => [wheel(-.095, z, r, hex), wheel(.095, z, r, hex)]);
  const loco = [
    plain([boxAt(.21, .17, .15, 0, .07, -.15), boxAt(.23, .02, .19, 0, .24, -.15)]),
    mergeGeometries([
      boxAt(.2, .03, .48, 0, .04, 0, dark),
      tube(.08, .3, 0, .15, .07, dark),
      tube(.084, .02, 0, .15, .13, gold), tube(.084, .02, 0, .15, .0, gold),
      paint(new THREE.CylinderGeometry(.032, .022, .09, 10).translate(0, .26, .17), dark),
      paint(new THREE.SphereGeometry(.035, 8, 6).translate(0, .225, .04), gold),
      boxAt(.17, .05, .04, 0, .04, .25, red),
      boxAt(.12, .06, .01, 0, .15, -.074, 0x26323f),
      boxAt(.04, .03, .01, 0, .14, .222, 0xfff3c4),
      ...wheelsAt([-.16, -.01, .13], .045, red),
    ]),
  ];
  const wagon = [
    plain([boxAt(.21, .15, .5, 0, .07, 0)]),
    mergeGeometries([
      boxAt(.2, .03, .5, 0, .045, 0, dark),
      boxAt(.23, .025, .52, 0, .22, 0, 0x3a3f47),
      boxAt(.215, .045, .4, 0, .13, 0, 0x26323f),
      boxAt(.04, .02, .08, 0, .05, .27, dark),
      ...wheelsAt([-.17, .17], .04, dark),
    ]),
  ];
  return { loco, wagon };
}

// elicea eolienei: trei pale în planul xy, axa spre +z
function rotorModel() {
  const parts = [0, 1, 2].map(k => new THREE.BoxGeometry(.05, .62, .015).translate(0, .33, 0).rotateZ(k * Math.PI * 2 / 3));
  return mergeGeometries([...parts, new THREE.SphereGeometry(.045, 8, 6)]);
}

// un om din trei straturi: tricoul și pantalonii au culoarea lor, pielea primește un ton diferit
function personModel() {
  const skin = 0xf1c7a5, noUv = g => { g.deleteAttribute('uv'); return g; };
  const head = paint(new THREE.SphereGeometry(.022, 8, 6).translate(0, .14, 0), skin);
  const hair = paint(new THREE.SphereGeometry(.023, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, .143, -.002), 0x3a2a1e);
  const detail = mergeGeometries([
    boxAt(.012, .045, .014, -.031, .072, 0, skin), boxAt(.012, .045, .014, .031, .072, 0, skin),
    boxAt(.019, .01, .026, -.012, 0, .003, 0x222222), boxAt(.019, .01, .026, .012, 0, .003, 0x222222),
    head, hair,
  ].map(noUv));
  return [
    plain([boxAt(.05, .057, .034, 0, .062, 0)]),
    plain([boxAt(.018, .055, .02, -.012, .008, 0), boxAt(.018, .055, .02, .012, .008, 0)]),
    detail,
  ];
}

// fațade cu ferestre: shaderul desenează ferestrele pe pereți, după mărimea fiecărei clădiri
function facadeMaterial({ floor, cell, winW, winH, base = 0, top = .04, shop = 0, line = 0 }) {
  const m = new THREE.MeshLambertMaterial();
  const f = n => n.toFixed(3);
  m.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLoc; varying vec2 vSize; varying float vSide;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vec3 sc = vec3(1.0);
        #ifdef USE_INSTANCING
          sc = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
        #endif
        bool zf = abs(objectNormal.z) > .5;
        vec3 lp = transformed * sc;
        vLoc = vec3(zf ? lp.x : lp.z, lp.y, 0.0);
        vSize = vec2(zf ? sc.x : sc.z, sc.y);
        vSide = abs(objectNormal.y) < .5 ? 1.0 : 0.0;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLoc; varying vec2 vSize; varying float vSide;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        if (vSide > .5) {
          float usable = max(vSize.x - .07, .01), h = vLoc.y;
          float cols = max(1.0, floor(usable / ${f(cell)}));
          float u = vLoc.x / usable * cols + cols * .5, fu = fract(u);
          float inside = step(0.0, u) * step(u, cols);
          float fv = fract((h - ${f(base)}) / ${f(floor)});
          float rows = step(${f(base)}, h) * step(h, vSize.y - ${f(top)});
          float win = inside * rows * step(abs(fu - .5), ${f(winW / 2)}) * step(abs(fv - .5), ${f(winH / 2)});
          float sill = inside * rows * step(abs(fu - .5), ${f(winW / 2 + .07)}) * step(abs(fv - .5 + ${f(winH / 2 + .05)}), .05) * (1.0 - win);
          float vitrina = ${f(shop)} > 0.0 ? step(.03, h) * step(h, ${f(shop)}) * inside * step(abs(fu - .5), .44) : 0.0;
          win = max(win, vitrina);
          vec3 glass = mix(vec3(.16, .27, .42), vec3(.66, .84, .95), clamp(fv * .8 + (1.0 - fu) * .35 - .1, 0.0, 1.0));
          diffuseColor.rgb *= 1.0 - ${f(line * .22)} * rows * step(fv, .06); // linia dintre etaje
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * .8, sill);
          diffuseColor.rgb = mix(diffuseColor.rgb, glass, win);
        }`);
  };
  return m;
}

const pick = (arr, v) => arr[v % arr.length];

function hash(i, k) {
  let h = Math.imul(i + 1, 0x9e3779b1) ^ Math.imul(k + 7, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// mulțime de obiecte identice desenate într-un singur apel (InstancedMesh)
class Pool {
  constructor(scene, geo, max, { shadow = true, material } = {}) {
    this.mesh = new THREE.InstancedMesh(geo, material || new THREE.MeshLambertMaterial(), max);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
    this.mesh.count = 0;
    this.mesh.castShadow = shadow;
    this.mesh.receiveShadow = true;
    this.mesh.frustumCulled = false;
    this.max = max; this.n = 0;
    scene.add(this.mesh);
  }
  add(m, c) {
    if (this.n >= this.max) return;
    this.mesh.setMatrixAt(this.n, m);
    this.mesh.setColorAt(this.n, c);
    this.n++;
  }
  commit() {
    this.mesh.count = this.n;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.instanceColor.needsUpdate = true;
  }
}

const PITCH = Math.atan(1 / Math.SQRT2); // unghiul izometric clasic (~35°)
const VIEW = 30; // câte unități se văd pe verticală la zoom 1
const MAX_CARS = 180, MAX_PEOPLE = 260, MAX_TRAINS = 6;
const ROADISH = new Set(['road', 'crossing']), RAILISH = new Set(['rail', 'crossing']);
const rnd = arr => arr[Math.random() * 1000 % arr.length | 0];

export class CityView {
  constructor(mount) {
    this.mount = mount;
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.canvas = this.renderer.domElement;
    mount.appendChild(this.canvas);

    const scene = this.scene = new THREE.Scene();
    scene.background = new THREE.Color(0x9fd3f5);
    scene.add(new THREE.HemisphereLight(0xf2f8ff, 0x7a9a55, 2.0));
    this.sun = new THREE.DirectionalLight(0xfff0d6, 2.3);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, { left: -36, right: 36, top: 36, bottom: -36, near: 1, far: 140 });
    this.sun.shadow.bias = -.0005;
    this.sun.shadow.normalBias = .03;
    scene.add(this.sun, this.sun.target);

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 400);
    this.target = new THREE.Vector3();
    this.zoom = 2.2;
    this.rot = 0;
    this.yaw = Math.PI / 4;

    const g = (geo) => geo.translate(0, .5, 0);
    this.geo = {
      box: g(new THREE.BoxGeometry(1, 1, 1)),
      pyr: g(new THREE.ConeGeometry(Math.SQRT1_2, 1, 4).rotateY(Math.PI / 4)),
      cyl: g(new THREE.CylinderGeometry(.5, .5, 1, 12)),
      cone: g(new THREE.ConeGeometry(.5, 1, 7)),
      ball: g(new THREE.SphereGeometry(.5, 10, 8)),
      // acoperiș în două ape: prismă triunghiulară, coama de-a lungul axei z
      arch: new THREE.CylinderGeometry(.5, .5, 1, 16, 1, true, 0, Math.PI).rotateZ(Math.PI / 2),
      torus: new THREE.TorusGeometry(.35, .15, 8, 18).rotateX(Math.PI / 2).translate(0, .15, 0),
      gable: new THREE.ExtrudeGeometry(new THREE.Shape([new THREE.Vector2(-.5, 0), new THREE.Vector2(.5, 0), new THREE.Vector2(0, 1)]),
        { depth: 1, bevelEnabled: false }).translate(0, 0, -.5),
    };
    const facade = (opts, max) => new Pool(scene, this.geo.box, max, { material: facadeMaterial(opts) });
    this.pools = {
      ground: new Pool(scene, this.geo.box, N * N, { shadow: false }),
      mark: new Pool(scene, this.geo.box, N * N * 12, { shadow: false }),
      box: new Pool(scene, this.geo.box, N * N * 14),
      gable: new Pool(scene, this.geo.gable, N * N * 3),
      house: facade({ floor: .2, cell: .14, winW: .48, winH: .48, base: .04, top: .03 }, N * N * 2),
      apt: facade({ floor: .2, cell: .14, winW: .55, winH: .55, base: .2, top: .06 }, N * N),
      block: facade({ floor: .2, cell: .13, winW: .56, winH: .52, base: .2, top: .06, line: 1 }, N * N * 2),
      shop: facade({ floor: .2, cell: .16, winW: .5, winH: .5, base: .24, top: .04, shop: .19 }, N * N),
      office: facade({ floor: .14, cell: .1, winW: .9, winH: .68, base: .12, top: .04 }, N * N * 3),
      factory: facade({ floor: .5, cell: .12, winW: .7, winH: .22, base: .05, top: .05 }, N * N),
      pyr: new Pool(scene, this.geo.pyr, N * N),
      cyl: new Pool(scene, this.geo.cyl, N * N * 6),
      cone: new Pool(scene, this.geo.cone, N * N * 6),
      flower: new Pool(scene, new THREE.IcosahedronGeometry(.5, 0).translate(0, .5, 0), N * N * 10),
      ball: new Pool(scene, this.geo.ball, N * N * 8),
      torus: new Pool(scene, this.geo.torus, N * N),
      arch: new Pool(scene, this.geo.arch, N * N, { material: new THREE.MeshLambertMaterial({ side: THREE.DoubleSide }) }),
      warn: new Pool(scene, new THREE.OctahedronGeometry(.16), N * N, { shadow: false, material: new THREE.MeshBasicMaterial() }),
    };
    this.cars = [];
    // mașini și oameni: pentru fiecare model, un strat colorat și un strat cu detalii
    const detailMat = () => new THREE.MeshLambertMaterial({ vertexColors: true });
    const layers = (geos, max) => geos.map(g => new Pool(scene, g, max, g.attributes.color ? { material: detailMat() } : {}));
    this.carModels = vehicleModels().map(m => layers([m.body, m.detail], MAX_CARS));
    this.personLayers = layers(personModel(), MAX_PEOPLE);
    this.people = [];
    const tm = trainModels();
    this.trainLayers = { loco: layers(tm.loco, MAX_TRAINS), wagon: layers(tm.wagon, MAX_TRAINS * 6) };
    this.trains = [];
    this.rotors = new Pool(scene, rotorModel(), 400);
    this.animalPools = Object.fromEntries(Object.entries(animalGeometries()).map(([id, geo]) =>
      [id, new Pool(scene, geo, 600, { material: new THREE.MeshLambertMaterial({ vertexColors: true }) })]));
    this.animals = new Map();
    this.ranchSpots = [];
    this.xAxis = new THREE.Vector3(1, 0, 0);
    this.turbines = [];
    this.spinQ = new THREE.Quaternion();
    this.zAxis = new THREE.Vector3(0, 0, 1);
    // panou solar înclinat spre soare
    this.pools.panel = new Pool(scene, new THREE.BoxGeometry(.4, .018, .26).rotateX(-.5).translate(0, .14, 0), N * N * 4);
    this.white = new THREE.Color(0xffffff);

    const base = new THREE.Mesh(new THREE.BoxGeometry(N + .4, 1.2, N + .4), new THREE.MeshLambertMaterial({ color: COL.base }));
    base.position.y = -.82;
    base.receiveShadow = true;
    scene.add(base);

    const prevMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: .5, depthWrite: false });
    this.preview = new Pool(scene, new THREE.BoxGeometry(1, .08, 1).translate(0, .04, 0), N * N, { shadow: false, material: prevMat });
    this.preview.mesh.renderOrder = 2;
    this.select = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1, .3, 1).translate(0, .15, 0)),
      new THREE.LineBasicMaterial({ color: 0xffffff }));
    this.select.visible = false;
    scene.add(this.select);

    this.m = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.c = new THREE.Color();
    this.v = new THREE.Vector3(); this.s = new THREE.Vector3(); this.up = new THREE.Vector3(0, 1, 0);
    this.ray = new THREE.Raycaster(); this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.resize();
  }

  resize() {
    const w = this.mount.clientWidth || innerWidth, h = this.mount.clientHeight || innerHeight;
    this.renderer.setSize(w, h);
    this.w = w; this.h = h;
    this.updateCamera();
  }

  updateCamera() {
    const cam = this.camera, h = VIEW / this.zoom, a = this.w / this.h;
    Object.assign(cam, { left: -h * a / 2, right: h * a / 2, top: h / 2, bottom: -h / 2 });
    cam.updateProjectionMatrix();
    const t = this.target, cp = Math.cos(PITCH);
    cam.position.set(t.x + Math.sin(this.yaw) * cp * 100, t.y + Math.sin(PITCH) * 100, t.z + Math.cos(this.yaw) * cp * 100);
    cam.lookAt(t);
    this.sun.position.set(t.x + 22, 40, t.z + 14);
    this.sun.target.position.copy(t);
  }

  // dx, dy în pixeli: harta urmărește degetul / mouse-ul
  pan(dx, dy) {
    const upp = VIEW / this.zoom / this.h, y = this.yaw;
    const rx = Math.cos(y), rz = -Math.sin(y), fx = -Math.sin(y), fz = -Math.cos(y), k = 1 / Math.sin(PITCH);
    this.target.x += -rx * dx * upp + fx * dy * upp * k;
    this.target.z += -rz * dx * upp + fz * dy * upp * k;
    const lim = N / 2;
    this.target.x = Math.max(-lim, Math.min(lim, this.target.x));
    this.target.z = Math.max(-lim, Math.min(lim, this.target.z));
    this.updateCamera();
  }

  zoomBy(f, cx, cy) {
    const before = cx != null && this.groundAt(cx, cy);
    this.zoom = Math.max(.45, Math.min(8, this.zoom * f));
    this.updateCamera();
    const after = before && this.groundAt(cx, cy);
    if (before && after) { this.target.x += before.x - after.x; this.target.z += before.z - after.z; this.updateCamera(); }
  }

  rotate(dir) { this.rot = (this.rot + dir + 4) % 4; }

  groundAt(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect();
    this.ray.setFromCamera({ x: ((clientX - r.left) / r.width) * 2 - 1, y: -((clientY - r.top) / r.height) * 2 + 1 }, this.camera);
    return this.ray.ray.intersectPlane(this.plane, new THREE.Vector3());
  }

  pickTile(clientX, clientY) {
    const p = this.groundAt(clientX, clientY);
    if (!p) return null;
    const x = Math.floor(p.x + N / 2), z = Math.floor(p.z + N / 2);
    return x >= 0 && z >= 0 && x < N && z < N ? { x, z } : null;
  }

  // ---------- construirea scenei din datele orașului ----------

  part(pool, x, y, z, sx, sy, sz, color, rot = 0) {
    this.q.setFromAxisAngle(this.up, rot);
    this.m.compose(this.v.set(x, y, z), this.q, this.s.set(sx, sy, sz));
    this.pools[pool].add(this.m, this.c.setHex(color));
  }

  tree(x, z, s, v, pine = false) {
    if (pine) {
      this.part('cyl', x, 0, z, .07 * s, .25 * s, .07 * s, COL.trunk);
      this.part('cone', x, .18 * s, z, .42 * s, .75 * s, .42 * s, pick(COL.tree, v));
      return;
    }
    // coroană pufoasă din trei bile
    const c = pick(COL.leaf, v);
    this.part('cyl', x, 0, z, .06 * s, .3 * s, .06 * s, COL.trunk);
    this.part('ball', x, .22 * s, z, .48 * s, .42 * s, .48 * s, c);
    this.part('ball', x + .1 * s, .4 * s, z - .06 * s, .3 * s, .26 * s, .3 * s, c);
    this.part('ball', x - .09 * s, .37 * s, z + .09 * s, .28 * s, .24 * s, .28 * s, c);
  }

  palm(x, z, s, v) {
    this.part('cyl', x, 0, z, .045 * s, .6 * s, .045 * s, 0xb08850);
    for (let j = 0; j < 6; j++) {
      const a = j / 6 * Math.PI * 2 + v;
      this.part('flower', x + Math.sin(a) * .15 * s, .55 * s, z + Math.cos(a) * .15 * s, .09 * s, .05 * s, .34 * s, j % 2 ? 0x3fa34d : 0x4fbf5a, a);
    }
    this.part('ball', x, .52 * s, z, .07 * s, .07 * s, .07 * s, 0x7a5232);
  }

  rebuild(city) {
    for (const p of Object.values(this.pools)) p.n = 0;
    const roads = [], rails = [];
    this.turbines = [];
    this.ranchSpots = [];
    let stations = 0;
    for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
      const i = z * N + x, t = city.terrain[i], k = city.kind[i], lvl = city.level[i], v = city.variant[i];
      const cx = x - N / 2 + .5, cz = z - N / 2 + .5;
      // pământul
      let gc = pick(COL.grass, v), top = 0;
      if (t === WATER) { gc = COL.water; top = -.2; }
      else if (ROADISH.has(k)) gc = COL.road;
      else if (ZONES.has(k)) gc = lvl ? COL.lot[k] : COL[k]; // zona goală își păstrează culoarea, ca s-o recunoști
      else if (k === 'park') gc = COL.park;
      else if (k === 'garden') gc = COL.garden;
      else if (k === 'farm') gc = COL.soil;
      else if (k === 'solar') gc = 0xcfc8b8;
      else if (k === 'ranch') gc = 0x9ad85e;
      else if (t === FOREST) gc = COL.forest;
      // plajă: iarba liberă de lângă apă devine nisip, uneori cu un palmier
      const shore = !k && t === GRASS && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) =>
        x + dx >= 0 && z + dz >= 0 && x + dx < N && z + dz < N && city.terrain[(z + dz) * N + x + dx] === WATER);
      if (shore) {
        gc = COL.sand;
        if (v % 5 === 0) this.palm(cx + (hash(i, 1) - .5) * .4, cz + (hash(i, 2) - .5) * .4, .8 + hash(i, 3) * .4, v);
      }
      this.part('ground', cx, top - .3, cz, 1, .3, 1, gc);

      if (t === FOREST && !k) {
        const n = 2 + (v % 2);
        for (let j = 0; j < n; j++) this.tree(cx + (hash(i, j) - .5) * .6, cz + (hash(i, j + 9) - .5) * .6, .8 + hash(i, j + 3) * .5, v + j, hash(i, j + 4) < .45);
      }
      if (ROADISH.has(k)) {
        roads.push([x, z]);
        const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        const isRoad = (a, b) => a >= 0 && b >= 0 && a < N && b < N && ROADISH.has(city.kind[b * N + a]);
        const links = nb.filter(([dx, dz]) => isRoad(x + dx, z + dz)).length;
        if (t === WATER) {
          // pod: tablier la nivelul drumurilor, pilon în apă, parapete pe marginile fără drum
          this.part('box', cx, -.06, cz, 1, .06, 1, COL.road);
          this.part('box', cx, -.1, cz, .96, .04, .96, COL.bridge);
          this.part('cyl', cx, -.2, cz, .2, .1, .2, COL.pillar);
          // două arce de oțel peste tot podul, cu tiranți până la tablier
          const { dx: ax, dz: az, idx, len } = this.bridgeSpan(city, x, z);
          const H = Math.min(1.3, .32 + len * .16), steel = 0xdfe4e9;
          for (const side of [-1, 1]) {
            const lx = az ? side * .45 : 0, lz = ax ? side * .45 : 0;
            for (let q = 0; q < 10; q++) {
              const a = -.5 + (q + .5) / 10, y = H * Math.sin(Math.PI * (idx + .5 + a) / len);
              this.part('box', cx + ax * a + lx, y - .025, cz + az * a + lz, ax ? .12 : .05, .05, az ? .12 : .05, steel);
              if (q % 3 === 1 && y > .06) this.part('cyl', cx + ax * a + lx, 0, cz + az * a + lz, .012, y - .03, .012, 0xa8b0b8);
            }
          }
          const yMid = H * Math.sin(Math.PI * (idx + .5) / len);
          if (yMid > H * .55) this.part('box', cx, yMid - .03, cz, az ? .92 : .045, .035, ax ? .92 : .045, steel);
        }
        let lamp = t !== WATER && v % 3 === 0;
        for (const [dx, dz] of nb) {
          if (!isRoad(x + dx, z + dz)) {
            if (t === WATER) { this.part('box', cx + dx * .47, 0, cz + dz * .47, dx ? .06 : 1, .14, dz ? .06 : 1, COL.bridge); continue; }
            // trotuar cu bordură, uneori un stâlp de iluminat
            this.part('mark', cx + dx * .41, 0, cz + dz * .41, dx ? .18 : 1, .025, dz ? .18 : 1, COL.sidewalk);
            this.part('mark', cx + dx * .325, 0, cz + dz * .325, dx ? .02 : 1, .032, dz ? .02 : 1, COL.curb);
            this.part('mark', cx + dx * .28, .002, cz + dz * .28, dx ? .018 : 1, .008, dz ? .018 : 1, COL.edge);
            const fx = cx + dx * .45, fz = cz + dz * .45, kind = (v >> 2) % 9;
            if (!lamp && kind === 1) { // bancă
              this.part('box', fx, .03, fz, dx ? .07 : .22, .02, dz ? .07 : .22, 0xa0623a);
              this.part('box', fx + dx * .03, .05, fz + dz * .03, dx ? .015 : .22, .05, dz ? .015 : .22, 0xa0623a);
            } else if (!lamp && kind === 3) { // coș de gunoi
              this.part('cyl', fx, .02, fz, .05, .07, .05, 0x2e9d55);
            } else if (!lamp && kind === 5) { // stație de autobuz
              for (const o of [-.14, .14]) this.part('cyl', fx + (dz ? o : 0), .02, fz + (dx ? o : 0), .015, .2, .015, 0xdddddd);
              this.part('box', fx, .22, fz, dx ? .12 : .34, .02, dz ? .12 : .34, 0x2f80ed);
              this.part('box', fx + dx * .05, .05, fz + dz * .05, dx ? .01 : .3, .15, dz ? .01 : .3, 0xbfe6ff);
              this.part('box', fx, .03, fz, dx ? .05 : .24, .02, dz ? .05 : .24, 0x7a7a7a);
            } else if (!lamp && kind === 7 && v % 2) { // copac pe trotuar
              this.tree(fx, fz, .45, v);
            }
            if (lamp) {
              lamp = false;
              const lx = cx + dx * .45, lz = cz + dz * .45;
              this.part('cyl', lx, 0, lz, .022, .38, .022, 0x4a4f57);
              this.part('box', lx - dx * .05, .37, lz - dz * .05, dx ? .12 : .03, .02, dz ? .12 : .03, 0x4a4f57);
              this.part('flower', lx - dx * .09, .345, lz - dz * .09, .035, .03, .035, 0xfff1b0);
            }
            continue;
          }
          if (links >= 3) {
            // trecere de pietoni pe fiecare braț al intersecției
            for (let q = -2; q <= 2; q++) {
              const o = q * .12;
              this.part('mark', cx + dx * .36 + (dz ? o : 0), .002, cz + dz * .36 + (dx ? o : 0), dx ? .12 : .06, .008, dz ? .12 : .06, 0xf7f7f7);
            }
          } else {
            for (const o of [.12, .37]) this.part('mark', cx + dx * o, .002, cz + dz * o, dx ? .14 : .035, .008, dz ? .14 : .035, 0xf4f1e4);
          }
        }
      }
      if (RAILISH.has(k)) {
        rails.push([x, z]);
        const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        const isRail = (a, b) => a >= 0 && b >= 0 && a < N && b < N && RAILISH.has(city.kind[b * N + a]);
        let arms = dirs.filter(([dx, dz]) => isRail(x + dx, z + dz));
        if (arms.length === 1) arms.push([-arms[0][0], -arms[0][1]]);
        if (!arms.length) arms = [[1, 0], [-1, 0]];
        if (t === WATER) { // pod de cale ferată
          this.part('box', cx, -.06, cz, 1, .06, 1, COL.bridge);
          this.part('cyl', cx, -.2, cz, .2, .14, .2, COL.pillar);
          for (const [dx, dz] of dirs) if (!arms.some(([a, b]) => a === dx && b === dz))
            this.part('box', cx + dx * .47, 0, cz + dz * .47, dx ? .05 : 1, .1, dz ? .05 : 1, 0x8b2f2a);
        }
        const bed = k === 'rail';
        for (const [dx, dz] of arms) {
          if (bed) { // pietriș și traverse de lemn
            this.part('mark', cx + dx * .25, 0, cz + dz * .25, dx ? .5 : .36, .02, dz ? .5 : .36, COL.gravel);
            for (const o of [.04, .2, .36]) this.part('box', cx + dx * o, .02, cz + dz * o, dx ? .06 : .3, .016, dz ? .3 : .06, COL.sleeper);
          }
          for (const q of [-.075, .075]) this.part('box', cx + dx * .25 + (dz ? q : 0), bed ? .036 : .001, cz + dz * .25 + (dx ? q : 0),
            dx ? .5 : .022, bed ? .02 : .012, dz ? .5 : .022, bed ? COL.rail : 0x55595f);
        }
        if (k === 'crossing') for (const q of [-1, 1]) { // indicatoare cu cruce roșie
          this.part('cyl', cx + q * .42, 0, cz + q * .42, .018, .24, .018, 0xffffff);
          this.part('box', cx + q * .42, .22, cz + q * .42, .12, .03, .02, 0xe53935);
        }
      }
      if (k === 'station') stations++;
      const h = k && !ROADISH.has(k) && !RAILISH.has(k) ? this.building(k, lvl, v, cx, cz, i, this.facing(city, x, z, v, k === 'station' ? RAILISH : ROADISH)) : 0;
      // semn de avertizare deasupra zonelor cu probleme: gri = fără drum, galben = fără curent, albastru = fără apă
      if (ZONES.has(k)) {
        const warn = !city.road[i] ? 0x9e9e9e : !city.powered[i] ? 0xffd21f : !city.watered[i] && lvl >= 1 ? 0x3fa9ff : 0;
        if (warn) this.part('warn', cx, h + .45, cz, 1, 1, 1, warn);
      }
    }
    for (const p of Object.values(this.pools)) p.commit();
    this.roads = roads;
    this.roadSet = new Set(roads.map(([x, z]) => z * N + x));
    this.rails = rails;
    this.railSet = new Set(rails.map(([x, z]) => z * N + x));
    this.stations = stations;
    this.syncAnimals();
  }

  // un pod: în ce direcție merge și al câtelea pătrățel e din lungimea lui
  bridgeSpan(city, x, z) {
    const at = (a, b) => a >= 0 && b >= 0 && a < N && b < N;
    const road = (a, b) => at(a, b) && ROADISH.has(city.kind[b * N + a]);
    const deck = (a, b) => road(a, b) && city.terrain[b * N + a] === WATER;
    const alongX = road(x - 1, z) || road(x + 1, z) || !(road(x, z - 1) || road(x, z + 1));
    const [dx, dz] = alongX ? [1, 0] : [0, 1];
    let s = 0, e = 0;
    while (deck(x - dx * (s + 1), z - dz * (s + 1))) s++;
    while (deck(x + dx * (e + 1), z + dz * (e + 1))) e++;
    return { dx, dz, idx: s, len: s + e + 1 };
  }

  // animalele rămân pe loc când se reconstruiește harta; se schimbă doar dacă ferma primește alt fel de animale
  syncAnimals() {
    const next = new Map();
    for (const spot of this.ranchSpots) {
      const old = this.animals.get(spot.i);
      if (old && old.type === spot.type) { old.spot = spot; next.set(spot.i, old); continue; }
      const a = ANIMALS[spot.type], tints = TINTS[a.id], list = [];
      for (let j = 0; j < a.count; j++) {
        const lx = -.34 + Math.random() * .68, lz = .07 + Math.random() * .3;
        list.push({ lx, lz, tx: lx, tz: lz, yaw: Math.random() * 6.3, wait: Math.random() * 3, phase: Math.random() * 6, tint: pick(tints, j + spot.v) });
      }
      next.set(spot.i, { type: spot.type, spot, list });
    }
    this.animals = next;
  }

  // animalele se plimbă prin țarc și se opresc; păsările ciugulesc
  updateAnimals(dt) {
    for (const p of Object.values(this.animalPools)) p.n = 0;
    for (const { type, spot, list } of this.animals.values()) {
      const a = ANIMALS[type], pool = this.animalPools[a.id], speed = a.bird ? .07 : a.id === 'horse' ? .08 : .035;
      for (const an of list) {
        const walking = an.wait <= 0;
        if (!walking) an.wait -= dt;
        else {
          const dx = an.tx - an.lx, dz = an.tz - an.lz, d = Math.hypot(dx, dz);
          if (d < .01) {
            an.wait = 1 + Math.random() * (a.bird ? 2.5 : 5);
            an.tx = -.34 + Math.random() * .68;
            an.tz = .07 + Math.random() * .3;
          } else {
            const step = Math.min(d, speed * dt);
            an.lx += dx / d * step;
            an.lz += dz / d * step;
            let t = Math.atan2(dx, dz) - an.yaw;
            t = Math.atan2(Math.sin(t), Math.cos(t));
            an.yaw += t * Math.min(1, dt * 5);
          }
        }
        an.phase += dt;
        const y = walking ? Math.abs(Math.sin(an.phase * (a.bird ? 14 : 8))) * (a.bird ? .006 : .004) : 0;
        const wx = spot.cx + an.lx * spot.cs + an.lz * spot.sn, wz = spot.cz - an.lx * spot.sn + an.lz * spot.cs;
        this.q.setFromAxisAngle(this.up, an.yaw + spot.r);
        if (a.bird && !walking) this.q.multiply(this.spinQ.setFromAxisAngle(this.xAxis, Math.max(0, Math.sin(an.phase * 3)) * .5));
        this.m.compose(this.v.set(wx, y, wz), this.q, this.s.set(1, 1, 1));
        pool.add(this.m, this.c.setHex(an.tint));
      }
    }
    for (const p of Object.values(this.animalPools)) p.commit();
  }

  // clădirile se întorc cu fața spre un drum vecin
  facing(city, x, z, v, want = ROADISH) {
    const dirs = [[0, 1, 0], [1, 0, Math.PI / 2], [0, -1, Math.PI], [-1, 0, -Math.PI / 2]];
    for (let j = 0; j < 4; j++) {
      const [dx, dz, r] = dirs[(v + j) % 4], a = x + dx, b = z + dz;
      if (a >= 0 && b >= 0 && a < N && b < N && want.has(city.kind[b * N + a])) return r;
    }
    return (v % 4) * Math.PI / 2;
  }

  // fiecare magazin are pe acoperiș un obiect mare care arată ce vinde
  shopProp(P, v, y, z, aw) {
    const theme = (v >> 1) % 6;
    if (theme === 0) { // burgeri
      P('cyl', 0, y, z, .36, .07, .36, 0xe39a3b);
      P('cyl', 0, y + .07, z, .4, .025, .4, 0x6bbf3a);
      P('cyl', 0, y + .095, z, .37, .06, .37, 0x6b3a22);
      P('box', 0, y + .155, z, .33, .015, .33, 0xffd23f);
      P('ball', 0, y + .15, z, .38, .2, .38, 0xeea64a);
    } else if (theme === 1) { // fructe
      P('cyl', 0, y, z, .42, .09, .42, 0xc68a4a);
      [[-.08, -.05, 0xe53935], [.09, -.03, 0xffa31a], [0, .09, 0x8bc34a], [-.02, -.01, 0xffe14d]].forEach(([fx, fz, c], j) =>
        P('ball', fx, y + .06 + (j === 3 ? .08 : 0), z + fz, .15, .15, .15, c));
    } else if (theme === 2) { // flori
      for (let j = 0; j < 6; j++) {
        const a = j / 6 * Math.PI * 2;
        P('ball', Math.sin(a) * .13, y + .04, z + Math.cos(a) * .13, .17, .07, .17, 0xff7eb6);
      }
      P('ball', 0, y + .06, z, .13, .08, .13, 0xffd23f);
    } else if (theme === 3) { // înghețată
      P('cyl', 0, y, z, .15, .16, .15, 0xe0b070);
      P('ball', 0, y + .13, z, .22, .2, .22, 0xff9ec4);
      P('ball', 0, y + .28, z, .18, .17, .18, 0xa8e6cf);
      P('ball', 0, y + .43, z, .06, .06, .06, 0xe53935);
    } else if (theme === 4) { // gogoși
      P('torus', 0, y, z, .55, .55, .55, 0xe8b070);
      P('torus', 0, y + .04, z, .53, .4, .53, 0xff8fc2);
    } else { // firmă simplă
      P('box', 0, y, z + .26, .44, .12, .03, 0xffffff);
      P('box', 0, y + .02, z + .276, .38, .08, .01, aw);
    }
  }

  // r = rotația clădirii; fața (ușa) e spre +z înainte de rotire
  building(k, lvl, v, cx, cz, i, r) {
    const cs = Math.cos(r), sn = Math.sin(r);
    const P = (pool, dx, y, dz, sx, sy, sz, col) => this.part(pool, cx + dx * cs + dz * sn, y, cz - dx * sn + dz * cs, sx, sy, sz, col, r);
    const roof = pick(COL.roofs, v >> 2);
    const yard = () => { // gard alb în jurul curții, cu poartă spre drum
      for (const sx of [-1, 1]) P('box', sx * .46, 0, 0, .025, .07, .94, COL.fence);
      P('box', 0, 0, -.46, .94, .07, .025, COL.fence);
      for (const sx of [-1, 1]) P('box', sx * .29, 0, .46, .36, .07, .025, COL.fence);
    };
    if (k === 'R') {
      if (!lvl) return 0;
      if (lvl === 1) {
        const wall = pick(COL.walls, v), style = (v >> 3) % 3;
        yard();
        P('box', 0, 0, .3, .1, .008, .34, COL.path);
        P('house', 0, 0, -.1, .5, .28, .4, wall);
        P(style === 1 ? 'pyr' : 'gable', 0, .28, -.1, .62, .2, .52, roof);
        P('box', .14, .3, -.2, .06, .16, .06, 0x9c6b52);
        P('box', 0, 0, .105, .09, .17, .012, 0x7a4b2e);
        P('box', 0, 0, .13, .16, .02, .05, 0xd8d0c0);
        if (style === 0) { // piscină
          P('box', .26, 0, .28, .3, .01, .28, 0xf4f4f4);
          P('box', .26, .002, .28, .24, .012, .22, 0x48b4e8);
        } else {
          P('flower', .28, 0, .28, .14, .12, .14, 0x3f9d3f);
          this.tree(cx + (.3 * cs + -.32 * sn), cz + (-.3 * sn + -.32 * cs), .5, v);
        }
        P('flower', -.28, 0, .26, .13, .11, .13, 0x4caf50);
        P('flower', -.2, 0, .36, .07, .06, .07, pick(COL.flowers, v));
        return .6;
      }
      if (lvl === 2) {
        const wall = pick(COL.walls, v + 2);
        yard();
        P('box', -.06, 0, .32, .1, .008, .3, COL.path);
        P('house', -.06, 0, -.1, .56, .46, .42, wall);
        P(v % 2 ? 'gable' : 'pyr', -.06, .46, -.1, .68, .22, .52, roof);
        P('house', .3, 0, .0, .24, .24, .3, wall);
        P('box', .3, .24, .0, .28, .03, .34, roof);
        P('box', -.06, .21, .16, .34, .02, .12, 0xf2f2f2);
        P('box', -.06, .23, .215, .34, .05, .01, 0xffffff);
        for (const px of [-.2, .08]) P('cyl', px, 0, .2, .025, .21, .025, 0xffffff);
        P('box', -.06, 0, .115, .1, .17, .012, 0x6b4430);
        P('box', -.22, .48, -.2, .06, .14, .06, 0x9c6b52);
        P('flower', .3, 0, .3, .13, .1, .13, 0x3f9d3f);
        P('flower', -.33, 0, .3, .12, .1, .12, 0x4caf50);
        return 1;
      }
      const floors = 5 + (v % 4), hh = .2 + floors * .2 + .06;
      P('apt', 0, 0, -.02, .74, hh, .62, pick(COL.apt, v));
      P('box', 0, 0, -.02, .76, .2, .64, pick(COL.plinth, v));
      P('box', 0, 0, .3, .16, .16, .02, 0x34495e);
      P('box', 0, .17, .34, .28, .02, .1, 0xdfe3e6);
      const balc = v % 2 ? [-.19, .19] : [0];
      for (let f = 0; f < floors; f++) for (const bx of balc) P('box', bx, .2 + f * .2, .325, balc.length > 1 ? .26 : .4, .07, .07, 0xf6f6f6);
      P('box', 0, hh, -.02, .76, .04, .64, 0xdcd6cc);
      P('box', .2, hh + .04, -.15, .16, .1, .14, COL.metal);
      if (v % 3 === 0) P('box', -.15, hh + .04, -.05, .32, .03, .34, 0x5fae4a);
      return hh + .2;
    }
    if (k === 'H') {
      if (!lvl) return 0;
      // blocuri cu etaje: 4–6, 8–10 sau 14–16 etaje, în trei stiluri
      const floors = [0, 4, 8, 14][lvl] + (v % 3), hh = .2 + floors * .2 + .06, style = (v >> 2) % 3;
      if (style === 0) { // bloc lung cu balcoane colorate pe toată fațada
        P('block', 0, 0, -.04, .88, hh, .56, pick(COL.blocks, v));
        P('box', 0, 0, -.04, .9, .2, .58, pick(COL.plinth, v));
        for (let f = 0; f < floors; f++) for (const bx of [-.27, 0, .27]) {
          P('box', bx, .2 + f * .2, .27, .22, .025, .1, 0xf2f2f2);
          P('box', bx, .225 + f * .2, .315, .22, .06, .01, pick(COL.panels, v + (bx > 0 ? 2 : bx < 0 ? 1 : 0)));
        }
        P('box', 0, 0, .25, .18, .17, .02, 0x34495e);
        P('box', 0, .17, .3, .3, .02, .12, 0xdfe3e6);
        P('box', 0, hh, -.04, .92, .04, .6, 0xdcd6cc);
        P('box', -.25, hh + .04, -.1, .18, .16, .18, 0xcfc8bc); // casa liftului
        P('box', .25, hh + .04, -.1, .14, .08, .12, COL.metal);
      } else if (style === 1) { // turn modern cu plăci ieșite la fiecare etaj
        const c = pick(COL.blocks, v + 2);
        P('block', 0, 0, 0, .62, hh, .62, c);
        P('box', 0, 0, 0, .66, .2, .66, 0x3d4b5c);
        for (let f = 1; f <= floors; f++) P('box', 0, .2 * f, 0, .72, .022, .72, 0xf7f7f7);
        for (const q of [-1, 1]) P('box', q * .33, .2, q * .33, .02, hh - .26, .02, 0xffffff); // colțuri
        P('box', 0, hh, 0, .7, .04, .7, 0xe8e8e8);
        P('box', 0, hh + .04, 0, .4, .03, .4, 0x5fae4a); // grădină pe acoperiș
        P('cyl', .2, hh + .04, -.2, .02, .3, .02, COL.metal);
      } else { // bloc din cărămidă cu casa scării din sticlă
        P('block', 0, 0, -.03, .82, hh, .54, pick(COL.brick, v));
        P('box', 0, 0, -.03, .84, .2, .56, 0x8a7f74);
        for (let f = 1; f <= floors; f++) P('box', 0, .2 * f, -.03, .84, .02, .56, 0xf1ebe1);
        P('box', 0, .2, .245, .14, hh - .26, .02, 0x6fa8d8);
        for (let f = 0; f < floors; f++) for (const bx of [-.26, .26]) P('box', bx, .2 + f * .2, .27, .2, .07, .07, 0xf6f6f6);
        P('box', 0, 0, .25, .14, .17, .02, 0x5a3a2e);
        P('box', 0, hh, -.03, .86, .04, .58, 0x6b4f3f);
        P('box', 0, hh + .04, -.03, .2, .14, .2, 0x8a6a5a);
      }
      // copaci și bănci în fața blocului
      if (v % 2) this.tree(cx + (.38 * cs + .38 * sn), cz + (-.38 * sn + .38 * cs), .45, v);
      return hh + .3;
    }
    if (k === 'C') {
      if (!lvl) return 0;
      if (lvl === 1) {
        const aw = pick(COL.awning, v);
        P('shop', 0, 0, -.06, .8, .42, .6, pick(COL.walls, v + 1));
        P('box', 0, .19, .3, .8, .025, .14, aw);
        P('box', 0, .16, .37, .8, .035, .01, aw);
        P('box', 0, .42, -.06, .86, .04, .66, aw);
        this.shopProp(P, v, .46, -.08, aw);
        if (v % 2) for (const sx of [-.25, .25]) {
          P('cyl', sx, 0, .42, .012, .17, .012, COL.metal);
          P('cone', sx, .14, .42, .17, .06, .17, pick(COL.awning, v + 1));
          P('cyl', sx, 0, .42, .07, .06, .07, 0xffffff);
        }
        return .65;
      }
      if (lvl === 2) {
        const hh = 1.1 + (v % 3) * .2;
        P('office', 0, 0, 0, .74, hh, .7, pick(COL.office, v));
        P('box', 0, 0, 0, .77, .12, .73, 0x3d4b5c);
        P('box', 0, .13, .4, .34, .02, .1, 0xf2f2f2);
        P('box', 0, hh, 0, .78, .04, .74, 0xdfe6ec);
        P('box', .1, hh + .04, -.05, .3, .12, .3, COL.metal);
        return hh + .3;
      }
      const hh = 2.2 + (v % 5) * .35, c = pick(COL.office, v + 1);
      P('office', 0, 0, 0, .9, .45, .9, 0xeef1f3);
      P('box', 0, .45, 0, .92, .03, .92, 0xd5dbe0);
      P('office', 0, .48, 0, .62, hh, .62, c);
      P('office', 0, .48 + hh, 0, .46, .35, .46, c);
      P('box', 0, .83 + hh, 0, .5, .03, .5, 0xdfe6ec);
      P('cyl', 0, .86 + hh, 0, .03, .5, .03, COL.metal);
      return hh + 1.4;
    }
    if (k === 'I') {
      if (!lvl) return 0;
      const fc = pick(COL.factory, v), h = .3 + lvl * .1;
      P('factory', -.05, 0, 0, .8, h, .84, fc);
      for (let j = 0; j < 3; j++) P('gable', -.32 + j * .27, h, 0, .27, .13, .84, j % 2 ? 0x8a9aa8 : 0x9fb0be);
      P('box', -.05, 0, .425, .22, .18, .01, 0x5c5c5c);
      for (let j = 0; j < Math.min(lvl, 2); j++) {
        const z = -.28 + j * .32, ch = .9 + lvl * .25;
        P('cyl', .33, 0, z, .1, ch, .1, 0xcfcfcf);
        P('cyl', .33, ch - .2, z, .105, .08, .105, 0xd0392b);
      }
      if (lvl === 3) {
        P('cyl', .3, 0, .3, .24, .38, .24, COL.metal);
        P('ball', .3, .28, .3, .24, .2, .24, COL.metal);
      }
      return 1 + lvl * .25;
    }
    if (k === 'power') {
      this.part('box', cx, 0, cz, .9, .45, .9, 0xb8bcc2);
      this.part('cyl', cx - .2, 0, cz - .15, .36, 1.1, .36, 0xd8d8d8);
      this.part('cyl', cx + .22, 0, cz + .18, .3, .95, .3, 0xd0d0d0);
      this.part('box', cx + .3, .45, cz - .3, .12, .3, .12, 0xf2c94c);
      return 1.2;
    }
    if (k === 'water') {
      for (const [dx, dz] of [[-.18, -.18], [.18, -.18], [-.18, .18], [.18, .18]]) this.part('cyl', cx + dx, 0, cz + dz, .05, .7, .05, COL.metal);
      this.part('cyl', cx, .7, cz, .62, .45, .62, 0x7ec8f2);
      this.part('pyr', cx, 1.15, cz, .6, .2, .6, 0x5ea3cc);
      return 1.4;
    }
    if (k === 'park') {
      this.part('box', cx, 0, cz, .22, .01, 1, COL.paving);
      this.part('box', cx, 0, cz, 1, .01, .22, COL.paving);
      if (v % 2) { // fântână
        this.part('cyl', cx, 0, cz, .5, .07, .5, COL.stone);
        this.part('cyl', cx, .01, cz, .42, .065, .42, 0x4fc3f7);
        this.part('cyl', cx, 0, cz, .07, .24, .07, COL.stone);
        this.part('cyl', cx, .22, cz, .2, .04, .2, COL.stone);
        this.part('ball', cx, .24, cz, .14, .1, .14, 0x9be3ff);
      } else { // statuie
        this.part('box', cx, 0, cz, .2, .16, .2, COL.stone);
        this.part('cyl', cx, .16, cz, .05, .14, .05, 0xd4a64a);
        this.part('ball', cx, .29, cz, .07, .07, .07, 0xd4a64a);
      }
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) this.tree(cx + sx * .32, cz + sz * .32, .55 + hash(i, sx + sz * 3) * .2, v + sx + sz);
      this.part('box', cx + .22, 0, cz - .14, .16, .04, .05, 0xa0623a);
      return .7;
    }
    if (k === 'garden') {
      // gard viu pe margini, alee în mijloc, straturi cu flori mari: lalele, margarete, trandafiri, floarea-soarelui
      const along = v % 2, w = (a, b) => along ? [b, a] : [a, b];
      for (const s of [-1, 1]) {
        const [hx, hz] = w(s * .45, 0), [sx, sz] = w(.08, .96);
        this.part('box', cx + hx, 0, cz + hz, sx, .1, sz, COL.hedge);
      }
      const [px, pz] = w(.16, 1);
      this.part('box', cx, 0, cz, px, .012, pz, COL.path);
      for (const s of [-1, 1]) for (let j = 0; j < 4; j++) for (let q = 0; q < 2; q++) {
        const [fx, fz] = w(s * (.17 + q * .12), -.34 + j * .225), x = cx + fx, z = cz + fz;
        const n = v + j * 3 + q * 7 + (s > 0 ? 11 : 0), type = n % 4, col = pick(COL.flowers, n >> 2);
        this.part('ball', x, 0, z, .1, .04, .1, 0x3f9d3f); // frunze
        if (type === 3) { // floarea-soarelui
          this.part('cyl', x, 0, z, .014, .26, .014, 0x4a8f3a);
          this.part('ball', x, .25, z, .13, .035, .13, 0xffc928);
          this.part('ball', x, .265, z, .055, .025, .055, 0x6b3a1e);
          continue;
        }
        this.part('cyl', x, 0, z, .012, .14, .012, 0x4a8f3a);
        if (type === 0) { // lalea
          this.part('ball', x, .12, z, .07, .1, .07, col);
        } else if (type === 1) { // margaretă
          this.part('ball', x, .13, z, .11, .03, .11, n % 3 ? 0xffffff : 0xffb3d1);
          this.part('ball', x, .14, z, .04, .03, .04, 0xffd23f);
        } else { // tufă de trandafiri
          this.part('ball', x, .04, z, .12, .12, .12, 0x2f8a3a);
          for (let r = 0; r < 3; r++) this.part('ball', x + (r - 1) * .035, .12 + (r % 2) * .02, z + (r === 1 ? .03 : -.02), .045, .045, .045, col);
        }
      }
      if (v % 3 === 0) { // bancă
        const [bx, bz] = w(0, .3), [bw, bl] = w(.16, .06);
        this.part('box', cx + bx, 0, cz + bz, bw, .05, bl, 0x8d6e4c);
      }
      return .4;
    }
    if (k === 'farm') {
      // trei brazde cu câte trei plante mari; cresc cu nivelul (0 = semințe, 3 = gata de cules)
      const crop = v % 6, s = [0, .5, .78, 1][lvl], along = (v >> 3) % 2, ripe = lvl === 3;
      for (let row = 0; row < 3; row++) {
        const o = -.3 + row * .3;
        this.part('box', cx + (along ? 0 : o), 0, cz + (along ? o : 0), along ? .92 : .2, .04, along ? .2 : .92, COL.furrow);
        if (!lvl) continue;
        for (let j = 0; j < 3; j++) {
          const a = -.3 + j * .3, x = cx + (along ? a : o), z = cz + (along ? o : a), y = .035;
          if (crop === 0) { // varză: frunze desfăcute și căpățână
            for (let q = 0; q < 4; q++) {
              const an = q * Math.PI / 2 + v;
              this.part('ball', x + Math.sin(an) * .07 * s, y, z + Math.cos(an) * .07 * s, .16 * s, .06 * s, .16 * s, 0x6fb84a);
            }
            this.part('ball', x, y + .01, z, .2 * s, .17 * s, .2 * s, 0xb5e07a);
          } else if (crop === 1) { // morcovi: frunze înalte și „umerii” portocalii
            for (let q = 0; q < 3; q++) this.part('cone', x + (q - 1) * .035, y, z + (q === 1 ? .03 : -.02), .05 * s, .3 * s, .05 * s, 0x3d9b3a);
            this.part('ball', x, y - .02, z, .09 * s, .07 * s, .09 * s, 0xf07d1a);
          } else if (crop === 2) { // roșii pe araci
            this.part('cyl', x, y, z, .018, .46 * s, .018, 0x8d6e4c);
            this.part('ball', x, y + .08 * s, z, .2 * s, .3 * s, .2 * s, 0x3a8a34);
            if (lvl >= 2) for (let q = 0; q < 3; q++)
              this.part('ball', x + (q - 1) * .07 * s, y + (.16 + (q % 2) * .08) * s, z + .08 * s, .075, .07, .075, ripe ? 0xe0302a : 0x9ccc4a);
          } else if (crop === 3) { // dovleci mari între frunze
            for (let q = 0; q < 3; q++) this.part('ball', x + (q - 1) * .09 * s, y, z - .06 * s, .14 * s, .05, .14 * s, 0x4f9a3a);
            if (lvl >= 2) {
              this.part('ball', x + .02, y, z + .03, .24 * s, .16 * s, .24 * s, ripe ? 0xf28c1c : 0xb6c94a);
              this.part('cyl', x + .02, y + .15 * s, z + .03, .02, .04, .02, 0x4a7a2a);
            }
          } else if (crop === 4) { // porumb: tulpini înalte cu știuleți
            for (let q = 0; q < 2; q++) {
              const qx = x + (q ? .05 : -.05), qz = z + (q ? -.03 : .03);
              this.part('cyl', qx, y, qz, .025, .6 * s, .025, 0x6aa84f);
              this.part('cone', qx, y + .1 * s, qz, .12 * s, .35 * s, .12 * s, 0x5d9e46);
              this.part('cone', qx, y + .56 * s, qz, .04, .1 * s, .04, 0xd9c27a);
              if (lvl >= 2) this.part('cyl', qx + .03, y + .25 * s, qz, .045, .12 * s, .045, ripe ? 0xffd23f : 0xc8d97a);
            }
          } else { // vinete pe tufe
            this.part('ball', x, y, z, .24 * s, .22 * s, .24 * s, 0x2f6b34);
            if (lvl >= 2) for (let q = 0; q < 2; q++)
              this.part('ball', x + (q ? .07 : -.07) * s, y + .02, z + .09 * s, .07, .13 * s, .07, ripe ? 0x5b2a86 : 0x9a7ab8);
          }
        }
      }
      return .4;
    }
    if (k === 'station') {
      // gară din cărămidă, cu turn cu ceas și copertină arcuită din sticlă spre șine
      this.part('box', cx, 0, cz, .96, .03, .96, COL.paving, r);
      P('house', 0, 0, -.24, .74, .34, .36, 0xb5533c);
      P('box', 0, .34, -.24, .78, .04, .4, 0x5a3a2e);
      P('house', -.3, 0, -.26, .17, .64, .17, 0xa8452f);
      P('pyr', -.3, .64, -.26, .22, .16, .22, 0x4a5568);
      P('box', -.3, .5, -.17, .09, .09, .01, 0xffffff);
      P('arch', 0, .03, .17, .92, .4, .5, 0x4a7fd8);
      for (const ax of [-.45, -.15, .15, .45]) P('arch', ax, .03, .17, .03, .42, .52, 0x8b2f2a);
      P('box', 0, .03, .17, .92, .02, .5, 0xcfc6b8);
      return 1;
    }
    if (k === 'wind') {
      // toate eolienele privesc în aceeași direcție, spre vânt
      const yaw = .6, ys = Math.sin(yaw), yc = Math.cos(yaw);
      this.part('cyl', cx, 0, cz, .36, .03, .36, 0xb8d98a);
      this.part('cyl', cx, .03, cz, .065, 1.55, .065, 0xf4f6f8);
      this.part('box', cx - ys * .03, 1.55, cz - yc * .03, .1, .09, .2, 0xf4f6f8, yaw);
      this.part('box', cx - ys * .03, 1.58, cz - yc * .03, .102, .025, .12, 0x2f80ed, yaw);
      this.turbines.push({ x: cx + ys * .09, y: 1.595, z: cz + yc * .09, yaw, phase: v });
      return 1.9;
    }
    if (k === 'solar') {
      // două rânduri de panouri albastre pe picioare
      for (const [px, pz] of [[-.22, -.2], [.22, -.2], [-.22, .2], [.22, .2]]) {
        this.part('cyl', cx + px - .15, 0, cz + pz, .02, .12, .02, COL.metal);
        this.part('cyl', cx + px + .15, 0, cz + pz, .02, .12, .02, COL.metal);
        this.part('panel', cx + px, 0, cz + pz, 1, 1, 1, 0x2a56b8);
      }
      this.part('box', cx + .4, 0, cz, .08, .12, .1, 0xe8e8e8);
      return .5;
    }
    if (k === 'ranch') {
      // țarc de lemn; hambar pentru animale sau coteț pentru păsări; lac pentru rațe, noroi pentru porci
      const an = ANIMALS[lvl] || ANIMALS[0], fence = 0x8d5a3b;
      for (const q of [-1, 1]) {
        this.part('box', cx + q * .47, .03, cz, .025, .03, .95, fence);
        this.part('box', cx, .03, cz + q * .47, .95, .03, .025, fence);
        this.part('box', cx + q * .47, .08, cz, .025, .02, .95, fence);
        this.part('box', cx, .08, cz + q * .47, .95, .02, .025, fence);
      }
      if (an.bird) {
        P('box', -.2, 0, -.22, .34, .2, .28, 0xe9d7b5);
        P('gable', -.2, .2, -.22, .4, .14, .32, 0xc0392b);
        P('box', -.2, .03, -.075, .07, .08, .012, 0x5a3a2e);
        P('box', -.2, 0, -.03, .06, .02, .1, 0xa0784a);
        P('cyl', .08, 0, -.2, .06, .05, .06, 0xb0b8c0);
      } else {
        P('box', -.17, 0, -.18, .4, .3, .36, 0xc62f2a);
        P('gable', -.17, .3, -.18, .46, .18, .4, 0x6b3a2a);
        P('box', -.17, 0, .005, .2, .21, .012, 0xffffff);
        P('box', -.17, 0, .012, .16, .18, .01, 0x8b2420);
        P('box', -.17, .22, -.17, .09, .06, .38, 0xffffff);
        P('box', .32, 0, .0, .05, .04, .16, fence); // jgheab
      }
      P('cyl', .26, 0, -.26, .17, .5, .17, 0xd7dde3);
      P('ball', .26, .42, -.26, .17, .15, .17, 0x8f98a1);
      P('cyl', .06, 0, -.33, .1, .07, .1, 0xe8c547);
      if (an.id === 'duck') {
        P('cyl', .18, 0, .22, .36, .008, .3, 0xd9d2c5);
        P('cyl', .18, .002, .22, .32, .012, .26, 0x4fc3f7);
      } else if (an.id === 'pig') P('cyl', .18, 0, .24, .3, .008, .22, 0x7a5232);
      this.ranchSpots.push({ i, type: ANIMALS[lvl] ? lvl : 0, cx, cz, cs, sn, r, v });
      return .7;
    }
    if (k === 'police') {
      this.part('box', cx, 0, cz, .8, .55, .8, 0x3d62c4, r);
      this.part('box', cx, .55, cz, .82, .06, .82, 0xe8e8e8, r);
      this.part('box', cx - .1, .61, cz, .12, .1, .12, 0xe53935);
      this.part('box', cx + .1, .61, cz, .12, .1, .12, 0x1e88e5);
      return .8;
    }
    if (k === 'fire') {
      this.part('box', cx, 0, cz, .82, .6, .82, 0xc8382f, r);
      this.part('box', cx, 0, cz, .5, .38, .86, 0x3a2a26, r);
      this.part('box', cx, .6, cz, .84, .06, .84, 0xeeeeee, r);
      return .8;
    }
    if (k === 'school') {
      this.part('box', cx, 0, cz, .86, .5, .62, 0xe08a3c, r);
      this.part('pyr', cx, .5, cz, .9, .25, .66, 0x8c4a3a, r);
      this.part('cyl', cx + .35, 0, cz + .35, .03, 1, .03, COL.metal);
      this.part('box', cx + .43, .82, cz + .35, .16, .12, .02, 0xd62f2f);
      return 1;
    }
    return 0;
  }

  setPreview(items) {
    const p = this.preview;
    p.n = 0;
    for (const { x, z, ok } of items) {
      this.m.makeTranslation(x - N / 2 + .5, 0, z - N / 2 + .5);
      p.add(this.m, this.c.setHex(ok ? 0x4cff7a : 0xff4d4d));
    }
    p.commit();
  }

  setSelected(t) {
    this.select.visible = !!t;
    if (t) this.select.position.set(t.x - N / 2 + .5, 0, t.z - N / 2 + .5);
  }

  // ---------- mașini ----------

  // mașinile merg pe banda din dreapta, oamenii pe trotuar; amândouă trec din pătrățel în pătrățel de drum
  moveAlong(list, dt, target, make, lane) {
    const roads = this.roads || [], set = this.roadSet;
    const isRoad = (x, z) => x >= 0 && z >= 0 && x < N && z < N && set.has(z * N + x);
    const neighbors = (x, z) => [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dz]) => [x + dx, z + dz]).filter(([a, b]) => isRoad(a, b));
    const spawn = () => {
      const [x, z] = roads[Math.random() * roads.length | 0], nb = neighbors(x, z);
      if (!nb.length) return null;
      const to = nb[Math.random() * nb.length | 0];
      return { from: [x, z], to, t: Math.random(), yaw: Math.atan2(to[0] - x, to[1] - z), ...make() };
    };
    target = roads.length > 1 ? target : 0;
    for (let tries = 0; list.length < target && tries < 20; tries++) { const o = spawn(); if (o) list.push(o); }
    if (list.length > target) list.length = target;
    for (let k = 0; k < list.length; k++) {
      let o = list[k];
      if (!isRoad(...o.from) || !isRoad(...o.to)) { o = list[k] = spawn(); if (!o) { list.splice(k--, 1); continue; } }
      o.t += dt * o.speed;
      while (o.t >= 1) {
        o.t -= 1;
        const nb = neighbors(...o.to), fwd = nb.filter(([a, b]) => a !== o.from[0] || b !== o.from[1]);
        const opts = fwd.length ? fwd : nb;
        o.from = o.to;
        o.to = opts.length ? opts[Math.random() * opts.length | 0] : o.from;
      }
      const dx = o.to[0] - o.from[0], dz = o.to[1] - o.from[1], off = lane(o);
      o.x = o.from[0] + dx * o.t - N / 2 + .5 - dz * off;
      o.z = o.from[1] + dz * o.t - N / 2 + .5 + dx * off;
      // virează lin în loc să se întoarcă dintr-odată
      if (dx || dz) {
        let d = Math.atan2(dx, dz) - o.yaw;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        o.yaw += d * Math.min(1, dt * o.speed * 9);
      }
    }
  }

  draw(layers, o, y, colors, scale = 1) {
    this.q.setFromAxisAngle(this.up, o.yaw);
    this.m.compose(this.v.set(o.x, y, o.z), this.q, this.s.set(scale, scale, scale));
    layers.forEach((pool, j) => pool.add(this.m, colors[j] == null ? this.white : this.c.setHex(colors[j])));
  }

  updateTraffic(dt, cars, people) {
    const rnd = arr => pick(arr, Math.random() * 1000 | 0);
    this.moveAlong(this.cars, dt, Math.min(MAX_CARS, cars),
      () => ({ speed: .9 + Math.random() * .7, model: Math.random() < .2 ? 1 : 0, color: rnd(COL.car) }),
      () => .15);
    this.moveAlong(this.people, dt, Math.min(MAX_PEOPLE, people),
      () => ({ speed: .22 + Math.random() * .16, side: Math.random() < .5 ? 1 : -1, shirt: rnd(COL.shirts), pants: rnd(COL.pants), skin: rnd(COL.skins), step: Math.random() * 6 }),
      p => .42 * p.side);
    const all = [...this.carModels, this.personLayers].flat();
    for (const pool of all) pool.n = 0;
    for (const c of this.cars) this.draw(this.carModels[c.model], c, 0, [c.color, null]);
    for (const p of this.people) {
      p.step += dt * p.speed * 40;
      // pașii: omul se ridică puțin la fiecare pas
      this.draw(this.personLayers, p, .025 + Math.abs(Math.sin(p.step)) * .014, [p.shirt, p.pants, p.skin], 1.25);
    }
    for (const pool of all) pool.commit();
    this.updateTrains(dt);
  }

  // trenurile merg pe șine; la capăt de linie se întorc
  updateTrains(dt) {
    const set = this.railSet, rails = this.rails || [], SP = .6;
    const isRail = (x, z) => x >= 0 && z >= 0 && x < N && z < N && !!set?.has(z * N + x);
    const nbs = ([x, z]) => [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dz]) => [x + dx, z + dz]).filter(([a, b]) => isRail(a, b));
    const same = (a, b) => a[0] === b[0] && a[1] === b[1];
    const want = rails.length >= 3 ? Math.min(MAX_TRAINS, 1 + (this.stations || 0)) : 0;
    const spawn = () => {
      for (let tries = 0; tries < 10; tries++) {
        const a = rails[Math.random() * rails.length | 0], nb = nbs(a);
        if (nb.length) return { hist: [a, nb[0]], t: 0, speed: .7 + Math.random() * .3, wagons: 2 + (Math.random() * 3 | 0), color: rnd(COL.train), wcolor: rnd(COL.wagon), yaws: [] };
      }
      return null;
    };
    while (this.trains.length < want) { const tr = spawn(); if (!tr) break; this.trains.push(tr); }
    if (this.trains.length > want) this.trains.length = want;
    const pools = [...this.trainLayers.loco, ...this.trainLayers.wagon];
    for (const p of pools) p.n = 0;
    for (let k = 0; k < this.trains.length; k++) {
      let tr = this.trains[k];
      if (!tr.hist.slice(-2).every(([x, z]) => isRail(x, z))) { tr = this.trains[k] = spawn(); if (!tr) { this.trains.splice(k--, 1); continue; } }
      const B = tr.wagons * SP + .5;
      tr.t += dt * tr.speed;
      for (let guard = 0; tr.t >= 1 && guard < 4; guard++) {
        const h = tr.hist, cur = h[h.length - 1], prev = h[h.length - 2];
        const fwd = nbs(cur).filter(n => !same(n, prev));
        if (fwd.length) {
          const straight = fwd.find(n => n[0] - cur[0] === cur[0] - prev[0] && n[1] - cur[1] === cur[1] - prev[1]);
          h.push(straight && Math.random() < .75 ? straight : fwd[Math.random() * fwd.length | 0]);
          tr.t -= 1;
          if (h.length > Math.ceil(B) + 3) h.splice(0, h.length - Math.ceil(B) - 3);
        } else {
          // capăt de linie: ultimul vagon devine capul trenului
          const len = h.length, np = Math.min(len - 1, B);
          const n = Math.max(2, Math.min(len, Math.floor(np) + 2));
          tr.hist = h.slice().reverse().slice(0, n);
          tr.t = Math.min(np - (n - 2), .999);
          tr.yaws = [];
        }
      }
      if (tr.t >= 1) tr.t = .999;
      const h = tr.hist, p = h.length - 2 + tr.t;
      for (let c = 0; c <= tr.wagons; c++) {
        const q = Math.max(0, p - c * SP), i = Math.min(Math.floor(q), h.length - 2), f = q - i;
        const a = h[i], b = h[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], aim = Math.atan2(dx, dz);
        let yaw = tr.yaws[c] ?? aim, d = aim - yaw;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        yaw += d * Math.min(1, dt * 7);
        tr.yaws[c] = yaw;
        const o = { x: a[0] + dx * f - N / 2 + .5, z: a[1] + dz * f - N / 2 + .5, yaw };
        this.draw(c ? this.trainLayers.wagon : this.trainLayers.loco, o, .045, c ? [tr.wcolor, null] : [tr.color, null]);
      }
    }
    for (const p of pools) p.commit();
  }

  render(dt) {
    // rotirea camerei se face lin
    const want = Math.PI / 4 + this.rot * Math.PI / 2;
    let d = want - this.yaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    if (Math.abs(d) > .001) { this.yaw += d * Math.min(1, dt * 8); this.updateCamera(); }
    this.pools.warn.mesh.position.y = Math.sin(performance.now() / 300) * .06;
    this.updateAnimals(dt);
    const spin = performance.now() / 1000 * 2.4, p = this.rotors;
    p.n = 0;
    for (const t of this.turbines) {
      this.q.setFromAxisAngle(this.up, t.yaw).multiply(this.spinQ.setFromAxisAngle(this.zAxis, spin + t.phase));
      this.m.compose(this.v.set(t.x, t.y, t.z), this.q, this.s.set(1, 1, 1));
      p.add(this.m, this.white);
    }
    p.commit();
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.scene.traverse(o => { o.geometry?.dispose(); o.material?.dispose?.(); });
    this.renderer.dispose();
    this.canvas.remove();
  }
}
