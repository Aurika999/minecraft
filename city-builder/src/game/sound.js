// Sunetele jocului, făcute pe loc cu WebAudio (fără fișiere de descărcat): construcții, monede, fanfară,
// glasurile animalelor, clopoțelul de la barieră, claxoane, păsărele și o melodie veselă de fundal.
// Browserele pornesc sunetul doar după primul click, de aceea `unlock()` se cheamă la prima atingere.
const KEY = 'orasul-meu-sunet';

let ctx = null, master = null, sfxBus = null, musicBus = null, noiseBuf = null;
const pref = (() => { try { return { sfx: true, music: true, ...JSON.parse(localStorage.getItem(KEY)) }; } catch { return { sfx: true, music: true }; } })();

function setup() {
  if (ctx) return true;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = .8; master.connect(ctx.destination);
  sfxBus = ctx.createGain(); sfxBus.gain.value = pref.sfx ? 1 : 0; sfxBus.connect(master);
  musicBus = ctx.createGain(); musicBus.gain.value = pref.music ? .22 : 0; musicBus.connect(master);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return true;
}

export function unlock() {
  if (!setup()) return;
  if (ctx.state === 'suspended') ctx.resume();
  if (pref.music) music.start();
}

export const prefs = () => ({ ...pref });
export function setPref(k, on) {
  pref[k] = on;
  try { localStorage.setItem(KEY, JSON.stringify(pref)); } catch { /* fără */ }
  if (!ctx) return;
  const t = ctx.currentTime;
  if (k === 'sfx') sfxBus.gain.setTargetAtTime(on ? 1 : 0, t, .05);
  if (k === 'music') { musicBus.gain.setTargetAtTime(on ? .22 : 0, t, .2); if (on) music.start(); else music.stop(); }
}

const ready = () => ctx && ctx.state === 'running' && pref.sfx;

// un ton: frecvența poate aluneca (f → f2), cu vibrato, plic de volum scurt
function tone({ f, f2 = f, type = 'sine', at = 0, dur = .2, vol = .25, vib = 0, vibF = 6, bus = sfxBus, filter = 0, attack = .01 }) {
  const t = ctx.currentTime + at, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (f2 !== f) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  if (vib) {
    const l = ctx.createOscillator(), lg = ctx.createGain();
    l.frequency.value = vibF; lg.gain.value = vib; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + .05);
  }
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(.0008, t + dur);
  let out = o;
  if (filter) { const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = filter; o.connect(fl); out = fl; }
  out.connect(g); g.connect(bus);
  o.start(t); o.stop(t + dur + .05);
}

function noise({ at = 0, dur = .15, vol = .2, freq = 1200, q = 1, type = 'bandpass' }) {
  const t = ctx.currentTime + at, s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noiseBuf; fl.type = type; fl.frequency.value = freq; fl.Q.value = q;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0008, t + dur);
  s.connect(fl); fl.connect(g); g.connect(sfxBus);
  s.start(t, Math.random() * .5); s.stop(t + dur + .05);
}

export const sfx = {
  build() { if (!ready()) return; noise({ dur: .08, vol: .3, freq: 500 }); tone({ f: 520, f2: 780, type: 'triangle', at: .04, dur: .14, vol: .18 }); },
  demolish() { if (!ready()) return; noise({ dur: .35, vol: .35, freq: 300, q: .7 }); },
  coin() { if (!ready()) return; tone({ f: 988, type: 'square', dur: .08, vol: .08 }); tone({ f: 1319, type: 'square', at: .08, dur: .25, vol: .08 }); },
  pop() { if (!ready()) return; tone({ f: 600, f2: 1100, dur: .1, vol: .2 }); },
  click() { if (!ready()) return; tone({ f: 900, dur: .05, vol: .08, type: 'triangle' }); },
  fanfare() {
    if (!ready()) return;
    [[523, 0], [659, .12], [784, .24], [1047, .4]].forEach(([f, at]) => tone({ f, type: 'triangle', at, dur: at > .3 ? .6 : .16, vol: .22 }));
    [[262, .4], [392, .4]].forEach(([f, at]) => tone({ f, type: 'sine', at, dur: .6, vol: .12 }));
  },
  wrong() { if (!ready()) return; tone({ f: 330, f2: 220, type: 'triangle', dur: .35, vol: .14 }); },
  heart() { if (!ready()) return; tone({ f: 880, f2: 1320, dur: .18, vol: .1, type: 'sine' }); },
  ding() { if (!ready()) return; tone({ f: 1480, type: 'sine', dur: .35, vol: .07 }); tone({ f: 2960, type: 'sine', dur: .2, vol: .02 }); },
  honk() { if (!ready()) return; const f = 330 + Math.random() * 120; tone({ f, type: 'square', dur: .22, vol: .045, filter: 1400 }); tone({ f: f * 1.26, type: 'square', dur: .22, vol: .035, filter: 1400 }); },
  chirp() {
    if (!ready()) return;
    const base = 2600 + Math.random() * 1400, n = 2 + (Math.random() * 3 | 0);
    for (let k = 0; k < n; k++) tone({ f: base, f2: base * (1.25 + Math.random() * .3), at: k * .11, dur: .07, vol: .025 });
  },
  cricket() {
    if (!ready()) return;
    for (let k = 0; k < 3; k++) tone({ f: 4300, type: 'sine', at: k * .09, dur: .05, vol: .018, vib: 300, vibF: 60 });
  },
  // glasurile animalelor
  animal(id) {
    if (!ready()) return;
    const v = {
      cow: () => tone({ f: 150, f2: 110, type: 'sawtooth', dur: .9, vol: .16, vib: 3, vibF: 5, filter: 700, attack: .12 }),
      pig: () => { for (let k = 0; k < 3; k++) { tone({ f: 190, f2: 140, type: 'sawtooth', at: k * .14, dur: .11, vol: .14, filter: 900 }); noise({ at: k * .14, dur: .1, vol: .08, freq: 400 }); } },
      sheep: () => tone({ f: 420, f2: 380, type: 'sawtooth', dur: .7, vol: .12, vib: 40, vibF: 13, filter: 1800, attack: .05 }),
      goat: () => tone({ f: 560, f2: 480, type: 'sawtooth', dur: .55, vol: .11, vib: 60, vibF: 15, filter: 2200, attack: .04 }),
      horse: () => { tone({ f: 600, f2: 950, type: 'sawtooth', dur: .25, vol: .1, vib: 50, vibF: 18, filter: 2500 }); tone({ f: 950, f2: 380, type: 'sawtooth', at: .25, dur: .6, vol: .1, vib: 70, vibF: 20, filter: 2500 }); },
      chicken: () => { [0, .12, .24, .5].forEach((at, k) => tone({ f: k === 3 ? 900 : 700, f2: k === 3 ? 1300 : 760, type: 'square', at, dur: k === 3 ? .3 : .07, vol: .06, filter: 2400 })); },
      turkey: () => tone({ f: 340, f2: 300, type: 'square', dur: .6, vol: .07, vib: 120, vibF: 24, filter: 1600 }),
      duck: () => { [0, .2].forEach(at => tone({ f: 480, f2: 360, type: 'sawtooth', at, dur: .15, vol: .12, filter: 1200 })); },
    }[id];
    (v || this.pop)();
  },
};

// ploaia: un foșnet continuu, cât de tare plouă (0..1)
let rainSrc = null, rainGain = null;
export function setRain(v) {
  if (!ctx || ctx.state !== 'running') return;
  if (!rainSrc && v > 0) {
    rainSrc = ctx.createBufferSource(); rainSrc.buffer = noiseBuf; rainSrc.loop = true;
    const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 1800;
    rainGain = ctx.createGain(); rainGain.gain.value = 0;
    rainSrc.connect(fl); fl.connect(rainGain); rainGain.connect(sfxBus); rainSrc.start();
  }
  if (rainGain) rainGain.gain.setTargetAtTime(v * .16, ctx.currentTime, .3);
}

// melodia de fundal: o buclă veselă de 4 măsuri (pentatonică), cu bas și un clinchet ușor
const music = (() => {
  const C = [523, 587, 659, 784, 880, 1047], BASS = [131, 175, 196, 131];
  const tune = [0, 2, 4, 2, 3, 2, 0, -1, 1, 3, 5, 3, 4, 3, 1, -1, 2, 4, 5, 4, 3, 1, 2, -1, 0, 2, 1, 3, 2, 1, 0, -1];
  let timer = null, step = 0, next = 0;
  const BEAT = .27;
  function tick() {
    if (!ctx) return;
    while (next < ctx.currentTime + .6) {
      const at = next - ctx.currentTime, n = tune[step % tune.length];
      if (n >= 0) tone({ f: C[n], type: 'triangle', at, dur: BEAT * 1.6, vol: .16, bus: musicBus, attack: .02 });
      if (step % 4 === 0) tone({ f: BASS[(step / 8 | 0) % 4], type: 'sine', at, dur: BEAT * 3.6, vol: .22, bus: musicBus, attack: .03 });
      if (step % 2 === 1) tone({ f: 2093, type: 'sine', at, dur: .06, vol: .02, bus: musicBus });
      step++; next += BEAT;
    }
  }
  return {
    start() { if (timer || !ctx) return; next = ctx.currentTime + .1; timer = setInterval(tick, 150); tick(); },
    stop() { clearInterval(timer); timer = null; },
  };
})();
