// Calcule pentru modul „Matematică”: fiecare bloc are calculul lui, mereu același
// pentru aceeași poziție (până greșești de 3 ori și primești altul).
import { mulberry32 } from './noise.js';

export const MATH_LEVELS = { off: 'Fără', easy: 'Ușor', medium: 'Mediu', hard: 'Greu' };
const LEVEL_SEED = { easy: 1, medium: 2, hard: 3 };

export function makeProblem(level, x, y, z, salt = 0) {
  const seed = Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(z, 83492791)
    ^ Math.imul(salt + 1, 2654435761 | 0) ^ Math.imul(LEVEL_SEED[level], 40503);
  const r = mulberry32(seed), n = (a, b) => a + Math.floor(r() * (b - a + 1)), k = r();
  if (level === 'easy') {
    if (k < .5) { const a = n(0, 10), b = n(0, 10); return { text: `${a} + ${b}`, answer: a + b }; }
    const a = n(1, 20), b = n(0, a);
    return { text: `${a} − ${b}`, answer: a - b };
  }
  if (level === 'medium') {
    if (k < .35) { const a = n(10, 90), b = n(1, 100 - a); return { text: `${a} + ${b}`, answer: a + b }; }
    if (k < .65) { const a = n(10, 100), b = n(1, a); return { text: `${a} − ${b}`, answer: a - b }; }
    const a = n(2, 10), b = n(2, 10);
    return { text: `${a} × ${b}`, answer: a * b };
  }
  if (k < .3) { const a = n(3, 12), b = n(3, 12); return { text: `${a} × ${b}`, answer: a * b }; }
  if (k < .55) { const b = n(2, 12), c = n(2, 12); return { text: `${b * c} ÷ ${b}`, answer: c }; }
  if (k < .7) { const a = n(100, 900), b = n(10, 999 - a); return { text: `${a} + ${b}`, answer: a + b }; }
  if (k < .85) { const a = n(100, 999), b = n(10, a); return { text: `${a} − ${b}`, answer: a - b }; }
  const a = n(1, 20), b = n(2, 9), c = n(2, 9);
  return { text: `${a} + ${b} × ${c}`, answer: a + b * c };
}
