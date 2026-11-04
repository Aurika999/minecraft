// Conturi, prieteni și vizite, prin Firebase (Authentication + Firestore).
// Date:
//   users/{uid}                 profilul public: nume, cod de prieten, preț bilet, încasări din bilete, like-uri, statistici
//   users/{uid}/friends/{fid}   lista de prieteni
//   codes/{cod}                 codul de prieten → uid
//   cities/{uid}                orașul salvat (City.toJSON, ca text)
//   friendRequests/{from_to}    cereri de prietenie
//   visits/{id}                 cine a vizitat pe cine și cât a plătit
import { initializeApp } from 'firebase/app';
import {
  getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as fbSignOut,
} from 'firebase/auth';
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs,
  onSnapshot, writeBatch, runTransaction, serverTimestamp, addDoc, increment,
} from 'firebase/firestore';
import { connectAuthEmulator } from 'firebase/auth';
import { connectFirestoreEmulator } from 'firebase/firestore';
import { firebaseConfig } from './firebase-config.js';

// pentru teste pe calculator: `VITE_EMULATOR=1 npm run dev` folosește emulatorul Firebase în loc de proiectul real
const emulator = import.meta.env?.VITE_EMULATOR === '1' || globalThis.ORASUL_EMULATOR === true;
const config = firebaseConfig || (emulator ? { apiKey: 'demo-key', authDomain: 'localhost', projectId: 'demo-orasul' } : null);

export const enabled = !!config;
// numele unic permite mai multe conturi în același proces (folosit la teste)
const app = enabled ? initializeApp(config, globalThis.ORASUL_APP_NAME || '[DEFAULT]') : null;
const auth = app && getAuth(app);
const db = app && getFirestore(app);
if (emulator && app) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}

export const MAX_TICKET = 500;

// ---------- cont ----------

export const onUser = cb => (enabled ? onAuthStateChanged(auth, cb) : (cb(null), () => {}));
export const signInGoogle = () => signInWithPopup(auth, new GoogleAuthProvider());
export const signInEmail = (email, pass) => signInWithEmailAndPassword(auth, email, pass);
export const signUpEmail = (email, pass) => createUserWithEmailAndPassword(auth, email, pass);
export const signOut = () => fbSignOut(auth);

// cod de prieten scurt, ușor de dictat: trei litere + patru cifre, fără litere care se încurcă (O/0, I/1)
function newCode(name) {
  const letters = 'ABCDEFGHJKLMNPRSTUVWXYZ';
  const clean = (name || '').toUpperCase().replace(/[^A-Z]/g, '');
  const pre = (clean + [0, 1, 2].map(() => letters[Math.random() * letters.length | 0]).join('')).slice(0, 3);
  return `${pre}-${1000 + (Math.random() * 9000 | 0)}`;
}

// profilul se face o singură dată, la prima intrare
export async function ensureProfile(user) {
  const ref = doc(db, 'users', user.uid), snap = await getDoc(ref);
  if (snap.exists()) return snap.data();
  const name = (user.displayName || user.email?.split('@')[0] || 'Primar').slice(0, 24);
  let code;
  for (let i = 0; i < 8; i++) {
    code = newCode(name);
    if (!(await getDoc(doc(db, 'codes', code))).exists()) break;
  }
  await setDoc(doc(db, 'codes', code), { uid: user.uid });
  const profile = { name, code, ticket: 50, pending: 0, pendingVisitors: 0, likes: 0, stats: {}, createdAt: serverTimestamp() };
  await setDoc(ref, profile);
  return profile;
}

export const watchProfile = (uid, cb) => onSnapshot(doc(db, 'users', uid), s => cb(s.exists() ? s.data() : null));
export const updateProfile = (uid, data) => updateDoc(doc(db, 'users', uid), data);

// ---------- orașul în cont ----------

// bugetul (bani, taxe, raportul lunii) stă separat, în private/{uid}, pe care îl citește doar proprietarul;
// orașul din cities/{uid}, pe care îl văd prietenii în vizită, nu-l conține
const SECRET = ['money', 'tax', 'lastMonth', 'harvest'];

export async function saveCity(uid, city) {
  const s = city.stats, full = city.toJSON();
  const secret = Object.fromEntries(SECRET.map(k => [k, full[k] ?? null]));
  const pub = { ...full, money: 0, tax: 9, lastMonth: null, harvest: 0 };
  try {
    await setDoc(doc(db, 'private', uid), { ...secret, updatedAt: serverTimestamp() });
  } catch (e) {
    // regulile vechi nu știu încă de private/: păstrăm bugetul în oraș, ca să nu se piardă
    if (!String(e.code).includes('permission-denied')) throw e;
    Object.assign(pub, secret);
  }
  await setDoc(doc(db, 'cities', uid), { data: JSON.stringify(pub), updatedAt: serverTimestamp() });
  await updateDoc(doc(db, 'users', uid), {
    // fără bani: profilul îl vede oricine are cont, iar bugetul rămâne secret
    stats: { pop: s.pop, jobs: s.jobsC + s.jobsI, happiness: Math.round(s.happiness * 100), date: city.dateText() },
  });
}

// own = true: orașul meu, cu buget cu tot; altfel orașul unui prieten, fără buget
export async function loadCity(uid, own = false) {
  const snap = await getDoc(doc(db, 'cities', uid));
  if (!snap.exists()) return null;
  const city = JSON.parse(snap.data().data);
  if (own) {
    const p = await getDoc(doc(db, 'private', uid)).catch(() => null);
    if (p?.exists()) for (const k of SECRET) if (p.data()[k] !== undefined) city[k] = p.data()[k];
  } else Object.assign(city, { money: 0, tax: 9, lastMonth: null, harvest: 0 });
  return city;
}

// ---------- prieteni ----------

export async function sendRequest(me, myName, code) {
  const c = await getDoc(doc(db, 'codes', code.trim().toUpperCase()));
  if (!c.exists()) throw new Error('Nu există niciun primar cu acest cod.');
  const to = c.data().uid;
  if (to === me) throw new Error('Acesta e chiar codul tău 🙂');
  if ((await getDoc(doc(db, 'users', me, 'friends', to))).exists()) throw new Error('Sunteți deja prieteni.');
  await setDoc(doc(db, 'friendRequests', `${me}_${to}`), { from: me, fromName: myName, to, at: serverTimestamp() });
}

export const watchRequests = (uid, cb) =>
  onSnapshot(query(collection(db, 'friendRequests'), where('to', '==', uid)), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() }))));

// acceptarea scrie prietenia la amândoi și șterge cererea, dintr-o dată
export async function acceptRequest(me, req) {
  const b = writeBatch(db);
  b.set(doc(db, 'users', me, 'friends', req.from), { since: serverTimestamp() });
  b.set(doc(db, 'users', req.from, 'friends', me), { since: serverTimestamp() });
  b.delete(doc(db, 'friendRequests', req.id));
  await b.commit();
}
export const refuseRequest = req => deleteDoc(doc(db, 'friendRequests', req.id));

export async function removeFriend(me, fid) {
  const b = writeBatch(db);
  b.delete(doc(db, 'users', me, 'friends', fid));
  b.delete(doc(db, 'users', fid, 'friends', me));
  await b.commit();
}

// lista de prieteni, cu profilul fiecăruia (nume, statistici, preț bilet)
export function watchFriends(uid, cb) {
  return onSnapshot(collection(db, 'users', uid, 'friends'), async s => {
    const list = await Promise.all(s.docs.map(async d => {
      const p = await getDoc(doc(db, 'users', d.id));
      return p.exists() ? { uid: d.id, ...p.data() } : null;
    }));
    cb(list.filter(Boolean).sort((a, b) => (b.stats?.pop || 0) - (a.stats?.pop || 0)));
  });
}

// ---------- vizite și bilete ----------

// plătește biletul (îl adaugă la încasările gazdei) și aduce orașul prietenului
export async function visitFriend(me, host, myName = '') {
  const hostRef = doc(db, 'users', host);
  // întâi orașul, ca să nu plătească nimeni bilet la un oraș care nu se poate deschide
  const city = await loadCity(host);
  if (!city) throw new Error('Prietenul nu are încă un oraș salvat.');
  const price = await runTransaction(db, async tx => {
    const h = await tx.get(hostRef);
    if (!h.exists()) throw new Error('Prietenul nu mai există.');
    const ticket = Math.max(0, Math.min(MAX_TICKET, h.data().ticket || 0));
    tx.update(hostRef, { pending: increment(ticket), pendingVisitors: increment(1) });
    return ticket;
  });
  await addDoc(collection(db, 'visits'), { visitor: me, visitorName: myName, host, price, at: serverTimestamp() });
  return { price, city };
}

// cine m-a vizitat: cele mai noi vizite primele; numele se iau din profil când lipsesc (vizitele vechi)
export function watchVisits(uid, cb) {
  const names = new Map();
  return onSnapshot(query(collection(db, 'visits'), where('host', '==', uid)), async s => {
    const list = s.docs.map(d => ({ id: d.id, ...d.data() }));
    await Promise.all([...new Set(list.filter(v => !v.visitorName).map(v => v.visitor))].filter(id => !names.has(id)).map(async id => {
      const p = await getDoc(doc(db, 'users', id)).catch(() => null);
      names.set(id, p?.exists() ? p.data().name : 'Primar necunoscut');
    }));
    cb(list.map(v => ({ ...v, visitorName: v.visitorName || names.get(v.visitor), time: v.at?.toDate?.() || new Date() }))
      .sort((a, b) => b.time - a.time));
  });
}

export const likeCity = host => updateDoc(doc(db, 'users', host), { likes: increment(1) });

// gazda își ia banii din bilete strânși cât a lipsit
export async function collectEarnings(uid) {
  const ref = doc(db, 'users', uid);
  return runTransaction(db, async tx => {
    const s = await tx.get(ref), d = s.data() || {};
    if (!d.pending && !d.pendingVisitors) return { amount: 0, visitors: 0 };
    tx.update(ref, { pending: 0, pendingVisitors: 0 });
    return { amount: d.pending || 0, visitors: d.pendingVisitors || 0 };
  });
}

// mesaj prietenos pentru erorile Firebase cele mai dese
export function niceError(e) {
  const c = e?.code || '';
  if (c.includes('invalid-credential') || c.includes('wrong-password') || c.includes('user-not-found')) return 'Email sau parolă greșite.';
  if (c.includes('email-already-in-use')) return 'Există deja un cont cu acest email. Alege „Am deja cont”.';
  if (c.includes('weak-password')) return 'Parola trebuie să aibă cel puțin 6 caractere.';
  if (c.includes('invalid-email')) return 'Adresa de email nu e scrisă corect.';
  if (c.includes('popup-closed')) return 'Ai închis fereastra de intrare.';
  if (c.includes('permission-denied')) return 'Nu ai voie să faci asta (verifică regulile Firestore).';
  if (c.includes('unavailable') || c.includes('network')) return 'Nu e conexiune la internet.';
  return e?.message || 'Ceva n-a mers. Încearcă din nou.';
}
