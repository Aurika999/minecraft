// Leagă simularea, grafica și controalele; trimite starea către React.
import { N, TOOL, DAY_SECONDS, ANIMALS } from './config.js';
import { City, ZONES } from './city.js';
import { CityView } from './view.js';

const SAVE_KEY = 'orasul-meu-v1';

function loadSave() {
  try { return City.fromJSON(JSON.parse(localStorage.getItem(SAVE_KEY))); } catch { return null; }
}

export class Engine {
  constructor(mount, onUpdate) {
    this.onUpdate = onUpdate;
    const saved = loadSave();
    this.city = saved || City.create();
    this.welcome = !saved;
    this.view = new CityView(mount);
    this.view.rebuild(this.city);
    this.builtVersion = this.city.version;
    this.tool = 'inspect';
    this.speed = 1;
    this.selected = null;
    this.messages = []; this.msgId = 0;
    this.pointers = new Map(); this.drag = null;
    this.acc = 0; this.lastRebuild = 0; this.lastEmit = 0; this.lastHints = 0;
    this.bind();
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
    this.emit();
  }

  bind() {
    const c = this.view.canvas;
    c.style.touchAction = 'none';
    this.h = {
      pointerdown: e => this.onDown(e), pointermove: e => this.onMove(e), pointerup: e => this.onUp(e),
      pointercancel: e => this.onUp(e), pointerleave: e => { if (e.pointerType === 'mouse' && !this.drag) this.view.setPreview([]); },
      wheel: e => { e.preventDefault(); this.view.zoomBy(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX, e.clientY); },
      contextmenu: e => e.preventDefault(),
    };
    for (const [k, f] of Object.entries(this.h)) c.addEventListener(k, f, k === 'wheel' ? { passive: false } : undefined);
    this.onKey = e => this.key(e);
    this.onResize = () => this.view.resize();
    this.onHide = () => { if (document.hidden) this.save(); };
    addEventListener('keydown', this.onKey);
    addEventListener('resize', this.onResize);
    document.addEventListener('visibilitychange', this.onHide);
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.save();
    for (const [k, f] of Object.entries(this.h)) this.view.canvas.removeEventListener(k, f);
    removeEventListener('keydown', this.onKey);
    removeEventListener('resize', this.onResize);
    document.removeEventListener('visibilitychange', this.onHide);
    this.view.dispose();
  }

  // ---------- acțiuni din interfață ----------

  setTool(id) { this.tool = id; if (id !== 'inspect') this.select(null); this.view.setPreview([]); this.emit(); }
  setSpeed(s) { this.speed = s; this.emit(); }
  setTax(t) { this.city.tax = t; this.city.updateStats(); this.emit(); }
  closeWelcome() { this.welcome = false; this.emit(); }
  rotate(d) { this.view.rotate(d); }
  zoom(f) { this.view.zoomBy(f); }
  select(t) { this.selected = t; this.view.setSelected(t); this.emit(); }

  setRanch(x, z, j) {
    const r = this.city.setAnimal(this.city.idx(x, z), j);
    if (r.error) { this.msg(r.error); return; }
    const a = ANIMALS[j];
    this.msg(`${a.icon} Ferma are acum ${a.name.toLowerCase()}: ${a.product}, +${a.income} $ pe lună.`);
    this.save();
    this.emit();
  }

  newCity() {
    this.city = City.create();
    this.selected = null;
    this.view.setSelected(null);
    this.view.cars = [];
    this.view.target.set(0, 0, 0);
    this.view.updateCamera();
    this.view.rebuild(this.city);
    this.builtVersion = this.city.version;
    this.welcome = true;
    this.save();
    this.emit();
  }

  save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.city.toJSON())); } catch { /* spațiu plin sau mod privat */ }
  }

  msg(text) {
    const now = performance.now();
    if (this.messages.some(m => m.text === text && now - m.t < 8000)) return;
    this.messages.push({ id: ++this.msgId, text, t: now });
    if (this.messages.length > 4) this.messages.shift();
    this.emit();
  }

  // ---------- controale ----------

  tilesFor(a, b) {
    const mode = TOOL[this.tool].mode, out = [];
    if (mode === 'tap') return [[b.x, b.z]];
    if (mode === 'line') {
      // drum în formă de L: întâi pe axa cu distanța mai mare
      const xFirst = Math.abs(b.x - a.x) >= Math.abs(b.z - a.z), corner = xFirst ? { x: b.x, z: a.z } : { x: a.x, z: b.z };
      const seg = (p, q) => {
        const n = Math.max(Math.abs(q.x - p.x), Math.abs(q.z - p.z));
        for (let s = 0; s <= n; s++) out.push([p.x + Math.sign(q.x - p.x) * s, p.z + Math.sign(q.z - p.z) * s]);
      };
      seg(a, corner); seg(corner, b);
      return out.filter(([x, z], i) => out.findIndex(([x2, z2]) => x2 === x && z2 === z) === i);
    }
    for (let z = Math.min(a.z, b.z); z <= Math.max(a.z, b.z); z++)
      for (let x = Math.min(a.x, b.x); x <= Math.max(a.x, b.x); x++) out.push([x, z]);
    return out;
  }

  showPreview(a, b) {
    const tiles = this.tilesFor(a, b), c = this.city;
    let cost = 0;
    const items = tiles.map(([x, z]) => {
      const ok = !c.check(this.tool, c.idx(x, z));
      if (ok) cost += c.cost(this.tool, c.idx(x, z));
      return { x, z, ok };
    });
    const afford = cost <= c.money;
    this.view.setPreview(items.map(it => ({ ...it, ok: it.ok && afford })));
    this.previewCost = cost;
    this.emit();
  }

  onDown(e) {
    this.view.canvas.setPointerCapture(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY });
    if (this.pointers.size === 2) { this.drag = { mode: 'gesture' }; this.view.setPreview([]); this.previewCost = 0; return; }
    if (this.pointers.size > 2) return;
    if (e.pointerType === 'mouse' && e.button !== 0) { this.drag = { mode: 'pan' }; return; }
    if (this.tool === 'inspect') { this.drag = { mode: 'tap', moved: false }; return; }
    const t = this.view.pickTile(e.clientX, e.clientY);
    if (!t) { this.drag = { mode: 'pan' }; return; }
    this.drag = { mode: 'build', a: t, b: t };
    this.showPreview(t, t);
  }

  onMove(e) {
    const p = this.pointers.get(e.pointerId);
    if (!p) {
      // mouse fără click: arată unde ar construi unealta
      if (e.pointerType === 'mouse' && this.tool !== 'inspect') {
        const t = this.view.pickTile(e.clientX, e.clientY);
        if (t && (!this.hover || t.x !== this.hover.x || t.z !== this.hover.z)) { this.hover = t; this.showPreview(t, t); }
      }
      return;
    }
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    const d = this.drag;
    if (!d) return;
    if (d.mode === 'gesture' && this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()], dist = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      if (d.dist) {
        this.view.zoomBy(dist / d.dist, mid.x, mid.y);
        this.view.pan(mid.x - d.mid.x, mid.y - d.mid.y);
      }
      d.dist = dist; d.mid = mid;
    } else if (d.mode === 'pan') this.view.pan(dx, dy);
    else if (d.mode === 'tap') {
      if (Math.hypot(e.clientX - p.sx, e.clientY - p.sy) > 8) d.moved = true;
      if (d.moved) this.view.pan(dx, dy);
    } else if (d.mode === 'build') {
      const t = this.view.pickTile(e.clientX, e.clientY);
      if (t && (t.x !== d.b.x || t.z !== d.b.z)) { d.b = t; this.showPreview(d.a, t); }
    }
  }

  onUp(e) {
    if (!this.pointers.has(e.pointerId)) return;
    this.pointers.delete(e.pointerId);
    const d = this.drag, done = e.type === 'pointerup';
    if (d?.mode === 'build' && done) this.commit(d.a, d.b);
    else if (d?.mode === 'tap' && !d.moved && done) this.select(this.view.pickTile(e.clientX, e.clientY));
    if (d?.mode === 'build' || d?.mode === 'gesture') { this.view.setPreview([]); this.previewCost = 0; }
    // după ce ridici un deget din două, celălalt doar mută harta
    this.drag = this.pointers.size ? { mode: 'pan' } : null;
    this.emit();
  }

  commit(a, b) {
    const r = this.city.apply(this.tool, this.tilesFor(a, b));
    if (r.error) { this.msg(r.error); return; }
    this.view.rebuild(this.city);
    this.builtVersion = this.city.version;
    if (TOOL[this.tool].zone || this.tool === 'road') this.hints(true);
    // după ce pui o fermă, se deschide meniul ei ca să alegi animalele
    if (this.tool === 'ranch') { this.setTool('inspect'); this.select(b); }
    this.save();
  }

  key(e) {
    if (e.target.closest?.('input, textarea')) return;
    const k = e.key.toLowerCase();
    if (k === 'q') this.rotate(-1);
    else if (k === 'e') this.rotate(1);
    else if (k === ' ') { e.preventDefault(); this.setSpeed(this.speed ? 0 : 1); }
    else if (k === 'escape') this.setTool('inspect');
    else if (k === '+' || k === '=') this.zoom(1.2);
    else if (k === '-') this.zoom(1 / 1.2);
    else if (['arrowleft', 'a'].includes(k)) this.view.pan(60, 0);
    else if (['arrowright', 'd'].includes(k)) this.view.pan(-60, 0);
    else if (['arrowup', 'w'].includes(k)) this.view.pan(0, 60);
    else if (['arrowdown', 's'].includes(k)) this.view.pan(0, -60);
  }

  // sfaturi pentru jucător, după ce se uită la oraș
  hints(soon) {
    const now = performance.now();
    if (!soon && now - this.lastHints < 15000) return;
    this.lastHints = now;
    const c = this.city;
    let zones = 0, noRoad = 0, noPower = 0, noWater = 0, power = 0, water = 0;
    for (let i = 0; i < N * N; i++) {
      const k = c.kind[i];
      if (k === 'power' || k === 'wind' || k === 'solar') power++;
      if (k === 'water') water++;
      if (!ZONES.has(k)) continue;
      zones++;
      if (!c.road[i]) noRoad++;
      else if (!c.powered[i]) noPower++;
      else if (!c.watered[i] && c.level[i] >= 1) noWater++;
    }
    if (!zones) return;
    if (!power) this.msg('⚡ Zonele au nevoie de curent: construiește o centrală electrică.');
    else if (noPower) this.msg(`⚡ ${noPower} pătrățele de zonă nu au curent. Construiește o centrală mai aproape.`);
    if (noRoad) this.msg(`🛣️ ${noRoad} pătrățele de zonă sunt prea departe de drum (max. 2 pătrățele).`);
    if (c.stats.pop > 0 && !water) this.msg('💧 Clădirile rămân mici fără apă: construiește un turn de apă.');
    else if (noWater > 5) this.msg('💧 Unele clădiri nu au apă. Mai construiește un turn de apă.');
    if (c.money < 0) this.msg('💸 Ești pe minus! Crește taxele sau construiește mai puțin.');
  }

  // ---------- bucla ----------

  loop = (t) => {
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(.1, (t - this.last) / 1000);
    this.last = t;
    const c = this.city, len = DAY_SECONDS[this.speed];
    if (!this.welcome) {
      this.acc += dt;
      for (let n = 0; this.acc >= len && n < 5; n++) { this.acc -= len; c.stepDay(); }
      if (this.acc > len) this.acc = 0;
    }
    if (c.events.length) for (const ev of c.events.splice(0)) this.msg(ev);
    if (c.monthEnded) { c.monthEnded = false; this.hints(); this.save(); }
    if (c.version !== this.builtVersion && t - this.lastRebuild > 250) {
      this.view.rebuild(c);
      this.builtVersion = c.version;
      this.lastRebuild = t;
    }
    this.view.updateTraffic(dt * Math.min(this.speed, 2), Math.floor(c.stats.pop / 10), Math.floor(c.stats.pop / 8));
    this.view.render(dt);
    if (t - this.lastEmit > 250) this.emit();
  };

  emit() {
    this.lastEmit = performance.now();
    const c = this.city, s = c.stats, now = performance.now();
    this.messages = this.messages.filter(m => now - m.t < 7000);
    this.onUpdate({
      money: c.money, pop: s.pop, jobs: s.jobsC + s.jobsI, happiness: s.happiness, date: c.dateText(),
      demand: { ...c.demand }, tax: c.tax, lastMonth: c.lastMonth, speed: this.speed, tool: this.tool,
      previewCost: this.previewCost || 0, welcome: this.welcome, messages: [...this.messages],
      info: this.selected ? c.tileInfo(this.selected.x, this.selected.z) : null,
      buildings: c.kind.reduce((n, k, i) => n + (k && !['road', 'rail', 'crossing'].includes(k) && (!ZONES.has(k) || c.level[i]) ? 1 : 0), 0),
    });
  }
}
