// Leagă simularea, grafica și controalele; trimite starea către React.
import { N, TOOL, DAY_SECONDS, ANIMALS } from './config.js';
import { City, ZONES, WATER } from './city.js';
import { CityView } from './view.js';
import { Avatars, LOOKS, SHIRTS } from './avatars.js';
import * as M from './missions.js';
import { sfx, unlock, setRain } from './sound.js';

const SKY_KEY = 'orasul-meu-cer';
const WEATHER = false; // ploaia și ninsoarea sunt oprite (true le pornește din nou)
const QUIZ_DAILY = 40; // câte răspunsuri corecte pe zi aduc bani
const DAY_REAL = 240; // o zi întreagă (zi + noapte) durează 4 minute

const LOOK_KEY = 'orasul-meu-personaj';
// clădirile prin care personajul nu poate trece (zonele construite se ocolesc și ele)
const SOLID = new Set(['power', 'water', 'police', 'fire', 'school', 'station']);
const WALK_SPEED = 2.4;

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
    // personajul meu: cum arată (ținut minte pe acest dispozitiv) și unde e, când mă plimb
    this.avatars = new Avatars(this.view.scene);
    this.keys = new Set();
    this.walk = null;
    let look = null;
    try { look = JSON.parse(localStorage.getItem(LOOK_KEY)); } catch { /* fără */ }
    this.me = { name: 'Eu', look: LOOKS.includes(look?.look) ? look.look : 'casual', shirt: SHIRTS.includes(look?.shirt) ? look.shirt : SHIRTS[1] };
    this.started = performance.now(); this.lastQuest = 0; this.nextChirp = 4000; this.nextHonk = 15000; this.lastBell = 0;
    this.celebrate = null; this.celebrateId = 0;
    // cerul: 'auto' = zi și noapte pe rând, 'day' = mereu zi
    try { this.skyMode = localStorage.getItem(SKY_KEY) === 'day' ? 'day' : 'auto'; } catch { this.skyMode = 'auto'; }
    this.dayT = .38;
    this.weather = { kind: null, until: 0, next: 50000 + Math.random() * 60000, bowUntil: 0 };
    this.rainL = 0; this.snowL = 0; this.bowL = 0;
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
    this.onKeyUp = e => this.keys.delete(e.key.toLowerCase());
    this.onBlur = () => this.keys.clear();
    addEventListener('keyup', this.onKeyUp);
    addEventListener('blur', this.onBlur);
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
    removeEventListener('keyup', this.onKeyUp);
    removeEventListener('blur', this.onBlur);
    removeEventListener('resize', this.onResize);
    document.removeEventListener('visibilitychange', this.onHide);
    this.view.dispose();
  }

  // ---------- acțiuni din interfață ----------

  setTool(id) {
    // în vizită se construiește doar cu voia gazdei, și fără buldozer
    if (this.readOnly && id !== 'inspect' && (!this.canBuild || id === 'bulldoze')) return;
    this.tool = id; if (id !== 'inspect') this.select(null); this.view.setPreview([]); this.emit();
  }
  setSpeed(s) { this.speed = s; this.emit(); }
  setTax(t) { this.city.tax = t; this.city.updateStats(); this.emit(); }
  closeWelcome() { this.welcome = false; this.emit(); }
  rotate(d) { this.view.rotate(d); }
  zoom(f) { this.view.zoomBy(f); }
  select(t) { this.selected = t; this.view.setSelected(t); this.emit(); }

  setRanch(x, z, j) {
    if (this.readOnly) return;
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
    if (this.readOnly) return; // orașul vizitat nu se salvează niciodată
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.city.toJSON())); } catch { /* spațiu plin sau mod privat */ }
    this.onSave?.(this.city);
  }

  // ---------- conturi și vizite ----------

  // pune pe hartă alt oraș (de exemplu cel din cont, la intrare)
  show(city) {
    this.city = city;
    this.avatars.clear();
    const walking = !!this.walk;
    this.walk = null;
    this.selected = null;
    this.view.setSelected(null);
    this.view.cars = [];
    this.view.people = [];
    this.view.target.set(0, 0, 0);
    this.view.updateCamera();
    this.view.rebuild(city);
    this.builtVersion = city.version;
    if (walking) this.startWalk();
    this.emit();
  }

  // înlocuiește orașul de acasă (de exemplu cu cel salvat în cont)
  replaceCity(json) {
    const c = City.fromJSON(json);
    if (!c) return false;
    if (this.readOnly) this.home = c; else { this.welcome = false; this.show(c); this.save(); }
    return true;
  }

  // intră în vizită: orașul prietenului se vede, dar nu se poate schimba nimic
  visit(json, info) {
    const c = City.fromJSON(json);
    if (!c) return false;
    if (!this.readOnly) { this.save(); this.home = this.city; }
    this.readOnly = true;
    this.canBuild = false;
    this.visiting = info;
    this.tool = 'inspect';
    this.welcome = false;
    this.show(c);
    return true;
  }

  // gazda a schimbat ceva: orașul vizitat se înlocuiește, dar camera și personajele rămân pe loc
  refreshVisit(json) {
    if (!this.readOnly) return;
    const c = City.fromJSON(json);
    if (!c) return;
    this.city = c;
    this.view.rebuild(c);
    this.builtVersion = c.version;
    this.emit();
  }

  // gazda îi dă voie vizitatorului să construiască
  setCanBuild(on) {
    on = !!on && !!this.readOnly;
    if (on === !!this.canBuild) return;
    this.canBuild = on;
    if (!on) this.setTool('inspect');
    this.emit();
  }

  // gazda primește o construcție de la un prieten: o face din banii ei (dacă se poate)
  applyRemote(op) {
    if (this.readOnly) return null; // gazda nu e acasă: rămâne pe mai târziu
    const t = TOOL[op.tool], flat = op.tiles || [], tiles = [];
    if (!t || op.tool === 'bulldoze' || op.tool === 'inspect') return { error: 'Unealtă necunoscută.' };
    for (let k = 0; k + 1 < flat.length && tiles.length < N * N; k += 2) {
      const x = flat[k] | 0, z = flat[k + 1] | 0;
      if (this.city.inside(x, z)) tiles.push([x, z]);
    }
    if (!tiles.length) return { error: 'Nimic de construit.' };
    const r = this.city.apply(op.tool, tiles);
    if (r.error) return r;
    this.view.rebuild(this.city);
    this.builtVersion = this.city.version;
    sfx.build();
    this.msg(`🔨 ${op.byName || 'Un prieten'} a construit la tine: ${t.icon} ${t.name} (${r.cost.toLocaleString('ro-RO')} $).`);
    this.save();
    return r;
  }

  goHome() {
    if (!this.readOnly) return;
    this.readOnly = false;
    this.canBuild = false;
    this.visiting = null;
    this.show(this.home);
    this.home = null;
  }

  // bani primiți sau plătiți din orașul de acasă (bilete, încasări), chiar și în timpul unei vizite
  addMoney(amount) {
    (this.readOnly ? this.home : this.city).money += amount;
    if (!this.readOnly) this.save();
    this.emit();
  }

  homeCity() { return this.readOnly ? this.home : this.city; }

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
      seg(a, corner);
      // podul se face doar în linie dreaptă
      if (!TOOL[this.tool].bridge) seg(corner, b);
      return out.filter(([x, z], i) => out.findIndex(([x2, z2]) => x2 === x && z2 === z) === i);
    }
    for (let z = Math.min(a.z, b.z); z <= Math.max(a.z, b.z); z++)
      for (let x = Math.min(a.x, b.x); x <= Math.max(a.x, b.x); x++) out.push([x, z]);
    return out;
  }

  showPreview(a, b) {
    const tiles = this.tilesFor(a, b), c = this.city;
    if (TOOL[this.tool].bridge) {
      const p = c.planBridge(this.tool, tiles), ok = !p.error && (this.readOnly || p.cost <= c.money);
      this.view.setPreview(p.items.map(it => ({ x: it.x, z: it.z, ok: it.ok && ok })));
      this.previewCost = p.cost;
      this.emit();
      return;
    }
    let cost = 0;
    const items = tiles.map(([x, z]) => {
      const ok = !c.check(this.tool, c.idx(x, z));
      if (ok) cost += c.cost(this.tool, c.idx(x, z));
      return { x, z, ok };
    });
    const afford = this.readOnly || cost <= c.money;
    this.view.setPreview(items.map(it => ({ ...it, ok: it.ok && afford })));
    this.previewCost = cost;
    this.emit();
  }

  onDown(e) {
    unlock();
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
    else if (d?.mode === 'tap' && !d.moved && done) {
      // când mă plimb, un click pe hartă îmi trimite personajul acolo
      const g = this.view.groundAt(e.clientX, e.clientY);
      // un animal atins se bucură; altfel, plimbându-mă merg acolo, iar cu 🔍 văd pătrățelul
      if (this.pet(g)) { /* mângâiat */ }
      else if (this.walk) { if (g) this.walk.dest = { x: g.x, z: g.z }; }
      else this.select(this.view.pickTile(e.clientX, e.clientY));
    }
    if (d?.mode === 'build' || d?.mode === 'gesture') { this.view.setPreview([]); this.previewCost = 0; }
    // după ce ridici un deget din două, celălalt doar mută harta
    this.drag = this.pointers.size ? { mode: 'pan' } : null;
    this.emit();
  }

  commit(a, b) {
    if (this.readOnly) {
      // la prieten: construcția pleacă la gazdă, care o face din banii ei
      if (!this.canBuild || this.tool === 'bulldoze') return;
      const tiles = this.tilesFor(a, b);
      if (TOOL[this.tool].bridge) { const p = this.city.planBridge(this.tool, tiles); if (p.error) { this.msg(p.error); return; } }
      this.onRemoteBuild?.(this.tool, tiles);
      this.msg(`🔨 Trimis la ${this.visiting?.name || 'gazdă'}: ${TOOL[this.tool].icon} ${TOOL[this.tool].name}…`);
      return;
    }
    const r = this.city.apply(this.tool, this.tilesFor(a, b));
    if (r.error) { this.msg(r.error); return; }
    if (this.tool === 'bulldoze') sfx.demolish(); else sfx.build();
    this.quests();
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
    // când mă plimb, săgețile și WASD mișcă personajul
    if (this.walk && ['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'a', 'd', 'w', 's'].includes(k)) {
      e.preventDefault(); this.keys.add(k); this.walk.dest = null; return;
    }
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

  // ---------- animale, misiuni, premii ----------

  pet(p, reach) {
    const hit = this.view.petAt(p, reach);
    if (!hit) return false;
    sfx.animal(hit.id);
    setTimeout(() => sfx.heart(), 250);
    this.homeCity().quest.pets++;
    this.quests();
    return true;
  }

  // misiunile îndeplinite dau bani și o stea; premiul zilei vine o dată pe zi
  quests() {
    if (this.readOnly || this.welcome) return;
    const c = this.city, q = c.quest;
    if (performance.now() - this.started > 5000) {
      const d = M.daily(c, q);
      if (d) {
        sfx.coin();
        this.party({ icon: '🎁', title: 'Premiul zilei!', text: d.streak > 1 ? `Joci de ${d.streak} zile la rând!` : 'Bine ai revenit în orașul tău!', reward: d.prize, small: true });
        this.save();
      }
    }
    // un oraș mai vechi poate avea deodată mai multe misiuni gata: se adună într-o singură sărbătoare
    const won = [];
    for (let k = 0; k < 10; k++) { const w = M.check(c, q); if (!w.length) break; won.push(...w); }
    if (won.length === 1) {
      sfx.fanfare();
      this.party({ icon: won[0].icon, title: 'Misiune îndeplinită! ⭐', text: won[0].text, reward: won[0].reward });
    } else if (won.length) {
      sfx.fanfare();
      this.party({ icon: '🏆', title: `${won.length} misiuni îndeplinite! ${'⭐'.repeat(Math.min(5, won.length))}`, text: won.map(m => m.icon).join(' '), reward: won.reduce((s, m) => s + m.reward, 0) });
    }
    if (won.length) { this.save(); this.emit(); }
  }

  // ferestrele de premiu vin pe rând, ca să nu se acopere una pe alta
  // întrebările cu premii: 50 $ pentru un răspuns corect, plus 100 $ la fiecare 5 la rând;
  // banii vin pentru cel mult 40 de răspunsuri corecte pe zi (după aceea se poate juca, dar fără bani)
  quizState() {
    const q = this.homeCity().quest, today = new Date().toDateString();
    if (!q.quiz || q.quiz.day !== today) q.quiz = { day: today, correct: 0, answered: 0, earned: 0, streak: 0 };
    return q.quiz;
  }

  quizAnswer(ok) {
    const s = this.quizState(), home = this.homeCity();
    s.answered++;
    let reward = 0;
    if (ok) {
      s.correct++; s.streak++;
      home.quest.quizTotal = (home.quest.quizTotal || 0) + 1;
      if (s.correct <= QUIZ_DAILY) reward = 50 + (s.streak % 5 === 0 ? 100 : 0);
      sfx.coin();
    } else { s.streak = 0; sfx.wrong(); }
    if (reward) { s.earned += reward; home.quest.quizEarned = (home.quest.quizEarned || 0) + reward; this.addMoney(reward); } else { this.save(); this.emit(); }
    this.quests();
    return { reward, ...s };
  }

  party(p) {
    const item = { ...p, id: ++this.celebrateId };
    if (this.celebrate) (this.partyQueue ||= []).push(item); else this.celebrate = item;
    this.emit();
  }
  closeParty() { this.celebrate = this.partyQueue?.shift() || null; this.emit(); }

  missions() {
    const c = this.homeCity(), q = c.quest;
    return { active: M.active(c, q), done: M.doneList(q), stars: q.stars, streak: q.streak || 0, total: M.MISSIONS.length };
  }

  // ---------- plimbarea cu personajul ----------

  // pe unde poate merge personajul (coordonate de pe hartă, centrul hărții e 0,0)
  walkable(x, z) {
    const tx = Math.floor(x + N / 2), tz = Math.floor(z + N / 2), c = this.city;
    if (!c.inside(tx, tz)) return false;
    const i = c.idx(tx, tz), k = c.kind[i];
    if (c.terrain[i] === WATER && !['road', 'rail', 'bridge', 'crossing'].includes(k)) return false;
    if (SOLID.has(k)) return false;
    if (ZONES.has(k) && c.level[i] > 0) return false;
    return true;
  }

  startWalk() {
    if (this.walk) return;
    // pornește din mijlocul ecranului, sau din cel mai apropiat loc pe care se poate merge
    const t = this.view.target;
    let best = null;
    for (let r = 0; r < N && !best; r++)
      for (let dz = -r; dz <= r && !best; dz++)
        for (let dx = -r; dx <= r && !best; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
          const x = Math.round(t.x) + dx + .5, z = Math.round(t.z) + dz + .5;
          if (this.walkable(x, z)) best = { x, z };
        }
    if (!best) { this.msg('Nu e niciun loc liber pe care să te plimbi.'); return; }
    this.walk = { x: best.x, z: best.z, yaw: 0, dest: null, moving: false };
    this.select(null);
    this.setTool('inspect');
    if (this.view.zoom < 3) { this.view.zoom = 3.4; this.view.updateCamera(); }
    this.msg('🚶 Mergi cu săgețile sau W A S D, ori atinge harta unde vrei să ajungi.');
    this.emit();
  }

  stopWalk() {
    if (!this.walk) return;
    this.walk = null;
    this.keys.clear();
    this.avatars.remove('me');
    this.onWalk?.(null);
    this.emit();
  }

  toggleWalk() { if (this.walk) this.stopWalk(); else this.startWalk(); }

  setLook(look, shirt) {
    if (LOOKS.includes(look)) this.me.look = look;
    if (SHIRTS.includes(shirt)) this.me.shirt = shirt;
    try { localStorage.setItem(LOOK_KEY, JSON.stringify({ look: this.me.look, shirt: this.me.shirt })); } catch { /* fără */ }
    this.emit();
  }

  setName(name) { if (name && name !== this.me.name) { this.me.name = name; this.emit(); } }

  // emoji deasupra personajului (îl pornește dacă nu mă plimbam)
  sayEmoji(e) {
    if (!this.walk) this.startWalk();
    if (!this.walk) return;
    this.walk.emoji = e; this.walk.emojiAt = Date.now();
    this.avatars.say('me', e);
    sfx.pop();
  }

  // ceilalți jucători din oraș: [{ uid, name, look, shirt, x, z, yaw, emoji, emojiAt }]
  setOthers(list) {
    const ids = new Set(['me']);
    for (const p of list) {
      if (!p.walking) continue;
      ids.add(p.uid);
      const a = this.avatars.set(p.uid, { name: p.name, look: p.look, shirt: p.shirt, x: p.x, z: p.z, yaw: p.yaw || 0 });
      if (p.emojiAt && p.emojiAt !== a.emojiAt) { if (a.emojiAt !== undefined || Date.now() - p.emojiAt < 4000) { this.avatars.say(p.uid, p.emoji); sfx.pop(); } a.emojiAt = p.emojiAt; }
    }
    this.avatars.keep(ids);
  }

  // poza: ce se vede acum pe ecran, descărcată ca imagine
  photo() {
    this.view.render(0);
    const a = document.createElement('a');
    a.href = this.view.canvas.toDataURL('image/png');
    a.download = `orasul-meu-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.png`;
    a.click();
    this.msg('📸 Poza a fost salvată!');
  }

  updateWalk(dt) {
    const w = this.walk;
    if (!w) return;
    const y = this.view.yaw, K = this.keys;
    // înainte = de la cameră spre ecran; dreapta = spre dreapta ecranului
    const f = (K.has('arrowup') || K.has('w') ? 1 : 0) - (K.has('arrowdown') || K.has('s') ? 1 : 0);
    const r = (K.has('arrowright') || K.has('d') ? 1 : 0) - (K.has('arrowleft') || K.has('a') ? 1 : 0);
    let vx = -Math.sin(y) * f + Math.cos(y) * r, vz = -Math.cos(y) * f - Math.sin(y) * r;
    if (!f && !r && w.dest) {
      vx = w.dest.x - w.x; vz = w.dest.z - w.z;
      if (Math.hypot(vx, vz) < .08) { w.dest = null; vx = vz = 0; }
    }
    const len = Math.hypot(vx, vz);
    w.moving = len > 0;
    if (len) {
      const step = Math.min(WALK_SPEED * dt, w.dest && !f && !r ? len : Infinity);
      vx = vx / len * step; vz = vz / len * step;
      w.yaw = Math.atan2(vx, vz);
      // se oprește la ziduri, dar alunecă pe lângă ele
      const ox = w.x, oz = w.z;
      if (this.walkable(w.x + vx * 3, w.z + vz * 3)) { w.x += vx; w.z += vz; }
      else if (vx && this.walkable(w.x + vx * 3, w.z)) w.x += vx;
      else if (vz && this.walkable(w.x, w.z + vz * 3)) w.z += vz;
      else { w.dest = null; w.moving = false; }
      this.homeCity().quest.walked += Math.hypot(w.x - ox, w.z - oz);
      // dacă trece pe lângă un animal, îl mângâie singur
      if (w.moving && performance.now() - (w.lastPet || 0) > 1500 && this.pet({ x: w.x, z: w.z }, .3)) w.lastPet = performance.now();
      // camera îl urmărește lin
      const t = this.view.target, k = Math.min(1, dt * 4);
      t.x += (w.x - t.x) * k; t.z += (w.z - t.z) * k;
      this.view.updateCamera();
    }
    const a = this.avatars.set('me', { ...this.me, x: w.x, z: w.z, yaw: w.yaw, me: true });
    a.moving = w.moving;
    this.onWalk?.({ x: +w.x.toFixed(2), z: +w.z.toFixed(2), yaw: +w.yaw.toFixed(2), moving: w.moving, emoji: w.emoji || null, emojiAt: w.emojiAt || 0 });
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
    // în vizită timpul orașului stă pe loc (se vede cum l-a lăsat prietenul), dar viața de pe străzi merge
    if (!this.welcome && !this.readOnly) {
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
    this.updateWalk(dt);
    this.avatars.update(dt);
    if (t - this.lastQuest > 1000) { this.lastQuest = t; this.quests(); }
    this.updateSky(dt, t);
    this.ambience(t);
    this.view.updateTraffic(dt * (this.readOnly ? 1 : Math.min(this.speed, 2)), Math.floor(c.stats.pop / 10), Math.floor(c.stats.pop / 8));
    this.view.render(dt);
    if (t - this.lastEmit > 250) this.emit();
  };

  // ---------- cerul: ziua, noaptea și vremea ----------

  setSkyMode(m) {
    this.skyMode = m === 'day' ? 'day' : 'auto';
    try { localStorage.setItem(SKY_KEY, this.skyMode); } catch { /* fără */ }
    this.msg(this.skyMode === 'day' ? '☀️ E mereu zi.' : '🌗 Acum vin pe rând ziua și noaptea.');
    this.emit();
  }

  isNight() { return Math.sin((this.dayT - .25) * Math.PI * 2) + .3 < -.05; }

  updateSky(dt, t) {
    if (this.skyMode === 'day') this.dayT += (.5 - this.dayT) * Math.min(1, dt * 2);
    else this.dayT = (this.dayT + dt * Math.max(1, Math.min(this.speed || 1, 3)) / DAY_REAL) % 1;
    // vremea: din când în când plouă (iarna ninge); după ploaie, ziua, apare un curcubeu
    const w = this.weather;
    if (WEATHER && !w.kind && t > w.next) {
      const month = Math.floor(this.city.day / 30) % 12;
      w.kind = [11, 0, 1].includes(month) ? 'snow' : 'rain';
      w.until = t + 30000 + Math.random() * 35000;
      this.msg(w.kind === 'snow' ? '❄️ Ninge! Orașul se face alb de iarnă.' : '🌧️ Începe să plouă!');
    } else if (w.kind && t > w.until) {
      if (w.kind === 'rain' && !this.isNight()) { w.bowUntil = t + 25000; this.msg('🌈 S-a oprit ploaia: uite un curcubeu!'); }
      w.kind = null;
      w.next = t + 70000 + Math.random() * 90000;
    }
    const near = (v, goal, s) => v + Math.sign(goal - v) * Math.min(Math.abs(goal - v), dt / s);
    this.rainL = near(this.rainL, w.kind === 'rain' ? 1 : 0, 5);
    this.snowL = near(this.snowL, w.kind === 'snow' ? 1 : 0, 6);
    this.bowL = near(this.bowL, t < w.bowUntil ? 1 : 0, 3);
    Object.assign(this.view.skyState, { time: this.dayT, rain: this.rainL, snow: this.snowL, bow: this.bowL });
    setRain(this.rainL);
  }

  skyInfo() {
    const w = this.weather.kind, night = this.isNight(), e = Math.sin((this.dayT - .25) * Math.PI * 2) + .3;
    const icon = w === 'rain' ? '🌧️' : w === 'snow' ? '❄️' : this.bowL > .5 ? '🌈' : night ? '🌙' : e < .35 ? '🌅' : '☀️';
    return { mode: this.skyMode, icon, night };
  }

  // păsărele ziua, greieri noaptea, claxoane rare și clopoțelul barierei, când e o trecere închisă pe ecran
  ambience(t) {
    if (t > this.nextChirp) {
      this.nextChirp = t + 3000 + Math.random() * 7000;
      if (this.weather.kind) { /* pe ploaie tac */ } else if (this.isNight()) sfx.cricket();
      else if (this.city.stats.pop < 2000 || Math.random() < .5) sfx.chirp();
    }
    if (t > this.nextHonk) { this.nextHonk = t + 12000 + Math.random() * 25000; if (this.view.cars.length > 8) sfx.honk(); }
    if (t - this.lastBell > 520 && this.view.bellNear()) { this.lastBell = t; sfx.ding(); }
  }

  emit() {
    this.lastEmit = performance.now();
    const c = this.city, s = c.stats, now = performance.now();
    this.messages = this.messages.filter(m => now - m.t < 7000);
    this.onUpdate({
      money: c.money, pop: s.pop, jobs: s.jobsC + s.jobsI, happiness: s.happiness, date: c.dateText(),
      demand: { ...c.demand }, tax: c.tax, lastMonth: c.lastMonth, speed: this.speed, tool: this.tool,
      previewCost: this.previewCost || 0, welcome: this.welcome, messages: [...this.messages],
      readOnly: !!this.readOnly, visiting: this.visiting || null, homeMoney: this.homeCity().money,
      canBuild: !!this.canBuild, walking: !!this.walk, celebrate: this.celebrate, stars: this.homeCity().quest.stars,
      missions: this.missions(), sky: this.skyInfo(),
      quiz: { today: this.quizState().earned, correct: this.quizState().correct, total: this.homeCity().quest.quizEarned || 0, answers: this.homeCity().quest.quizTotal || 0 }, look: this.me.look, shirt: this.me.shirt,
      info: this.selected ? c.tileInfo(this.selected.x, this.selected.z) : null,
      buildings: c.kind.reduce((n, k, i) => n + (k && !['road', 'rail', 'crossing', 'bridge'].includes(k) && (!ZONES.has(k) || c.level[i]) ? 1 : 0), 0),
    });
  }
}
