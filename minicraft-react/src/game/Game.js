import * as THREE from 'three';
import { WX, WY, WZ, CX, CZ, DAY_LENGTH } from './constants.js';
import { B, I, BLOCK, SOLID, item, maxStack, RECIPES, recipesFor, FUEL_ORDER } from './registry.js';
import { World } from './world.js';
import { atlasTexture, iconCanvas } from './textures.js';
import { moveEntity, raycast, rayBox, hasSupport, touches, aabbOverlap, overlapsSolid } from './physics.js';
import { Inventory } from './inventory.js';
import { createMob, updateMob, HOSTILE, PASSIVE } from './mobs.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const FULL = [0, 0, 0, 1, 1, 1];
const REACH = { survival: 4.5, creative: 5 };
const CREATIVE_HOTBAR = [B.GRASS, B.DIRT, B.STONE, B.COBBLE, B.LOG, B.PLANKS, B.TORCH, B.TABLE, B.FURNACE];
const SKY_DAY = [.53, .74, 1], SKY_NIGHT = [.02, .03, .08], SKY_DUSK = [.98, .55, .32];

const VERT = `
attribute vec3 light;
varying vec2 vUv;
varying vec3 vLight;
varying float vDist;
void main() {
  vUv = uv;
  vLight = light;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vDist = length(mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;
const FRAG = `
uniform sampler2D map;
uniform float daylight;
uniform vec3 fogColor;
uniform float fogNear;
uniform float fogFar;
varying vec2 vUv;
varying vec3 vLight;
varying float vDist;
void main() {
  vec3 tex = texture2D(map, vUv).rgb;
  float sky = pow(0.8, (1.0 - vLight.x) * 15.0) * daylight;
  float blk = pow(0.8, (1.0 - vLight.y) * 15.0);
  vec3 l = max(vec3(sky), vec3(blk, blk * 0.85, blk * 0.65));
  vec3 col = tex * max(l, vec3(0.03)) * vLight.z;
  gl_FragColor = vec4(mix(col, fogColor, smoothstep(fogNear, fogFar, vDist)), 1.0);
}`;

export class Game {
  constructor(mount, onUpdate) {
    this.onUpdate = onUpdate;
    this.keys = {};
    this.messages = []; this.msgId = 0;
    this.mobs = []; this.items = []; this.arrows = []; this.effects = [];
    this.mode = 'survival'; this.screen = 'menu'; this.station = 'hand';
    this.inv = new Inventory(); this.sel = 0; this.cursor = null; this.fuel = 0;
    this.time = .02; this.daylight = 1; this.skyLevel = 15;
    this.debug = false; this.started = false; this.locked = false;
    this.target = null; this.breaking = null; this.breakCd = 0; this.useCd = 0;
    this.mouseL = false; this.mouseR = false; this.wSprint = false;
    this.lastSpace = 0; this.lastW = 0; this.lastHint = 0;
    this.sleepT = 0; this.spawnT = 0; this.heldNameAt = 0; this.bed = null;
    this.fps = 0; this.frames = 0; this.fpsT = 0;
    this._dir = new THREE.Vector3(); this._sun = new THREE.Vector3();
    // pe telefon/tabletă nu există pointer lock: controalele vin din butoanele de pe ecran
    this.touch = matchMedia('(hover: none) and (pointer: coarse)').matches;
    this.move = { x: 0, y: 0 }; this.touchSprint = false;

    this.world = new World((Math.random() * 1e9) | 0);
    this.world.generate();
    this.world.computeLight(0, WX - 1, 0, WZ - 1);

    this.initScene(mount);
    this.worldSpawn = this.findSpawn();
    this.p = { w: .3, h: 1.8, yaw: 0, pitch: 0 };
    this.resetPlayer();
    for (let i = 0; i < 24; i++) this.trySpawn(PASSIVE[i % PASSIVE.length], false, Math.random() * WX, Math.random() * WZ, 0, 6);
    this.bind();

    this.last = performance.now(); this.lastEmit = 0;
    this.raf = requestAnimationFrame(this.loop);
    this.emit();
  }

  // ---------- inițializare ----------

  initScene(mount) {
    const scene = this.scene = new THREE.Scene();
    scene.background = new THREE.Color();
    scene.fog = new THREE.Fog(0xffffff, 30, 70);
    this.ambient = new THREE.AmbientLight(0xffffff, 1);
    this.sunLight = new THREE.DirectionalLight(0xffffff, 1);
    scene.add(this.ambient, this.sunLight);

    this.camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, .05, 500);
    this.camera.rotation.order = 'YXZ';
    this.renderer = new THREE.WebGLRenderer({ antialias: false });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.setSize(innerWidth, innerHeight);
    this.canvas = this.renderer.domElement;
    mount.appendChild(this.canvas);

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        map: { value: atlasTexture() }, daylight: { value: 1 },
        fogColor: { value: new THREE.Vector3() }, fogNear: { value: 30 }, fogFar: { value: 70 },
      },
      vertexShader: VERT, fragmentShader: FRAG,
    });
    this.chunks = new Array(CX * CZ).fill(null);
    for (let k = 0; k < CX * CZ; k++) this.rebuildChunk(k);

    this.sun = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshBasicMaterial({ color: 0xfff3b0, fog: false }));
    this.moon = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.MeshBasicMaterial({ color: 0xdfe6ff, fog: false }));
    this.outline = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
      new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: .55 }));
    this.crack = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, depthWrite: false }));
    this.outline.visible = this.crack.visible = false;
    scene.add(this.sun, this.moon, this.outline, this.crack);

    this.arrowGeo = new THREE.BoxGeometry(.05, .05, .5);
    this.arrowMat = new THREE.MeshLambertMaterial({ color: 0x8a6a40 });
    this.boomGeo = new THREE.SphereGeometry(1, 16, 12);
    this.spriteMats = {};

  }

  findSpawn() {
    const w = this.world, cx = WX >> 1, cz = WZ >> 1;
    for (let r = 0; r < 24; r++) for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
      const x = cx + dx, z = cz + dz, y = w.topY(x, z);
      if (w.get(x, y, z) === B.GRASS) return { x: x + .5, y: y + 1, z: z + .5 };
    }
    return { x: cx + .5, y: w.topY(cx, cz) + 1, z: cz + .5 };
  }

  resetPlayer() {
    let s = this.worldSpawn;
    if (this.bed) {
      if (this.world.get(this.bed.x, this.bed.y, this.bed.z) === B.BED) s = { x: this.bed.x + .5, y: this.bed.y + 1, z: this.bed.z + .5 };
      else { this.bed = null; this.msg('Patul tău lipsește, așa că ai renăscut la punctul inițial.'); }
    }
    const p = this.p;
    Object.assign(p, {
      x: s.x, y: s.y, z: s.z, vx: 0, vy: 0, vz: 0, onGround: false, flying: false, sneaking: false,
      sprinting: false, health: 20, food: 20, sat: 5, exh: 0, maxY: s.y, invul: 0, regen: 0,
      starve: 0, lavaT: 0, hurtAt: 0, dead: false,
    });
    if (overlapsSolid(this.world, p)) p.y = p.maxY = this.world.topY(Math.floor(p.x), Math.floor(p.z)) + 1;
  }

  bind() {
    this.h = {
      keydown: e => this.onKey(e, true),
      keyup: e => this.onKey(e, false),
      mousemove: e => this.onMouseMove(e),
      mousedown: e => this.onMouseDown(e),
      mouseup: e => this.onMouseUp(e),
      wheel: e => this.onWheel(e),
      contextmenu: e => e.preventDefault(),
      resize: () => {
        this.renderer.setSize(innerWidth, innerHeight);
        this.camera.aspect = innerWidth / innerHeight;
        this.camera.updateProjectionMatrix();
      },
      blur: () => { this.keys = {}; this.mouseL = this.mouseR = false; },
    };
    for (const [k, f] of Object.entries(this.h)) addEventListener(k, f);
    this.onLock = () => {
      this.locked = document.pointerLockElement === this.canvas;
      if (this.locked && (this.screen === 'menu' || this.screen === 'pause')) this.screen = 'play';
      else if (!this.locked && this.screen === 'play') { this.screen = 'pause'; this.releaseInputs(); }
      this.emit();
    };
    this.onLockError = () => { if (this.screen === 'play' && !this.locked) { this.screen = 'pause'; this.emit(); } };
    this.onFs = () => this.emit();
    this.onVisibility = () => { if (document.hidden) this.pause(); };
    document.addEventListener('pointerlockchange', this.onLock);
    document.addEventListener('pointerlockerror', this.onLockError);
    document.addEventListener('fullscreenchange', this.onFs);
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    for (const [k, f] of Object.entries(this.h)) removeEventListener(k, f);
    document.removeEventListener('pointerlockchange', this.onLock);
    document.removeEventListener('pointerlockerror', this.onLockError);
    document.removeEventListener('fullscreenchange', this.onFs);
    document.removeEventListener('visibilitychange', this.onVisibility);
    if (this.locked) document.exitPointerLock();
    this.scene.traverse(o => {
      o.geometry?.dispose();
      for (const m of [].concat(o.material || [])) { m.map?.dispose(); m.dispose(); }
    });
    this.material.uniforms.map.value.dispose();
    this.renderer.dispose();
    this.canvas.remove();
  }

  // ---------- acțiuni din interfață ----------

  lock() {
    if (this.touch) {
      if (this.screen === 'menu' || this.screen === 'pause') this.screen = 'play';
      this.emit();
      return;
    }
    try {
      const r = this.canvas.requestPointerLock();
      if (r && r.catch) r.catch(() => {});
    } catch { /* tratat de pointerlockerror */ }
  }

  start(mode) {
    this.setMode(mode);
    if (!this.started) {
      this.started = true;
      this.msg(mode === 'survival'
        ? 'Începe prin a tăia un copac: ține apăsat click stânga pe trunchi.'
        : 'Mod Creative: apasă de două ori Spațiu ca să zbori. Cu E alegi orice bloc.');
    }
    if (this.touch && !document.fullscreenElement) {
      document.documentElement.requestFullscreen?.()
        .then(() => screen.orientation?.lock?.('landscape'))
        .catch(() => {});
    }
    this.lock();
  }

  resume() { this.lock(); }

  pause() {
    if (this.screen !== 'play') return;
    if (this.locked) { document.exitPointerLock(); return; }
    this.screen = 'pause';
    this.releaseInputs();
    this.emit();
  }

  releaseInputs() {
    this.keys = {}; this.mouseL = this.mouseR = false;
    this.move.x = this.move.y = 0; this.touchSprint = false;
  }

  // ---------- controale tactile ----------

  look(dx, dy) {
    if (this.screen !== 'play') return;
    const p = this.p;
    p.yaw -= dx * .006;
    p.pitch = clamp(p.pitch - dy * .006, -1.55, 1.55);
  }

  // x, y în [-1, 1] de la joystick; y negativ = înainte
  setMove(x, y) {
    const m = Math.hypot(x, y);
    if (m < .15) x = y = 0;
    this.move.x = x; this.move.y = y;
    this.touchSprint = m > .95 && y < -.7;
  }

  // atingere scurtă: lovește mobul din centru, altfel pune bloc / folosește
  touchTap() {
    if (this.screen !== 'play' || this.sleepT > 0) return;
    if (!this.attack()) this.useItem(false);
  }

  // ținut apăsat: sparge blocul din centru
  touchBreak(on) { this.mouseL = on && this.screen === 'play'; }

  virtualKey(code, down) {
    this.onKey({ code, repeat: false, ctrlKey: false, preventDefault() {} }, down);
  }

  setMode(mode) {
    this.mode = mode;
    if (mode === 'survival') this.p.flying = false;
    else if (this.inv.slots.slice(0, 9).every(s => !s)) CREATIVE_HOTBAR.forEach((id, i) => { this.inv.slots[i] = { id, count: 64 }; });
    this.emit();
  }

  toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    // în Chrome/Edge, ecranul complet permite blocarea tastaturii (Ctrl+W nu mai închide tab-ul)
    else document.documentElement.requestFullscreen?.().then(() => navigator.keyboard?.lock?.()).catch(() => {});
  }

  respawn() {
    this.resetPlayer();
    this.screen = 'play';
    this.lock();
    this.emit();
  }

  select(i) { this.sel = i; this.heldNameAt = performance.now(); this.breaking = null; this.emit(); }

  openInventory(station) {
    this.station = station;
    this.screen = 'inventory';
    this.releaseInputs(); this.breaking = null;
    document.exitPointerLock();
    this.emit();
  }

  closeInventory() {
    if (this.cursor) {
      const c = this.cursor, left = this.inv.add(c.id, c.count, c.dur);
      if (left) this.spawnItem(c.id, left, this.p.x, this.p.y + 1, this.p.z, null, 1.5, c.dur);
      this.cursor = null;
    }
    this.screen = 'play';
    this.lock();
    this.emit();
  }

  clickSlot(i, button, shift) {
    const sl = this.inv.slots, s = sl[i], c = this.cursor;
    if (shift && s && !c) {
      const [from, to] = i < 9 ? [9, 36] : [0, 9];
      sl[i] = null;
      const left = this.inv.addRange(s.id, s.count, s.dur, from, to);
      if (left) sl[i] = { ...s, count: left };
      return this.emit();
    }
    const max = c ? maxStack(c.id) : 64;
    if (button === 2) {
      if (!c && s) {
        const half = Math.ceil(s.count / 2);
        this.cursor = { ...s, count: half };
        s.count -= half;
        if (!s.count) sl[i] = null;
      } else if (c && (!s || (s.id === c.id && s.count < max))) {
        if (s) s.count++; else sl[i] = { ...c, count: 1 };
        if (--c.count <= 0) this.cursor = null;
      }
    } else if (!c) { this.cursor = s; sl[i] = null; }
    else if (!s) { sl[i] = c; this.cursor = null; }
    else if (s.id === c.id && max > 1) {
      const m = Math.min(c.count, max - s.count);
      s.count += m; c.count -= m;
      if (!c.count) this.cursor = null;
    } else { sl[i] = c; this.cursor = s; }
    this.emit();
  }

  creativePick(id) {
    const tool = item(id).tool;
    this.inv.slots[this.sel] = tool ? { id, count: 1, dur: tool.dur } : { id, count: maxStack(id) };
    this.emit();
  }

  clearSlot(i) { this.inv.slots[i] = null; this.emit(); }

  canCraft(r) {
    if (!r.ins.every(([id, n]) => this.inv.count(id) >= n)) return false;
    return r.st !== 'furnace' || this.fuel >= 1 || FUEL_ORDER.some(f => this.inv.count(f) > 0);
  }

  craft(i, all) {
    const r = RECIPES[i], has = () => r.ins.every(([id, n]) => this.inv.count(id) >= n);
    for (let n = 0; n < (all ? 64 : 1); n++) {
      if (!has()) break;
      if (r.st === 'furnace') {
        while (this.fuel < 1) {
          const f = FUEL_ORDER.find(id => this.inv.count(id) > 0);
          if (!f) break;
          this.inv.remove(f, 1);
          this.fuel += item(f).fuel;
        }
        if (this.fuel < 1) { this.msg('Cuptorul are nevoie de combustibil: cărbune, scânduri, bețe sau lemn.'); break; }
        if (!has()) break;
        this.fuel -= 1;
      }
      for (const [id, c] of r.ins) this.inv.remove(id, c);
      const left = this.inv.add(r.out, r.n);
      if (left) this.spawnItem(r.out, left, this.p.x, this.p.y + 1, this.p.z, null, 1.5);
    }
    this.emit();
  }

  // ---------- intrări ----------

  onKey(e, down) {
    if (!down) {
      this.keys[e.code] = false;
      if (e.code === 'KeyW') this.wSprint = false;
      return;
    }
    if (e.code === 'F3') { e.preventDefault(); this.debug = !this.debug; this.emit(); return; }
    if (this.screen === 'inventory') {
      if (e.code === 'KeyE' || e.code === 'Escape') { e.preventDefault(); this.closeInventory(); }
      return;
    }
    if (this.screen !== 'play') return;
    if (e.ctrlKey || e.code === 'Space' || e.code === 'Tab') e.preventDefault();
    this.keys[e.code] = true;
    if (e.repeat) return;
    const now = performance.now();
    if (e.code === 'Escape') document.exitPointerLock();
    else if (e.code === 'Space' && this.mode === 'creative') {
      if (now - this.lastSpace < 300) { this.p.flying = !this.p.flying; this.p.vy = 0; this.lastSpace = 0; }
      else this.lastSpace = now;
    } else if (e.code === 'KeyW') {
      if (now - this.lastW < 300) this.wSprint = true;
      this.lastW = now;
    } else if (e.code === 'KeyE') this.openInventory('hand');
    else if (e.code === 'KeyQ') this.dropHeld();
    else if (/^Digit[1-9]$/.test(e.code)) this.select(+e.code[5] - 1);
  }

  onMouseMove(e) {
    if (!this.locked || this.screen !== 'play') return;
    const p = this.p;
    p.yaw -= e.movementX * .0022;
    p.pitch = clamp(p.pitch - e.movementY * .0022, -1.55, 1.55);
  }

  onMouseDown(e) {
    if (!this.locked || this.screen !== 'play' || this.sleepT > 0) return;
    if (e.button === 0) { this.mouseL = true; this.attack(); }
    else if (e.button === 2) { this.mouseR = true; this.useItem(false); this.useCd = .3; }
    else if (e.button === 1) { e.preventDefault(); this.pickBlock(); }
  }

  onMouseUp(e) {
    if (e.button === 0) this.mouseL = false;
    else if (e.button === 2) this.mouseR = false;
  }

  onWheel(e) {
    if (!this.locked || this.screen !== 'play') return;
    this.select((this.sel + (e.deltaY > 0 ? 1 : 8)) % 9);
  }

  // ---------- bucla principală ----------

  loop = (t) => {
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(.05, (t - this.last) / 1000);
    this.last = t;
    this.frames++;
    if (t - this.fpsT > 1000) { this.fps = this.frames; this.frames = 0; this.fpsT = t; }
    this.update(dt);
    this.renderer.render(this.scene, this.camera);
    if (t - this.lastEmit > 100) this.emit();
  };

  update(dt) {
    const s = this.screen;
    if (s === 'menu') this.p.yaw += dt * .05;
    const running = s !== 'menu' && s !== 'pause';
    if (running) {
      if (this.sleepT > 0 && (this.sleepT -= dt) <= 0) {
        this.time = Math.floor(this.time) + 1;
        this.msg('Bună dimineața!');
      }
      if (!this.p.dead) this.updatePlayer(dt, s === 'play' && this.sleepT <= 0);
      this.updateMobs(dt);
      this.updateItems(dt);
      this.updateArrows(dt);
      this.updateEffects(dt);
      if ((this.spawnT -= dt) <= 0) { this.spawnT = 1; this.spawnTick(); }
    }
    this.placeCamera(dt);
    this.updateSky(running ? dt : 0);
    this.updateTarget();
    this.updateBreaking(dt);
    if (this.mouseR && s === 'play' && (this.useCd -= dt) <= 0) { this.useCd = .25; this.useItem(true); }
  }

  updatePlayer(dt, input) {
    const p = this.p, k = input ? this.keys : {}, w = this.world, creative = this.mode === 'creative';
    const inLava = touches(w, p, B.LAVA), shift = !!(k.ShiftLeft || k.ShiftRight);
    let f = (k.KeyW ? 1 : 0) - (k.KeyS ? 1 : 0), st = (k.KeyD ? 1 : 0) - (k.KeyA ? 1 : 0);
    if (input) { f -= this.move.y; st += this.move.x; }

    p.sneaking = shift && !p.flying;
    const canSprint = creative || p.food > 6;
    const wantSprint = k.ControlLeft || k.ControlRight || this.wSprint || (input && this.touchSprint);
    if (wantSprint && f > 0 && !p.sneaking && canSprint) p.sprinting = true;
    if (f <= 0 || p.sneaking || !canSprint) p.sprinting = false;

    let speed = p.flying ? (p.sprinting ? 21 : 10.9) : p.sneaking ? 1.3 : p.sprinting ? 5.6 : 4.3;
    if (inLava) speed *= .35;
    const len = Math.max(1, Math.hypot(f, st));
    f /= len; st /= len;
    const sn = Math.sin(p.yaw), cs = Math.cos(p.yaw);
    const wx = (-sn * f + cs * st) * speed, wz = (-cs * f - sn * st) * speed;
    const acc = Math.min(1, dt * (p.onGround || p.flying ? 14 : 4));
    p.vx += (wx - p.vx) * acc;
    p.vz += (wz - p.vz) * acc;

    if (p.flying) {
      const target = ((k.Space ? 1 : 0) - (shift ? 1 : 0)) * 8;
      p.vy += (target - p.vy) * Math.min(1, dt * 10);
    } else if (inLava) {
      p.vy = k.Space ? 2 : Math.max(p.vy - 10 * dt, -1.5);
    } else {
      if (k.Space && p.onGround) { p.vy = 8.4; p.onGround = false; p.exh += p.sprinting ? .2 : .05; }
      p.vy = Math.max(p.vy - 28 * dt, -55);
    }

    const ox = p.x, oz = p.z, wasGround = p.onGround;
    // ghemuit, nu cazi de pe margine
    const rx = moveEntity(w, p, p.vx * dt, 0, 0);
    if (p.sneaking && wasGround && !hasSupport(w, p)) { p.x = ox; p.vx = 0; }
    const rz = moveEntity(w, p, 0, 0, p.vz * dt);
    if (p.sneaking && wasGround && !hasSupport(w, p)) { p.z = oz; p.vz = 0; }
    const ry = moveEntity(w, p, 0, p.vy * dt, 0);
    if (rx.hx) p.vx = 0;
    if (rz.hz) p.vz = 0;
    if ((rx.hx || rz.hz) && p.sprinting && !p.flying) p.sprinting = false;
    if (ry.hy) { p.onGround = p.vy < 0; p.vy = 0; } else p.onGround = false;
    if (p.flying && p.onGround) p.flying = false;

    if (p.onGround || p.flying || inLava) {
      if (p.onGround && !wasGround && !creative && !inLava) {
        const fall = p.maxY - p.y;
        if (fall > 3.4) this.hurtPlayer(Math.floor(fall - 3), null, 'Ai căzut de prea sus.');
      }
      p.maxY = p.y;
    } else p.maxY = Math.max(p.maxY, p.y);

    if (!creative) {
      if (p.onGround) p.exh += Math.hypot(p.x - ox, p.z - oz) * (p.sprinting ? .1 : .01);
      while (p.exh >= 4) { p.exh -= 4; if (p.sat > 0) p.sat = Math.max(0, p.sat - 1); else p.food = Math.max(0, p.food - 1); }
      if (p.food >= 18 && p.health < 20) {
        if ((p.regen += dt) >= 3) { p.regen = 0; p.health = Math.min(20, p.health + 1); p.exh += 3; }
      } else p.regen = 0;
      if (p.food === 0) {
        if ((p.starve += dt) >= 4) { p.starve = 0; this.hurtPlayer(1, null, 'Ai murit de foame.'); }
      } else p.starve = 0;
      if (inLava) {
        if ((p.lavaT -= dt) <= 0) { p.lavaT = .5; this.hurtPlayer(4, null, 'Ai încercat să înoți în lavă.'); }
      } else p.lavaT = 0;
    }
    if (p.y < -10) {
      if (creative) { p.y = WY; p.vy = 0; } else this.hurtPlayer(100, null, 'Ai căzut din lume.');
    }
    p.invul = Math.max(0, p.invul - dt);
  }

  placeCamera(dt) {
    const p = this.p, cam = this.camera;
    cam.position.set(p.x, p.y + (p.dead ? .3 : p.sneaking ? 1.32 : 1.62), p.z);
    cam.rotation.set(p.pitch, p.yaw, 0);
    const fov = p.sprinting ? (p.flying ? 85 : 80) : 70;
    if (Math.abs(cam.fov - fov) > .01) {
      cam.fov += (fov - cam.fov) * Math.min(1, dt * 10);
      cam.updateProjectionMatrix();
    }
  }

  updateSky(dt) {
    this.time += dt / DAY_LENGTH;
    const a = (this.time % 1) * Math.PI * 2, sunH = Math.sin(a), dl = clamp((sunH + .15) / .45, 0, 1);
    this.daylight = dl;
    this.skyLevel = Math.round(4 + 11 * dl);
    const dusk = clamp(1 - Math.abs(sunH) / .3, 0, 1) * .45;
    const c = [0, 1, 2].map(i => lerp(lerp(SKY_NIGHT[i], SKY_DAY[i], dl), SKY_DUSK[i], dusk));
    this.scene.background.setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace);
    this.scene.fog.color.copy(this.scene.background);
    const u = this.material.uniforms;
    u.fogColor.value.set(c[0], c[1], c[2]);
    u.daylight.value = .18 + .82 * dl;

    const dir = this._sun.set(Math.cos(a), sunH, .3).normalize(), cam = this.camera.position;
    this.sun.position.copy(cam).addScaledVector(dir, 200); this.sun.lookAt(cam);
    this.moon.position.copy(cam).addScaledVector(dir, -200); this.moon.lookAt(cam);
    this.sunLight.position.copy(dir).multiplyScalar(100);
    this.sunLight.intensity = Math.PI * .6 * dl;
    this.ambient.intensity = Math.PI * (.25 + .5 * dl);
    for (const m of Object.values(this.spriteMats)) m.color.setScalar(.35 + .65 * dl);
  }

  lookDir() {
    const p = this.p;
    return this._dir.set(-Math.sin(p.yaw) * Math.cos(p.pitch), Math.sin(p.pitch), -Math.cos(p.yaw) * Math.cos(p.pitch));
  }

  updateTarget() {
    if (this.screen !== 'play' || this.p.dead) { this.target = null; this.outline.visible = false; return; }
    const t = this.target = raycast(this.world, this.camera.position, this.lookDir(), REACH[this.mode]);
    if (!t) { this.outline.visible = false; return; }
    const b = BLOCK[t.id].box || FULL;
    this.outline.position.set(t.x + (b[0] + b[3]) / 2, t.y + (b[1] + b[4]) / 2, t.z + (b[2] + b[5]) / 2);
    this.outline.scale.set((b[3] - b[0]) * 1.002, (b[4] - b[1]) * 1.002, (b[5] - b[2]) * 1.002);
    this.outline.visible = true;
  }

  // ---------- blocuri ----------

  heldTool() { const s = this.inv.slots[this.sel]; return (s && item(s.id).tool) || null; }

  canHarvest(d, tool) { return !d.tier || (tool && tool.type === 'pickaxe' && tool.tier >= d.tier); }

  breakTime(id) {
    const d = BLOCK[id];
    if (d.hardness === Infinity) return Infinity;
    if (this.mode === 'creative') return 0;
    const tool = this.heldTool();
    let t = d.hardness * (this.canHarvest(d, tool) ? 1.5 : 5);
    if (tool && d.tool === tool.type) t /= tool.speed;
    return t;
  }

  updateBreaking(dt) {
    this.breakCd -= dt;
    const t = this.target;
    if (!this.mouseL || !t || this.screen !== 'play') { this.breaking = null; this.crack.visible = false; return; }
    if (this.breakCd > 0) return;
    const key = `${t.x},${t.y},${t.z}`;
    if (!this.breaking || this.breaking.key !== key) {
      this.breaking = { key, prog: 0 };
      const d = BLOCK[t.id], now = performance.now();
      if (this.mode === 'survival' && !this.canHarvest(d, this.heldTool()) && now - this.lastHint > 6000) {
        this.lastHint = now;
        this.msg(d.tier >= 2 ? `Pentru ${d.name.toLowerCase()} ai nevoie de un târnăcop mai bun.` : `Fără târnăcop, ${d.name.toLowerCase()} nu lasă nimic.`);
      }
    }
    const bt = this.breakTime(t.id);
    if (bt === Infinity) return;
    this.breaking.prog += bt === 0 ? 1 : dt / bt;
    if (this.breaking.prog >= 1) {
      this.breakBlock(t.x, t.y, t.z);
      this.breaking = null;
      this.crack.visible = false;
      this.breakCd = this.mode === 'creative' ? .2 : .08;
      return;
    }
    this.crack.visible = true;
    this.crack.position.copy(this.outline.position);
    this.crack.scale.copy(this.outline.scale).multiplyScalar(1.003);
    this.crack.material.opacity = .15 + this.breaking.prog * .55;
  }

  breakBlock(x, y, z) {
    const w = this.world, id = w.get(x, y, z), d = BLOCK[id], survival = this.mode === 'survival';
    w.set(x, y, z, B.AIR);
    if (survival) {
      const tool = this.heldTool();
      if (this.canHarvest(d, tool)) {
        const drop = id === B.LEAVES ? (Math.random() < .08 ? I.APPLE : null) : d.drop;
        if (drop) this.spawnItem(drop, 1, x + .5, y + .3, z + .5);
      }
      if (tool && d.hardness > 0) this.damageTool(1);
      this.p.exh += .005;
    }
    if (w.get(x, y + 1, z) === B.TORCH) {
      w.set(x, y + 1, z, B.AIR);
      if (survival) this.spawnItem(B.TORCH, 1, x + .5, y + 1.3, z + .5);
    }
    this.blocksChanged(x, x, z, z);
  }

  blocksChanged(x0, x1, z0, z1) {
    for (const k of this.world.relight(x0, x1, z0, z1)) this.rebuildChunk(k);
  }

  rebuildChunk(k) {
    const g = this.world.buildChunkGeometry(k % CX, Math.floor(k / CX));
    const m = this.chunks[k];
    if (m) { m.geometry.dispose(); m.geometry = g; }
    else { this.chunks[k] = new THREE.Mesh(g, this.material); this.scene.add(this.chunks[k]); }
  }

  useItem(repeat) {
    const t = this.target, s = this.inv.slots[this.sel], def = s && item(s.id), p = this.p;
    if (!repeat && t && !p.sneaking) {
      if (t.id === B.TABLE) return this.openInventory('table');
      if (t.id === B.FURNACE) return this.openInventory('furnace');
      if (t.id === B.BED) return this.sleep(t);
    }
    if (def?.food) {
      if (this.mode === 'survival' && p.food < 20) {
        p.food = Math.min(20, p.food + def.food);
        p.sat = Math.min(p.food, p.sat + def.food * .6);
        this.consumeHeld();
        this.emit();
      }
      return;
    }
    if (def?.block && t) this.placeBlock(t, s);
  }

  placeBlock(t, s) {
    if (!t.n[0] && !t.n[1] && !t.n[2]) return;
    const x = t.x + t.n[0], y = t.y + t.n[1], z = t.z + t.n[2], w = this.world;
    if (!w.inside(x, y, z)) return;
    const cur = w.get(x, y, z);
    if (cur !== B.AIR && cur !== B.LAVA) return;
    const bid = item(s.id).block, d = BLOCK[bid];
    if (bid === B.TORCH && (BLOCK[t.id].box || t.n[1] === -1)) return;
    if (d.solid) {
      const b = d.box || FULL, box = [x + b[0], y + b[1], z + b[2], x + b[3], y + b[4], z + b[5]];
      if (aabbOverlap(this.p, ...box) || this.mobs.some(m => aabbOverlap(m, ...box))) return;
    }
    w.set(x, y, z, bid);
    if (this.mode === 'survival') this.consumeHeld();
    this.blocksChanged(x, x, z, z);
    this.emit();
  }

  consumeHeld() {
    const s = this.inv.slots[this.sel];
    if (s && --s.count <= 0) this.inv.slots[this.sel] = null;
  }

  damageTool(n) {
    const s = this.inv.slots[this.sel];
    if (!s || this.mode !== 'survival' || !item(s.id).tool) return;
    s.dur -= n;
    if (s.dur <= 0) { this.inv.slots[this.sel] = null; this.msg(`${item(s.id).name} s-a rupt!`); }
  }

  pickBlock() {
    const t = this.target;
    if (this.mode !== 'creative' || !t) return;
    const i = this.inv.slots.findIndex((s, j) => j < 9 && s && s.id === t.id);
    if (i >= 0) this.select(i);
    else { this.inv.slots[this.sel] = { id: t.id, count: 64 }; this.select(this.sel); }
  }

  dropHeld() {
    const s = this.inv.slots[this.sel];
    if (!s) return;
    const d = this.lookDir(), c = this.camera.position;
    this.spawnItem(s.id, 1, c.x + d.x * .4, c.y - .3 + d.y * .4, c.z + d.z * .4, { x: d.x * 5, y: d.y * 5 + 2, z: d.z * 5 }, 1.5, s.dur);
    this.consumeHeld();
    this.emit();
  }

  sleep(t) {
    if (this.daylight > .3) return this.msg('Poți dormi doar noaptea.');
    if (this.mobs.some(m => m.cfg.hostile && Math.hypot(m.x - this.p.x, m.y - this.p.y, m.z - this.p.z) < 8))
      return this.msg('Nu poți dormi acum: sunt monștri în apropiere!');
    this.bed = { x: t.x, y: t.y, z: t.z };
    this.sleepT = 1.5;
    this.msg('Punctul de renaștere a fost setat la pat.');
  }

  explode(x, y, z, r) {
    const w = this.world, bx = Math.floor(x), by = Math.floor(y), bz = Math.floor(z);
    for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) for (let dz = -r; dz <= r; dz++) {
      if (dx * dx + dy * dy + dz * dz > r * r + Math.random() * 2) continue;
      const id = w.get(bx + dx, by + dy, bz + dz);
      if (!id || id === B.BEDROCK || id === B.LAVA) continue;
      w.set(bx + dx, by + dy, bz + dz, B.AIR);
      const drop = id === B.LEAVES ? null : BLOCK[id].drop;
      if (this.mode === 'survival' && drop && Math.random() < .3) this.spawnItem(drop, 1, bx + dx + .5, by + dy + .5, bz + dz + .5);
    }
    this.blocksChanged(bx - r, bx + r, bz - r, bz + r);
    const p = this.p, pd = Math.hypot(p.x - x, p.y + .9 - y, p.z - z);
    if (pd < 7) this.hurtPlayer(Math.round(20 * (1 - pd / 7)), { x, z }, 'Ai fost aruncat în aer de un creeper.');
    for (const m of this.mobs) {
      const md = Math.hypot(m.x - x, m.y - y, m.z - z);
      if (md < 7) this.damageMob(m, Math.round(20 * (1 - md / 7)), { x, z });
    }
    const mesh = new THREE.Mesh(this.boomGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .8 }));
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
    this.effects.push({ mesh, t: 0 });
  }

  // ---------- jucător: viață ----------

  hurtPlayer(dmg, src, cause) {
    const p = this.p;
    if (this.mode === 'creative' || p.dead || p.invul > 0 || dmg <= 0) return;
    p.health = Math.max(0, p.health - dmg);
    p.invul = .5;
    p.hurtAt = performance.now();
    p.exh += .1;
    if (src) {
      const dx = p.x - src.x, dz = p.z - src.z, l = Math.hypot(dx, dz) || 1;
      p.vx = dx / l * 7; p.vz = dz / l * 7;
      p.vy = Math.max(p.vy, 5); p.onGround = false;
    }
    if (p.health <= 0) this.die(cause);
    this.emit();
  }

  die(cause) {
    const p = this.p;
    p.dead = true;
    this.screen = 'dead';
    this.deathCause = cause;
    this.deathPos = [Math.floor(p.x), Math.floor(p.y), Math.floor(p.z)];
    const drop = s => this.spawnItem(s.id, s.count, p.x, p.y + 1, p.z, { x: (Math.random() - .5) * 6, y: 4, z: (Math.random() - .5) * 6 }, 2, s.dur);
    this.inv.slots.forEach((s, i) => { if (s) { drop(s); this.inv.slots[i] = null; } });
    if (this.cursor) { drop(this.cursor); this.cursor = null; }
    this.releaseInputs();
    document.exitPointerLock();
  }

  // ---------- mobi ----------

  attack() {
    const o = this.camera.position, d = this.lookDir();
    let best = null, bt = Math.min(3.5, this.target ? this.target.t : Infinity);
    for (const m of this.mobs) {
      const r = rayBox(o, d, m.x - m.w, m.y, m.z - m.w, m.x + m.w, m.y + m.h, m.z + m.w);
      if (r && r.t < bt) { bt = r.t; best = m; }
    }
    if (!best) return false;
    const tool = this.heldTool();
    this.damageMob(best, tool ? tool.dmg : 1, this.p);
    if (tool) this.damageTool(tool.type === 'sword' ? 1 : 2);
    this.p.exh += .1;
    this.mouseL = false;
    return true;
  }

  damageMob(m, dmg, src) {
    if (m.dead || m.invul > 0) return;
    m.hp -= dmg; m.hurt = .3; m.invul = .45;
    if (src) {
      const dx = m.x - src.x, dz = m.z - src.z, l = Math.hypot(dx, dz) || 1;
      m.kx = dx / l * 6; m.kz = dz / l * 6;
      if (m.onGround) m.vy = 5;
    }
    if (!m.cfg.hostile) { m.panic = 5; m.timer = 0; }
    if (m.hp <= 0) {
      m.dead = true;
      for (const [id, a, b] of m.cfg.drops) {
        const n = a + Math.floor(Math.random() * (b - a + 1));
        if (n) this.spawnItem(id, n, m.x, m.y + .5, m.z);
      }
    }
  }

  updateMobs(dt) {
    for (let i = this.mobs.length - 1; i >= 0; i--) {
      const m = this.mobs[i];
      if (!m.dead) updateMob(m, dt, this);
      const far = Math.hypot(m.x - this.p.x, m.z - this.p.z);
      const despawn = m.cfg.hostile && (far > 64 || (this.daylight > .8 && far > 20 && Math.random() < dt * .05));
      if (m.dead || despawn || m.y < -10) {
        this.scene.remove(m.group);
        for (const mt of m.mats) mt.dispose();
        this.mobs.splice(i, 1);
      }
    }
  }

  spawnTick() {
    const hostile = this.mobs.filter(m => m.cfg.hostile).length, passive = this.mobs.length - hostile;
    if (this.mode === 'survival' && hostile < 10)
      for (let i = 0; i < 3; i++) this.trySpawn(HOSTILE[Math.random() * HOSTILE.length | 0], true, this.p.x, this.p.z, 18, 34);
    if (passive < 12 && this.daylight > .5 && Math.random() < .15)
      this.trySpawn(PASSIVE[Math.random() * PASSIVE.length | 0], false, this.p.x, this.p.z, 24, 40);
  }

  // dark: monștrii apar doar unde lumina e cel mult 7; animalele doar pe iarbă, sub cerul liber
  trySpawn(type, dark, cx, cz, dmin, dmax) {
    const a = Math.random() * Math.PI * 2, dist = dmin + Math.random() * (dmax - dmin);
    const x = Math.floor(cx + Math.sin(a) * dist), z = Math.floor(cz + Math.cos(a) * dist);
    if (x < 1 || z < 1 || x >= WX - 1 || z >= WZ - 1) return false;
    const w = this.world, cands = [];
    for (let y = 1; y < WY - 2; y++) {
      const below = w.get(x, y - 1, z), here = w.get(x, y, z), above = w.get(x, y + 1, z);
      if (!SOLID[below] || below === B.LEAVES || below === B.BED || SOLID[here] || SOLID[above] || here === B.LAVA || above === B.LAVA) continue;
      const i = w.idx(x, y, z), sky = w.sky[i], blk = w.blk[i];
      if (dark ? Math.max(blk, sky - (15 - this.skyLevel)) > 7 : below !== B.GRASS || sky < 15) continue;
      cands.push(y);
    }
    if (!cands.length) return false;
    const m = createMob(type, x + .5, cands[Math.random() * cands.length | 0], z + .5);
    this.scene.add(m.group);
    this.mobs.push(m);
    return true;
  }

  lineOfSight(m) {
    const o = { x: m.x, y: m.y + 1.5, z: m.z }, p = this.p;
    const d = { x: p.x - o.x, y: p.y + 1.6 - o.y, z: p.z - o.z }, len = Math.hypot(d.x, d.y, d.z);
    d.x /= len; d.y /= len; d.z /= len;
    return !raycast(this.world, o, d, len);
  }

  shootArrow(m) {
    const p = this.p, sx = m.x, sy = m.y + 1.5, sz = m.z;
    const dx = p.x - sx, dz = p.z - sz, dh = Math.hypot(dx, dz) || 1, speed = 22, t = dh / speed;
    const vy = (p.y + 1.2 - sy) / t + .5 * 18 * t;
    const mesh = new THREE.Mesh(this.arrowGeo, this.arrowMat);
    this.scene.add(mesh);
    const j = () => (Math.random() - .5) * 1.2;
    this.arrows.push({ x: sx, y: sy, z: sz, vx: dx / dh * speed + j(), vy: vy + j(), vz: dz / dh * speed + j(), life: 5, mesh });
  }

  updateArrows(dt) {
    const p = this.p;
    for (let i = this.arrows.length - 1; i >= 0; i--) {
      const a = this.arrows[i];
      a.vy -= 18 * dt;
      a.x += a.vx * dt; a.y += a.vy * dt; a.z += a.vz * dt;
      a.life -= dt;
      let gone = a.life <= 0 || SOLID[this.world.get(Math.floor(a.x), Math.floor(a.y), Math.floor(a.z))];
      if (!gone && !p.dead && aabbOverlap({ x: p.x, y: p.y - .1, z: p.z, w: p.w + .1, h: p.h + .2 }, a.x, a.y, a.z, a.x, a.y, a.z)) {
        this.hurtPlayer(3, { x: a.x - a.vx, z: a.z - a.vz }, 'Ai fost împușcat de un schelet.');
        gone = true;
      }
      if (gone) { this.scene.remove(a.mesh); this.arrows.splice(i, 1); continue; }
      a.mesh.position.set(a.x, a.y, a.z);
      a.mesh.lookAt(a.x + a.vx, a.y + a.vy, a.z + a.vz);
    }
  }

  updateEffects(dt) {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const e = this.effects[i];
      e.t += dt;
      e.mesh.scale.setScalar(1 + e.t * 12);
      e.mesh.material.opacity = .8 * (1 - e.t / .35);
      if (e.t >= .35) { this.scene.remove(e.mesh); e.mesh.material.dispose(); this.effects.splice(i, 1); }
    }
  }

  // ---------- obiecte aruncate pe jos ----------

  spriteMat(id) {
    if (!this.spriteMats[id]) {
      const tex = new THREE.CanvasTexture(iconCanvas(id));
      tex.magFilter = tex.minFilter = THREE.NearestFilter;
      tex.colorSpace = THREE.SRGBColorSpace;
      this.spriteMats[id] = new THREE.SpriteMaterial({ map: tex, alphaTest: .1 });
    }
    return this.spriteMats[id];
  }

  spawnItem(id, count, x, y, z, vel, delay = .5, dur) {
    const sp = new THREE.Sprite(this.spriteMat(id));
    sp.scale.setScalar(.38);
    this.scene.add(sp);
    const v = vel || { x: (Math.random() - .5) * 3, y: 3.5, z: (Math.random() - .5) * 3 };
    this.items.push({ id, count, dur, x, y, z, vx: v.x, vy: v.y, vz: v.z, w: .12, h: .25, age: 0, delay, sp });
  }

  updateItems(dt) {
    const p = this.p, w = this.world;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.age += dt; it.delay -= dt;
      it.vy -= 18 * dt;
      const r = moveEntity(w, it, it.vx * dt, it.vy * dt, it.vz * dt);
      if (r.hy) { it.vy = 0; const f = Math.max(0, 1 - dt * 8); it.vx *= f; it.vz *= f; }
      if (r.hx) it.vx = 0;
      if (r.hz) it.vz = 0;
      let gone = it.age > 300 || w.get(Math.floor(it.x), Math.floor(it.y + .1), Math.floor(it.z)) === B.LAVA || it.y < -10;
      if (!gone && !p.dead && it.delay <= 0) {
        const dx = p.x - it.x, dy = p.y + .9 - it.y, dz = p.z - it.z;
        if (dx * dx + dy * dy + dz * dz < 2.25) {
          it.count = this.inv.add(it.id, it.count, it.dur);
          gone = it.count === 0;
        }
      }
      if (gone) { this.scene.remove(it.sp); this.items.splice(i, 1); continue; }
      it.sp.position.set(it.x, it.y + .22 + Math.sin(it.age * 3) * .05, it.z);
    }
  }

  // ---------- stare pentru React ----------

  msg(text) {
    this.messages.push({ id: ++this.msgId, text, t: performance.now() });
    if (this.messages.length > 6) this.messages.shift();
    this.emit();
  }

  emit() {
    const now = performance.now(), p = this.p;
    this.lastEmit = now;
    this.messages = this.messages.filter(m => now - m.t < 6000);
    this.onUpdate({
      now, touch: this.touch, screen: this.screen, mode: this.mode,
      sel: this.sel, station: this.station, fuel: this.fuel,
      health: p.health, food: p.food, hurtAt: p.hurtAt, heldNameAt: this.heldNameAt,
      slots: this.inv.slots.map(s => s && { ...s }),
      cursor: this.cursor && { ...this.cursor },
      recipes: this.screen === 'inventory' && this.mode === 'survival'
        ? recipesFor(this.station).map(r => ({ ...r, ok: this.canCraft(r) })) : null,
      messages: [...this.messages],
      sleep: this.sleepT > 0 ? clamp(1 - this.sleepT / 1.5, 0, 1) : 0,
      death: this.screen === 'dead' ? { cause: this.deathCause, pos: this.deathPos } : null,
      debug: this.debug ? this.debugInfo() : null,
      fullscreen: !!document.fullscreenElement,
    });
  }

  debugInfo() {
    const p = this.p, w = this.world, bx = Math.floor(p.x), by = Math.floor(p.y), bz = Math.floor(p.z);
    const i = w.inside(bx, by, bz) ? w.idx(bx, by, bz) : -1;
    const hours = (6 + (this.time % 1) * 24) % 24, pad = n => String(Math.floor(n)).padStart(2, '0');
    const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw);
    const facing = Math.abs(fx) > Math.abs(fz) ? (fx > 0 ? 'Est (+X)' : 'Vest (−X)') : (fz > 0 ? 'Sud (+Z)' : 'Nord (−Z)');
    const hostile = this.mobs.filter(m => m.cfg.hostile).length, sp = this.bed ? this.bed : this.worldSpawn;
    return {
      fps: this.fps,
      xyz: `${p.x.toFixed(2)} / ${p.y.toFixed(2)} / ${p.z.toFixed(2)}`,
      block: `${bx} ${by} ${bz}`,
      facing,
      time: `ziua ${Math.floor(this.time) + 1}, ${pad(hours)}:${pad((hours % 1) * 60)}`,
      light: i >= 0 ? `cer ${w.sky[i]}, torțe ${w.blk[i]}` : '-',
      target: this.target ? `${BLOCK[this.target.id].name} (${this.target.x} ${this.target.y} ${this.target.z})` : '-',
      mobs: `${this.mobs.length - hostile} animale, ${hostile} monștri`,
      spawn: `${Math.floor(sp.x)} ${Math.floor(sp.y)} ${Math.floor(sp.z)}${this.bed ? ' (pat)' : ''}`,
    };
  }
}
