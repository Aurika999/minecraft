// Joacă împreună: cine e acum în același oraș, personajele care se plimbă, emoji, poze,
// și construcțiile trimise gazdei de prietenii care au voie să construiască la ea.
import { useEffect, useState } from 'react';
import * as S from './net/social.js';
import { LOOKS, SHIRTS, EMOJIS } from './game/avatars.js';
import { QuizButton } from './Quiz.jsx';

const STALE = 30000; // cine n-a mai dat semn de viață de 30 de secunde a plecat

export function useRoom(social, g, ui) {
  const { user, profile } = social;
  const me = user?.uid, host = ui?.visiting?.uid || me || null, away = !!me && host !== me;
  const [players, setPlayers] = useState([]);
  const [hostProfile, setHostProfile] = useState(null);

  useEffect(() => { if (g && profile?.name) g.setName(profile.name); }, [g, profile?.name]);

  // semn de viață în profil, ca prietenii să vadă că ești online și unde
  useEffect(() => {
    if (!me || !host) return;
    const beat = () => S.heartbeat(me, away ? host : 'home').catch(() => {});
    beat();
    const t = setInterval(beat, 60000);
    return () => clearInterval(t);
  }, [me, host, away]);

  useEffect(() => {
    if (!me || !g || !host) return;
    let state = null, last = 0, lastKey = '', lastList = [], known = null, lastRaw = null;
    const hostName = () => ui?.visiting?.name || 'gazda';

    // locul meu în oraș: se trimite des cât merg, rar cât stau
    const send = force => {
      const now = Date.now();
      const data = { name: g.me.name, look: g.me.look, shirt: g.me.shirt, walking: !!state, ...(state || {}) };
      delete data.moving;
      const key = JSON.stringify(data);
      if (!force && (key === lastKey ? now - last < 10000 : now - last < 400)) return;
      last = now; lastKey = key;
      S.putPlayer(host, me, data).catch(() => {});
    };
    g.onWalk = s => { state = s; send(s === null); };
    send(true);
    const tick = setInterval(() => { send(false); show(lastList); }, 5000);

    const show = list => {
      lastList = list;
      const now = Date.now(), here = list.filter(p => p.uid !== me && now - (p.at || 0) < STALE);
      if (known) for (const p of here) if (!known.has(p.uid)) {
        g.msg(!away ? `👋 ${p.name} a venit în orașul tău!` : p.uid === host ? `👋 ${p.name} e acasă.` : `👋 ${p.name} e și el în vizită aici.`);
      }
      known = new Set(here.map(p => p.uid));
      g.roomBusy = here.length > 0;
      g.setOthers(here);
      setPlayers(here);
    };
    const offs = [S.watchPlayers(host, show)];

    if (!away) {
      // gazda: face construcțiile trimise de prieteni, din banii ei
      const done = new Set();
      offs.push(S.watchPendingOps(me, ops => {
        for (const op of ops) {
          if (done.has(op.id)) continue;
          const r = g.applyRemote(op);
          if (!r) continue;
          done.add(op.id);
          S.markOp(me, op.id, r.error ? 'rejected' : 'ok', r.error || null).catch(() => {});
        }
      }));
    } else {
      // vizitatorul: orașul se schimbă sub ochii lui când gazda construiește
      offs.push(S.watchCity(host, (json, raw) => { if (raw !== lastRaw) { if (lastRaw !== null) g.refreshVisit(json); lastRaw = raw; } }));
      offs.push(S.watchProfile(host, setHostProfile));
      offs.push(S.watchMyOps(host, me, ops => {
        for (const op of ops) {
          if (op.status === 'ok') g.msg(`✅ ${hostName()} a primit construcția ta!`);
          else if (op.status === 'rejected') g.msg(`⚠ Nu s-a putut construi: ${op.reason || 'gazda a refuzat'}`);
        }
      }));
      g.onRemoteBuild = (tool, tiles) => S.sendOp(host, me, g.me.name, tool, tiles).catch(e => g.msg('⚠ ' + S.niceError(e)));
    }

    const bye = () => S.dropPlayer(host, me);
    addEventListener('pagehide', bye);
    return () => {
      offs.forEach(f => f());
      clearInterval(tick);
      removeEventListener('pagehide', bye);
      bye();
      g.onWalk = null; g.onRemoteBuild = null; g.roomBusy = false;
      g.setOthers([]);
      setPlayers([]); setHostProfile(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, g, host, away]);

  // vizitatorul construiește doar dacă gazda i-a dat voie și e acasă, ca să vadă ce se întâmplă
  const hostHere = away && players.some(p => p.uid === host);
  const allowed = away && !!hostProfile?.builders?.[me];
  useEffect(() => { g?.setCanBuild(allowed && hostHere); }, [g, allowed, hostHere]);

  return { players, hostHere, allowed };
}

// bara din stânga: plimbă-te, emoji, cum arată personajul, poză
export function PlayBar({ ui, g, room, onQuiz }) {
  const [dress, setDress] = useState(false);
  const n = room.players.length;
  return (
    <div className="playbar">
      <QuizButton onClick={onQuiz} />
      <button className={'icon walk' + (ui.walking ? ' on' : '')} onClick={() => g.toggleWalk()}
        title={ui.walking ? 'Oprește plimbarea' : 'Plimbă-te prin oraș cu personajul tău'} aria-label="Plimbă-te">
        {ui.walking ? '🛑' : '🚶'}
      </button>
      {n > 0 && <span className="here" title="Prieteni aici acum">👥 {n}</span>}
      {ui.walking && (
        <>
          <div className="emojis">
            {EMOJIS.map(e => <button key={e} className="icon" onClick={() => g.sayEmoji(e)} aria-label={`Trimite ${e}`}>{e}</button>)}
          </div>
          <button className="icon" onClick={() => setDress(!dress)} title="Cum arată personajul" aria-label="Schimbă personajul">👕</button>
          <button className="icon" onClick={() => g.photo()} title="Fă o poză" aria-label="Fă o poză">📸</button>
          {dress && (
            <div className="card dress">
              <b>Personajul tău</b>
              <div className="looks">
                {LOOKS.map(l => (
                  <button key={l} className={ui.look === l ? 'on' : ''} onClick={() => g.setLook(l, ui.shirt)}>
                    {{ casual: '🧑', dress: '👗', child: '🧒', jogger: '🏃' }[l]}
                  </button>
                ))}
              </div>
              <div className="shirts">
                {SHIRTS.map(c => (
                  <button key={c} className={ui.shirt === c ? 'on' : ''} style={{ background: '#' + c.toString(16).padStart(6, '0') }}
                    onClick={() => g.setLook(ui.look, c)} aria-label="Culoarea bluzei" />
                ))}
              </div>
              <small className="muted">Pe calculator: săgețile sau W A S D. Pe telefon: atinge unde vrei să mergi.</small>
            </div>
          )}
        </>
      )}
    </div>
  );
}
