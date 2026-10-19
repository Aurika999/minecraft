import { item, maxStack } from './registry.js';

// 36 de sloturi: 0–8 bara de jos, 9–35 inventarul principal. Un slot: { id, count, dur? }
export class Inventory {
  constructor() { this.slots = new Array(36).fill(null); }

  // întoarce câte obiecte NU au încăput
  addRange(id, count, dur, from, to) {
    const max = maxStack(id), tool = item(id).tool;
    if (max > 1) for (let i = from; i < to && count; i++) {
      const s = this.slots[i];
      if (s && s.id === id && s.count < max) { const m = Math.min(count, max - s.count); s.count += m; count -= m; }
    }
    for (let i = from; i < to && count; i++) {
      if (this.slots[i]) continue;
      const m = Math.min(count, max);
      this.slots[i] = tool ? { id, count: m, dur: dur ?? tool.dur } : { id, count: m };
      count -= m;
    }
    return count;
  }

  add(id, count = 1, dur) { return this.addRange(id, count, dur, 0, 36); }

  count(id) { return this.slots.reduce((n, s) => n + (s && s.id === id ? s.count : 0), 0); }

  remove(id, n) {
    for (let i = 35; i >= 0 && n > 0; i--) {
      const s = this.slots[i];
      if (!s || s.id !== id) continue;
      const m = Math.min(n, s.count);
      s.count -= m; n -= m;
      if (!s.count) this.slots[i] = null;
    }
    return n === 0;
  }
}
