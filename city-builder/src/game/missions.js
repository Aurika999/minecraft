// Misiuni cu premii: câte trei active odată, de la ușoare la grele. Fiecare are un progres (cât ai / cât trebuie),
// iar la final dă bani și o stea. Plus premiul zilnic, care crește cu fiecare zi în care joci la rând.
import { N } from './config.js';

const count = (c, ...kinds) => { let n = 0; for (let i = 0; i < N * N; i++) if (kinds.includes(c.kind[i])) n++; return n; };
const built = (c, ...kinds) => { let n = 0; for (let i = 0; i < N * N; i++) if (kinds.includes(c.kind[i]) && c.level[i] > 0) n++; return n; };
const ranchWith = (c, j) => { let n = 0; for (let i = 0; i < N * N; i++) if (c.kind[i] === 'ranch' && c.level[i] === j) n++; return n; };

// goal(oraș, contoare) → [cât ai, cât trebuie]
export const MISSIONS = [
  { id: 'road10', icon: '🛣️', text: 'Construiește 10 pătrățele de drum', reward: 300, goal: c => [count(c, 'road', 'crossing'), 10] },
  { id: 'homes6', icon: '🏠', text: 'Fă 6 pătrățele de locuințe', reward: 300, goal: c => [count(c, 'R', 'H'), 6] },
  { id: 'power1', icon: '⚡', text: 'Adu curent: o centrală, o eoliană sau panouri solare', reward: 500, goal: c => [Math.min(1, count(c, 'power', 'wind', 'solar')), 1] },
  { id: 'water1', icon: '💧', text: 'Construiește un turn de apă', reward: 500, goal: c => [count(c, 'water'), 1] },
  { id: 'pop50', icon: '👥', text: 'Ajungi la 50 de locuitori', reward: 500, goal: c => [c.stats.pop, 50] },
  { id: 'pet5', icon: '🐾', text: 'Mângâie 5 animale (atinge-le cu 🔍)', reward: 300, goal: (c, q) => [q.pets || 0, 5] },
  { id: 'quiz10', icon: '❓', text: 'Răspunde corect la 10 întrebări (butonul ❓)', reward: 500, goal: (c, q) => [q.quizTotal || 0, 10] },
  { id: 'park3', icon: '🌳', text: 'Fă 3 parcuri', reward: 400, goal: c => [count(c, 'park'), 3] },
  { id: 'ranch1', icon: '🐄', text: 'Construiește o fermă de animale', reward: 400, goal: c => [count(c, 'ranch'), 1] },
  { id: 'farm6', icon: '🥕', text: 'Plantează 6 pătrățele de legume', reward: 300, goal: c => [count(c, 'farm'), 6] },
  { id: 'walk30', icon: '🚶', text: 'Plimbă-te 30 de pătrățele cu personajul tău', reward: 300, goal: (c, q) => [Math.floor(q.walked || 0), 30] },
  { id: 'garden4', icon: '🌷', text: 'Fă 4 curți cu flori', reward: 300, goal: c => [count(c, 'garden'), 4] },
  { id: 'horse', icon: '🐴', text: 'Fă o fermă de cai', reward: 600, goal: c => [ranchWith(c, 4), 1] },
  { id: 'shops6', icon: '🏬', text: 'Ai 6 magazine construite', reward: 600, goal: c => [built(c, 'C'), 6] },
  { id: 'school', icon: '🏫', text: 'Construiește o școală', reward: 600, goal: c => [count(c, 'school'), 1] },
  { id: 'pop300', icon: '👥', text: 'Ajungi la 300 de locuitori', reward: 1000, goal: c => [c.stats.pop, 300] },
  { id: 'train', icon: '🚉', text: 'Pune o cale ferată (10 pătrățele) și o gară', reward: 1000, goal: c => [Math.min(10, count(c, 'rail', 'crossing')) + Math.min(1, count(c, 'station')), 11] },
  { id: 'bridge', icon: '🌉', text: 'Construiește un pod peste drum sau peste șine', reward: 800, goal: c => [Math.min(1, count(c, 'bridge')), 1] },
  { id: 'fun', icon: '🎡', text: 'Fă un parc de distracții', reward: 1000, goal: c => [Math.min(1, count(c, 'fun')), 1] },
  { id: 'wind3', icon: '🌬️', text: 'Pune 3 eoliene', reward: 800, goal: c => [count(c, 'wind'), 3] },
  { id: 'pets25', icon: '❤️', text: 'Mângâie 25 de animale', reward: 800, goal: (c, q) => [q.pets || 0, 25] },
  { id: 'pop1000', icon: '🏙️', text: 'Ajungi la 1.000 de locuitori', reward: 2000, goal: c => [c.stats.pop, 1000] },
  { id: 'happy', icon: '😊', text: 'Oameni fericiți: 75% mulțumire, cu cel puțin 200 de locuitori', reward: 1500, goal: c => [c.stats.pop >= 200 ? Math.round(c.stats.happiness * 100) : 0, 75] },
  { id: 'beach', icon: '🏖️', text: 'Fă o plajă pe malul lacului', reward: 400, goal: c => [Math.min(1, count(c, 'beach')), 1] },
  { id: 'cafe', icon: '☕', text: 'Deschide o cafenea', reward: 400, goal: c => [Math.min(1, count(c, 'cafe')), 1] },
  { id: 'gas', icon: '⛽', text: 'Construiește o benzinărie', reward: 600, goal: c => [Math.min(1, count(c, 'gas')), 1] },
  { id: 'airport', icon: '✈️', text: 'Fă un aeroport de cel puțin 8 pătrățele', reward: 2500, goal: c => [Math.min(8, count(c, 'airport')), 8] },
  { id: 'quiz100', icon: '🧠', text: 'Răspunde corect la 100 de întrebări', reward: 3000, goal: (c, q) => [q.quizTotal || 0, 100] },
  { id: 'pop3000', icon: '🌆', text: 'Ajungi la 3.000 de locuitori', reward: 5000, goal: c => [c.stats.pop, 3000] },
];
const BY_ID = Object.fromEntries(MISSIONS.map(m => [m.id, m]));
export const ACTIVE = 3;

export const newQuest = () => ({ done: [], stars: 0, pets: 0, walked: 0, daily: null, streak: 0 });

// misiunile la care lucrezi acum, cu progresul lor
export function active(c, q) {
  return MISSIONS.filter(m => !q.done.includes(m.id)).slice(0, ACTIVE).map(m => {
    const [have, need] = m.goal(c, q);
    return { ...m, have: Math.min(have, need), need };
  });
}

// verifică misiunile: le dă premiul celor îndeplinite și le întoarce
export function check(c, q) {
  const won = [];
  for (const m of active(c, q)) {
    if (m.have < m.need) continue;
    q.done.push(m.id);
    q.stars++;
    c.money += m.reward;
    won.push(m);
  }
  return won;
}

export const doneList = q => q.done.map(id => BY_ID[id]).filter(Boolean);

const dayKey = d => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
// premiul zilei: 100 $ în prima zi, +100 $ pentru fiecare zi la rând (cel mult 700 $)
export function daily(c, q, now = new Date()) {
  const today = dayKey(now);
  if (q.daily === today) return null;
  const yesterday = dayKey(new Date(now.getTime() - 864e5));
  q.streak = q.daily === yesterday ? (q.streak || 0) + 1 : 1;
  q.daily = today;
  const prize = 100 * Math.min(7, q.streak);
  c.money += prize;
  return { prize, streak: q.streak };
}
