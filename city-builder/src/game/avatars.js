// Jucătorii de pe hartă: personajul meu și ale prietenilor din același oraș.
// Fiecare e un om mare (din tipurile de oameni de pe trotuare), cu numele deasupra și o bulă cu emoji.
import * as THREE from 'three';
import { PERSON_TYPES } from './people.js';

export const LOOKS = ['casual', 'dress', 'child', 'jogger'];
export const SHIRTS = [0xe74c3c, 0x3498db, 0xf1c40f, 0x2ecc71, 0x9b59b6, 0xff7eb6, 0xe67e22, 0x1abc9c];
export const EMOJIS = ['👋', '❤️', '😂', '🎉', '👍', '😮', '🐶', '🏠'];
const SCALE = 2.6;

// un text desenat pe o pânză, pus pe un sprite care se uită mereu spre cameră
function textSprite(text, { font = 'bold 44px system-ui, sans-serif', bg = 'rgba(255,255,255,.92)', fg = '#1d2a3a', h = .2 } = {}) {
  const c = document.createElement('canvas'), x = c.getContext('2d');
  x.font = font;
  const w = Math.ceil(x.measureText(text).width) + 36;
  c.width = w; c.height = 64;
  x.font = font;
  if (bg) {
    x.fillStyle = bg;
    x.beginPath(); x.roundRect(2, 2, w - 4, 60, 28); x.fill();
  }
  x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(text, w / 2, 34);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  s.scale.set(h * w / 64, h, 1);
  s.renderOrder = 10;
  return s;
}

function figure(look, shirt) {
  const T = PERSON_TYPES[look] || PERSON_TYPES.casual, g = new THREE.Group();
  const mat = hex => new THREE.MeshLambertMaterial({ vertexColors: true, color: hex });
  const legs = look === 'dress' ? 0xf1c7a5 : 0x2f3b52;
  g.add(new THREE.Mesh(T.geo.top, mat(shirt)), new THREE.Mesh(T.geo.detail, mat(0xffffff)));
  const limbs = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(T.geo.leg, mat(legs)), arm = new THREE.Mesh(T.geo.arm, mat(shirt));
    leg.position.set(side * T.hip[0], T.hip[1], 0);
    arm.position.set(side * T.shoulder[0], T.shoulder[1], 0);
    g.add(leg, arm);
    limbs.push({ leg, arm, side });
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.scale.setScalar(SCALE);
  return { body: g, limbs, T };
}

export class Avatars {
  constructor(scene) {
    this.scene = scene;
    this.list = new Map(); // id → avatar
  }

  // creează sau schimbă un jucător; pos = { x, z, yaw } (ținta, spre care merge lin)
  set(id, { name, look, shirt, x, z, yaw, me = false }) {
    let a = this.list.get(id);
    if (a && (a.look !== look || a.shirt !== shirt || a.name !== name)) { this.remove(id); a = null; }
    if (!a) {
      const f = figure(look, shirt), root = new THREE.Group();
      root.add(f.body);
      const label = textSprite(name || '?', { bg: me ? 'rgba(255,214,64,.95)' : 'rgba(255,255,255,.92)' });
      label.position.y = .72;
      root.add(label);
      // un cerc colorat pe jos, ca să se vadă unde e jucătorul
      const ring = new THREE.Mesh(new THREE.RingGeometry(.16, .22, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: shirt, transparent: true, opacity: .8 }));
      ring.position.y = .02;
      root.add(ring);
      root.position.set(x, 0, z);
      this.scene.add(root);
      a = { id, root, ...f, look, shirt, name, x, z, yaw, tx: x, tz: z, tyaw: yaw, step: 0, bubble: null, bubbleT: 0, me };
      this.list.set(id, a);
    }
    a.tx = x; a.tz = z; a.tyaw = yaw;
    if (me) { a.x = x; a.z = z; a.yaw = yaw; }
    return a;
  }

  remove(id) {
    const a = this.list.get(id);
    if (!a) return;
    this.scene.remove(a.root);
    a.root.traverse(o => { if (o.material) { o.material.map?.dispose(); o.material.dispose(); } if (o.geometry && !Object.values(a.T.geo).includes(o.geometry)) o.geometry.dispose(); });
    this.list.delete(id);
  }

  // păstrează doar jucătorii din listă (plus pe al meu)
  keep(ids) { for (const id of [...this.list.keys()]) if (!ids.has(id)) this.remove(id); }

  clear() { for (const id of [...this.list.keys()]) this.remove(id); }

  say(id, emoji) {
    const a = this.list.get(id);
    if (!a) return;
    if (a.bubble) { a.root.remove(a.bubble); a.bubble.material.map.dispose(); a.bubble.material.dispose(); }
    a.bubble = textSprite(emoji, { font: '50px system-ui, "Segoe UI Emoji", sans-serif', h: .36 });
    a.bubble.position.y = 1.02;
    a.root.add(a.bubble);
    a.bubbleT = 3;
  }

  update(dt) {
    for (const a of this.list.values()) {
      const dx = a.tx - a.x, dz = a.tz - a.z, d = Math.hypot(dx, dz);
      if (!a.me) {
        // ceilalți: alunecă spre ultima poziție primită (dacă e foarte departe, sare direct)
        if (d > 6) { a.x = a.tx; a.z = a.tz; } else { const k = Math.min(1, dt * 8); a.x += dx * k; a.z += dz * k; }
        let dy = a.tyaw - a.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); a.yaw += dy * Math.min(1, dt * 10);
      }
      const moving = a.me ? a.moving : d > .02;
      if (moving) a.step += dt * 11;
      const sw = moving ? Math.sin(a.step) : 0;
      a.root.position.set(a.x, (moving ? Math.abs(sw) * .025 : 0) + (a.y || 0), a.z);
      a.body.rotation.y = a.yaw;
      for (const { leg, arm, side } of a.limbs) {
        leg.rotation.x = side * sw * (a.T.swing ?? .55);
        arm.rotation.x = -side * sw * (a.T.armSwing ?? .6);
      }
      if (a.bubble && (a.bubbleT -= dt) <= 0) { a.root.remove(a.bubble); a.bubble.material.map.dispose(); a.bubble.material.dispose(); a.bubble = null; }
      else if (a.bubble) a.bubble.position.y = 1.02 + Math.sin(a.bubbleT * 4) * .03;
    }
  }
}
