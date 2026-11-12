// Simularea orașului: teren, zone, servicii, creștere, buget. Fără grafică.
import { newQuest } from './missions.js';
import {
  N, START_MONEY, DAYS_PER_MONTH, ROAD_UPKEEP, FOREST_CLEAR, BRIDGE_COST, BRIDGE_UPKEEP, RESIDENTS, RESIDENTS_H, JOBS_C, JOBS_I,
  TOOL, KINDS, KIND_NAME, MONTHS, ANIMALS, CROPS, CROP_STAGES, HARVEST_PRICE,
} from './config.js';

export const GRASS = 0, WATER = 1, FOREST = 2;
export const ZONES = new Set(['R', 'H', 'C', 'I']);
// blocurile folosesc aceeași cerere ca locuințele
const demandKey = k => k === 'H' ? 'R' : k;
// locuri de muncă în servicii și afaceri (pe pătrățel): ajută și ele oamenii să se mute în oraș
const SERVICE_JOBS = { police: 15, fire: 15, school: 20, station: 20, power: 20, water: 5, fun: 12, ranch: 4, cafe: 10, gas: 8, parking: 2, airport: 15, beach: 3 };
// cât de mică poate fi cererea ca pe o zonă goală de case sau blocuri să înceapă totuși construcția
const START_DEMAND = -.35;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// pod peste drum sau peste cale ferată. level ține:
//   bitul 0 = axa podului (0 = în lungul lui x, 1 = în lungul lui z),
//   bitul 1 = ce trece pe sus (0 = drum, 1 = cale ferată),
//   biții 2–3 = ce trece pe dedesubt, de-a curmezișul (0 = nimic, 1 = drum, 2 = cale ferată)
export const bridgeOf = l => ({ axis: l & 1, top: l & 2 ? 'rail' : 'road', under: [null, 'road', 'rail'][(l >> 2) & 3] });
const bridgeLevel = (axis, top, under) => axis | (top === 'rail' ? 2 : 0) | (({ road: 1, rail: 2 })[under] || 0) << 2;

function rng32(seed) {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeNoise(seed) {
  const h = (x, z) => {
    let v = Math.imul(x, 374761393) ^ Math.imul(z, 668265263) ^ Math.imul(seed, 1442695041);
    v = Math.imul(v ^ (v >>> 13), 1274126177);
    return ((v ^ (v >>> 16)) >>> 0) / 4294967296;
  };
  const s = t => t * t * (3 - 2 * t);
  const n = (x, z) => {
    const xi = Math.floor(x), zi = Math.floor(z), fx = s(x - xi), fz = s(z - zi);
    const a = h(xi, zi), b = h(xi + 1, zi), c = h(xi, zi + 1), d = h(xi + 1, zi + 1);
    return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
  };
  return (x, z) => (n(x, z) * 4 + n(x * 2, z * 2) * 2 + n(x * 4, z * 4)) / 7;
}

export class City {
  constructor() {
    const n = N * N;
    this.terrain = new Uint8Array(n);
    this.kind = new Array(n).fill(null);
    this.level = new Uint8Array(n);
    this.variant = new Uint8Array(n);
    this.money = START_MONEY;
    this.day = 0;
    this.tax = 9;
    this.lastMonth = null;
    this.harvest = 0; // banii din legumele culese luna aceasta
    this.quest = newQuest(); // misiuni, stele, animale mângâiate, premiul zilei
    this.version = 0;
    this.events = [];
    this.demand = { R: 1, C: .25, I: .75 };
    this.stats = { pop: 0, jobsC: 0, jobsI: 0, happiness: .5 };
    this.powered = new Uint8Array(n);
    this.watered = new Uint8Array(n);
    this.road = new Uint8Array(n);
    this.nearWater = new Uint8Array(n);
    this.value = new Float32Array(n);
    this.pollution = new Float32Array(n);
    this.cover = { police: new Float32Array(n), fire: new Float32Array(n), school: new Float32Array(n), park: new Float32Array(n), garden: new Float32Array(n), station: new Float32Array(n), fun: new Float32Array(n), cafe: new Float32Array(n), parking: new Float32Array(n), airport: new Float32Array(n), beach: new Float32Array(n) };
  }

  static create(seed = (Math.random() * 1e9) | 0) {
    const c = new City();
    c.seed = seed;
    c.generate();
    c.prepare();
    c.recompute();
    c.updateStats();
    return c;
  }

  idx(x, z) { return z * N + x; }
  inside(x, z) { return x >= 0 && z >= 0 && x < N && z < N; }

  // rampa unui pod: un pătrățel de drum (sau de șine) lipit de capătul podului, în lungul lui.
  // up = +1 urcă spre +x/+z, -1 urcă invers, 0 = pod de ambele părți
  ramp(x, z, net) {
    if (!this.inside(x, z)) return null;
    const i = this.idx(x, z);
    if (this.kind[i] !== net || this.terrain[i] === WATER) return null;
    const deck = (a, b, axis) => {
      if (!this.inside(a, b) || this.kind[this.idx(a, b)] !== 'bridge') return false;
      const br = bridgeOf(this.level[this.idx(a, b)]);
      return br.top === net && br.axis === axis;
    };
    for (const axis of [0, 1]) {
      const [dx, dz] = axis ? [0, 1] : [1, 0], p = deck(x + dx, z + dz, axis), m = deck(x - dx, z - dz, axis);
      if (p || m) return { axis, up: p && m ? 0 : p ? 1 : -1 };
    }
    return null;
  }

  // pe ce axe trece drumul (net = 'road') sau calea ferată (net = 'rail') printr-un pătrățel: 1 = x, 2 = z
  lanes(x, z, net) {
    if (!this.inside(x, z)) return 0;
    const i = this.idx(x, z), k = this.kind[i];
    if (k === 'bridge') {
      const b = bridgeOf(this.level[i]);
      return (b.top === net ? 1 << b.axis : 0) | (b.under === net ? 1 << (1 - b.axis) : 0);
    }
    if (k !== net && k !== 'crossing') return 0;
    const r = this.ramp(x, z, net); // rampa merge doar în lungul podului
    return r ? 1 << r.axis : 3;
  }

  generate() {
    const r = rng32(this.seed), land = makeNoise(this.seed), trees = makeNoise(this.seed + 99);
    for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
      const i = this.idx(x, z), d = Math.hypot(x - N / 2, z - N / 2);
      if (land(x / 11, z / 11) < .33 && d > 7) this.terrain[i] = WATER;
      else if (trees(x / 7, z / 7) > .6 && d > 5) this.terrain[i] = FOREST;
      this.variant[i] = r() * 256 | 0;
    }
  }

  // date care depind doar de teren
  prepare() {
    for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
      let near = 0;
      for (let dz = -2; dz <= 2 && !near; dz++) for (let dx = -2; dx <= 2; dx++) {
        if (this.inside(x + dx, z + dz) && this.terrain[this.idx(x + dx, z + dz)] === WATER) { near = 1; break; }
      }
      this.nearWater[this.idx(x, z)] = near;
    }
  }

  // acoperire cu curent, apă, servicii, poluare, acces la drum, valoarea terenului
  recompute() {
    const { kind, level, powered, watered, road, value, pollution, cover } = this;
    powered.fill(0); watered.fill(0); road.fill(0); pollution.fill(0);
    for (const a of Object.values(cover)) a.fill(0);
    const radiate = (x, z, r, fn) => {
      for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
        const d = Math.hypot(dx, dz);
        if (d > r || !this.inside(x + dx, z + dz)) continue;
        fn(this.idx(x + dx, z + dz), 1 - d / (r + 1));
      }
    };
    for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
      const i = this.idx(x, z), k = kind[i];
      if (!k) continue;
      if (k === 'road' || k === 'crossing' || (k === 'bridge' && this.lanes(x, z, 'road'))) {
        for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
          if (Math.abs(dx) + Math.abs(dz) <= 2 && this.inside(x + dx, z + dz)) road[this.idx(x + dx, z + dz)] = 1;
        }
      } else if (k === 'power') {
        radiate(x, z, TOOL.power.radius, j => { powered[j] = 1; });
        radiate(x, z, 6, (j, f) => { pollution[j] = Math.min(1, pollution[j] + .5 * f); });
      } else if (k === 'wind' || k === 'solar') radiate(x, z, TOOL[k].radius, j => { powered[j] = 1; });
      else if (k === 'water') radiate(x, z, TOOL.water.radius, j => { watered[j] = 1; });
      else if (cover[k]) radiate(x, z, TOOL[k].radius, (j, f) => { cover[k][j] = Math.max(cover[k][j], f); });
      if (k === 'airport') radiate(x, z, 3, (j, f) => { pollution[j] = Math.min(1, pollution[j] + .1 * f); }); // zgomotul avioanelor
      else if (k === 'I' && level[i]) radiate(x, z, 5, (j, f) => { pollution[j] = Math.min(1, pollution[j] + .12 * level[i] * f); });
    }
    for (let i = 0; i < N * N; i++) {
      value[i] = clamp(.42 + .22 * cover.park[i] + .14 * cover.garden[i] + .1 * cover.station[i] + .12 * cover.fun[i] + .12 * cover.police[i] + .1 * cover.school[i] + .06 * cover.fire[i] + .1 * cover.cafe[i] + .04 * cover.parking[i] + .08 * cover.airport[i] + .1 * cover.beach[i]
        + .08 * this.nearWater[i] - .55 * pollution[i], 0, 1);
    }
  }

  updateStats() {
    let pop = 0, jobsC = 0, jobsI = 0, vSum = 0;
    for (let i = 0; i < N * N; i++) {
      const k = this.kind[i], l = this.level[i];
      if (k === 'R' || k === 'H') { const n = (k === 'H' ? RESIDENTS_H : RESIDENTS)[l]; pop += n; vSum += this.value[i] * n; }
      else if (k === 'C') jobsC += JOBS_C[l];
      else if (SERVICE_JOBS[k]) jobsC += SERVICE_JOBS[k];
      else if (k === 'I') jobsI += JOBS_I[l];
    }
    const jobs = jobsC + jobsI, taxEff = (this.tax - 9) * .04;
    const unemployed = pop ? Math.max(0, pop - jobs) / pop : 0;
    const happiness = pop ? clamp((vSum / pop) * .8 + .25 - unemployed * .3 - Math.max(0, this.tax - 9) * .02, 0, 1) : .5;
    this.stats = { pop, jobsC, jobsI, happiness };
    this.demand = {
      R: clamp((jobs * 1.1 + 60 - pop) / (pop * .25 + 60) - taxEff - Math.max(0, .4 - happiness), -1, 1),
      C: clamp((pop * .35 - jobsC + 10) / (jobsC * .3 + 40) - taxEff, -1, 1),
      I: clamp((pop * .55 - jobsI + 30) / (jobsI * .3 + 40) - taxEff, -1, 1),
    };
  }

  // o zi de joc: zonele cresc sau scad, uneori izbucnesc incendii
  stepDay() {
    this.day++;
    let changed = false;
    for (let i = 0; i < N * N; i++) {
      const k = this.kind[i];
      if (k === 'farm') {
        // legumele cresc, apoi se culeg și se plantează din nou
        if (this.level[i] < 3) {
          if (Math.random() < .07 + (this.nearWater[i] || this.watered[i] ? .05 : 0)) { this.level[i]++; changed = true; }
        } else if (Math.random() < .08) {
          this.level[i] = 1;
          this.harvest += HARVEST_PRICE;
          changed = true;
        }
        continue;
      }
      if (!ZONES.has(k)) continue;
      const lvl = this.level[i], ok = this.road[i] && this.powered[i];
      // fabricile nu sunt deranjate de propria poluare
      const v = k === 'I' ? this.value[i] + .55 * this.pollution[i] : this.value[i];
      // blocurile nu cresc deloc fără apă, dar ajung la etaje multe și pe teren mai ieftin
      const max = !ok ? 0 : k === 'H' ? (!this.watered[i] ? 0 : v > .62 ? 3 : v > .45 ? 2 : 1)
        : !this.watered[i] ? 1 : v > .7 ? 3 : v > .5 ? 2 : 1;
      const dm = this.demand[demandKey(k)];
      // prima casă sau primul bloc de pe o zonă goală apare și când cererea e puțin scăzută
      const need = lvl === 0 && (k === 'R' || k === 'H') ? START_DEMAND : 0;
      if (lvl < max && dm > need) {
        if (Math.random() < (lvl === 0 ? .035 : .015) + .05 * Math.max(0, dm)) { this.level[i]++; changed = true; }
      } else if (lvl > max) {
        if (Math.random() < .04) { this.level[i]--; changed = true; }
      } else if (dm < -.3 && lvl > 0 && Math.random() < .01) { this.level[i]--; changed = true; }
      if (this.level[i] && this.cover.fire[i] < .05 && Math.random() < .00015) {
        this.level[i] = 0;
        changed = true;
        this.events.push(`🔥 Incendiu! O clădire a ars la (${i % N}, ${(i / N) | 0}). Construiește o stație de pompieri.`);
      }
    }
    if (changed) { this.version++; this.recompute(); }
    this.updateStats();
    if (this.day % DAYS_PER_MONTH === 0) this.endMonth();
  }

  endMonth() {
    const s = this.stats, jobs = s.jobsC + s.jobsI;
    const income = Math.round((s.pop * 10 + jobs * 6) * this.tax / 100), farm = this.harvest;
    this.harvest = 0;
    let roadCost = 0, services = 0, energy = 0, ranch = 0, tickets = 0, business = 0;
    this.kind.forEach((k, i) => {
      const water = this.terrain[i] === WATER;
      if (k === 'road' || k === 'crossing') roadCost += water ? BRIDGE_UPKEEP : ROAD_UPKEEP;
      if (k === 'rail' || k === 'crossing') roadCost += water ? BRIDGE_UPKEEP : TOOL.rail.upkeep;
      else if (k === 'bridge') {
        const b = bridgeOf(this.level[i]);
        roadCost += TOOL[b.top === 'road' ? 'flyover' : 'viaduct'].upkeep + (b.under === 'road' ? ROAD_UPKEEP : b.under === 'rail' ? TOOL.rail.upkeep : 0);
      } else if (k && k !== 'road' && TOOL[k]?.upkeep) services += TOOL[k].upkeep;
      // energia de la eoliene și panouri, produsele de la fermă
      if (k === 'ranch') ranch += (ANIMALS[this.level[i]] || ANIMALS[0]).income;
      else if (k === 'fun') tickets += TOOL.fun.sells;
      else if (TOOL[k]?.biz) business += TOOL[k].sells;
      else if (TOOL[k]?.sells) energy += TOOL[k].sells;
    });
    const expenses = roadCost + services;
    const earned = income + farm + energy + ranch + tickets + business;
    this.money += earned - expenses;
    this.lastMonth = { income, farm, energy, ranch, tickets, business, roads: roadCost, services, expenses, net: earned - expenses };
    this.monthEnded = true;
  }

  // schimbă ce se crește la o fermă (level = indicele din ANIMALS)
  setAnimal(i, j) {
    const a = ANIMALS[j];
    if (this.kind[i] !== 'ranch' || !a) return { error: 'Aici nu e o fermă.' };
    if (this.level[i] === j) return { error: `Ferma are deja ${a.name.toLowerCase()}.` };
    if (a.price > this.money) return { error: `Nu ai destui bani: ${a.name.toLowerCase()} costă ${a.price} $.` };
    this.money -= a.price;
    this.level[i] = j;
    this.version++;
    return { cost: a.price };
  }

  // de ce nu se poate folosi unealta aici (sau null dacă se poate)
  check(tool, i) {
    const k = this.kind[i], emptyZone = ZONES.has(k) && this.level[i] === 0, free = !k || emptyZone;
    if (tool === 'bulldoze') return k || this.terrain[i] === FOREST ? null : 'Nu e nimic de demolat aici.';
    const linear = tool === 'road' || tool === 'rail';
    if (linear && (this.ramp(i % N, (i / N) | 0, 'road') || this.ramp(i % N, (i / N) | 0, 'rail'))) return 'Aici e rampa unui pod: nu se poate încrucișa.';
    if (this.terrain[i] === WATER) {
      if (!linear) return 'Pe apă poți construi doar poduri: folosește unealta Drum sau Cale ferată.';
      if (k === tool) return 'Aici e deja un pod.';
      return k ? 'Pe un pod nu se pot încrucișa drumul și calea ferată.' : null;
    }
    if (linear) {
      if (k === tool || k === 'crossing') return tool === 'road' ? 'Aici e deja drum.' : 'Aici e deja cale ferată.';
      if (k === 'road' || k === 'rail') return null; // drum peste șine (sau invers): trecere la nivel
      return free ? null : 'Locul e ocupat. Demolează mai întâi.';
    }
    if (tool === 'beach' && free) {
      const x = i % N, z = (i / N) | 0;
      const shore = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => this.inside(x + dx, z + dz) && this.terrain[this.idx(x + dx, z + dz)] === WATER);
      if (!shore) return 'Plaja se face doar pe malul apei: pune-o chiar lângă lac.';
    }
    if (TOOL[tool].zone && k === tool) return 'Zona e deja aici.';
    return free ? null : 'Locul e ocupat. Demolează mai întâi.';
  }

  cost(tool, i) {
    if ((tool === 'road' || tool === 'rail') && this.terrain[i] === WATER) return BRIDGE_COST;
    return TOOL[tool].cost + (tool !== 'bulldoze' && this.terrain[i] === FOREST ? FOREST_CLEAR : 0);
  }

  // podul se construiește dintr-o dată: primul și ultimul pătrățel sunt rampe, cele din mijloc pod
  planBridge(tool, tiles) {
    const net = TOOL[tool].bridge, what = net === 'road' ? 'drum' : 'cale ferată';
    const axis = tiles.length > 1 && tiles[0][1] !== tiles[1][1] ? 1 : 0;
    const items = tiles.map(([x, z], n) => {
      const i = this.idx(x, z), k = this.kind[i], t = this.terrain[i];
      const bad = reason => ({ i, x, z, ok: false, reason });
      const free = !k || (ZONES.has(k) && this.level[i] === 0), forest = t === FOREST ? FOREST_CLEAR : 0;
      if (n === 0 || n === tiles.length - 1) { // rampă
        if (t === WATER) return bad('Rampa podului nu poate fi pe apă.');
        if (k === net) return { i, x, z, ok: true, cost: 0, kind: net, level: 0 };
        if (free) return { i, x, z, ok: true, cost: TOOL[net].cost + forest, kind: net, level: 0 };
        return bad(`Rampa podului are nevoie de loc liber sau de ${what}.`);
      }
      if (k === 'bridge') return bad('Aici e deja un pod.');
      if (k === 'crossing') return bad('Sub pod nu poate rămâne o trecere la nivel: demolează-o mai întâi.');
      if (k !== 'road' && k !== 'rail' && !free) return bad('Locul e ocupat. Demolează mai întâi.');
      const under = k === 'road' || k === 'rail' ? k : null;
      return { i, x, z, ok: true, cost: TOOL[tool].cost + forest, kind: 'bridge', level: bridgeLevel(axis, net, under) };
    });
    if (tiles.length < 3) return { items: items.map(it => ({ ...it, ok: false })), cost: 0, error: 'Trage mai lung: o rampă, podul și încă o rampă (cel puțin 3 pătrățele).' };
    const wrong = items.find(it => !it.ok);
    return { items, cost: items.reduce((s, it) => s + (it.cost || 0), 0), error: wrong?.reason };
  }

  apply(tool, tiles) {
    if (TOOL[tool].bridge) {
      const p = this.planBridge(tool, tiles);
      if (p.error) return { error: p.error };
      if (p.cost > this.money) return { error: `Nu ai destui bani: podul costă ${p.cost.toLocaleString('ro-RO')} $.` };
      this.money -= p.cost;
      for (const it of p.items) {
        if (this.terrain[it.i] === FOREST) this.terrain[it.i] = GRASS;
        this.kind[it.i] = it.kind;
        this.level[it.i] = it.level;
      }
      this.version++;
      this.recompute();
      this.updateStats();
      return { cost: p.cost, count: p.items.length };
    }
    let cost = 0, reason = null;
    const ok = [];
    for (const [x, z] of tiles) {
      const i = this.idx(x, z), r = this.check(tool, i);
      if (r) { reason ??= r; continue; }
      ok.push(i);
      cost += this.cost(tool, i);
    }
    if (!ok.length) return { error: reason || 'Nimic de construit aici.' };
    if (cost > this.money) return { error: `Nu ai destui bani: costă ${cost.toLocaleString('ro-RO')} $.` };
    this.money -= cost;
    for (const i of ok) {
      if (this.terrain[i] === FOREST) this.terrain[i] = GRASS;
      const k = this.kind[i];
      // un pod demolat lasă în urmă ce trecea pe sub el
      this.kind[i] = tool === 'bulldoze' ? (k === 'bridge' ? bridgeOf(this.level[i]).under : null)
        : (tool === 'road' && k === 'rail') || (tool === 'rail' && k === 'road') ? 'crossing' : tool;
      this.level[i] = 0;
    }
    this.version++;
    this.recompute();
    this.updateStats();
    return { cost, count: ok.length };
  }

  dateText() {
    const m = Math.floor(this.day / DAYS_PER_MONTH);
    return `${MONTHS[m % 12]} ${2026 + Math.floor(m / 12)}`;
  }

  tileInfo(x, z) {
    const i = this.idx(x, z), k = this.kind[i], l = this.level[i];
    const info = {
      x, z,
      title: k === 'road' && this.terrain[i] === WATER ? 'Pod' : k === 'rail' && this.terrain[i] === WATER ? 'Pod de cale ferată' : k ? KIND_NAME[k] : ['Iarbă', 'Apă', 'Pădure'][this.terrain[i]],
      value: Math.round(this.value[i] * 100), pollution: Math.round(this.pollution[i] * 100),
      powered: !!this.powered[i], watered: !!this.watered[i], road: !!this.road[i],
    };
    if (k === 'bridge') {
      const br = bridgeOf(l);
      info.title = (br.top === 'road' ? 'Pod rutier' : 'Pod de cale ferată')
        + (br.under === 'road' ? ' peste drum' : br.under === 'rail' ? ' peste calea ferată' : this.terrain[i] === WATER ? ' peste apă' : '');
    }
    if (k === 'ranch') info.ranch = this.level[i] < ANIMALS.length ? this.level[i] : 0;
    if (k === 'farm') {
      info.crop = CROPS[this.variant[i] % CROPS.length];
      info.stage = CROP_STAGES[l];
    }
    if (ZONES.has(k)) {
      info.level = l;
      if (k === 'R' || k === 'H') info.residents = (k === 'H' ? RESIDENTS_H : RESIDENTS)[l];
      else info.jobs = (k === 'C' ? JOBS_C : JOBS_I)[l];
      if (!info.road) info.problem = 'Nu are drum în apropiere.';
      else if (!info.powered) info.problem = 'Nu are curent electric.';
      else if (!info.watered) info.problem = k === 'H' ? 'Blocurile au nevoie de apă ca să fie construite.' : 'Nu are apă, așa că rămâne mică.';
      else {
        const dm = this.demand[demandKey(k)], empty = !l, need = empty && (k === 'R' || k === 'H') ? START_DEMAND : 0;
        if (dm <= need) info.problem = k === 'R' || k === 'H'
          ? 'Sunt prea puține locuri de muncă pentru câți oameni locuiesc deja. Construiește 🏬 Comerț sau 🏭 Industrie (sau o cafenea, o școală, o benzinărie), apoi blocurile vor crește.'
          : k === 'C' ? 'Sunt prea multe magazine pentru câți oameni sunt. Construiește 🏠 Locuințe sau 🏢 Blocuri.'
            : 'Sunt prea multe fabrici pentru câți oameni sunt. Construiește 🏠 Locuințe sau 🏢 Blocuri.';
        // totul e în regulă, doar trebuie puțin timp
        else if (empty) info.note = `🏗️ Totul e gata! ${k === 'H' ? 'Blocul' : k === 'R' ? 'Casa' : k === 'C' ? 'Magazinul' : 'Fabrica'} se construiește singur(ă) în câteva secunde, cât timpul merge (▶).`;
      }
    }
    return info;
  }

  toJSON() {
    return {
      v: 1, seed: this.seed, money: this.money, day: this.day, tax: this.tax, lastMonth: this.lastMonth, harvest: this.harvest,
      terrain: Array.from(this.terrain), kind: this.kind.map(k => KINDS.indexOf(k)),
      level: Array.from(this.level), variant: Array.from(this.variant), quest: this.quest,
    };
  }

  static fromJSON(o) {
    if (o?.v !== 1 || o.terrain?.length !== N * N) return null;
    const c = new City();
    Object.assign(c, { seed: o.seed, money: o.money, day: o.day, tax: o.tax, lastMonth: o.lastMonth, harvest: o.harvest || 0 });
    c.terrain.set(o.terrain);
    c.kind = o.kind.map(k => KINDS[k] ?? null);
    c.level.set(o.level);
    c.variant.set(o.variant);
    if (o.quest && Array.isArray(o.quest.done)) c.quest = { ...newQuest(), ...o.quest, done: [...o.quest.done] };
    c.prepare();
    c.recompute();
    c.updateStats();
    return c;
  }
}
