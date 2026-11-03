// Oamenii de pe trotuare: mai multe tipuri (bărbat, femeie în rochie, domn la costum, mamă cu cărucior, copil,
// biciclist, om care aleargă, muncitor). Fiecare tip are corpul și lucrurile lui, iar picioarele și mâinile
// sunt piese separate, ca să se miște la mers. Toți privesc spre +z și stau pe y = 0.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

function paint(geo, hex) {
  const c = new THREE.Color(hex), n = geo.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) c.toArray(a, i * 3);
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return geo;
}
const W = 0xffffff, SKIN = 0xf1c7a5, BLACK = 0x1e1e1e;
// rx > 0 apleacă piesa spre înainte
const box = (w, h, l, x, y, z, hex = W, rx = 0) => paint(new THREE.BoxGeometry(w, h, l).rotateX(rx).translate(x, y + h / 2, z), hex);
const ball = (rx, ry, rz, x, y, z, hex) => paint(new THREE.SphereGeometry(1, 10, 8).scale(rx, ry, rz).translate(x, y, z), hex);
const cap = (r, x, y, z, hex) => paint(new THREE.SphereGeometry(r, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2).translate(x, y, z), hex);
const merge = geos => mergeGeometries(geos.map(g => { if (g.attributes.uv) g.deleteAttribute('uv'); return g; }));

// capul, cu ochi; coafura se adaugă separat
const head = (y, r = .023) => [ball(r, r * 1.05, r, 0, y, 0, SKIN), box(.005, .005, .003, -.009, y + .002, r - .001, BLACK), box(.005, .005, .003, .009, y + .002, r - .001, BLACK)];
const hair = {
  short: (y, c = 0x4a3324) => [cap(.0245, 0, y + .004, -.002, c)],
  long: (y, c = 0x6b4423) => [cap(.025, 0, y + .004, -.002, c), box(.046, .05, .014, 0, y - .04, -.016, c)],
  ponytail: (y, c = 0x2b1d14) => [cap(.025, 0, y + .004, -.002, c), ball(.012, .022, .012, 0, y - .012, -.03, c)],
  grey: y => [cap(.024, 0, y - .002, -.004, 0xb8b8b8), ball(.0236, .012, .0236, 0, y + .012, 0, SKIN)],
  cap: (y, c) => [cap(.026, 0, y + .006, 0, c), box(.04, .005, .025, 0, y + .006, .028, c)],
  helmet: (y, c) => [cap(.029, 0, y + .003, -.003, c), box(.01, .006, .05, 0, y + .03, -.004, 0xffffff)],
  headband: (y, c = 0x4a3324) => [cap(.0245, 0, y + .004, -.002, c), paint(new THREE.TorusGeometry(.024, .004, 6, 14).rotateX(Math.PI / 2).translate(0, y + .006, 0), 0xe53935)],
};

// piciorul: pantalonul se colorează cu instanța (alb aici), pantoful rămâne închis; se rotește din șold (sus)
const legGeo = (L, w = .021) => merge([box(w, L, .024, 0, -L, 0), box(w + .003, .014, .034, 0, -L, .006, BLACK)]);
// brațul: se rotește din umăr; se colorează ca bluza
const armGeo = (L = .058) => merge([box(.014, L, .016, 0, -L, 0)]);

// fiecare tip: geometriile (top colorat, detail cu culorile lui, picior, braț), unde sunt șoldurile și umerii,
// ce culori primește și cum se mișcă
function build() {
  const torso = (w, h, y0) => box(w, h, .032, 0, y0, 0);
  const T = {};
  T.casual = {
    weight: 22, speed: [.22, .36], top: 'shirts', legs: 'pants',
    geo: { top: merge([torso(.05, .066, .085)]), detail: merge([...head(.174), ...hair.short(.174)]), leg: legGeo(.085), arm: armGeo() },
    hip: [.013, .085], shoulder: [.032, .148],
  };
  T.dress = {
    weight: 16, speed: [.2, .32], top: 'dresses', legs: 'skin',
    geo: {
      top: merge([paint(new THREE.CylinderGeometry(.022, .042, .095, 10).translate(0, .055 + .095 / 2, 0), W), torso(.044, .03, .12)]),
      detail: merge([...head(.174), ...hair.long(.174)]), leg: legGeo(.085, .016), arm: armGeo(),
    },
    hip: [.011, .085], shoulder: [.03, .148],
  };
  T.suit = {
    weight: 10, speed: [.24, .34], top: 0x2f3542, legs: 0x2f3542, arms: 0x2f3542, armFixed: [null, -.15],
    geo: {
      top: merge([torso(.052, .068, .085)]),
      detail: merge([...head(.176), ...hair.grey(.176),
        box(.02, .03, .004, 0, .12, .0165, 0xffffff), box(.007, .026, .005, 0, .118, .018, 0xc0392b), // cămașă și cravată
        box(.044, .032, .012, .04, .032, .02, 0x6b4423), box(.014, .006, .004, .04, .064, .02, 0x3a2a1a)]), // servieta
      leg: legGeo(.085), arm: armGeo(),
    },
    hip: [.013, .085], shoulder: [.033, .15],
  };
  T.stroller = {
    weight: 7, speed: [.16, .24], top: 'shirts', legs: 'pants', armFixed: [-1.15, -1.15], skinTint: false,
    geo: {
      top: merge([torso(.048, .064, .085)]),
      detail: merge([...head(.172), ...hair.ponytail(.172),
        // căruciorul împins în față
        box(.05, .035, .07, 0, .03, .12, 0x2f5fa8), cap(.034, 0, .062, .1, 0x2f5fa8),
        box(.05, .006, .006, 0, .1, .07, 0x333333), box(.004, .05, .004, -.022, .055, .075, 0x333333, -.5), box(.004, .05, .004, .022, .055, .075, 0x333333, -.5),
        ...[[-.022, .095], [.022, .095], [-.022, .15], [.022, .15]].map(([x, z]) =>
          paint(new THREE.CylinderGeometry(.012, .012, .006, 10).rotateZ(Math.PI / 2).translate(x, .012, z), BLACK))]),
      leg: legGeo(.085), arm: armGeo(.06),
    },
    hip: [.012, .085], shoulder: [.031, .146],
  };
  T.shopper = {
    weight: 12, speed: [.18, .3], top: 'shirts', legs: 'pants', armFixed: [null, -.08],
    geo: {
      top: merge([torso(.046, .064, .085)]),
      detail: merge([...head(.172), ...hair.long(.172, 0xc8892a),
        box(.034, .045, .014, .04, .035, .006, 0xff7eb6), box(.02, .02, .003, .04, .08, .006, 0xff7eb6)]), // sacoșa
      leg: legGeo(.085), arm: armGeo(),
    },
    hip: [.012, .085], shoulder: [.03, .146],
  };
  T.child = {
    weight: 12, speed: [.24, .38], top: 'shirts', legs: 'pants', swing: .7,
    geo: {
      top: merge([torso(.036, .046, .058)]),
      detail: merge([...head(.124, .02), ...hair.cap(.124, 0xe53935), box(.03, .036, .016, 0, .066, -.024, 0x2e9d55)]), // șapcă și ghiozdan
      leg: legGeo(.058, .017), arm: armGeo(.042),
    },
    hip: [.01, .058], shoulder: [.024, .102],
  };
  T.cyclist = {
    weight: 7, speed: [.55, .75], top: 0xf57c00, legs: 0x263238, armFixed: [-1.2, -1.2], skinTint: false, pedal: true,
    geo: {
      top: merge([box(.046, .062, .03, 0, .1, -.01, W, .35)]),
      detail: merge([...head(.18).map(g => g.translate(0, 0, .02)), ...hair.helmet(.18, 0x43a047).map(g => g.translate(0, 0, .02)),
        // bicicleta: două roți verticale, cadru, ghidon, șa
        ...[-.065, .065].map(z => paint(new THREE.TorusGeometry(.045, .005, 6, 18).rotateY(Math.PI / 2).translate(0, .045, z), BLACK)),
        box(.006, .006, .13, 0, .07, 0, 0x26a69a), box(.006, .05, .006, 0, .045, -.03, 0x26a69a, .3), box(.006, .05, .006, 0, .06, .05, 0x26a69a, -.3),
        box(.05, .005, .005, 0, .115, .06, 0x333333), box(.02, .008, .03, 0, .1, -.04, 0x333333)]),
      leg: legGeo(.07), arm: armGeo(.06),
    },
    hip: [.013, .1], shoulder: [.03, .15],
  };
  T.jogger = {
    weight: 8, speed: [.45, .6], top: 'sport', legs: 'pants', swing: .95, armSwing: 1.1,
    geo: { top: merge([torso(.048, .064, .085)]), detail: merge([...head(.174), ...hair.headband(.174)]), leg: legGeo(.085), arm: armGeo() },
    hip: [.013, .085], shoulder: [.031, .146],
  };
  T.worker = {
    weight: 6, speed: [.2, .3], top: 0xf2c230, legs: 0x2f3b52, arms: 0xf2c230,
    geo: {
      top: merge([torso(.054, .068, .085)]),
      detail: merge([...head(.176), ...hair.cap(.176, 0x1e3a8a), box(.056, .008, .034, 0, .11, 0, 0xd8d8d8), box(.056, .008, .034, 0, .13, 0, 0xd8d8d8)]), // dungi reflectorizante
      leg: legGeo(.085), arm: armGeo(),
    },
    hip: [.014, .085], shoulder: [.034, .148],
  };
  return T;
}

export const PERSON_TYPES = build();
export const PERSON_COLORS = {
  shirts: [0xe74c3c, 0x3498db, 0xf1c40f, 0x2ecc71, 0xffffff, 0x9b59b6, 0xe67e22, 0x1abc9c, 0x34495e, 0xff7eb6],
  dresses: [0xe84a7a, 0x5c6bc0, 0xffb74d, 0x26a69a, 0xba68c8, 0xef5350, 0xfdd835],
  sport: [0x00acc1, 0xff4081, 0x7cb342, 0xffffff],
  pants: [0x2f3b52, 0x3b5b8c, 0x4a4a4a, 0x6b5a45, 0x1f2a37, 0x7c8c99, 0xc8b68a],
  skins: [0xffffff, 0xeac7a6, 0xc4906c, 0x8d5f43],
};
