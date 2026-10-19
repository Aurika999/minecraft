import * as THREE from 'three';
import { WX, WY, WZ, CH, CX } from './constants.js';
import { B, BLOCK, OPAQUE, EMIT, SOLID } from './registry.js';
import { mulberry32, noise3, fbm2 } from './noise.js';
import { tileInfo } from './textures.js';

// colțurile fiecărei fețe, în ordinea: stânga-jos, dreapta-jos, dreapta-sus, stânga-sus (văzute din afară)
const FACES = [
  { d: [1, 0, 0], c: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], shade: .8, t: 1, ax: 0 },
  { d: [-1, 0, 0], c: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], shade: .8, t: 1, ax: 0 },
  { d: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], shade: 1, t: 0, ax: 1 },
  { d: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], shade: .5, t: 2, ax: 1 },
  { d: [0, 0, 1], c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], shade: .65, t: 1, ax: 2 },
  { d: [0, 0, -1], c: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], shade: .65, t: 1, ax: 2 },
];
const UL = [0, 1, 1, 0], VL = [0, 0, 1, 1], FULL = [0, 0, 0, 1, 1, 1];

export class World {
  constructor(seed) {
    this.seed = seed;
    const n = WX * WY * WZ;
    this.blocks = new Uint8Array(n);
    this.sky = new Uint8Array(n);
    this.blk = new Uint8Array(n);
  }

  idx(x, y, z) { return (y * WZ + z) * WX + x; }
  inside(x, y, z) { return x >= 0 && y >= 0 && z >= 0 && x < WX && y < WY && z < WZ; }
  get(x, y, z) { return this.inside(x, y, z) ? this.blocks[this.idx(x, y, z)] : B.AIR; }
  set(x, y, z, id) { if (this.inside(x, y, z)) this.blocks[this.idx(x, y, z)] = id; }

  topY(x, z) {
    for (let y = WY - 1; y >= 0; y--) if (SOLID[this.get(x, y, z)]) return y;
    return 0;
  }

  skyAt(x, y, z) {
    x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
    return this.inside(x, y, z) ? this.sky[this.idx(x, y, z)] : 15;
  }

  generate() {
    const s = this.seed, rnd = mulberry32(s), heights = new Uint8Array(WX * WZ);
    for (let x = 0; x < WX; x++) for (let z = 0; z < WZ; z++) {
      const n = fbm2(x / 42, z / 42, 4, s), m = fbm2(x / 90 + 100, z / 90, 2, s + 50);
      const h = Math.max(6, Math.min(WY - 14, Math.floor(12 + n * 30 + Math.max(0, m - .5) * 40)));
      const sandy = h < 27 && fbm2(x / 30 + 300, z / 30, 2, s + 90) > .56;
      heights[z * WX + x] = h;
      for (let y = 0; y <= h; y++) {
        let id;
        if (y === 0 || (y <= 2 && rnd() < .5)) id = B.BEDROCK;
        else if (y < h - 3) id = B.STONE;
        else if (y < h) id = sandy ? B.SAND : B.DIRT;
        else id = sandy ? B.SAND : B.GRASS;
        this.set(x, y, z, id);
      }
    }

    // peșteri; în cele foarte adânci apare lavă
    for (let x = 0; x < WX; x++) for (let z = 0; z < WZ; z++) {
      const h = heights[z * WX + x];
      for (let y = 3; y < h; y++) {
        const v = noise3(x / 16, y / 11, z / 16, s + 7) * .7 + noise3(x / 7, y / 6, z / 7, s + 8) * .3;
        if (v > (y > h - 5 ? .74 : .66)) this.set(x, y, z, y <= 6 ? B.LAVA : B.AIR);
      }
    }

    const vein = (id, count, min, max, maxY) => {
      for (let i = 0; i < count; i++) {
        let x = rnd() * WX | 0, y = 1 + (rnd() * maxY | 0), z = rnd() * WZ | 0;
        const n = min + (rnd() * (max - min + 1) | 0);
        for (let k = 0; k < n; k++) {
          if (this.get(x, y, z) === B.STONE) this.set(x, y, z, id);
          x += (rnd() * 3 | 0) - 1; y += (rnd() * 3 | 0) - 1; z += (rnd() * 3 | 0) - 1;
        }
      }
    };
    vein(B.COAL_ORE, 280, 4, 10, 50);
    vein(B.IRON_ORE, 170, 3, 6, 38);
    vein(B.DIAMOND_ORE, 45, 2, 5, 14);

    for (let i = 0; i < WX * WZ * .012; i++) {
      const x = 2 + (rnd() * (WX - 4) | 0), z = 2 + (rnd() * (WZ - 4) | 0), y = this.topY(x, z);
      if (this.get(x, y, z) !== B.GRASS) continue;
      let crowded = false;
      for (let dx = -3; dx <= 3 && !crowded; dx++) for (let dz = -3; dz <= 3; dz++) if (this.get(x + dx, y + 1, z + dz) === B.LOG) { crowded = true; break; }
      if (crowded) continue;
      const th = 4 + (rnd() * 3 | 0), top = y + th;
      if (top + 2 >= WY) continue;
      for (let k = 1; k <= th; k++) this.set(x, y + k, z, B.LOG);
      for (let ly = top - 2; ly <= top + 1; ly++) {
        const r = ly <= top - 1 ? 2 : 1;
        for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
          if (Math.abs(dx) === r && Math.abs(dz) === r && (ly > top - 1 || rnd() < .5)) continue;
          if (this.get(x + dx, ly, z + dz) === B.AIR) this.set(x + dx, ly, z + dz, B.LEAVES);
        }
      }
    }
  }

  // Lumina cerului (coboară vertical fără pierdere) și a torțelor/lavei, prin BFS.
  // Recalculează doar zona [x0..x1] × [z0..z1], pe toată înălțimea.
  computeLight(x0, x1, z0, z1) {
    const { blocks, sky, blk } = this, qs = [], qb = [];
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
      let open = true;
      for (let y = WY - 1; y >= 0; y--) {
        const i = this.idx(x, y, z), id = blocks[i];
        if (OPAQUE[id]) open = false;
        sky[i] = open ? 15 : 0;
        blk[i] = EMIT[id];
        if (open) qs.push(i);
        if (EMIT[id]) qb.push(i);
      }
    }
    // lumina din vecinătatea zonei intră și ea în zonă
    const seed = (x, z) => {
      if (x < 0 || z < 0 || x >= WX || z >= WZ) return;
      for (let y = 0; y < WY; y++) {
        const i = this.idx(x, y, z);
        if (sky[i] > 1) qs.push(i);
        if (blk[i] > 1) qb.push(i);
      }
    };
    for (let x = x0 - 1; x <= x1 + 1; x++) { seed(x, z0 - 1); seed(x, z1 + 1); }
    for (let z = z0; z <= z1; z++) { seed(x0 - 1, z); seed(x1 + 1, z); }
    this.spread(sky, qs, x0, x1, z0, z1);
    this.spread(blk, qb, x0, x1, z0, z1);
  }

  spread(arr, q, x0, x1, z0, z1) {
    const blocks = this.blocks, L = WX * WZ;
    const visit = (n, v) => { if (!OPAQUE[blocks[n]] && arr[n] < v) { arr[n] = v; q.push(n); } };
    for (let h = 0; h < q.length; h++) {
      const i = q[h], v = arr[i] - 1;
      if (v <= 0) continue;
      const x = i % WX, z = ((i / WX) | 0) % WZ, y = (i / L) | 0;
      // vecinii se modifică doar dacă sunt în zonă
      const inX = x >= x0 && x <= x1, inZ = z >= z0 && z <= z1;
      if (inZ && x - 1 >= x0 && x - 1 <= x1) visit(i - 1, v);
      if (inZ && x + 1 >= x0 && x + 1 <= x1) visit(i + 1, v);
      if (inX && z - 1 >= z0 && z - 1 <= z1) visit(i - WX, v);
      if (inX && z + 1 >= z0 && z + 1 <= z1) visit(i + WX, v);
      if (inX && inZ && y > 0) visit(i - L, v);
      if (inX && inZ && y < WY - 1) visit(i + L, v);
    }
  }

  // După ce s-au schimbat blocuri în [ax0..ax1] × [az0..az1]: recalculează lumina
  // și întoarce indicii chunk-urilor care trebuie reconstruite.
  relight(ax0, ax1, az0, az1) {
    const x0 = Math.max(0, ax0 - 15), x1 = Math.min(WX - 1, ax1 + 15);
    const z0 = Math.max(0, az0 - 15), z1 = Math.min(WZ - 1, az1 + 15);
    const old = new Uint8Array((x1 - x0 + 1) * (z1 - z0 + 1) * WY * 2);
    let k = 0;
    for (let y = 0; y < WY; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
      const i = this.idx(x, y, z); old[k++] = this.sky[i]; old[k++] = this.blk[i];
    }
    this.computeLight(x0, x1, z0, z1);
    const out = new Set();
    const add = (x, z) => { if (x >= 0 && z >= 0 && x < WX && z < WZ) out.add((z >> 4) * CX + (x >> 4)); };
    k = 0;
    for (let y = 0; y < WY; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
      const i = this.idx(x, y, z);
      if ((old[k++] !== this.sky[i]) | (old[k++] !== this.blk[i])) {
        add(x, z);
        if ((x & 15) === 0) add(x - 1, z);
        if ((x & 15) === 15) add(x + 1, z);
        if ((z & 15) === 0) add(x, z - 1);
        if ((z & 15) === 15) add(x, z + 1);
      }
    }
    for (let x = ax0 - 1; x <= ax1 + 1; x++) for (let z = az0 - 1; z <= az1 + 1; z++) add(x, z);
    return out;
  }

  buildChunkGeometry(cx, cz) {
    const pos = [], uv = [], lt = [], ind = [];
    const x0 = cx * CH, z0 = cz * CH;
    for (let y = 0; y < WY; y++) for (let z = z0; z < z0 + CH; z++) for (let x = x0; x < x0 + CH; x++) {
      const i = this.idx(x, y, z), id = this.blocks[i];
      if (!id) continue;
      const def = BLOCK[id], box = def.box, bx = box || FULL;
      for (const f of FACES) {
        let s, b;
        if (box) { s = this.sky[i]; b = this.blk[i]; }
        else {
          const nx = x + f.d[0], ny = y + f.d[1], nz = z + f.d[2];
          if (ny < 0) continue;
          if (this.inside(nx, ny, nz)) {
            const n = this.idx(nx, ny, nz);
            if (OPAQUE[this.blocks[n]]) continue;
            s = this.sky[n]; b = this.blk[n];
          } else { s = 15; b = 0; }
        }
        const tile = tileInfo(def.tex[f.t]), base = pos.length / 3;
        let ua, ub, va, vb;
        if (f.ax === 0) { ua = bx[2]; ub = bx[5]; va = bx[1]; vb = bx[4]; }
        else if (f.ax === 2) { ua = bx[0]; ub = bx[3]; va = bx[1]; vb = bx[4]; }
        else { ua = bx[0]; ub = bx[3]; va = bx[2]; vb = bx[5]; }
        for (let k = 0; k < 4; k++) {
          const c = f.c[k];
          pos.push(x + bx[0] + c[0] * (bx[3] - bx[0]), y + bx[1] + c[1] * (bx[4] - bx[1]), z + bx[2] + c[2] * (bx[5] - bx[2]));
          const u = .001 + (ua + UL[k] * (ub - ua)) * .998, v = .001 + (va + VL[k] * (vb - va)) * .998;
          uv.push((tile.col + u) / tile.cols, 1 - (tile.row + 1 - v) / tile.rows);
          lt.push(s / 15, b / 15, f.shade);
        }
        ind.push(base, base + 1, base + 2, base, base + 2, base + 3);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute('light', new THREE.Float32BufferAttribute(lt, 3));
    g.setIndex(ind);
    g.computeBoundingSphere();
    return g;
  }
}
