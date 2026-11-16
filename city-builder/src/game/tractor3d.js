// Tractor 3D detaliat, construit din cod. Modelul e gândit în metri (lung ~4,6 m, înalt ~3 m),
// apoi micșorat cu S ca să încapă pe hartă. Botul e spre +x, roțile se rostogolesc în jurul axei z.
// Piesele de aceeași culoare se lipesc într-o singură plasă (mai puține desenări = merge repede).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const S = .075; // 1 metru din model = 0,075 unități pe hartă

// jantele potrivite fiecărei culori de tractor
const RIMS = { 0x2e7d32: 0xf2c230, 0xd32f2f: 0xe0e0e0, 0x1e6fd6: 0xf4f4f4, 0xf57c00: 0x3a3a3a };

// adună piese pe culori, apoi le lipește
class Builder {
  constructor() { this.buckets = new Map(); this.m = new THREE.Matrix4(); this.e = new THREE.Euler(); this.q = new THREE.Quaternion(); }
  add(geo, key, x, y, z, rx = 0, ry = 0, rz = 0, order = 'XYZ') {
    this.q.setFromEuler(this.e.set(rx, ry, rz, order));
    geo.applyMatrix4(this.m.compose(new THREE.Vector3(x, y, z), this.q, new THREE.Vector3(1, 1, 1)));
    const g = geo.index ? geo.toNonIndexed() : geo;
    if (!this.buckets.has(key)) this.buckets.set(key, []);
    this.buckets.get(key).push(g);
    return this;
  }
  box(w, h, d, key, x, y, z, rx, ry, rz, order) { return this.add(new THREE.BoxGeometry(w, h, d), key, x, y, z, rx, ry, rz, order); }
  // cilindru cu axa în lungul lui x, y sau z
  cyl(r, len, key, x, y, z, axis = 'y', seg = 16) {
    const g = new THREE.CylinderGeometry(r, r, len, seg);
    if (axis === 'x') g.rotateZ(Math.PI / 2); else if (axis === 'z') g.rotateX(Math.PI / 2);
    return this.add(g, key, x, y, z);
  }
  build(parent) {
    for (const [key, list] of this.buckets) {
      const mesh = new THREE.Mesh(mergeGeometries(list), material(key));
      mesh.castShadow = key !== 'glass';
      mesh.receiveShadow = true;
      parent.add(mesh);
      for (const g of list) g.dispose();
    }
    this.buckets.clear();
    return parent;
  }
}

function material(key) {
  if (key === 'glass') return new THREE.MeshLambertMaterial({ color: 0xa8d8f0, transparent: true, opacity: .42, side: THREE.DoubleSide, depthWrite: false });
  if (key === 'light') return new THREE.MeshBasicMaterial({ color: 0xfff6c8 });
  if (key === 'beacon') return new THREE.MeshBasicMaterial({ color: 0xff9800 });
  return new THREE.MeshLambertMaterial({ color: key, side: THREE.DoubleSide });
}

// capotă cu colțurile de sus rotunjite: profil în planul z-y, întins în lungul lui x
function hoodGeometry(w, h, r, len) {
  const s = new THREE.Shape(), hw = w / 2;
  s.moveTo(-hw, 0); s.lineTo(hw, 0); s.lineTo(hw, h - r);
  s.quadraticCurveTo(hw, h, hw - r, h); s.lineTo(-hw + r, h);
  s.quadraticCurveTo(-hw, h, -hw, h - r); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: true, bevelThickness: .04, bevelSize: .03, bevelSegments: 2, curveSegments: 6 });
  return g.rotateY(Math.PI / 2); // extrudarea merge acum spre +x
}

// o roată: anvelopă cu crampoane în V, jantă colorată, capac și prezoane; side = 1 (stânga) sau -1 (dreapta)
function makeWheel(r, w, rim, side, lugs) {
  const grp = new THREE.Group(), b = new Builder(), TIRE = 0x1d1d1d;
  b.cyl(r, w, TIRE, 0, 0, 0, 'z', 32);
  // crampoane: două rânduri, înclinate în sensuri opuse (model în V), decalate cu o jumătate de pas
  for (let row = 0; row < 2; row++) {
    const zs = row ? 1 : -1;
    for (let k = 0; k < lugs; k++) {
      const a = (k + row * .5) / lugs * Math.PI * 2;
      b.box(.07, r * .16, w * .5, TIRE, Math.cos(a) * (r + .02), Math.sin(a) * (r + .02), zs * w * .24, zs * .55, 0, a, 'ZYX');
    }
  }
  const face = side * w / 2;
  b.cyl(r * .62, w * 1.01, rim, 0, 0, 0, 'z', 24);
  b.cyl(r * .5, .02, shade(rim, .8), 0, 0, face + side * .01, 'z', 24);
  b.cyl(r * .17, w * 1.15, 0x4a4a4a, 0, 0, 0, 'z', 12);
  for (let k = 0; k < 8; k++) {
    const a = k / 8 * Math.PI * 2;
    b.cyl(.025, .06, 0xb0b0b0, Math.cos(a) * r * .25, Math.sin(a) * r * .25, face + side * .03, 'z', 6);
  }
  return b.build(grp);
}

function shade(c, f) {
  const col = new THREE.Color(c).multiplyScalar(f);
  return col.getHex();
}

// tractorul: col = culoarea caroseriei; plough = plug în spate; trailer = remorcă cu grâu
export function buildTractor(col = 0x2e7d32, { plough = true, trailer = false } = {}) {
  const outer = new THREE.Group(), grp = new THREE.Group();
  grp.scale.setScalar(S);
  outer.add(grp);
  const b = new Builder(), rim = RIMS[col] ?? 0xf2c230, DARK = 0x2e3236, GREY = 0x55595e, BLACK = 0x1f1f1f;
  const wheels = [];
  const wheel = (r, w, x, z, lugs) => {
    const side = z > 0 ? 1 : -1, wg = makeWheel(r, w, rim, side, lugs);
    wg.position.set(x, r, z);
    grp.add(wg);
    wheels.push({ m: wg, r: r * S });
  };
  // roțile: mari în spate, mici în față
  for (const z of [-.92, .92]) wheel(.9, .52, -.9, z, 20);
  for (const z of [-.76, .76]) wheel(.55, .34, 1.7, z, 14);

  // șasiul, puntea din spate și cea din față
  b.box(2.9, .45, .7, DARK, .55, .78, 0);
  b.cyl(.13, 1.5, DARK, -.9, .9, 0, 'z');
  b.box(.25, .16, 1.3, DARK, 1.7, .55, 0);
  // blocul motorului sub capotă și capota rotunjită
  b.box(1.8, .35, .8, GREY, 1.3, .95, 0);
  b.add(hoodGeometry(.9, .68, .24, 1.9), col, .35, 1.02, 0);
  // dungi pe lateralele capotei și guri de aerisire
  for (const z of [-.52, .52]) {
    b.box(1.6, .07, .012, 0xf5f5f5, 1.3, 1.5, z);
    for (let k = 0; k < 4; k++) b.box(.16, .035, .012, BLACK, 1.75 + k * .12 - .2, 1.25, z);
  }
  // grila din față cu lamele, faruri, contragreutăți
  b.box(.06, .64, .84, 0x2a2a2a, 2.3, 1.36, 0);
  for (let k = 0; k < 6; k++) b.box(.02, .035, .74, 0x8a8f94, 2.335, 1.12 + k * .085, 0);
  for (const z of [-.33, .33]) b.cyl(.07, .05, 'light', 2.34, 1.56, z, 'x', 12);
  b.box(.28, .34, 1.02, 0x2b2b2b, 2.5, .62, 0);
  for (let k = 0; k < 5; k++) b.box(.3, .05, 1.06, 0x44484d, 2.5, .5 + k * .075, 0);

  // rezervorul de motorină și cutia bateriei, treptele de urcare
  b.cyl(.22, .8, DARK, .62, .82, -.55, 'x');
  b.box(.45, .32, .3, BLACK, .62, .82, .55);
  for (const z of [-.72, .72]) for (const y of [.42, .72]) b.box(.32, .04, .2, GREY, .1, y, z);

  // aripile curbate peste roțile din spate
  for (const z of [-.92, .92]) {
    const f = new THREE.CylinderGeometry(1.02, 1.02, .62, 22, 1, true, Math.PI * .55, Math.PI * .75).rotateX(Math.PI / 2);
    b.add(f, col, -.9, .9, z);
  }

  // cabina: podea, stâlpi, geamuri pe toate părțile, acoperiș cu cozoroc
  const CX = -.65, CL = 1.8, CW = 1.45, Y0 = 1.45, CH = 1.38;
  b.box(1.9, .45, 1.3, col, CX, 1.23, 0);
  for (const x of [CX - CL / 2, CX + CL / 2]) for (const z of [-CW / 2, CW / 2]) b.box(.08, CH, .08, BLACK, x, Y0 + CH / 2, z);
  b.box(.03, CH - .06, CW - .08, 'glass', CX + CL / 2, Y0 + CH / 2, 0);
  b.box(.03, CH - .06, CW - .08, 'glass', CX - CL / 2, Y0 + CH / 2, 0);
  for (const z of [-CW / 2, CW / 2]) {
    b.box(CL - .08, CH - .06, .03, 'glass', CX, Y0 + CH / 2, z);
    b.box(.04, CH, .035, BLACK, CX + .15, Y0 + CH / 2, z); // marginea ușii
    b.box(.12, .03, .04, 0xb0b0b0, CX + .3, Y0 + .7, z * 1.02); // mânerul
  }
  b.box(2.02, .14, 1.68, col, CX + .06, Y0 + CH + .07, 0);
  b.box(1.8, .07, 1.48, 0xf2f2f2, CX + .02, Y0 + CH + .17, 0);
  // proiectoare pe acoperiș, în față și în spate, și girofarul portocaliu
  for (const z of [-.55, -.25, .25, .55]) {
    b.box(.06, .07, .14, 'light', CX + 1.07, Y0 + CH + .06, z);
    b.box(.06, .07, .14, 'light', CX - .97, Y0 + CH + .06, z);
  }
  b.cyl(.09, .05, BLACK, CX - .6, Y0 + CH + .23, .55);
  b.cyl(.075, .14, 'beacon', CX - .6, Y0 + CH + .32, .55, 'y', 12);
  // în cabină: scaunul și volanul, se văd prin geam
  b.box(.5, .14, .5, BLACK, CX - .2, Y0 + .38, 0);
  b.box(.1, .6, .48, BLACK, CX - .47, Y0 + .7, 0);
  b.cyl(.04, .55, GREY, CX + .5, Y0 + .45, 0, 'y', 8);
  b.add(new THREE.TorusGeometry(.17, .025, 6, 18), BLACK, CX + .45, Y0 + .75, 0, 0, Math.PI / 2, .6, 'YXZ');
  // oglinzile retrovizoare
  for (const s of [-1, 1]) {
    b.box(.04, .04, .36, BLACK, CX + CL / 2 - .02, Y0 + 1.05, s * (CW / 2 + .18));
    b.box(.05, .26, .16, BLACK, CX + CL / 2 - .02, Y0 + .95, s * (CW / 2 + .38));
  }
  // eșapamentul și filtrul de aer, în fața cabinei
  b.cyl(.065, 1.5, BLACK, .45, 2.4, .32, 'y', 12);
  b.cyl(.08, .1, 0x777777, .45, 3.15, .32, 'y', 12);
  b.cyl(.1, .5, DARK, .45, 1.95, -.32, 'y', 12);
  b.cyl(.13, .08, BLACK, .45, 2.24, -.32, 'y', 12);

  // cuplajul în trei puncte din spate
  for (const z of [-.35, .35]) b.box(.7, .07, .07, GREY, -1.95, .5, z, 0, 0, .15);
  b.box(.6, .07, .07, GREY, -1.9, 1.15, 0, 0, 0, -.2);

  if (plough) {
    // plug cu trei trupițe pe o bară în diagonală și o roată de sprijin
    const PL = 0xc0392b; // cadru roșu, ca să se vadă bine
    b.box(.5, .14, .5, PL, -2.15, .62, 0);
    b.box(1.75, .14, .14, PL, -2.95, .62, -.35, 0, 2.7, 0);
    for (const t of [.22, .52, .82]) {
      const x = -2.2 - 1.5 * t, z = -.7 * t;
      b.box(.1, .45, .1, PL, x, .4, z);
      b.box(.6, .4, .05, 0xa4abb1, x - .08, .22, z + .1, 0, .75, 0);
      b.box(.6, .05, .14, 0x6b7075, x - .05, .04, z + .08, 0, .75, 0);
      b.add(new THREE.ConeGeometry(.07, .3, 6).rotateZ(-Math.PI / 2), 0x6b7075, x + .25, .05, z + .05, 0, .75, 0);
    }
    const sw = new THREE.Group(); sw.position.set(-3.8, .25, -.85);
    const tb = new Builder(); tb.cyl(.25, .12, BLACK, 0, 0, 0, 'z', 16); tb.cyl(.12, .14, rim, 0, 0, 0, 'z', 12); tb.build(sw);
    grp.add(sw); wheels.push({ m: sw, r: .25 * S });
  }
  if (trailer) {
    // remorcă basculantă plină cu grâu
    b.box(.8, .1, .1, GREY, -2.15, .6, 0);
    b.box(3, .7, 1.8, 0xb23a2a, -4.1, 1.2, 0);
    b.box(2.9, .05, 1.7, 0xd9a441, -4.1, 1.56, 0);
    for (let k = 0; k < 5; k++) b.box(.04, .7, 1.82, 0x8f2a1e, -2.7 - k * .7, 1.2, 0);
    b.box(3.1, .12, 1.4, DARK, -4.1, .8, 0);
    for (const z of [-.85, .85]) {
      const tw = makeWheel(.45, .3, rim, z > 0 ? 1 : -1, 12);
      tw.position.set(-4.1, .45, z); grp.add(tw); wheels.push({ m: tw, r: .45 * S });
    }
  }
  b.build(grp);
  return { grp: outer, wheels };
}
