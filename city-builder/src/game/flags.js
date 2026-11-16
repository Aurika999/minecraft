// Steagurile pe care le poți pune pe clădiri. Se desenează pe o pânză (canvas): același desen e folosit
// și pe hartă (ca textură), și în meniul din care alegi steagul (ca imagine).
// v = dungi verticale, h = dungi orizontale; draw = desen special.

export const FLAGS = [
  { id: 'ro', name: 'România', v: ['#002b7f', '#fcd116', '#ce1126'] },
  { id: 'md', name: 'Moldova', v: ['#0046ae', '#ffd200', '#cc092f'], draw: (x, w, h) => emblem(x, w, h, '#b07b2a') },
  { id: 'eu', name: 'Uniunea Europeană', draw: (x, w, h) => { fill(x, w, h, '#003399'); stars(x, w / 2, h / 2, h * .32, 12, h * .06, '#ffcc00'); } },
  { id: 'it', name: 'Italia', v: ['#009246', '#ffffff', '#ce2b37'] },
  { id: 'fr', name: 'Franța', v: ['#0055a4', '#ffffff', '#ef4135'] },
  { id: 'de', name: 'Germania', h: ['#000000', '#dd0000', '#ffce00'] },
  { id: 'es', name: 'Spania', h: ['#aa151b', '#f1bf00', '#f1bf00', '#aa151b'] },
  { id: 'ua', name: 'Ucraina', h: ['#0057b7', '#ffd700'] },
  { id: 'hu', name: 'Ungaria', h: ['#ce2939', '#ffffff', '#477050'] },
  { id: 'bg', name: 'Bulgaria', h: ['#ffffff', '#00966e', '#d62612'] },
  { id: 'at', name: 'Austria', h: ['#ed2939', '#ffffff', '#ed2939'] },
  { id: 'nl', name: 'Olanda', h: ['#ae1c28', '#ffffff', '#21468b'] },
  { id: 'pl', name: 'Polonia', h: ['#ffffff', '#dc143c'] },
  { id: 'ie', name: 'Irlanda', v: ['#169b62', '#ffffff', '#ff883e'] },
  { id: 'be', name: 'Belgia', v: ['#000000', '#fdda24', '#ef3340'] },
  { id: 'jp', name: 'Japonia', draw: (x, w, h) => { fill(x, w, h, '#ffffff'); circle(x, w / 2, h / 2, h * .3, '#bc002d'); } },
  { id: 'gb', name: 'Marea Britanie', draw: unionJack },
  { id: 'us', name: 'SUA', draw: usa },
  { id: 'rainbow', name: 'Curcubeu', h: ['#e40303', '#ff8c00', '#ffed00', '#008026', '#004dff', '#750787'] },
  { id: 'heart', name: 'Inimă', draw: (x, w, h) => { fill(x, w, h, '#ffffff'); heart(x, w / 2, h * .55, h * .62, '#e53935'); } },
  { id: 'star', name: 'Stea', draw: (x, w, h) => { fill(x, w, h, '#1e88e5'); stars(x, w / 2, h / 2, 0, 1, h * .36, '#ffffff'); } },
  { id: 'pirate', name: 'Pirați', draw: pirate },
  { id: 'city', name: 'Orașul Meu', draw: (x, w, h) => { fill(x, w, h, '#2e9d55'); house(x, w / 2, h / 2, h * .62, '#ffffff'); } },
  { id: 'white', name: 'Alb (pace)', draw: (x, w, h) => fill(x, w, h, '#ffffff') },
];

export const FLAG_W = 96, FLAG_H = 64;

function fill(x, w, h, c) { x.fillStyle = c; x.fillRect(0, 0, w, h); }
function circle(x, cx, cy, r, c) { x.fillStyle = c; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill(); }
function star(x, cx, cy, r, c) {
  x.fillStyle = c; x.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * .45 : r;
    x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  x.closePath(); x.fill();
}
function stars(x, cx, cy, R, n, r, c) {
  for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2; star(x, cx + Math.cos(a) * R, cy + Math.sin(a) * R, r, c); }
}
function emblem(x, w, h, c) {
  // stema simplificată: un scut cu un cap de bour stilizat
  x.fillStyle = c;
  x.beginPath();
  x.moveTo(w / 2 - h * .12, h * .3); x.lineTo(w / 2 + h * .12, h * .3); x.lineTo(w / 2 + h * .12, h * .55);
  x.quadraticCurveTo(w / 2, h * .72, w / 2 - h * .12, h * .55); x.closePath(); x.fill();
  x.fillStyle = '#7a3b10'; x.fillRect(w / 2 - h * .05, h * .38, h * .1, h * .14);
}
function heart(x, cx, cy, s, c) {
  x.fillStyle = c; x.beginPath();
  x.moveTo(cx, cy + s * .35);
  x.bezierCurveTo(cx - s * .6, cy - s * .05, cx - s * .3, cy - s * .55, cx, cy - s * .2);
  x.bezierCurveTo(cx + s * .3, cy - s * .55, cx + s * .6, cy - s * .05, cx, cy + s * .35);
  x.fill();
}
function house(x, cx, cy, s, c) {
  x.fillStyle = c;
  x.beginPath(); x.moveTo(cx - s * .45, cy - s * .02); x.lineTo(cx, cy - s * .45); x.lineTo(cx + s * .45, cy - s * .02); x.closePath(); x.fill();
  x.fillRect(cx - s * .32, cy - s * .02, s * .64, s * .42);
  x.fillStyle = '#2e9d55'; x.fillRect(cx - s * .08, cy + s * .14, s * .16, s * .26);
}
function unionJack(x, w, h) {
  fill(x, w, h, '#012169');
  const diag = (lw, c) => { x.strokeStyle = c; x.lineWidth = lw; x.beginPath(); x.moveTo(0, 0); x.lineTo(w, h); x.moveTo(w, 0); x.lineTo(0, h); x.stroke(); };
  diag(h * .2, '#ffffff'); diag(h * .08, '#c8102e');
  x.fillStyle = '#ffffff'; x.fillRect(w / 2 - h * .17, 0, h * .34, h); x.fillRect(0, h / 2 - h * .17, w, h * .34);
  x.fillStyle = '#c8102e'; x.fillRect(w / 2 - h * .1, 0, h * .2, h); x.fillRect(0, h / 2 - h * .1, w, h * .2);
}
function usa(x, w, h) {
  for (let k = 0; k < 13; k++) { x.fillStyle = k % 2 ? '#ffffff' : '#b22234'; x.fillRect(0, k * h / 13, w, h / 13 + 1); }
  x.fillStyle = '#3c3b6e'; x.fillRect(0, 0, w * .42, h * 7 / 13);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) star(x, w * .05 + c * w * .08, h * .07 + r * h * .12, h * .035, '#ffffff');
}
function pirate(x, w, h) {
  fill(x, w, h, '#111111');
  const cx = w / 2, cy = h * .42, s = h;
  // oasele încrucișate
  x.strokeStyle = '#ffffff'; x.lineWidth = s * .07; x.lineCap = 'round';
  x.beginPath(); x.moveTo(cx - s * .3, cy + s * .05); x.lineTo(cx + s * .3, cy + s * .42); x.moveTo(cx + s * .3, cy + s * .05); x.lineTo(cx - s * .3, cy + s * .42); x.stroke();
  // craniul
  circle(x, cx, cy, s * .2, '#ffffff');
  x.fillRect(cx - s * .1, cy + s * .1, s * .2, s * .12);
  circle(x, cx - s * .075, cy, s * .05, '#111111');
  circle(x, cx + s * .075, cy, s * .05, '#111111');
}

// desenează steagul j pe o pânză nouă (w × h)
export function flagCanvas(j, w = FLAG_W, h = FLAG_H) {
  const f = FLAGS[j] || FLAGS[0];
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  if (f.v) f.v.forEach((col, k) => { x.fillStyle = col; x.fillRect(Math.floor(k * w / f.v.length), 0, Math.ceil(w / f.v.length) + 1, h); });
  if (f.h) f.h.forEach((col, k) => { x.fillStyle = col; x.fillRect(0, Math.floor(k * h / f.h.length), w, Math.ceil(h / f.h.length) + 1); });
  if (f.draw) f.draw(x, w, h);
  return c;
}

// imaginea mică pentru meniu (se face o singură dată pentru fiecare steag)
const urls = [];
export function flagImage(j) {
  if (!urls[j]) {
    const c = flagCanvas(j, 60, 40), x = c.getContext('2d');
    x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = 2; x.strokeRect(1, 1, 58, 38);
    urls[j] = c.toDataURL();
  }
  return urls[j];
}
