// Partea de distracție: misiunile cu stele, sărbătoarea cu confetti la premii și butoanele de sunet.
import { useEffect, useState } from 'react';
import { prefs, setPref, unlock, sfx } from './game/sound.js';

const fmt = n => Math.round(n || 0).toLocaleString('ro-RO');

export function MissionsButton({ ui, onClick }) {
  const ready = ui.missions.active.filter(m => m.have >= m.need).length;
  return (
    <button className="icon badge-host stars-btn" onClick={onClick} title="Misiuni" aria-label="Misiuni">
      📋{ui.stars > 0 && <span className="badge star">{ui.stars}⭐</span>}{ready > 0 && <span className="badge">!</span>}
    </button>
  );
}

export function MissionsPanel({ ui, Modal, onClose }) {
  const m = ui.missions;
  return (
    <Modal title="📋 Misiuni" onClose={onClose}>
      <p className="stars-line">⭐ <b>{m.stars}</b> {m.stars === 1 ? 'stea' : 'stele'} · {m.done.length} din {m.total} misiuni{m.streak > 1 && <> · 🔥 {m.streak} zile la rând</>}</p>
      {m.active.length ? (
        <ul className="missions">
          {m.active.map(x => (
            <li key={x.id}>
              <span className="mi">{x.icon}</span>
              <span className="mt">
                <b>{x.text}</b>
                <span className="mbar"><i style={{ width: `${Math.round(x.have / x.need * 100)}%` }} /></span>
                <small>{fmt(x.have)} / {fmt(x.need)}</small>
              </span>
              <span className="mr">+{fmt(x.reward)} $<small>⭐</small></span>
            </li>
          ))}
        </ul>
      ) : <p className="big center">🏆 Ai terminat toate misiunile! Ești cel mai bun primar!</p>}
      <p className="muted">Când termini o misiune primești banii și o stea, iar în locul ei apare una nouă. Intră în fiecare zi pentru premiul zilei 🎁: crește cu fiecare zi la rând.</p>
      {m.done.length > 0 && (
        <>
          <h3>Insignele tale</h3>
          <div className="badges">{m.done.map(x => <span key={x.id} title={x.text}>{x.icon}</span>)}</div>
        </>
      )}
    </Modal>
  );
}

// fereastra de premiu, cu confetti care cad; se închide singură
export function Party({ p, g }) {
  const [pieces] = useState(() => Array.from({ length: p.small ? 30 : 70 }, (_, i) => ({
    left: Math.random() * 100, delay: Math.random() * .8, dur: 1.8 + Math.random() * 1.6, rot: Math.random() * 360,
    color: ['#ff5252', '#ffd740', '#69f0ae', '#40c4ff', '#e040fb', '#ff6e40'][i % 6], w: 6 + Math.random() * 6,
  })));
  useEffect(() => { const t = setTimeout(() => g.closeParty(), p.small ? 3500 : 5000); return () => clearTimeout(t); }, [g, p]);
  return (
    <div className="party" onPointerDown={() => g.closeParty()}>
      <div className="confetti">
        {pieces.map((c, i) => <i key={i} style={{ left: `${c.left}%`, background: c.color, width: c.w, height: c.w * 1.6, animationDelay: `${c.delay}s`, animationDuration: `${c.dur}s`, transform: `rotate(${c.rot}deg)` }} />)}
      </div>
      <div className="card prize">
        <div className="prize-icon">{p.icon}</div>
        <h2>{p.title}</h2>
        <p>{p.text}</p>
        {p.reward > 0 && <p className="prize-money">+{fmt(p.reward)} $</p>}
      </div>
    </div>
  );
}

function useSoundPrefs() {
  const [s, set] = useState(prefs);
  const toggle = k => { unlock(); setPref(k, !s[k]); set(prefs()); if (k === 'sfx' && !s.sfx) setTimeout(() => sfx.pop(), 50); };
  return [s, toggle];
}

// butonul din bara de sus: pornește / oprește tot sunetul
export function SoundButton() {
  const [s, set] = useState(prefs), on = s.sfx || s.music;
  const flip = () => { unlock(); setPref('sfx', !on); setPref('music', !on); set(prefs()); };
  return <button className="icon" onClick={flip} title={on ? 'Oprește sunetul' : 'Pornește sunetul'} aria-label="Sunet">{on ? '🔊' : '🔇'}</button>;
}

export function SoundToggles() {
  const [s, toggle] = useSoundPrefs();
  return (
    <div className="sound-toggles">
      <button className={'mini-btn plain' + (s.sfx ? ' on' : '')} onClick={() => toggle('sfx')}>{s.sfx ? '🔊' : '🔇'} Sunete</button>
      <button className={'mini-btn plain' + (s.music ? ' on' : '')} onClick={() => toggle('music')}>{s.music ? '🎵' : '🔇'} Muzică</button>
    </div>
  );
}
