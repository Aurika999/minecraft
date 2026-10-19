// Coliziuni AABB și raycast prin grila de blocuri.
// O entitate are { x, y, z } = centrul tălpilor, w = jumătate din lățime, h = înălțime.
import { WX, WY, WZ } from './constants.js';
import { B, BLOCK, SOLID } from './registry.js';

const FULL = [0, 0, 0, 1, 1, 1];

function boxAt(world, x, y, z) {
  // marginile lumii se comportă ca pereți invizibili
  if (x < 0 || z < 0 || x >= WX || z >= WZ || y < 0) return FULL;
  if (y >= WY) return null;
  const id = world.blocks[world.idx(x, y, z)];
  return SOLID[id] ? BLOCK[id].box || FULL : null;
}

function eachSolid(world, x0, y0, z0, x1, y1, z1, fn) {
  for (let x = Math.floor(x0); x < x1; x++) for (let y = Math.floor(y0); y < y1; y++) for (let z = Math.floor(z0); z < z1; z++) {
    const b = boxAt(world, x, y, z);
    if (!b) continue;
    const bx0 = x + b[0], by0 = y + b[1], bz0 = z + b[2], bx1 = x + b[3], by1 = y + b[4], bz1 = z + b[5];
    if (x0 < bx1 && x1 > bx0 && y0 < by1 && y1 > by0 && z0 < bz1 && z1 > bz0) fn(bx0, by0, bz0, bx1, by1, bz1);
  }
}

function anySolid(world, x0, y0, z0, x1, y1, z1) {
  let hit = false;
  eachSolid(world, x0, y0, z0, x1, y1, z1, () => { hit = true; });
  return hit;
}

export const overlapsSolid = (world, e) => anySolid(world, e.x - e.w, e.y, e.z - e.w, e.x + e.w, e.y + e.h, e.z + e.w);
export const hasSupport = (world, e) => anySolid(world, e.x - e.w, e.y - .06, e.z - e.w, e.x + e.w, e.y, e.z + e.w);

export function aabbOverlap(e, x0, y0, z0, x1, y1, z1) {
  return e.x - e.w < x1 && e.x + e.w > x0 && e.y < y1 && e.y + e.h > y0 && e.z - e.w < z1 && e.z + e.w > z0;
}

export function touches(world, e, id) {
  for (let x = Math.floor(e.x - e.w); x <= Math.floor(e.x + e.w); x++)
    for (let y = Math.floor(e.y); y <= Math.floor(e.y + e.h); y++)
      for (let z = Math.floor(e.z - e.w); z <= Math.floor(e.z + e.w); z++)
        if (world.get(x, y, z) === id) return true;
  return false;
}

function resolve(world, e, axis, d) {
  let lim = d > 0 ? Infinity : -Infinity, hit = false;
  eachSolid(world, e.x - e.w, e.y, e.z - e.w, e.x + e.w, e.y + e.h, e.z + e.w, (x0, y0, z0, x1, y1, z1) => {
    hit = true;
    const lo = axis === 0 ? x0 : axis === 1 ? y0 : z0, hi = axis === 0 ? x1 : axis === 1 ? y1 : z1;
    lim = d > 0 ? Math.min(lim, lo) : Math.max(lim, hi);
  });
  if (!hit) return false;
  const E = 1e-6;
  if (axis === 0) e.x = d > 0 ? lim - e.w - E : lim + e.w + E;
  else if (axis === 1) e.y = d > 0 ? lim - e.h - E : lim;
  else e.z = d > 0 ? lim - e.w - E : lim + e.w + E;
  return true;
}

// mută pe fiecare axă pe rând, în pași mici ca să nu treacă prin blocuri
export function moveEntity(world, e, dx, dy, dz) {
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz)) / .45));
  let hx = false, hy = false, hz = false;
  for (let s = 0; s < steps; s++) {
    if (dy) { e.y += dy / steps; if (resolve(world, e, 1, dy)) hy = true; }
    if (dx) { e.x += dx / steps; if (resolve(world, e, 0, dx)) hx = true; }
    if (dz) { e.z += dz / steps; if (resolve(world, e, 2, dz)) hz = true; }
  }
  return { hx, hy, hz };
}

export function rayBox(o, d, x0, y0, z0, x1, y1, z1) {
  let tmin = -Infinity, tmax = Infinity, n = null;
  const axes = [[o.x, d.x, x0, x1], [o.y, d.y, y0, y1], [o.z, d.z, z0, z1]];
  for (let a = 0; a < 3; a++) {
    const [oo, dd, lo, hi] = axes[a];
    if (Math.abs(dd) < 1e-9) { if (oo < lo || oo > hi) return null; continue; }
    let t1 = (lo - oo) / dd, t2 = (hi - oo) / dd, s = -1;
    if (t1 > t2) { [t1, t2] = [t2, t1]; s = 1; }
    if (t1 > tmin) { tmin = t1; n = [0, 0, 0]; n[a] = s; }
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return null;
  }
  if (tmax < 0) return null;
  return { t: Math.max(tmin, 0), n: n || [0, 1, 0] };
}

// DDA prin grilă; întoarce primul bloc lovit (lava nu poate fi țintită) și normala feței
export function raycast(world, o, d, maxDist) {
  let x = Math.floor(o.x), y = Math.floor(o.y), z = Math.floor(o.z);
  const sx = Math.sign(d.x), sy = Math.sign(d.y), sz = Math.sign(d.z);
  const tdx = sx ? Math.abs(1 / d.x) : Infinity, tdy = sy ? Math.abs(1 / d.y) : Infinity, tdz = sz ? Math.abs(1 / d.z) : Infinity;
  let tmx = sx > 0 ? (x + 1 - o.x) * tdx : sx < 0 ? (o.x - x) * tdx : Infinity;
  let tmy = sy > 0 ? (y + 1 - o.y) * tdy : sy < 0 ? (o.y - y) * tdy : Infinity;
  let tmz = sz > 0 ? (z + 1 - o.z) * tdz : sz < 0 ? (o.z - z) * tdz : Infinity;
  let n = [0, 0, 0], t = 0;
  for (let i = 0; i < 256 && t <= maxDist; i++) {
    const id = world.get(x, y, z);
    if (id && id !== B.LAVA) {
      const bx = BLOCK[id].box;
      if (!bx) return { x, y, z, n, t, id };
      const r = rayBox(o, d, x + bx[0], y + bx[1], z + bx[2], x + bx[3], y + bx[4], z + bx[5]);
      if (r && r.t <= maxDist) return { x, y, z, n: r.n, t: r.t, id };
    }
    if (tmx < tmy && tmx < tmz) { x += sx; t = tmx; tmx += tdx; n = [-sx, 0, 0]; }
    else if (tmy < tmz) { y += sy; t = tmy; tmy += tdy; n = [0, -sy, 0]; }
    else { z += sz; t = tmz; tmz += tdz; n = [0, 0, -sz]; }
  }
  return null;
}
