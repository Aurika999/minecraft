// Animale și monștri: modele din cutii + comportament simplu.
import * as THREE from 'three';
import { B, I } from './registry.js';
import { moveEntity, touches } from './physics.js';

const geoCache = new Map();
function boxGeo(w, h, d) {
  const k = `${w}|${h}|${d}`;
  if (!geoCache.has(k)) geoCache.set(k, new THREE.BoxGeometry(w, h, d));
  return geoCache.get(k);
}

// modelele privesc spre +z; originea grupului e la tălpi
class Builder {
  constructor() { this.group = new THREE.Group(); this.mats = {}; this.legs = []; }
  mat(color) { return this.mats[color] ??= new THREE.MeshLambertMaterial({ color }); }
  box(parent, w, h, d, color, x, y, z) {
    const m = new THREE.Mesh(boxGeo(w, h, d), this.mat(color));
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }
  pivot(parent, x, y, z) { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; }
  leg(x, y, z, w, h, d, color, s) {
    const pv = this.pivot(this.group, x, y, z);
    this.box(pv, w, h, d, color, 0, -h / 2, 0);
    this.legs.push({ pv, s });
  }
  eyes(head, hw, hh, hd, color = 0x111111) {
    for (const s of [-1, 1]) this.box(head, .08, .08, .02, color, s * hw * .28, hh * .12, hd / 2 + .01);
  }
}

function quad(b, o) {
  const { legH, legW, bw, bh, bl } = o, lx = bw / 2 - legW / 2, lz = bl / 2 - legW / 2;
  [[-lx, lz, 1], [lx, lz, -1], [-lx, -lz, -1], [lx, -lz, 1]].forEach(([x, z, s]) => b.leg(x, legH, z, legW, legH, legW, o.leg, s));
  b.box(b.group, bw, bh, bl, o.body, 0, legH + bh / 2, 0);
  const [hw, hh, hd] = o.head, head = b.pivot(b.group, 0, o.headY, bl / 2 + hd / 2 - .06);
  b.box(head, hw, hh, hd, o.headColor ?? o.body, 0, 0, 0);
  b.eyes(head, hw, hh, hd);
  return head;
}

function humanoid(b, o) {
  b.leg(-.125, .75, 0, o.limb, .75, o.limb, o.leg, 1);
  b.leg(.125, .75, 0, o.limb, .75, o.limb, o.leg, -1);
  b.box(b.group, .5, .75, .25, o.body, 0, 1.125, 0);
  for (const s of [-1, 1]) {
    const pv = b.pivot(b.group, s * .375, 1.4, 0);
    b.box(pv, o.limb, .75, o.limb, o.arm, 0, -.3, 0);
    pv.rotation.x = -Math.PI / 2; // brațele întinse înainte
  }
  const head = b.pivot(b.group, 0, 1.75, 0);
  b.box(head, .5, .5, .5, o.head, 0, 0, 0);
  b.eyes(head, .5, .5, .5, o.eye);
}

export const MOB_TYPES = {
  cow: {
    hp: 10, w: .45, h: 1.4, speed: 1.3, drops: [[I.BEEF, 1, 3]],
    build: b => {
      const head = quad(b, { legH: .75, legW: .25, bw: .75, bh: .62, bl: 1.1, head: [.5, .5, .38], headY: 1.3, body: 0x4b3627, leg: 0x3a2a1f });
      b.box(b.group, .77, .3, .45, 0xe9e9e9, 0, 1.08, .15);
      b.box(head, .3, .2, .06, 0xc9a48c, 0, -.12, .21);
      for (const s of [-1, 1]) b.box(head, .06, .12, .06, 0xdddddd, s * .2, .3, 0);
    },
  },
  pig: {
    hp: 10, w: .45, h: .9, speed: 1.3, drops: [[I.PORK, 1, 3]],
    build: b => {
      const head = quad(b, { legH: .38, legW: .22, bw: .62, bh: .5, bl: 1, head: [.5, .5, .5], headY: .82, body: 0xf0a3a0, leg: 0xe08f8c });
      b.box(head, .24, .18, .06, 0xd97b7b, 0, -.08, .27);
    },
  },
  sheep: {
    hp: 8, w: .45, h: 1.3, speed: 1.2, drops: [[B.WOOL, 1, 1], [I.MUTTON, 1, 2]],
    build: b => {
      const head = quad(b, { legH: .45, legW: .2, bw: .7, bh: .6, bl: 1, head: [.38, .38, .42], headY: 1.1, body: 0xeeeeee, leg: 0xdcc8b6, headColor: 0xdcc8b6 });
      b.box(head, .42, .18, .3, 0xeeeeee, 0, .14, -.05);
    },
  },
  chicken: {
    hp: 4, w: .2, h: .7, speed: 1.2, drops: [[I.CHICKEN, 1, 1]],
    build: b => {
      b.leg(-.08, .3, 0, .05, .3, .05, 0xe0b030, 1);
      b.leg(.08, .3, 0, .05, .3, .05, 0xe0b030, -1);
      b.box(b.group, .35, .3, .45, 0xf4f4f4, 0, .45, 0);
      for (const s of [-1, 1]) b.box(b.group, .05, .2, .3, 0xe2e2e2, s * .2, .47, 0);
      const head = b.pivot(b.group, 0, .75, .2);
      b.box(head, .25, .3, .18, 0xf4f4f4, 0, 0, 0);
      b.box(head, .25, .08, .12, 0xf0a020, 0, 0, .14);
      b.box(head, .1, .1, .05, 0xd02020, 0, -.1, .1);
      b.eyes(head, .25, .3, .18);
    },
  },
  zombie: {
    hp: 20, w: .3, h: 1.95, speed: 2.4, hostile: true, drops: [[I.FLESH, 0, 2]],
    build: b => humanoid(b, { leg: 0x3b3f9a, body: 0x2c9a9a, arm: 0x5d9b47, head: 0x5d9b47, limb: .25, eye: 0x111111 }),
  },
  skeleton: {
    hp: 20, w: .3, h: 1.95, speed: 2.4, hostile: true, drops: [],
    build: b => humanoid(b, { leg: 0xbdbdbd, body: 0x9e9e9e, arm: 0xbdbdbd, head: 0xcfcfcf, limb: .13, eye: 0x222222 }),
  },
  creeper: {
    hp: 20, w: .3, h: 1.7, speed: 2.2, hostile: true, drops: [],
    build: b => {
      [[-.125, .2, 1], [.125, .2, -1], [-.125, -.2, -1], [.125, -.2, 1]].forEach(([x, z, s]) => b.leg(x, .38, z, .25, .38, .25, 0x4ea83a, s));
      b.box(b.group, .5, .75, .3, 0x5cb845, 0, .755, 0);
      const head = b.pivot(b.group, 0, 1.38, 0);
      b.box(head, .5, .5, .5, 0x5cb845, 0, 0, 0);
      for (const s of [-1, 1]) {
        b.box(head, .12, .12, .02, 0x111111, s * .12, .07, .26);
        b.box(head, .06, .12, .02, 0x111111, s * .09, -.14, .26);
      }
      b.box(head, .12, .18, .02, 0x111111, 0, -.08, .26);
    },
  },
};

export const HOSTILE = ['zombie', 'zombie', 'skeleton', 'creeper'];
export const PASSIVE = ['cow', 'pig', 'sheep', 'chicken'];

export function createMob(type, x, y, z) {
  const cfg = MOB_TYPES[type], b = new Builder();
  cfg.build(b);
  return {
    type, cfg, x, y, z, vx: 0, vy: 0, vz: 0, kx: 0, kz: 0, w: cfg.w, h: cfg.h, hp: cfg.hp,
    yaw: Math.random() * Math.PI * 2, onGround: false, timer: 0, dirX: 0, dirZ: 0, panic: 0,
    hurt: 0, invul: 0, attackCd: 0, fuse: 0, shootCd: 2, phase: 0, lavaT: 0, burnT: 0, flash: 0,
    dead: false, group: b.group, legs: b.legs, mats: Object.values(b.mats),
  };
}

export function updateMob(m, dt, g) {
  const p = g.p, cfg = m.cfg, w = g.world;
  const dx = p.x - m.x, dz = p.z - m.z, dy = p.y - m.y, dist = Math.hypot(dx, dz);
  const hunt = cfg.hostile && !p.dead && g.mode === 'survival' && dist < 24;
  let mx = 0, mz = 0, speed = cfg.speed, face = null;
  m.timer -= dt; m.invul -= dt; m.hurt -= dt;

  if (hunt) {
    const nx = dx / (dist || 1), nz = dz / (dist || 1);
    face = Math.atan2(dx, dz);
    if (m.type === 'zombie') {
      mx = nx; mz = nz;
      m.attackCd -= dt;
      if (dist < 1.2 && Math.abs(dy) < 1.8 && m.attackCd <= 0) { g.hurtPlayer(3, m, 'Te-a omorât un zombi.'); m.attackCd = 1; }
    } else if (m.type === 'creeper') {
      // se aprinde la 3 blocuri și explodează după 1,5 s dacă nu fugi mai departe de 7
      const near = Math.abs(dy) < 3 && dist < (m.fuse > 0 ? 7 : 3);
      m.fuse = near ? m.fuse + dt : Math.max(0, m.fuse - dt * 2);
      if (m.fuse <= 0) { mx = nx; mz = nz; }
      if (m.fuse >= 1.5) { m.dead = true; g.explode(m.x, m.y + .8, m.z, 3); return; }
    } else {
      m.shootCd -= dt;
      if (dist > 10) { mx = nx; mz = nz; } else if (dist < 5) { mx = -nx; mz = -nz; }
      if (m.shootCd <= 0 && dist < 16 && g.lineOfSight(m)) { g.shootArrow(m); m.shootCd = 2 + Math.random() * 1.5; }
    }
  } else {
    if (m.fuse) m.fuse = Math.max(0, m.fuse - dt * 2);
    if (m.panic > 0) {
      m.panic -= dt; speed *= 2.2;
      if (m.timer <= 0) {
        const a = Math.atan2(-dx, -dz) + (Math.random() - .5) * 1.6;
        m.dirX = Math.sin(a); m.dirZ = Math.cos(a); m.timer = .7;
      }
    } else if (m.timer <= 0) {
      if (Math.random() < .4) m.dirX = m.dirZ = 0;
      else { const a = Math.random() * Math.PI * 2; m.dirX = Math.sin(a); m.dirZ = Math.cos(a); }
      m.timer = 2 + Math.random() * 4;
    }
    mx = m.dirX; mz = m.dirZ;
    if (cfg.hostile) speed *= .5;
  }

  const inLava = touches(w, m, B.LAVA);
  if (inLava) speed *= .4;
  m.vx = mx * speed + m.kx;
  m.vz = mz * speed + m.kz;
  const decay = Math.max(0, 1 - dt * 6);
  m.kx *= decay; m.kz *= decay;
  m.vy = inLava ? Math.max(m.vy - 10 * dt, -1.5) : Math.max(m.vy - 28 * dt, -55);
  const r = moveEntity(w, m, m.vx * dt, m.vy * dt, m.vz * dt);
  if (r.hy) { m.onGround = m.vy < 0; m.vy = 0; } else m.onGround = false;
  if ((r.hx || r.hz) && (mx || mz) && (m.onGround || inLava)) m.vy = inLava ? 3 : 8.4;

  if (inLava && (m.lavaT -= dt) <= 0) { m.lavaT = .5; g.damageMob(m, 4); }
  // zombii și scheleții ard la soare
  if ((m.type === 'zombie' || m.type === 'skeleton') && g.daylight > .6 && w.skyAt(m.x, m.y + m.h - .1, m.z) >= 15) {
    if ((m.burnT += dt) > 1) { m.burnT = 0; g.damageMob(m, 2); }
  }

  const sp = Math.hypot(m.vx - m.kx, m.vz - m.kz);
  m.phase += sp * dt * 4;
  const swing = Math.sin(m.phase) * Math.min(1, sp) * .7;
  for (const l of m.legs) l.pv.rotation.x = l.s * swing;
  if (face === null && sp > .1) face = Math.atan2(m.vx, m.vz);
  if (face !== null) { const d = face - m.yaw; m.yaw += Math.atan2(Math.sin(d), Math.cos(d)) * Math.min(1, dt * 8); }
  m.group.position.set(m.x, m.y, m.z);
  m.group.rotation.y = m.yaw;

  const flash = m.hurt > 0 ? 0x880000 : m.fuse > 0 && Math.sin(m.fuse * 25) > 0 ? 0x777777 : 0;
  if (flash !== m.flash) { m.flash = flash; for (const mt of m.mats) mt.emissive.setHex(flash); }
  if (m.type === 'creeper') m.group.scale.setScalar(1 + Math.min(m.fuse, 1.5) * .08);
}
