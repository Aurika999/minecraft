// Meciul de fotbal de pe un teren: două echipe de câte 5 (portar, 2 fundași, 2 atacanți) și un arbitru.
// Jucătorul cu mingea o duce spre poarta adversă, o pasează la un coechipier sau șutează; adversarii încearcă
// să i-o fure. La gol, echipa care a marcat sare de bucurie, tabela se schimbă și se reia de la centru.
import * as THREE from 'three';
import { flagCanvas, teamKits, DEFAULT_TEAMS } from './flags.js';

// dimensiunile terenului, în coordonatele pătrățelului (x = lungimea, porțile la ±L)
export const PITCH = { L: .4, W: .25, Z: .07 };
const Y = .02; // înălțimea gazonului

// portarii poartă o culoare care nu seamănă cu tricourile celor două echipe
const KEEPERS = [0x43e06b, 0xff9800, 0x8e24aa, 0x00bcd4, 0x111111, 0xff4fa3];
const dist = (a, b) => Math.hypot((a >> 16 & 255) - (b >> 16 & 255), (a >> 8 & 255) - (b >> 8 & 255), (a & 255) - (b & 255));
function keeperColors(s0, s1) {
  const ok = KEEPERS.filter(c => dist(c, s0) > 110 && dist(c, s1) > 110);
  return [ok[0] ?? KEEPERS[0], ok[1] ?? KEEPERS[1]];
}
const SKIN = [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xffdbac];
const HAIR = [0x2b1b0e, 0x4a2c17, 0x111111, 0xd9a441, 0x7a4a24];
// formația echipei care atacă spre +x: portar, doi fundași, doi atacanți
const FORM = [[-.36, 0], [-.22, -.1], [-.22, .1], [-.06, -.12], [-.06, .12]];

let KIT = null;
function kit() {
  if (KIT) return KIT;
  const box = (w, h, d, y0 = 0) => new THREE.BoxGeometry(w, h, d).translate(0, h / 2 + y0, 0);
  const mats = new Map();
  KIT = {
    leg: box(.009, .03, .01, -.03), // atârnă de la șold în jos, ca să se poată balansa
    shorts: box(.026, .014, .02),
    shirt: box(.028, .028, .02),
    arm: box(.007, .024, .008, -.024),
    head: new THREE.SphereGeometry(.0105, 10, 8),
    hair: new THREE.SphereGeometry(.011, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
    ball: new THREE.IcosahedronGeometry(.0075, 1),
    shadow: new THREE.CircleGeometry(.014, 12).rotateX(-Math.PI / 2),
    mat: c => {
      if (!mats.has(c)) mats.set(c, new THREE.MeshLambertMaterial({ color: c }));
      return mats.get(c);
    },
    shadowMat: new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .22, depthWrite: false }),
  };
  return KIT;
}

function makePlayer(shirt, shorts, seed) {
  const K = kit(), grp = new THREE.Group(), body = new THREE.Group();
  const skin = K.mat(SKIN[seed % SKIN.length]);
  const mesh = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; body.add(m); return m; };
  const legs = [-1, 1].map(s => mesh(K.leg, skin, 0, .032, s * .006));
  for (const l of legs) { const sock = new THREE.Mesh(K.shorts, K.mat(shirt)); sock.scale.set(.4, .6, .5); sock.position.y = -.03; l.add(sock); }
  mesh(K.shorts, K.mat(shorts), 0, .03, 0);
  mesh(K.shirt, K.mat(shirt), 0, .044, 0);
  const arms = [-1, 1].map(s => mesh(K.arm, K.mat(shirt), 0, .07, s * .017));
  mesh(K.head, skin, 0, .082, 0);
  mesh(K.hair, K.mat(HAIR[(seed >> 2) % HAIR.length]), -.001, .084, 0);
  const sh = new THREE.Mesh(K.shadow, K.shadowMat); sh.position.y = .001; grp.add(sh);
  grp.add(body);
  return { grp, body, legs, arms, phase: seed * 1.7, x: 0, z: 0 };
}

// tabela de marcaj: o textură mică, redesenată la fiecare gol
function scoreTexture(m) {
  const x = m.board.ctx;
  x.fillStyle = '#1b1f24'; x.fillRect(0, 0, 256, 96);
  // steagurile celor două țări, cu un chenar alb
  m.teams.forEach((j, s) => { const fx = s ? 182 : 8; x.fillStyle = '#ffffff'; x.fillRect(fx - 3, 25, 72, 50); x.drawImage(flagCanvas(j, 66, 44), fx, 28); });
  x.fillStyle = '#ffd54f'; x.font = 'bold 50px "Segoe UI", Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(`${m.score[0]} : ${m.score[1]}`, 128, 52);
  m.board.tex.needsUpdate = true;
}

export function createMatch(spot, seed = 0) {
  const K = kit(), { L, Z } = PITCH;
  const root = new THREE.Group();
  root.position.set(spot.x, 0, spot.z);
  root.rotation.y = spot.r;
  const teams = spot.teams || DEFAULT_TEAMS, kits = teamKits(teams[0], teams[1]), keepers = keeperColors(kits[0][0], kits[1][0]);
  const players = [];
  for (let team = 0; team < 2; team++) {
    const dir = team ? -1 : 1, T = { shirt: kits[team][0], shorts: kits[team][1], keeper: keepers[team] };
    FORM.forEach(([hx, hz], j) => {
      const p = makePlayer(j === 0 ? T.keeper : T.shirt, T.shorts, seed * 31 + team * 7 + j);
      p.team = team; p.keeper = j === 0; p.dir = dir;
      p.hx = hx * dir; p.hz = Z + hz * dir;
      p.x = p.hx; p.z = p.hz;
      p.grp.position.set(p.x, Y, p.z);
      p.grp.rotation.y = team ? Math.PI : 0;
      root.add(p.grp);
      players.push(p);
    });
  }
  // arbitrul e în negru, sau în galben-fluo dacă vreo echipă e îmbrăcată închis
  const refCol = kits.some(k => dist(k[0], 0x222222) < 110) ? 0xc6ff00 : 0x222222;
  const ref = makePlayer(refCol, 0x222222, seed + 3);
  ref.ref = true; ref.x = 0; ref.z = Z - .16; root.add(ref.grp);
  const ball = new THREE.Mesh(K.ball, K.mat(0xffffff)); ball.castShadow = true; root.add(ball);
  // tabela pe stâlp, în spatele tribunei
  const c = document.createElement('canvas'); c.width = 256; c.height = 96;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const boardMat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
  const board = new THREE.Mesh(new THREE.PlaneGeometry(.2, .075), boardMat);
  const boardGrp = new THREE.Group(); boardGrp.position.set(L - .02, .5, -.44); boardGrp.add(board); root.add(boardGrp);
  const m = {
    root, players, ref, ball, boardGrp,
    board: { ctx: c.getContext('2d'), tex, mat: boardMat },
    score: [0, 0], key: spot.key, r: spot.r, teams,
    b: { x: 0, z: Z, y: 0, mode: 'held', holder: null, hold: 1 },
    party: -1, wait: 0, rnd: seed * 7919 + 13,
  };
  kickoff(m, seed % 2);
  scoreTexture(m);
  return m;
}

export function disposeMatch(m) {
  m.board.tex.dispose(); m.board.mat.dispose(); m.boardGrp.children[0].geometry.dispose();
}

// generator de numere aleatoare (mulberry32), cu sămânța proprie fiecărui meci
function rand(m) {
  let t = (m.rnd = (m.rnd + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// lovitura de începere: atacantul echipei primește mingea la centru
function kickoff(m, team) {
  const p = m.players[team * 5 + 3];
  p.x = -.02 * p.dir; p.z = PITCH.Z;
  Object.assign(m.b, { mode: 'held', holder: p, hold: .5, x: p.x, z: p.z, y: 0 });
  m.back = true; // prima pasă merge înapoi, la un fundaș
}

function kick(m, from, tx, tz, opts = {}) {
  const d = Math.hypot(tx - m.b.x, tz - m.b.z);
  Object.assign(m.b, { mode: 'fly', holder: null, fx: m.b.x, fz: m.b.z, tx, tz, u: 0, dur: Math.max(.25, d / (opts.shot ? .9 : .55)), arc: opts.shot ? .02 : .012 + d * .04, shot: false, goal: false, to: null, ...opts, from });
}

export function updateMatch(m, dt, camYaw) {
  const { L, W, Z } = PITCH, b = m.b, P = m.players;
  // mingea
  if (b.mode === 'held') {
    const p = b.holder;
    b.hold -= dt;
    const goalX = L * p.dir;
    if (!p.keeper && Math.abs(goalX - p.x) < .17 && b.hold < .4) {
      // șut la poartă
      const gz = Z + (rand(m) - .5) * .1, goal = rand(m) < .28;
      kick(m, p, goalX + .02 * p.dir, gz, { shot: true, goal, team: p.team });
    } else if (b.hold <= 0) {
      // pasă la un coechipier (portarul dă mereu în teren)
      const mates = P.filter(q => q.team === p.team && q !== p && !q.keeper);
      const ahead = mates.filter(q => (q.x - p.x) * p.dir > -.05);
      const backs = mates.filter(q => (q.x - p.x) * p.dir < -.08);
      const pool = m.back && backs.length ? backs : ahead.length && rand(m) < .7 ? ahead : mates;
      m.back = false;
      const to = pool[Math.floor(rand(m) * pool.length)];
      kick(m, p, to.x + .03 * to.dir, to.z, { to });
    } else {
      b.x = p.x + Math.cos(p.yaw || 0) * .016;
      b.z = p.z - Math.sin(p.yaw || 0) * .016;
      // un adversar aproape poate fura mingea (sau jucătorul presat scapă de ea mai repede)
      for (const q of P) {
        if (q.team === p.team || q.keeper) continue;
        if (Math.hypot(q.x - p.x, q.z - p.z) < .06 && b.hold > .15) b.hold -= dt * 1.5;
        if (Math.hypot(q.x - p.x, q.z - p.z) < .028 && rand(m) < dt * 1.2) {
          Object.assign(b, { holder: q, hold: .6 + rand(m) * .8 });
          break;
        }
      }
    }
  } else if (b.mode === 'fly') {
    b.u = Math.min(1, b.u + dt / b.dur);
    const u = b.u;
    b.x = b.fx + (b.tx - b.fx) * u; b.z = b.fz + (b.tz - b.fz) * u;
    b.y = b.arc * 4 * u * (1 - u);
    if (u >= 1) {
      if (b.shot) {
        if (b.goal) {
          m.score[b.team]++; scoreTexture(m);
          m.party = b.team; m.wait = 2.6;
          Object.assign(b, { mode: 'dead', y: 0 });
        } else {
          // portarul prinde mingea
          const k = P[(1 - b.team) * 5];
          Object.assign(b, { mode: 'held', holder: k, hold: .9 + rand(m) * .5 });
        }
      } else Object.assign(b, { mode: 'held', holder: b.to, hold: .5 + rand(m) * 1.2 });
    }
  } else if (b.mode === 'dead') {
    m.wait -= dt;
    if (m.wait <= 0) { const t = 1 - m.party; m.party = -1; kickoff(m, t); }
  }

  // jucătorii
  const holder = b.mode === 'held' ? b.holder : null;
  const atk = holder ? holder.team : b.mode === 'fly' && b.from ? b.from.team : -1;
  // din echipa care nu are mingea, cel mai apropiat jucător de câmp o urmărește
  const chaser = [null, null];
  for (const team of [0, 1]) {
    if (team === atk || b.mode === 'dead') continue;
    let best = 1e9;
    for (const q of P) if (q.team === team && !q.keeper) {
      const d = Math.hypot(q.x - b.x, q.z - b.z);
      if (d < best) { best = d; chaser[team] = q; }
    }
  }
  const t = performance.now() / 1000;
  for (const p of [...P, m.ref]) {
    let tx, tz, speed = .11;
    if (p.ref) { tx = b.x * .7; tz = Z - .17 + (b.z - Z) * .3; speed = .09; }
    else if (b.mode === 'dead') { tx = p.hx; tz = p.hz; speed = .07; if (m.party === p.team && !p.keeper) { tx = p.x; tz = p.z; } }
    else if (p === holder) {
      if (p.keeper) { tx = p.x; tz = p.z; }
      else { tx = L * p.dir; tz = Z + (b.z - Z) * .6; speed = .125; }
    } else if (p.keeper) {
      tx = (L - .03) * -p.dir; tz = Z + Math.max(-.06, Math.min(.06, (b.z - Z) * .5));
      if (b.mode === 'fly' && b.shot && b.team !== p.team) tz = b.tz; // se aruncă spre minge
      speed = .14;
    } else if (p === chaser[p.team]) {
      tx = b.mode === 'fly' ? b.tx : b.x; tz = b.mode === 'fly' ? b.tz : b.z; speed = .105;
    } else if (b.mode === 'fly' && b.to === p) { tx = b.tx; tz = b.tz; speed = .12; }
    else {
      const push = atk === p.team ? .1 * p.dir : atk >= 0 ? -.05 * p.dir : 0;
      tx = p.hx + b.x * .45 + push; tz = p.hz + (b.z - Z) * .35;
    }
    tx = Math.max(-L - .02, Math.min(L + .02, tx));
    tz = Math.max(Z - W - .02, Math.min(Z + W + .02, tz));
    const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
    const step = Math.min(d, speed * dt);
    let moving = d > .004;
    if (moving) {
      p.x += dx / d * step; p.z += dz / d * step;
      const want = Math.atan2(-dz, dx);
      let diff = want - (p.yaw ?? want);
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      p.yaw = (p.yaw ?? want) + diff * Math.min(1, dt * 10);
    } else if (!p.ref) {
      // cine stă se uită spre minge
      const want = Math.atan2(-(b.z - p.z), b.x - p.x);
      let diff = want - (p.yaw ?? want);
      p.yaw = (p.yaw ?? want) + Math.atan2(Math.sin(diff), Math.cos(diff)) * Math.min(1, dt * 5);
    }
    const jump = m.party === p.team && b.mode === 'dead' && !p.keeper;
    p.phase += dt * (moving ? 16 : 0);
    const swing = moving ? Math.sin(p.phase) * .7 : 0;
    p.legs[0].rotation.z = swing; p.legs[1].rotation.z = -swing;
    p.arms[0].rotation.z = jump ? Math.PI * .9 : -swing * .8;
    p.arms[1].rotation.z = jump ? Math.PI * .9 : swing * .8;
    p.body.position.y = jump ? Math.abs(Math.sin(t * 9 + p.phase)) * .025 : moving ? Math.abs(Math.sin(p.phase)) * .004 : 0;
    p.grp.position.set(p.x, Y, p.z);
    p.grp.rotation.y = p.yaw || 0;
  }
  m.ball.position.set(b.x, Y + .0075 + b.y, b.z);
  m.ball.rotation.z -= dt * 8;
  m.boardGrp.rotation.y = camYaw - m.r;
}
