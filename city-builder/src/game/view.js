// Grafica 3D: harta, clădirile, mașinile, camera izometrică.
import * as THREE from 'three';
import { N } from './config.js';
import { WATER, FOREST, ZONES } from './city.js';

const COL = {
  grass: [0x7cc45a, 0x76bd54, 0x82c95f], forest: 0x5fa847, water: 0x3d8fd6, road: 0x4a4e55, mark: 0xe9e4c8,
  R: 0xb5e8ad, C: 0xb3d4f3, I: 0xf0dd9a, park: 0x5aa845, base: 0x7a5a3c, sand: 0xd9c98f,
  trunk: 0x7a5232, tree: [0x2f7d32, 0x3a8f3a, 0x2a6e2e],
  walls: [0xf2e6d0, 0xe8d3b0, 0xf5f0e6, 0xdcc7a8, 0xf0dcc8], roofs: [0xb5523b, 0x8c4a3a, 0x6b4f3f, 0xc26a3d, 0x5e6e7c],
  glass: [0x6fa8d8, 0x7fb6e0, 0x5d93c4, 0x8cc0e6], factory: [0xb59f7a, 0xa38d6b, 0xc0aa82], metal: 0x9aa0a6,
  abandoned: 0x8a8a8a, car: [0xe74c3c, 0xf1c40f, 0x3498db, 0xecf0f1, 0x2ecc71, 0x9b59b6, 0x34495e],
};
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
    scene.add(new THREE.HemisphereLight(0xe8f4ff, 0x5d7a45, 1.6));
    this.sun = new THREE.DirectionalLight(0xfff4e0, 2.4);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, { left: -36, right: 36, top: 36, bottom: -36, near: 1, far: 140 });
    this.sun.shadow.bias = -.0005;
    this.sun.shadow.normalBias = .03;
    scene.add(this.sun, this.sun.target);

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 400);
    this.target = new THREE.Vector3();
    this.zoom = 1;
    this.rot = 0;
    this.yaw = Math.PI / 4;

    const g = (geo) => geo.translate(0, .5, 0);
    this.geo = {
      box: g(new THREE.BoxGeometry(1, 1, 1)),
      pyr: g(new THREE.ConeGeometry(Math.SQRT1_2, 1, 4).rotateY(Math.PI / 4)),
      cyl: g(new THREE.CylinderGeometry(.5, .5, 1, 12)),
      cone: g(new THREE.ConeGeometry(.5, 1, 7)),
      ball: g(new THREE.SphereGeometry(.5, 10, 8)),
    };
    this.pools = {
      ground: new Pool(scene, this.geo.box, N * N, { shadow: false }),
      mark: new Pool(scene, this.geo.box, N * N * 4, { shadow: false }),
      box: new Pool(scene, this.geo.box, N * N * 5),
      pyr: new Pool(scene, this.geo.pyr, N * N),
      cyl: new Pool(scene, this.geo.cyl, N * N * 2),
      cone: new Pool(scene, this.geo.cone, N * N * 3),
      ball: new Pool(scene, this.geo.ball, N * N),
      warn: new Pool(scene, new THREE.OctahedronGeometry(.16), N * N, { shadow: false, material: new THREE.MeshBasicMaterial() }),
    };
    this.cars = [];
    this.carPool = new Pool(scene, new THREE.BoxGeometry(.17, .11, .3).translate(0, .055, 0), 160);

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
    this.zoom = Math.max(.45, Math.min(4, this.zoom * f));
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

  tree(x, z, s, v) {
    this.part('cyl', x, 0, z, .07 * s, .25 * s, .07 * s, COL.trunk);
    this.part('cone', x, .18 * s, z, .42 * s, .75 * s, .42 * s, pick(COL.tree, v));
  }

  rebuild(city) {
    for (const p of Object.values(this.pools)) p.n = 0;
    const roads = [];
    for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
      const i = z * N + x, t = city.terrain[i], k = city.kind[i], lvl = city.level[i], v = city.variant[i];
      const cx = x - N / 2 + .5, cz = z - N / 2 + .5;
      // pământul
      let gc = pick(COL.grass, v), top = 0;
      if (t === WATER) { gc = COL.water; top = -.1; }
      else if (k === 'road') gc = COL.road;
      else if (ZONES.has(k)) gc = COL[k];
      else if (k === 'park') gc = COL.park;
      else if (t === FOREST) gc = COL.forest;
      this.part('ground', cx, top - .3, cz, 1, .3, 1, gc);

      if (t === FOREST && !k) {
        const n = 2 + (v % 2);
        for (let j = 0; j < n; j++) this.tree(cx + (hash(i, j) - .5) * .6, cz + (hash(i, j + 9) - .5) * .6, .8 + hash(i, j + 3) * .5, v + j);
      }
      if (k === 'road') {
        roads.push([x, z]);
        const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        for (const [dx, dz] of nb) {
          const nx = x + dx, nz = z + dz;
          if (nx < 0 || nz < 0 || nx >= N || nz >= N || city.kind[nz * N + nx] !== 'road') continue;
          this.part('mark', cx + dx * .25, .002, cz + dz * .25, dx ? .5 : .05, .01, dz ? .5 : .05, COL.mark);
        }
      }
      const h = k && k !== 'road' ? this.building(k, lvl, v, cx, cz, i) : 0;
      // semn de avertizare deasupra zonelor cu probleme: gri = fără drum, galben = fără curent, albastru = fără apă
      if (ZONES.has(k)) {
        const warn = !city.road[i] ? 0x9e9e9e : !city.powered[i] ? 0xffd21f : !city.watered[i] && lvl >= 1 ? 0x3fa9ff : 0;
        if (warn) this.part('warn', cx, h + .45, cz, 1, 1, 1, warn);
      }
    }
    for (const p of Object.values(this.pools)) p.commit();
    this.roads = roads;
    this.roadSet = new Set(roads.map(([x, z]) => z * N + x));
  }

  building(k, lvl, v, cx, cz, i) {
    const r = (v % 4) * Math.PI / 2;
    if (k === 'R') {
      if (!lvl) return 0;
      if (lvl === 1) {
        this.part('box', cx, 0, cz, .5, .38, .5, pick(COL.walls, v), r);
        this.part('pyr', cx, .38, cz, .62, .3, .62, pick(COL.roofs, v), r);
        this.tree(cx + .32, cz + .32, .55, v);
        return .7;
      }
      if (lvl === 2) {
        this.part('box', cx, 0, cz, .72, .75, .72, pick(COL.walls, v + 1), r);
        this.part('pyr', cx, .75, cz, .82, .35, .82, pick(COL.roofs, v + 2), r);
        return 1.1;
      }
      const hh = 1.7 + (v % 5) * .25;
      this.part('box', cx, 0, cz, .7, hh, .7, pick(COL.walls, v + 2));
      this.part('box', cx, hh, cz, .74, .08, .74, 0x8a7c6c);
      this.part('box', cx, hh + .08, cz, .2, .16, .2, COL.metal);
      return hh + .2;
    }
    if (k === 'C') {
      if (!lvl) return 0;
      if (lvl === 1) {
        this.part('box', cx, 0, cz, .78, .48, .78, pick(COL.walls, v + 3), r);
        this.part('box', cx, .32, cz + .4, .8, .06, .16, pick([0xd84a3a, 0x3a8ad8, 0x3aa858, 0xe0a030], v), 0);
        return .5;
      }
      if (lvl === 2) {
        this.part('box', cx, 0, cz, .74, 1.35, .74, pick(COL.glass, v));
        this.part('box', cx, 1.35, cz, .5, .12, .5, COL.metal);
        return 1.5;
      }
      const hh = 2.6 + (v % 6) * .3;
      this.part('box', cx, 0, cz, .72, hh, .72, pick(COL.glass, v + 1));
      this.part('box', cx, hh, cz, .44, .45, .44, pick(COL.glass, v + 2));
      this.part('cyl', cx, hh + .45, cz, .04, .6, .04, COL.metal);
      return hh + 1;
    }
    if (k === 'I') {
      if (!lvl) return 0;
      const fc = pick(COL.factory, v);
      this.part('box', cx, 0, cz, .86, .35 + lvl * .15, .86, fc);
      this.part('box', cx, .35 + lvl * .15, cz, .88, .05, .88, 0x6f6252);
      for (let j = 0; j < Math.min(lvl, 2); j++) this.part('cyl', cx - .25 + j * .4, 0, cz - .25, .13, .9 + lvl * .25, .13, 0x8c8c8c);
      if (lvl === 3) this.part('cyl', cx + .25, 0, cz + .2, .3, .55, .3, COL.metal);
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
      for (let j = 0; j < 3; j++) this.tree(cx + (hash(i, j) - .5) * .55, cz + (hash(i, j + 5) - .5) * .55, .6 + hash(i, j + 2) * .3, v + j);
      this.part('ball', cx + .2, -.05, cz - .25, .3, .1, .3, 0x4aa3df);
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

  updateCars(dt, wanted) {
    const roads = this.roads || [], set = this.roadSet;
    const isRoad = (x, z) => x >= 0 && z >= 0 && x < N && z < N && set.has(z * N + x);
    const neighbors = (x, z) => [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dz]) => [x + dx, z + dz]).filter(([a, b]) => isRoad(a, b));
    const spawn = () => {
      const [x, z] = roads[Math.random() * roads.length | 0], nb = neighbors(x, z);
      if (!nb.length) return null;
      return { from: [x, z], to: nb[Math.random() * nb.length | 0], t: Math.random(), speed: 1 + Math.random() * .8, color: pick(COL.car, Math.random() * 100 | 0) };
    };
    const target = roads.length > 1 ? Math.min(160, wanted) : 0;
    let tries = 0;
    while (this.cars.length < target && tries++ < 20) { const c = spawn(); if (c) this.cars.push(c); }
    if (this.cars.length > target) this.cars.length = target;

    const p = this.carPool;
    p.n = 0;
    for (let k = 0; k < this.cars.length; k++) {
      let car = this.cars[k];
      if (!isRoad(...car.from) || !isRoad(...car.to)) { car = this.cars[k] = spawn(); if (!car) { this.cars.splice(k--, 1); continue; } }
      car.t += dt * car.speed;
      while (car.t >= 1) {
        car.t -= 1;
        const nb = neighbors(...car.to), fwd = nb.filter(([a, b]) => a !== car.from[0] || b !== car.from[1]);
        const opts = fwd.length ? fwd : nb;
        car.from = car.to;
        car.to = opts.length ? opts[Math.random() * opts.length | 0] : car.from;
      }
      const dx = car.to[0] - car.from[0], dz = car.to[1] - car.from[1];
      const x = car.from[0] + dx * car.t - N / 2 + .5 - dz * .14, z = car.from[1] + dz * car.t - N / 2 + .5 + dx * .14;
      this.q.setFromAxisAngle(this.up, Math.atan2(dx, dz));
      this.m.compose(this.v.set(x, 0, z), this.q, this.s.set(1, 1, 1));
      p.add(this.m, this.c.setHex(car.color));
    }
    p.commit();
  }

  render(dt) {
    // rotirea camerei se face lin
    const want = Math.PI / 4 + this.rot * Math.PI / 2;
    let d = want - this.yaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    if (Math.abs(d) > .001) { this.yaw += d * Math.min(1, dt * 8); this.updateCamera(); }
    this.pools.warn.mesh.position.y = Math.sin(performance.now() / 300) * .06;
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.scene.traverse(o => { o.geometry?.dispose(); o.material?.dispose?.(); });
    this.renderer.dispose();
    this.canvas.remove();
  }
}
