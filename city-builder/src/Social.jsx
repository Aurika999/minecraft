// Prieteni și vizite: intrarea în cont, lista de prieteni, codul de prieten, cererile, prețul biletului,
// banda de vizită. Orașul se salvează și în cont, ca prietenii să-l poată vedea.
import { useEffect, useRef, useState } from 'react';
import * as S from './net/social.js';

const fmt = n => Math.round(n || 0).toLocaleString('ro-RO');

// starea contului: utilizatorul, profilul, prietenii, cererile; plus salvarea orașului în cont
export function useSocial(g) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [ready, setReady] = useState(!S.enabled);
  const collecting = useRef(false);

  useEffect(() => S.onUser(u => { setUser(u); setReady(true); }), []);

  // la intrare: profilul, orașul din cont (sau urcăm orașul de acum), prietenii și cererile
  useEffect(() => {
    if (!user || !g) { setProfile(null); setFriends([]); setRequests([]); return; }
    let alive = true;
    const stop = [];
    (async () => {
      try {
        await S.ensureProfile(user);
        const cloud = await S.loadCity(user.uid, true);
        if (!alive) return;
        if (cloud) { g.replaceCity(cloud); g.msg('☁️ Orașul tău din cont a fost încărcat.'); }
        else { await S.saveCity(user.uid, g.homeCity()); g.msg('☁️ Orașul tău a fost salvat în cont.'); }
      } catch (e) { g.msg('☁️ ' + S.niceError(e)); }
      if (!alive) return;
      stop.push(S.watchProfile(user.uid, setProfile), S.watchFriends(user.uid, setFriends), S.watchRequests(user.uid, setRequests));
    })();
    return () => { alive = false; stop.forEach(f => f()); };
  }, [user, g]);

  // orașul se urcă în cont la câteva secunde după ce s-a schimbat (construcție, sfârșit de lună)
  useEffect(() => {
    if (!user || !g) return;
    let timer = null;
    let due = 0;
    const flush = () => { clearTimeout(timer); timer = null; S.saveCity(user.uid, g.homeCity()).catch(() => {}); };
    // când sunt prieteni în oraș, se salvează aproape imediat, ca ei să vadă construcțiile pe loc
    g.onSave = () => {
      const wait = g.roomBusy ? 1200 : 8000;
      if (timer && due <= Date.now() + wait) return;
      clearTimeout(timer); due = Date.now() + wait; timer = setTimeout(flush, wait);
    };
    const onHide = () => { if (document.hidden && timer) flush(); };
    document.addEventListener('visibilitychange', onHide);
    return () => { g.onSave = null; clearTimeout(timer); document.removeEventListener('visibilitychange', onHide); };
  }, [user, g]);

  // banii din bilete intră în oraș imediat ce vine cineva (sau la următoarea intrare)
  useEffect(() => {
    if (!user || !g || !profile?.pending && !profile?.pendingVisitors || collecting.current) return;
    collecting.current = true;
    S.collectEarnings(user.uid).then(({ amount, visitors }) => {
      if (!visitors) return;
      g.addMoney(amount);
      g.msg(visitors === 1 ? `🎟️ Un prieten te-a vizitat și ți-a adus ${fmt(amount)} $!` : `🎟️ ${visitors} vizitatori ți-au adus ${fmt(amount)} $!`);
      S.updateProfile(user.uid, { earnedTotal: (profile.earnedTotal || 0) + amount, visitorsTotal: (profile.visitorsTotal || 0) + visitors }).catch(() => {});
    }).catch(() => {}).finally(() => { collecting.current = false; });
  }, [user, g, profile]);

  return { enabled: S.enabled, ready, user, profile, friends, requests };
}

export function SocialButton({ social, onClick }) {
  const n = social.requests.length;
  return (
    <button className="icon badge-host" onClick={onClick} title="Prieteni" aria-label="Prieteni">
      👥{n > 0 && <span className="badge">{n}</span>}
    </button>
  );
}

// banda de sus în timpul unei vizite
export function VisitBanner({ ui, g, room }) {
  const v = ui.visiting, [liked, setLiked] = useState(false);
  useEffect(() => setLiked(false), [v?.uid]);
  return (
    <div className="visit-banner">
      <span>🏝️ În vizită la <b>{v.name}</b> <small className="mine-money">· 💰 {Math.round(ui.homeMoney).toLocaleString('ro-RO')} $ ai tu</small>
        {ui.canBuild ? <small className="build-ok">🔨 poți construi (plătește {v.name})</small>
          : room?.allowed && !room.hostHere ? <small className="build-ok off">🔨 construiești când {v.name} e acasă</small> : null}
      </span>
      <button className="mini-btn like" disabled={liked} onClick={() => { setLiked(true); S.likeCity(v.uid).catch(() => {}); g.msg(`❤️ I-ai dat like orașului lui ${v.name}!`); }}>
        {liked ? '❤️ Ți-a plăcut' : '🤍 Îmi place'}
      </button>
      <button className="mini-btn home" onClick={() => g.goHome()}>🏠 Înapoi acasă</button>
    </div>
  );
}

export function SocialPanel({ social, ui, g, Modal, onClose }) {
  if (!social.enabled) {
    return (
      <Modal title="👥 Prieteni" onClose={onClose}>
        <p>Aici vei putea să-ți faci cont, să adaugi prieteni și să le vizitezi orașele (cu bilet!).</p>
        <p className="problem">Funcția nu e pornită încă: jocul trebuie legat la un proiect Firebase gratuit (fișierul <code>src/net/firebase-config.js</code>).</p>
      </Modal>
    );
  }
  if (!social.ready) return <Modal title="👥 Prieteni" onClose={onClose}><p className="muted">Se încarcă…</p></Modal>;
  if (!social.user) return <SignIn Modal={Modal} onClose={onClose} />;
  return <Friends social={social} ui={ui} g={g} Modal={Modal} onClose={onClose} />;
}

function SignIn({ Modal, onClose }) {
  const [mode, setMode] = useState('new'); // 'new' = cont nou, 'old' = am deja cont
  const [email, setEmail] = useState(''), [pass, setPass] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const run = async f => { setErr(''); setBusy(true); try { await f(); } catch (e) { setErr(S.niceError(e)); } setBusy(false); };
  return (
    <Modal title="👥 Intră în cont" onClose={onClose}>
      <p>Cu un cont, orașul tău se păstrează pe orice telefon sau calculator, iar prietenii îl pot vizita.</p>
      <button className="primary wide" disabled={busy} onClick={() => run(S.signInGoogle)}>Intră cu Google</button>
      <p className="muted center">sau cu email</p>
      <form className="signin" onSubmit={e => { e.preventDefault(); run(() => (mode === 'new' ? S.signUpEmail : S.signInEmail)(email, pass)); }}>
        <input type="email" placeholder="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required />
        <input type="password" placeholder="parolă (minim 6 caractere)" value={pass} onChange={e => setPass(e.target.value)}
          autoComplete={mode === 'new' ? 'new-password' : 'current-password'} required />
        <button className="primary" disabled={busy}>{mode === 'new' ? 'Fă-mi cont' : 'Intră'}</button>
      </form>
      <button className="link" onClick={() => setMode(mode === 'new' ? 'old' : 'new')}>{mode === 'new' ? 'Am deja cont' : 'Vreau cont nou'}</button>
      {err && <p className="problem">⚠ {err}</p>}
    </Modal>
  );
}

function Friends({ social, ui, g, Modal, onClose }) {
  const { user, profile, friends, requests } = social;
  const [tab, setTab] = useState('friends'), [err, setErr] = useState(''), [ok, setOk] = useState('');
  const [confirm, setConfirm] = useState(null), [busy, setBusy] = useState(false);
  const run = async (f, done) => { setErr(''); setOk(''); setBusy(true); try { await f(); if (done) setOk(done); } catch (e) { setErr(S.niceError(e)); } setBusy(false); };
  if (!profile) return <Modal title="👥 Prieteni" onClose={onClose}><p className="muted">Se încarcă profilul…</p></Modal>;

  const tabs = [['friends', `Prieteni (${friends.length})`], ['add', 'Adaugă'], ['requests', `Cereri${requests.length ? ` (${requests.length})` : ''}`], ['visitors', 'Vizitatori'], ['me', 'Orașul meu']];

  const visit = f => run(async () => {
    const { price, city } = await S.visitFriend(user.uid, f.uid, profile.name);
    if (price) g.addMoney(-price);
    g.visit(city, { uid: f.uid, name: f.name });
    g.msg(price ? `🎟️ Ai plătit ${fmt(price)} $ bilet. Bine ai venit în orașul lui ${f.name}!` : `🏝️ Bine ai venit în orașul lui ${f.name}!`);
    onClose();
  });

  return (
    <Modal title="👥 Prieteni" onClose={onClose}>
      <div className="tabs" role="tablist">
        {tabs.map(([id, label]) => <button key={id} role="tab" className={tab === id ? 'on' : ''} onClick={() => { setTab(id); setErr(''); setOk(''); setConfirm(null); }}>{label}</button>)}
      </div>

      {tab === 'friends' && (confirm ? (
        <div className="confirm">
          <p>Vizitezi orașul lui <b>{confirm.name}</b>.</p>
          <p className="big">🎟️ {confirm.ticket ? `${fmt(confirm.ticket)} $` : 'Gratis'}</p>
          <p className="muted">Banii pentru bilet ies din orașul tău (ai {fmt(ui.homeMoney)} $) și intră în orașul lui {confirm.name}. În vizită te poți plimba cu personajul tău 🚶 și vă vedeți unul pe altul.{confirm.builders?.[user.uid] ? ` ${confirm.name} ți-a dat voie să construiești la el 🔨.` : ' Nu poți schimba nimic, decât dacă îți dă voie să construiești 🔨.'}</p>
          <div className="menu-actions">
            <button className="primary" disabled={busy || confirm.ticket > ui.homeMoney} onClick={() => visit(confirm)}>
              {confirm.ticket > ui.homeMoney ? 'Nu ai destui bani' : confirm.ticket ? 'Plătește și intră' : 'Intră'}
            </button>
            <button className="mini-btn plain" onClick={() => setConfirm(null)}>Înapoi</button>
          </div>
        </div>
      ) : friends.length ? (
        <ul className="friends">
          {friends.map(f => {
            const on = S.isOnline(f), builder = !!profile.builders?.[f.uid];
            const where = !on ? null : f.where === 'home' ? '🟢 e acasă acum' : f.where === user.uid ? '🟢 e la tine acum!' : '🟢 online';
            return (
              <li key={f.uid}>
                <span className={'avatar' + (on ? ' online' : '')}>{(f.name || '?')[0].toUpperCase()}</span>
                <span className="who"><b>{f.name}</b><small>{where ? <span className="on-now">{where}</span> : <>👥 {fmt(f.stats?.pop)} locuitori · ❤️ {fmt(f.likes)}</>}</small></span>
                <button className={'mini-btn builder' + (builder ? ' on' : '')} disabled={busy}
                  title={builder ? `${f.name} poate construi la tine (din banii tăi). Apasă ca să-i iei voia.` : `Dă-i voie lui ${f.name} să construiască în orașul tău`}
                  onClick={() => run(() => S.setBuilder(user.uid, f.uid, !builder), builder ? `${f.name} nu mai poate construi la tine.` : `Acum ${f.name} poate construi în orașul tău când e în vizită (din banii tăi, dar fără să dărâme nimic).`)}>
                  🔨{builder ? ' ✓' : ''}
                </button>
                <button className="primary small" disabled={busy || ui.visiting?.uid === f.uid} onClick={() => setConfirm(f)}>
                  {f.where === 'home' && on ? 'Joacă-te' : 'Vizitează'}<small>{f.ticket ? `🎟️ ${fmt(f.ticket)} $` : 'gratis'}</small>
                </button>
              </li>
            );
          })}
        </ul>
      ) : <p className="muted">Încă nu ai prieteni. Dă-le codul tău (la „Adaugă”) sau scrie codul lor.</p>)}

      {tab === 'add' && (
        <div className="add-friend">
          <p>Codul tău de prieten:</p>
          <div className="mycode">
            <b>{profile.code}</b>
            <button className="mini-btn plain" onClick={() => { navigator.clipboard?.writeText(profile.code); setOk('Codul a fost copiat.'); }}>📋 Copiază</button>
          </div>
          <p className="muted">Spune-l prietenilor tăi: ei îl scriu la ei, iar tu primești o cerere.</p>
          <AddByCode busy={busy} onSend={code => run(() => S.sendRequest(user.uid, profile.name, code), 'Cererea a fost trimisă! Așteaptă să o accepte.')} />
        </div>
      )}

      {tab === 'requests' && (requests.length ? (
        <ul className="friends">
          {requests.map(r => (
            <li key={r.id}>
              <span className="avatar">{(r.fromName || '?')[0].toUpperCase()}</span>
              <span className="who"><b>{r.fromName}</b><small>vrea să fie prietenul tău</small></span>
              <button className="primary small" disabled={busy} onClick={() => run(() => S.acceptRequest(user.uid, r), `Acum ești prieten cu ${r.fromName}!`)}>✓ Acceptă</button>
              <button className="mini-btn plain" disabled={busy} onClick={() => run(() => S.refuseRequest(r))}>✕</button>
            </li>
          ))}
        </ul>
      ) : <p className="muted">Nu ai cereri noi.</p>)}

      {tab === 'visitors' && <Visitors uid={user.uid} />}

      {tab === 'me' && <MyCity social={social} busy={busy} run={run} />}

      {ok && <p className="okmsg">✓ {ok}</p>}
      {err && <p className="problem">⚠ {err}</p>}
    </Modal>
  );
}

// lista celor care m-au vizitat: cine, cât a plătit și când
function Visitors({ uid }) {
  const [list, setList] = useState(null);
  useEffect(() => S.watchVisits(uid, setList), [uid]);
  if (!list) return <p className="muted">Se încarcă…</p>;
  if (!list.length) return <p className="muted">Încă nu te-a vizitat nimeni. Dă-le prietenilor codul tău și invită-i!</p>;
  const total = list.reduce((s, v) => s + (v.price || 0), 0);
  const when = d => {
    const day = new Date(d).setHours(0, 0, 0, 0), today = new Date().setHours(0, 0, 0, 0);
    const hour = d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
    if (day === today) return `azi, la ${hour}`;
    if (today - day === 864e5) return `ieri, la ${hour}`;
    return `${d.toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}, la ${hour}`;
  };
  return (
    <>
      <p className="stats-line visit-total">🎟️ <b>{list.length}</b> {list.length === 1 ? 'vizită' : 'vizite'} · 💰 <b>{fmt(total)} $</b> din bilete</p>
      <ul className="friends visits">
        {list.map(v => (
          <li key={v.id}>
            <span className="avatar">{(v.visitorName || '?')[0].toUpperCase()}</span>
            <span className="who"><b>{v.visitorName}</b><small>🕒 {when(v.time)}</small></span>
            <span className={'paid' + (v.price ? '' : ' free')}>{v.price ? `+${fmt(v.price)} $` : 'gratis'}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

function AddByCode({ busy, onSend }) {
  const [code, setCode] = useState('');
  return (
    <form className="signin" onSubmit={e => { e.preventDefault(); if (code.trim()) onSend(code); setCode(''); }}>
      <input placeholder="codul prietenului (ex. MIA-4821)" value={code} onChange={e => setCode(e.target.value.toUpperCase())} maxLength={12} />
      <button className="primary" disabled={busy || !code.trim()}>Trimite cererea</button>
    </form>
  );
}

function MyCity({ social, busy, run }) {
  const { user, profile } = social;
  const [name, setName] = useState(profile.name), [ticket, setTicket] = useState(profile.ticket ?? 50);
  return (
    <div className="mycity">
      <label className="field">Numele tău de primar
        <input value={name} maxLength={24} onChange={e => setName(e.target.value)} />
      </label>
      <label className="tax">
        <span>Prețul biletului de vizită: <b>{ticket ? `${ticket} $` : 'gratis'}</b></span>
        <input type="range" min="0" max={S.MAX_TICKET} step="10" value={ticket} onChange={e => setTicket(+e.target.value)} />
      </label>
      <p className="muted">Fiecare prieten care te vizitează plătește biletul din orașul lui, iar banii intră în orașul tău.</p>
      <button className="primary" disabled={busy} onClick={() => run(() => S.updateProfile(user.uid, { name: name.trim() || profile.name, ticket }), 'Salvat!')}>Salvează</button>
      <p className="stats-line">❤️ {fmt(profile.likes)} like-uri · 🎟️ {fmt(profile.visitorsTotal)} vizitatori · 💰 {fmt(profile.earnedTotal)} $ din bilete</p>
      <button className="link" onClick={() => S.signOut()}>Ieși din cont ({user.email || user.displayName})</button>
    </div>
  );
}
