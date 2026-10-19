// Texturi pixel-art generate procedural: atlas pentru blocuri + iconițe pentru obiecte.
import * as THREE from 'three';
import { B, BLOCK, item } from './registry.js';
import { mulberry32 } from './noise.js';

const T = 16, COLS = 8;
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const vary = (c, v, r) => { const f = 1 + (r - .5) * v; return [c[0] * f, c[1] * f, c[2] * f]; };

class Px {
  constructor(r) { this.d = new Uint8ClampedArray(T * T * 4); this.r = r; }
  set(x, y, c) {
    if (x < 0 || y < 0 || x >= T || y >= T) return;
    const i = (y * T + x) * 4;
    this.d[i] = c[0]; this.d[i + 1] = c[1]; this.d[i + 2] = c[2]; this.d[i + 3] = 255;
  }
  fill(c, v) { this.each(() => vary(c, v, this.r())); }
  each(fn) { for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) { const c = fn(x, y); if (c) this.set(x, y, c); } }
}

const GRASS = [96, 158, 56], DIRT = [134, 96, 67], STONE = [125, 125, 125], BARK = [104, 82, 50], PLANK = [168, 134, 82];

function ore(p, c) {
  P.stone(p);
  for (let k = 0; k < 5; k++) {
    const cx = 2 + (p.r() * 11 | 0), cy = 2 + (p.r() * 11 | 0);
    for (let j = 0; j < 4; j++) p.set(cx + (p.r() * 3 | 0) - 1, cy + (p.r() * 3 | 0) - 1, vary(c, .3, p.r()));
  }
}

function cobble(p, base) {
  const pts = Array.from({ length: 10 }, () => [p.r() * T, p.r() * T, .8 + p.r() * .35]);
  p.each((x, y) => {
    let d1 = 1e9, d2 = 1e9, shade = 1;
    for (const [px, py, sh] of pts) for (const ox of [-T, 0, T]) for (const oy of [-T, 0, T]) {
      const d = Math.hypot(x + .5 - px - ox, y + .5 - py - oy);
      if (d < d1) { d2 = d1; d1 = d; shade = sh; } else if (d < d2) d2 = d;
    }
    return d2 - d1 < 1.2 ? vary([72, 72, 72], .2, p.r()) : vary(base.map(v => v * shade), .12, p.r());
  });
}

const P = {
  grass_top: p => p.fill(GRASS, .3),
  grass_side: p => {
    P.dirt(p);
    for (let x = 0; x < T; x++) { const d = 3 + (p.r() * 3 | 0); for (let y = 0; y < d; y++) p.set(x, y, vary(GRASS, .3, p.r())); }
  },
  dirt: p => p.fill(DIRT, .35),
  stone: p => {
    p.fill(STONE, .16);
    for (let k = 0; k < 8; k++) { const x = p.r() * T | 0, y = p.r() * T | 0; p.set(x, y, [100, 100, 100]); p.set(x + 1, y, [108, 108, 108]); }
  },
  cobble: p => cobble(p, [128, 128, 128]),
  log_top: p => p.each((x, y) => {
    const d = Math.hypot(x - 7.5, y - 7.5);
    return vary(d > 6.6 ? BARK : (d * 1.4 | 0) % 2 ? [184, 150, 92] : [158, 126, 76], .1, p.r());
  }),
  log_side: p => {
    const col = Array.from({ length: T }, () => .75 + p.r() * .45);
    p.each(x => vary(BARK.map(v => v * col[x]), .12, p.r()));
  },
  leaves: p => p.each(() => p.r() < .28 ? vary([36, 86, 26], .3, p.r()) : vary([62, 130, 42], .35, p.r())),
  planks: p => p.each((x, y) => {
    const seam = (x + (y >> 2) * 6) % T === 0;
    return vary(y % 4 === 3 || seam ? [122, 94, 54] : PLANK, .1, p.r());
  }),
  sand: p => p.fill([219, 207, 160], .1),
  coal_ore: p => ore(p, [28, 28, 30]),
  iron_ore: p => ore(p, [214, 172, 140]),
  diamond_ore: p => ore(p, [90, 236, 226]),
  bedrock: p => p.fill([84, 84, 84], 1.1),
  table_top: p => {
    P.planks(p);
    p.each((x, y) => (x < 2 || y < 2 || x > 13 || y > 13) ? vary([96, 70, 40], .1, p.r()) : null);
  },
  table_side: p => {
    P.planks(p);
    p.each((x, y) => y < 3 ? vary([96, 70, 40], .1, p.r()) : null);
    for (let y = 5; y < 12; y++) p.set(4, y, [70, 50, 30]);
    for (let x = 2; x < 7; x++) p.set(x, 5, [160, 160, 160]);
    for (let y = 5; y < 13; y++) p.set(11, y, [90, 64, 36]);
    for (let x = 9; x < 14; x++) for (let y = 4; y < 6; y++) p.set(x, y, [150, 150, 150]);
  },
  furnace_top: p => p.fill([112, 112, 112], .18),
  furnace_front: p => {
    cobble(p, [118, 118, 118]);
    p.each((x, y) => {
      if (x >= 4 && x < 12 && y >= 7 && y < 14) return y >= 11 ? vary([240, 130, 30], .3, p.r()) : vary([30, 30, 30], .2, p.r());
      if (y === 1 || (y === 6 && x >= 3 && x < 13)) return [80, 80, 80];
      return null;
    });
  },
  // torța și patul folosesc doar o parte din textură (cutia lor e mai mică decât un bloc)
  torch_top: p => p.fill([255, 214, 96], .1),
  torch_side: p => p.each((x, y) => y < 6 ? [255, 214, 96] : y < 8 ? (y === 6 ? [255, 236, 140] : [255, 160, 40]) : vary([122, 90, 50], .2, p.r())),
  bed_top: p => p.each((x, y) => y < 5 ? vary([236, 236, 236], .05, p.r()) : vary([176, 36, 36], .14, p.r())),
  bed_side: p => p.each((x, y) => y < 11 ? vary([176, 36, 36], .14, p.r()) : vary(PLANK, .12, p.r())),
  wool: p => p.fill([234, 234, 234], .1),
  lava: p => p.each(() => p.r() < .2 ? vary([255, 196, 64], .2, p.r()) : vary([214, 88, 18], .25, p.r())),
};

let atlasData = null;
function build() {
  if (atlasData) return atlasData;
  const rng = mulberry32(20240607), names = Object.keys(P), rows = Math.ceil(names.length / COLS);
  const atlas = mk(COLS * T, rows * T), ctx = atlas.getContext('2d'), tiles = {}, index = {};
  names.forEach((n, i) => {
    const p = new Px(rng);
    P[n](p);
    const c = mk(T, T);
    c.getContext('2d').putImageData(new ImageData(p.d, T, T), 0, 0);
    tiles[n] = c;
    index[n] = { col: i % COLS, row: Math.floor(i / COLS), cols: COLS, rows };
    ctx.drawImage(c, (i % COLS) * T, Math.floor(i / COLS) * T);
  });
  return (atlasData = { atlas, tiles, index });
}

export const tileInfo = name => build().index[name];

export function atlasTexture() {
  const t = new THREE.CanvasTexture(build().atlas);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  return t;
}

// ---------- iconițe ----------

// cub izometric din texturile blocului
function iso(bid) {
  const { tiles } = build(), d = BLOCK[bid], c = mk(32, 32), x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  const face = (tile, m, shade) => {
    x.setTransform(...m);
    x.drawImage(tiles[tile], 0, 0);
    if (shade) { x.fillStyle = `rgba(0,0,0,${shade})`; x.fillRect(0, 0, 16, 16); }
  };
  face(d.tex[0], [15 / 16, 7.5 / 16, -15 / 16, 7.5 / 16, 16, 1], 0);
  face(d.tex[1], [15 / 16, 7.5 / 16, 0, 1, 1, 8.5], .2);
  face(d.tex[1], [15 / 16, -7.5 / 16, 0, 1, 16, 16], .4);
  x.setTransform(1, 0, 0, 1, 0, 0);
  return c;
}

// iconiță desenată dintr-o funcție (x, y) -> culoare, cu contur închis la culoare
function shape(fn) {
  const r = mulberry32(7), d = new Uint8ClampedArray(T * T * 4), on = new Uint8Array(T * T);
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    const c = fn(x + .5, y + .5, r);
    if (c) { d.set([c[0], c[1], c[2], 255], (y * T + x) * 4); on[y * T + x] = 1; }
  }
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    if (on[y * T + x]) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= T || ny >= T || !on[ny * T + nx]) continue;
      const n = (ny * T + nx) * 4;
      d.set([d[n] * .35, d[n + 1] * .35, d[n + 2] * .35, 255], (y * T + x) * 4);
      break;
    }
  }
  const c = mk(T, T);
  c.getContext('2d').putImageData(new ImageData(d, T, T), 0, 0);
  const out = mk(32, 32), o = out.getContext('2d');
  o.imageSmoothingEnabled = false;
  o.drawImage(c, 0, 0, 32, 32);
  return out;
}

const WOOD = [137, 101, 54], WOOD_D = [100, 72, 38], BONE = [236, 230, 214];
// coordonate rotite pe diagonală: u de-a lungul mânerului, w perpendicular
const rot = (x, y, ex, ey) => [((x - ex) - (y - ey)) / Math.SQRT2, ((x - ex) + (y - ey)) / Math.SQRT2];
const handle = (u, w, from, to) => u > from && u < to && w > -.3 && w < .8 ? (w < .3 ? WOOD : WOOD_D) : null;

function toolFn(type, col) {
  const dark = col.map(v => v * .72), light = col.map(v => Math.min(255, v * 1.12));
  return (x, y) => {
    if (type === 'sword') {
      const [u, w] = rot(x, y, 6, 10);
      if (u > .6 && u < 13 && Math.abs(w) < Math.min(1.3, (13 - u) * .75)) return w < -.3 ? light : w < .4 ? col : dark;
      if (u > -.7 && u <= .6 && Math.abs(w) < 2.9) return dark;
      if (u > -4.3 && u <= -.7) return handle(u, w, -4.3, -.7);
      if (u > -5.4 && u <= -4.3 && Math.abs(w) < 1.1) return dark;
      return null;
    }
    const [ex, ey] = type === 'shovel' ? [9, 7] : [11, 5], [u, w] = rot(x, y, ex, ey);
    if (type === 'pickaxe') { const uu = u + w * w / 10; if (uu > -.8 && uu < 1.2 && Math.abs(w) < 6.6) return w < 0 ? col : dark; }
    if (type === 'axe' && w < .2 && w > -4.6 && u > -3.4 && u < 1.4 && !(w < -3 && u > .7)) return w < -3.2 ? light : w < -1 ? col : dark;
    if (type === 'shovel' && u > .2 && u < 5 && Math.abs(w) < 2.1 - Math.max(0, u - 3.6) * 1.4) return w < 0 ? col : dark;
    return handle(u, w, -12, .5);
  };
}

function chop(c, edge) {
  return (x, y) => {
    if (x > 11 && x < 14 && y > 2 && y < 6) return BONE;
    const dx = (x - 7) / 5.5, dy = (y - 9.5) / 4.6, d = dx * dx + dy * dy;
    return d < 1 ? (d > .62 ? edge : c) : null;
  };
}

function drum(c) {
  return (x, y) => {
    const [u, w] = rot(x, y, 13, 3);
    if (u > -6 && u < 0 && Math.abs(w) < .8) return BONE;
    if ((x - 13.2) ** 2 + (y - 2.8) ** 2 < 2.2) return BONE;
    const dx = x - 6.5, dy = y - 9.5;
    return dx * dx + dy * dy < 21 ? (dx < -1 && dy < -1 ? c.map(v => Math.min(255, v * 1.15)) : c) : null;
  };
}

const SHAPES = {
  stick: (x, y) => { const [u, w] = rot(x, y, 12, 4); return handle(u, w, -11.5, .5); },
  coal: (x, y, r) => { const dx = (x - 8) / 5.6, dy = (y - 8.5) / 4.6; return dx * dx + dy * dy < 1 - r() * .12 ? (r() < .2 ? [88, 88, 98] : [36, 36, 40]) : null; },
  ingot: (x, y) => {
    if (y >= 5 && y < 7 && x >= 5 - (y - 5) && x < 12 + (y - 5)) return [245, 245, 245];
    if (y >= 7 && y < 11 && x >= 3 && x < 14) return y > 10 ? [170, 170, 170] : y > 9.5 ? [180, 180, 180] : [215, 215, 215];
    return null;
  },
  diamond: (x, y) => {
    const d = Math.abs(x - 8) / 6.5 + Math.abs(y - 8) / 6.5;
    return d < 1 ? (x < 8 && y < 8 ? [205, 255, 250] : x + y < 16 ? [90, 230, 220] : [40, 170, 165]) : null;
  },
  apple: (x, y) => {
    if (x > 7 && x < 9 && y > 2 && y < 5) return [100, 70, 30];
    if (x > 9 && x < 12 && y > 2.5 && y < 4.5) return [60, 150, 40];
    const dx = x - 8, dy = y - 10, d = dx * dx + dy * dy;
    return d < 30 ? (dx < -1 && dy < -1 && d > 9 && d < 20 ? [255, 130, 130] : [205, 30, 35]) : null;
  },
  beef: chop([205, 62, 62], [240, 175, 175]),
  steak: chop([128, 72, 38], [92, 52, 26]),
  pork: chop([238, 150, 150], [255, 212, 212]),
  pork_c: chop([198, 122, 78], [160, 92, 60]),
  mutton: chop([196, 58, 58], [232, 204, 204]),
  mutton_c: chop([140, 82, 50], [108, 62, 40]),
  chicken: drum([240, 192, 172]),
  chicken_c: drum([196, 124, 62]),
  flesh: (x, y, r) => { const dx = (x - 8) / 6, dy = (y - 8.5) / 4.4; return dx * dx + dy * dy < 1 - r() * .25 ? (r() < .3 ? [150, 64, 52] : [112, 122, 62]) : null; },
};

const TORCH_ICON = (x, y) => {
  if (x < 7 || x > 9) return null;
  if (y > 3 && y < 5) return [255, 226, 110];
  if (y > 5 && y < 6) return [255, 150, 40];
  if (y > 6 && y < 15) return WOOD;
  return null;
};

export function iconCanvas(id) {
  const def = item(id);
  if (def.block) return def.block === B.TORCH ? shape(TORCH_ICON) : iso(def.block);
  if (def.tool) return shape(toolFn(def.icon, def.color));
  return shape(SHAPES[def.icon]);
}

const iconUrls = {};
export const iconURL = id => iconUrls[id] || (iconUrls[id] = iconCanvas(id).toDataURL());

// inimi și pulpe pentru bara de viață / foame
const HUD = {
  heart: ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'],
  food: ['...###.', '..#####', '..#####', '..####.', '.b###..', 'b......', 'bb.....'],
};
const hudUrls = {};
export function hudIconURL(kind) {
  if (hudUrls[kind]) return hudUrls[kind];
  const [base, state = 'full'] = kind.split('_'), heart = base === 'heart';
  const full = heart ? [222, 32, 32] : [196, 116, 48], empty = heart ? [58, 16, 16] : [52, 36, 24];
  const S = 9, d = new Uint8ClampedArray(S * S * 4), on = new Uint8Array(S * S);
  HUD[base].forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.') return;
    const filled = state === 'full' || (state === 'half' && x <= 3);
    let c = filled ? (ch === 'b' ? BONE : full) : empty;
    if (heart && filled && x === 1 && y === 1) c = [255, 190, 190];
    const i = (y + 1) * S + x + 1;
    d.set([...c, 255], i * 4); on[i] = 1;
  }));
  for (let i = 0; i < S * S; i++) {
    if (on[i]) continue;
    const x = i % S, y = (i / S) | 0;
    if ((x > 0 && on[i - 1]) || (x < S - 1 && on[i + 1]) || (y > 0 && on[i - S]) || (y < S - 1 && on[i + S])) d.set([0, 0, 0, 255], i * 4);
  }
  const c = mk(S, S);
  c.getContext('2d').putImageData(new ImageData(d, S, S), 0, 0);
  return (hudUrls[kind] = c.toDataURL());
}
