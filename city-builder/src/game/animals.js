// Modelele 3D ale animalelor și păsărilor de la fermă. Toate privesc spre +z și stau pe y = 0.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

function paint(geo, hex) {
  const c = new THREE.Color(hex), n = geo.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) c.toArray(a, i * 3);
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return geo;
}
// rx > 0 apleacă piesa spre înainte (+z)
const box = (w, h, l, x, y, z, hex, rx = 0) => paint(new THREE.BoxGeometry(w, h, l).rotateX(rx).translate(x, y + h / 2, z), hex);
const ball = (rx, ry, rz, x, y, z, hex) => paint(new THREE.SphereGeometry(1, 10, 8).scale(rx, ry, rz).translate(x, y, z), hex);
const leg = (r, h, x, z, hex) => paint(new THREE.CylinderGeometry(r, r * .85, h, 6).translate(x, h / 2, z), hex);
const legs4 = (r, h, dx, dz, hex) => [[-dx, -dz], [dx, -dz], [-dx, dz], [dx, dz]].map(([x, z]) => leg(r, h, x, z, hex));
const cone = (r, h, x, y, z, hex, rx = 0) => paint(new THREE.ConeGeometry(r, h, 6).rotateX(rx).translate(x, y, z), hex);
const pair = (fn, x) => [fn(-x), fn(x)];
const BLACK = 0x1e1e1e;

const MODELS = {
  cow: () => {
    const w = 0xffffff, pinkish = 0xf4b0b8;
    return [
      ...legs4(.012, .065, .035, .06, 0xf2f2f2),
      ...[[-.035, -.06], [.035, -.06], [-.035, .06], [.035, .06]].map(([x, z]) => box(.026, .012, .026, x, 0, z, 0x3a3a3a)),
      ball(.05, .045, .1, 0, .1, 0, w),
      ball(.032, .03, .04, .03, .115, .02, BLACK),
      ball(.03, .028, .035, -.028, .105, -.045, BLACK),
      ball(.026, .02, .028, 0, .062, -.03, pinkish), // uger
      box(.04, .045, .05, 0, .095, .1, w, .35), // gât
      box(.05, .05, .065, 0, .115, .135, w), // cap
      box(.052, .03, .025, 0, .11, .175, pinkish), // bot
      ...pair(x => box(.01, .01, .004, x, .148, .168, BLACK), .017), // ochi
      ...pair(x => box(.026, .012, .016, x, .15, .128, 0xf4f4f4), .036), // urechi
      ...pair(x => cone(.007, .03, x, .18, .13, 0xf3e3c3), .018), // coarne
      box(.008, .07, .008, 0, .05, -.1, w, -.25), // coadă
      ball(.012, .016, .012, 0, .055, -.112, BLACK),
    ];
  },
  pig: () => {
    const pink = 0xf7a8b8, dark = 0xe88c9e;
    return [
      ...legs4(.012, .04, .028, .045, 0xf29aac),
      ball(.045, .042, .072, 0, .075, 0, pink),
      ball(.035, .034, .035, 0, .085, .07, pink),
      paint(new THREE.CylinderGeometry(.018, .02, .022, 10).rotateX(Math.PI / 2).translate(0, .078, .106), dark), // rât
      ...pair(x => box(.006, .008, .004, x, .074, .117, 0x8a3c4a), .007),
      ...pair(x => box(.008, .008, .004, x, .1, .1, BLACK), .016),
      ...pair(x => cone(.014, .028, x, .118, .065, dark, -.5), .021), // urechi
      paint(new THREE.TorusGeometry(.012, .004, 6, 10).translate(0, .09, -.075), dark), // codiță
    ];
  },
  sheep: () => {
    const wool = 0xf6f3ec, face = 0x2b2b2b;
    return [
      ...legs4(.009, .045, .025, .04, face),
      ball(.05, .045, .065, 0, .08, 0, wool),
      ball(.03, .03, .03, .025, .11, .02, wool), ball(.03, .03, .03, -.025, .11, -.02, wool),
      ball(.028, .028, .028, 0, .115, .035, wool), ball(.03, .028, .03, 0, .105, -.045, wool),
      ball(.026, .026, .026, .03, .09, -.03, wool), ball(.026, .026, .026, -.03, .09, .03, wool),
      box(.032, .04, .045, 0, .075, .075, face, .25), // cap negru
      ball(.022, .018, .02, 0, .122, .07, wool), // moț
      ...pair(x => box(.026, .008, .012, x, .1, .07, face), .024), // urechi
      ...pair(x => box(.006, .006, .004, x, .1, .098, 0xffffff), .011), // ochi
    ];
  },
  goat: () => {
    const fur = 0xf2ece0;
    return [
      ...legs4(.008, .055, .022, .04, 0xd9cbb3),
      ball(.035, .036, .062, 0, .085, 0, fur),
      box(.025, .045, .03, 0, .085, .055, fur, .45), // gât
      box(.03, .032, .05, 0, .118, .082, fur), // cap
      box(.01, .028, .01, 0, .096, .102, 0xbfb29a), // barbă
      ...pair(x => cone(.007, .042, x, .165, .07, 0x8a7a60, -.6), .01), // coarne
      ...pair(x => box(.024, .008, .012, x, .138, .075, 0xe0d4bf), .022),
      ...pair(x => box(.006, .006, .004, x, .136, .107, BLACK), .01),
      box(.008, .022, .008, 0, .105, -.06, fur, -.5),
    ];
  },
  horse: () => {
    const coat = 0x8b5a2b, mane = 0x2b1d14;
    return [
      ...legs4(.011, .1, .033, .07, 0x7a4d24),
      ...[[-.033, -.07], [.033, -.07], [-.033, .07], [.033, .07]].map(([x, z]) => box(.024, .014, .024, x, 0, z, BLACK)),
      ball(.045, .048, .1, 0, .14, 0, coat),
      box(.035, .09, .045, 0, .14, .09, coat, .55), // gât
      box(.034, .036, .085, 0, .2, .14, coat), // cap
      box(.03, .03, .02, 0, .198, .19, 0x6b4423), // bot
      box(.012, .085, .03, 0, .16, .073, mane, .55), // coamă
      ...pair(x => cone(.007, .025, x, .25, .115, coat), .012), // urechi
      ...pair(x => box(.008, .008, .004, x, .222, .17, BLACK), .017), // ochi
      box(.02, .1, .016, 0, .07, -.105, mane, -.3), // coadă
    ];
  },
  chicken: () => [
    ...pair(x => leg(.003, .03, x, 0, 0xf2a33a), .008),
    ball(.028, .026, .034, 0, .05, 0, 0xffffff),
    ...pair(x => ball(.008, .016, .024, x, .052, 0, 0xeeeeee), .026), // aripi
    box(.02, .03, .012, 0, .055, -.032, 0xf5f5f5, -.6), // coadă
    ball(.016, .017, .016, 0, .085, .022, 0xffffff), // cap
    box(.005, .014, .018, 0, .098, .022, 0xe53935), // creastă
    cone(.005, .014, 0, .083, .043, 0xf2b33a, Math.PI / 2), // cioc
    ball(.004, .008, .004, 0, .071, .035, 0xe53935), // bărbie
    ...pair(x => box(.003, .003, .003, x, .088, .03, BLACK), .012),
  ],
  turkey: () => {
    const body = 0x4a3426;
    // coada desfăcută ca un evantai
    const fan = [-1, -.5, 0, .5, 1].map((a, j) => {
      const t = a * .95;
      return paint(new THREE.SphereGeometry(1, 8, 6).scale(.018, .05, .006).rotateZ(-t).translate(Math.sin(t) * .04, .075 + Math.cos(t) * .04, -.035), j % 2 ? 0x8b5a2b : 0x6b4423);
    });
    return [
      ...pair(x => leg(.004, .035, x, 0, 0xd88a5a), .01),
      ball(.035, .034, .042, 0, .06, 0, body),
      ...pair(x => ball(.01, .022, .03, x, .06, 0, 0x5c4033), .032),
      ...fan,
      box(.01, .035, .01, 0, .07, .03, 0x9ec3e6, .2), // gât
      ball(.011, .012, .011, 0, .108, .036, 0x9ec3e6), // cap
      ball(.005, .012, .005, 0, .094, .046, 0xd32f2f), // bărbie roșie
      cone(.004, .012, 0, .107, .05, 0xd9b38c, Math.PI / 2),
    ];
  },
  duck: () => [
    ...pair(x => leg(.003, .016, x, 0, 0xffa726), .008),
    ball(.026, .022, .04, 0, .035, 0, 0xffffff),
    box(.014, .025, .014, 0, .045, .026, 0xffffff, .2), // gât
    ball(.015, .015, .016, 0, .076, .03, 0xffffff), // cap
    box(.014, .006, .022, 0, .068, .052, 0xffa726), // cioc lat
    box(.014, .012, .012, 0, .045, -.042, 0xffffff, -.7), // coadă ridicată
    ...pair(x => box(.003, .003, .003, x, .08, .042, BLACK), .011),
  ],
};

// culorile cu care se nuanțează fiecare animal (albul păstrează culorile modelului)
export const TINTS = {
  cow: [0xffffff, 0xffffff, 0xd9a066, 0xb07a4a], pig: [0xffffff, 0xf3d0d0], sheep: [0xffffff, 0xf0e6d6],
  goat: [0xffffff, 0xd9b48a, 0x9a8a7a], horse: [0xffffff, 0x6b4a3a, 0xe8d0b0, 0x3a2a22],
  chicken: [0xffffff, 0xffffff, 0xd08a4a], turkey: [0xffffff], duck: [0xffffff, 0xfff3c4],
};

export function animalGeometries() {
  return Object.fromEntries(Object.entries(MODELS).map(([id, fn]) => [id, mergeGeometries(fn())]));
}
