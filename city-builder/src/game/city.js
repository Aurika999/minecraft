// Simularea orașului: teren, zone, servicii, creștere, buget. Fără grafică.
import {
  N, START_MONEY, DAYS_PER_MONTH, ROAD_UPKEEP, FOREST_CLEAR, BRIDGE_COST, BRIDGE_UPKEEP, RESIDENTS, RESIDENTS_H, JOBS_C, JOBS_I,
  TOOL, KINDS, KIND_NAME, MONTHS, ANIMALS, CROPS, CROP_STAGES, HARVEST_PRICE,
} from './config.js';

export const GRASS = 0, WATER = 1, FOREST = 2;
export const ZONES = new Set(['R', 'H', 'C', 'I']);
// blocurile folosesc aceeași cerere ca locuințele
const demandKey = k => k === 'H' ? 'R' : k;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

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
    this.cover = { police: new Float32Array(n), fire: new Float32Array(n), school: new Float32Array(n), park: new Float32Array(n), garden: new Float32Array(n), station: new Float32Array(n) };
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
      if (k === 'road' || k === 'crossing') {
        for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
          if (Math.abs(dx) + Math.abs(dz) <= 2 && this.inside(x + dx, z + dz)) road[this.idx(x + dx, z + dz)] = 1;
        }
      } else if (k === 'power') {
        radiate(x, z, TOOL.power.radius, j => { powered[j] = 1; });
        radiate(x, z, 6, (j, f) => { pollution[j] = Math.min(1, pollution[j] + .5 * f); });
      } else if (k === 'wind' || k === 'solar') radiate(x, z, TOOL[k].radius, j => { powered[j] = 1; });
      else if (k === 'water') radiate(x, z, TOOL.water.radius, j => { watered[j] = 1; });
      else if (cover[k]) radiate(x, z, TOOL[k].radius, (j, f) => { cover[k][j] = Math.max(cover[k][j], f); });
      else if (k === 'I' && level[i]) radiate(x, z, 5, (j, f) => { pollution[j] = Math.min(1, pollution[j] + .12 * level[i] * f); });
    }
    for (let i = 0; i < N * N; i++) {
      value[i] = clamp(.42 + .22 * cover.park[i] + .14 * cover.garden[i] + .1 * cover.station[i] + .12 * cover.police[i] + .1 * cover.school[i] + .06 * cover.fire[i]
        + .08 * this.nearWater[i] - .55 * pollution[i], 0, 1);
    }
  }

  updateStats() {
    let pop = 0, jobsC = 0, jobsI = 0, vSum = 0;
    for (let i = 0; i < N * N; i++) {
      const k = this.kind[i], l = this.level[i];
      if (k === 'R' || k === 'H') { const n = (k === 'H' ? RESIDENTS_H : RESIDENTS)[l]; pop += n; vSum += this.value[i] * n; }
      else if (k === 'C') jobsC += JOBS_C[l];
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
      if (lvl < max && dm > 0) {
        if (Math.random() < .015 + .05 * dm) { this.level[i]++; changed = true; }
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
    let roadCost = 0, services = 0, energy = 0, ranch = 0;
    this.kind.forEach((k, i) => {
      const water = this.terrain[i] === WATER;
      if (k === 'road' || k === 'crossing') roadCost += water ? BRIDGE_UPKEEP : ROAD_UPKEEP;
      if (k === 'rail' || k === 'crossing') roadCost += water ? BRIDGE_UPKEEP : TOOL.rail.upkeep;
      else if (k && k !== 'road' && TOOL[k].upkeep) services += TOOL[k].upkeep;
      // energia de la eoliene și panouri, produsele de la fermă
      if (k === 'ranch') ranch += (ANIMALS[this.level[i]] || ANIMALS[0]).income;
      else if (TOOL[k]?.sells) energy += TOOL[k].sells;
    });
    const expenses = roadCost + services;
    const earned = income + farm + energy + ranch;
    this.money += earned - expenses;
    this.lastMonth = { income, farm, energy, ranch, roads: roadCost, services, expenses, net: earned - expenses };
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
    if (TOOL[tool].zone && k === tool) return 'Zona e deja aici.';
    return free ? null : 'Locul e ocupat. Demolează mai întâi.';
  }

  cost(tool, i) {
    if ((tool === 'road' || tool === 'rail') && this.terrain[i] === WATER) return BRIDGE_COST;
    return TOOL[tool].cost + (tool !== 'bulldoze' && this.terrain[i] === FOREST ? FOREST_CLEAR : 0);
  }

  apply(tool, tiles) {
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
      this.kind[i] = tool === 'bulldoze' ? null
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
      else if (this.demand[demandKey(k)] <= 0) info.problem = 'Nu e cerere pentru acest tip de zonă acum.';
    }
    return info;
  }

  toJSON() {
    return {
      v: 1, seed: this.seed, money: this.money, day: this.day, tax: this.tax, lastMonth: this.lastMonth, harvest: this.harvest,
      terrain: Array.from(this.terrain), kind: this.kind.map(k => KINDS.indexOf(k)),
      level: Array.from(this.level), variant: Array.from(this.variant),
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
    c.prepare();
    c.recompute();
    c.updateStats();
    return c;
  }
}
