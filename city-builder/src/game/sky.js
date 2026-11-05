// Cerul: ziua și noaptea (soarele se mișcă, lumina se schimbă, noaptea se aprind ferestrele, felinarele și farurile),
// plus vremea: ploaie, ninsoare și curcubeul de după ploaie.
import * as THREE from 'three';

// cât de noapte e (0 = zi, 1 = noapte); îl citesc ferestrele clădirilor din shader
export const NIGHT = { value: 0 };

const C = (h) => new THREE.Color(h);
const SKY = { day: C(0x9fd3f5), dusk: C(0xf3a978), night: C(0x0d1830), rain: C(0x8794a1), rainNight: C(0x151c26) };
const SUN = { day: C(0xfff0d6), dusk: C(0xffa060), night: C(0x8ea6ff) };
const HEMI = { day: C(0xf2f8ff), night: C(0x41507e) };
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

const RAIN = 1400, SNOW = 1600, BOX = 22, TOP = 14;

export class Sky {
  constructor(view) {
    this.view = view;
    const scene = view.scene;
    this.hemi = scene.children.find(o => o.isHemisphereLight);
    this.time = .38; // dimineața
    this.rain = 0; this.snow = 0; this.bow = 0;
    this.tmp = new THREE.Color();

    // stropii de ploaie: linii scurte care cad
    const rg = new THREE.BufferGeometry();
    this.rainPos = new Float32Array(RAIN * 6);
    rg.setAttribute('position', new THREE.BufferAttribute(this.rainPos, 3));
    this.rainLines = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0xc6dcf0, transparent: true, opacity: 0, depthWrite: false }));
    this.rainLines.frustumCulled = false;
    this.drops = Array.from({ length: RAIN }, () => this.spawn([], true));
    scene.add(this.rainLines);

    // fulgii de zăpadă
    const sg = new THREE.BufferGeometry();
    this.snowPos = new Float32Array(SNOW * 3);
    sg.setAttribute('position', new THREE.BufferAttribute(this.snowPos, 3));
    this.snowPts = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 3.2, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false }));
    this.snowPts.frustumCulled = false;
    this.flakes = Array.from({ length: SNOW }, () => this.spawn([], true));
    scene.add(this.snowPts);

    // curcubeul: șapte arce colorate, în spatele orașului
    this.rainbow = new THREE.Group();
    ['#ff3b30', '#ff9500', '#ffd60a', '#34c759', '#32ade6', '#3f51b5', '#8e44ad'].forEach((col, k) => {
      const m = new THREE.Mesh(new THREE.TorusGeometry(15 - k * .42, .22, 6, 64, Math.PI),
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0, depthWrite: false, depthTest: false }));
      m.renderOrder = 9;
      this.rainbow.add(m);
    });
    this.rainbow.visible = false;
    scene.add(this.rainbow);

    // strălucirea felinarelor și farurile mașinilor (se văd doar seara și noaptea)
    const glowMat = () => new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    this.lampGlow = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), glowMat(), 4000);
    this.lampPool = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2), glowMat(), 4000);
    this.headlights = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), glowMat(), 2000);
    this.beams = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 16).rotateX(-Math.PI / 2), glowMat(), 2000);
    for (const m of [this.lampGlow, this.lampPool, this.headlights, this.beams]) { m.count = 0; m.frustumCulled = false; m.renderOrder = 3; scene.add(m); }
    this.lamps = [];
    this.m = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.v = new THREE.Vector3(); this.s = new THREE.Vector3();
  }

  // un strop sau un fulg nou, undeva deasupra camerei
  spawn(p, anywhere = false) {
    const t = this.view.target;
    p[0] = t.x + (Math.random() * 2 - 1) * BOX;
    p[1] = anywhere ? Math.random() * TOP : TOP;
    p[2] = t.z + (Math.random() * 2 - 1) * BOX;
    p[3] = Math.random() * 6.3;
    return p;
  }

  // felinarele orașului (le pune view.rebuild)
  setLamps(list) {
    this.lamps = list;
    const m = this.m;
    this.lampGlow.count = this.lampPool.count = Math.min(list.length, 4000);
    for (let k = 0; k < this.lampGlow.count; k++) {
      const [x, y, z] = list[k];
      m.makeScale(.09, .09, .09).setPosition(x, y, z); this.lampGlow.setMatrixAt(k, m);
      m.makeScale(.42, 1, .42).setPosition(x, .012, z); this.lampPool.setMatrixAt(k, m);
    }
    this.lampGlow.instanceMatrix.needsUpdate = this.lampPool.instanceMatrix.needsUpdate = true;
  }

  // ziua: time 0..1 (0,5 = amiază); rain, snow: 0..1 (cât de tare)
  update(dt, { time, rain, snow, bow }) {
    const view = this.view, t = view.target;
    this.time = time; this.rain = rain; this.snow = snow;
    const elev = Math.sin((time - .25) * Math.PI * 2) + .3; // soarele stă sus mai mult decât jos
    const day = smooth(-.2, .35, elev), dusk = Math.max(0, 1 - Math.abs(elev - .12) / .35) * (1 - Math.min(1, rain * 1.5));
    const night = 1 - day, wet = Math.max(rain, snow * .6);
    NIGHT.value = smooth(.35, .85, night + wet * .25);

    // soarele merge pe cer de la est la vest
    const a = (time - .25) * Math.PI * 2;
    view.sun.position.set(t.x + Math.cos(a) * 30, 12 + Math.max(.15, elev) * 30, t.z + 14 + Math.sin(a) * 8);
    view.sun.target.position.copy(t);
    const sunCol = this.tmp.copy(SUN.night).lerp(SUN.day, day).lerp(SUN.dusk, dusk * .8);
    view.sun.color.copy(sunCol);
    view.sun.intensity = (.25 + 2.05 * day) * (1 - .65 * wet);
    if (this.hemi) {
      this.hemi.color.copy(HEMI.night).lerp(HEMI.day, day);
      this.hemi.intensity = (.55 + 1.45 * day) * (1 - .35 * wet);
    }
    const bg = view.scene.background;
    bg.copy(SKY.night).lerp(SKY.day, day).lerp(SKY.dusk, dusk * .7);
    if (wet) bg.lerp(this.tmp.copy(SKY.rainNight).lerp(SKY.rain, day), wet * .75);

    // felinarele și farurile
    const glow = NIGHT.value;
    this.lampGlow.material.opacity = glow * .85;
    this.lampPool.material.opacity = glow * .32;
    this.headlights.material.opacity = glow * .9;
    this.beams.material.opacity = glow * .22;
    this.lampGlow.visible = this.lampPool.visible = this.headlights.visible = this.beams.visible = glow > .02;
    if (glow > .02) this.carLights();

    // ploaia
    this.rainLines.visible = rain > .01;
    if (this.rainLines.visible) {
      this.rainLines.material.opacity = .55 * rain;
      const n = Math.floor(RAIN * Math.min(1, rain * 1.2)), P = this.rainPos;
      for (let k = 0; k < RAIN; k++) {
        const d = this.drops[k];
        d[1] -= dt * 13; d[0] += dt * 1.2;
        if (d[1] < 0 || Math.abs(d[0] - t.x) > BOX || Math.abs(d[2] - t.z) > BOX) this.spawn(d);
        const o = k * 6, on = k < n;
        P[o] = d[0]; P[o + 1] = on ? d[1] : -50; P[o + 2] = d[2];
        P[o + 3] = d[0] - .03; P[o + 4] = on ? d[1] + .45 : -50; P[o + 5] = d[2];
      }
      this.rainLines.geometry.attributes.position.needsUpdate = true;
    }
    // ninsoarea
    this.snowPts.visible = snow > .01;
    if (this.snowPts.visible) {
      this.snowPts.material.opacity = .95 * snow;
      this.snowPts.material.size = 2.4 * (view.renderer.getPixelRatio?.() || 1) + 1;
      const n = Math.floor(SNOW * Math.min(1, snow * 1.2)), P = this.snowPos;
      for (let k = 0; k < SNOW; k++) {
        const f = this.flakes[k];
        f[3] += dt * 1.5;
        f[1] -= dt * 1.4; f[0] += Math.sin(f[3]) * dt * .4; f[2] += Math.cos(f[3] * .7) * dt * .3;
        if (f[1] < 0 || Math.abs(f[0] - t.x) > BOX || Math.abs(f[2] - t.z) > BOX) this.spawn(f);
        P[k * 3] = f[0]; P[k * 3 + 1] = k < n ? f[1] : -50; P[k * 3 + 2] = f[2];
      }
      this.snowPts.geometry.attributes.position.needsUpdate = true;
    }
    // curcubeul: în spatele orașului, cu fața spre cameră
    this.rainbow.visible = bow > .01;
    if (this.rainbow.visible) {
      // mărimea după cât se vede pe ecran, ca să încapă tot arcul
      const y = view.yaw, H = 30 / view.zoom, k = H * .62 / 15;
      this.rainbow.scale.setScalar(k);
      this.rainbow.position.set(t.x - Math.sin(y) * H * .4, -H * .44, t.z - Math.cos(y) * H * .4);
      this.rainbow.rotation.set(0, y, 0);
      for (const m of this.rainbow.children) m.material.opacity = .42 * bow;
    }
  }

  // două faruri în fața fiecărei mașini și o pată de lumină pe drum
  carLights() {
    const cars = this.view.cars, m = this.m, H = this.headlights, B = this.beams;
    let n = 0, b = 0;
    for (const c of cars) {
      if (n + 2 > 2000) break;
      const sy = Math.sin(c.yaw), cy = Math.cos(c.yaw), y = .065 + (c.y || 0);
      const fx = c.x + sy * .2, fz = c.z + cy * .2;
      for (const side of [-1, 1]) {
        m.makeScale(.022, .022, .022).setPosition(fx + cy * side * .065, y, fz - sy * side * .065);
        H.setMatrixAt(n++, m);
      }
      this.q.setFromAxisAngle(this.view.up, c.yaw);
      m.compose(this.v.set(c.x + sy * .42, .015 + (c.y || 0), c.z + cy * .42), this.q, this.s.set(.13, 1, .26));
      B.setMatrixAt(b++, m);
    }
    H.count = n; B.count = b;
    H.instanceMatrix.needsUpdate = B.instanceMatrix.needsUpdate = true;
  }
}
