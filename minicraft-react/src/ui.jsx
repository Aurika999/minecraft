import { useEffect, useRef, useState } from 'react';
import { item, CREATIVE_ITEMS } from './game/registry.js';
import { iconURL, hudIconURL } from './game/textures.js';

const range = (a, b) => Array.from({ length: b - a }, (_, i) => a + i);

export function ItemIcon({ id, size = 32 }) {
  return <img className="icon" src={iconURL(id)} width={size} height={size} alt="" draggable={false} />;
}

export function Slot({ s, sel, onPointerDown, title }) {
  const def = s && item(s.id), tool = def?.tool;
  return (
    <div className={'slot' + (sel ? ' sel' : '')} onPointerDown={onPointerDown} title={title ?? def?.name}>
      {s && <ItemIcon id={s.id} />}
      {s && s.count > 1 && <span className="count">{s.count}</span>}
      {tool && s.dur < tool.dur && (
        <span className="dur"><i style={{ width: `${(s.dur / tool.dur) * 100}%`, background: `hsl(${(s.dur / tool.dur) * 120},80%,45%)` }} /></span>
      )}
    </div>
  );
}

function Bar({ value, kind, right }) {
  const icons = range(0, 10).map(i => {
    const v = value - i * 2;
    return <img key={i} src={hudIconURL(v >= 2 ? kind : v >= 1 ? `${kind}_half` : `${kind}_empty`)} alt="" />;
  });
  return <div className="bar">{right ? icons.reverse() : icons}</div>;
}

export function Hud({ ui, game }) {
  const held = ui.slots[ui.sel];
  return (
    <div className={'hud' + (ui.touch ? ' touch' : '')}>
      {ui.screen === 'play' && held && ui.now - ui.heldNameAt < 2000 && <div className="held-name">{item(held.id).name}</div>}
      {ui.mode === 'survival' && (
        <div className="stats" aria-label={`Viață ${ui.health}/20, foame ${ui.food}/20`}>
          <Bar value={ui.health} kind="heart" />
          <Bar value={ui.food} kind="food" right />
        </div>
      )}
      <div className="hotbar">
        {range(0, 9).map(i => (
          <Slot key={i} s={ui.slots[i]} sel={i === ui.sel} onPointerDown={ui.touch ? () => game.select(i) : undefined} />
        ))}
      </div>
    </div>
  );
}

// ---------- controale tactile ----------

function Joystick({ game }) {
  const base = useRef(null), pid = useRef(null);
  const [knob, setKnob] = useState([0, 0]);
  const update = e => {
    const r = base.current.getBoundingClientRect(), R = r.width / 2;
    let x = (e.clientX - r.left - R) / R, y = (e.clientY - r.top - R) / R;
    const m = Math.hypot(x, y);
    if (m > 1) { x /= m; y /= m; }
    setKnob([x, y]);
    game.setMove(x, y);
  };
  const end = e => {
    if (e.pointerId !== pid.current) return;
    pid.current = null;
    setKnob([0, 0]);
    game.setMove(0, 0);
  };
  return (
    <div ref={base} className="joystick"
      onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); pid.current = e.pointerId; update(e); }}
      onPointerMove={e => { if (e.pointerId === pid.current) update(e); }}
      onPointerUp={end} onPointerCancel={end}>
      <div className="knob" style={{ transform: `translate(${knob[0] * 50}%, ${knob[1] * 50}%)` }} />
    </div>
  );
}

function HoldButton({ game, code, className, label, children }) {
  const [on, setOn] = useState(false);
  const up = () => { setOn(false); game.virtualKey(code, false); };
  return (
    <button className={'tbtn ' + className + (on ? ' on' : '')} aria-label={label}
      onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); setOn(true); game.virtualKey(code, true); }}
      onPointerUp={up} onPointerCancel={up}>
      {children}
    </button>
  );
}

// zona de privire: tragi = te uiți în jur, atingi scurt = pui bloc / lovești, ții apăsat = spargi
function LookArea({ game }) {
  const t = useRef(null);
  const end = e => {
    const s = t.current;
    if (!s || s.id !== e.pointerId) return;
    clearTimeout(s.timer);
    if (s.holding) game.touchBreak(false);
    else if (!s.moved && e.type === 'pointerup' && performance.now() - s.start < 350) game.touchTap();
    t.current = null;
  };
  return (
    <div className="look"
      onPointerDown={e => {
        if (t.current) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        const s = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, start: performance.now(), moved: false, holding: false };
        s.timer = setTimeout(() => { if (!s.moved) { s.holding = true; game.touchBreak(true); } }, 300);
        t.current = s;
      }}
      onPointerMove={e => {
        const s = t.current;
        if (!s || s.id !== e.pointerId) return;
        game.look(e.clientX - s.x, e.clientY - s.y);
        s.x = e.clientX; s.y = e.clientY;
        if (Math.hypot(e.clientX - s.sx, e.clientY - s.sy) > 12) s.moved = true;
      }}
      onPointerUp={end} onPointerCancel={end} />
  );
}

export function TouchControls({ game }) {
  useEffect(() => () => {
    game.setMove(0, 0);
    game.touchBreak(false);
    game.virtualKey('Space', false);
    game.virtualKey('ShiftLeft', false);
  }, [game]);
  return (
    <div className="touch-controls">
      <LookArea game={game} />
      <Joystick game={game} />
      <div className="tbar">
        <button className="tbtn small" onPointerDown={() => game.dropHeld()}>Aruncă</button>
        <button className="tbtn small" onPointerDown={() => game.openInventory('hand')}>Inventar</button>
        <button className="tbtn small" onPointerDown={() => game.pause()} aria-label="Pauză">II</button>
      </div>
      <HoldButton game={game} code="ShiftLeft" className="sneak" label="Ghemuire">▼</HoldButton>
      <HoldButton game={game} code="Space" className="jump" label="Săritură">▲</HoldButton>
    </div>
  );
}

export function Messages({ messages }) {
  return <div className="messages">{messages.map(m => <div key={m.id}>{m.text}</div>)}</div>;
}

export function Debug({ d }) {
  return (
    <div className="debug">
      <div>Minicraft · {d.fps} FPS</div>
      <div>XYZ: {d.xyz}</div>
      <div>Bloc: {d.block}</div>
      <div>Direcție: {d.facing}</div>
      <div>Timp: {d.time}</div>
      <div>Lumină: {d.light}</div>
      <div>Țintă: {d.target}</div>
      <div>Mobi: {d.mobs}</div>
      <div>Renaștere: {d.spawn}</div>
    </div>
  );
}

const CONTROLS = [
  ['W A S D', 'mișcare'],
  ['Spațiu', 'săritură · de 2 ori rapid în Creative = zbor'],
  ['Shift', 'ghemuire · coborâre în zbor'],
  ['Ctrl / W de 2 ori', 'alergare'],
  ['Click stânga (ține)', 'sparge blocuri · lovește'],
  ['Click dreapta', 'pune bloc · folosește · mănâncă'],
  ['Click mijloc', 'copiază blocul (Creative)'],
  ['E', 'inventar și crafting'],
  ['Q', 'aruncă obiectul din mână'],
  ['1–9 / rotița', 'alege din bara de jos'],
  ['F3', 'coordonate și informații'],
  ['Esc', 'pauză'],
];

const TOUCH_CONTROLS = [
  ['Joystick stânga', 'mișcare · împins până la capăt = alergare'],
  ['Tragi cu degetul', 'te uiți în jur'],
  ['Atingere scurtă', 'pune bloc · folosește · mănâncă · lovește'],
  ['Ții apăsat', 'sparge blocul din centru'],
  ['▲', 'săritură · de 2 ori rapid în Creative = zbor'],
  ['▼', 'ghemuire · coborâre în zbor'],
  ['Bara de jos', 'atingi un slot ca să-l alegi'],
];

function Controls({ touch }) {
  return (
    <table className="controls">
      <tbody>{(touch ? TOUCH_CONTROLS : CONTROLS).map(([k, v]) => <tr key={k}><td><kbd>{k}</kbd></td><td>{v}</td></tr>)}</tbody>
    </table>
  );
}

export function MainMenu({ ui, game }) {
  return (
    <div className="screen">
      <div className="menu">
        <h1>Minicraft</h1>
        <div className="row">
          <button onClick={() => game.start('survival')}>Survival</button>
          <button onClick={() => game.start('creative')}>Creative</button>
        </div>
        <p className="sub">Survival: viață, foame, unelte și monștri noaptea. Creative: blocuri nelimitate și zbor.</p>
        {!ui.touch && <button className="ghost" onClick={() => game.toggleFullscreen()}>Ecran complet</button>}
        <Controls touch={ui.touch} />
        <p className="note">
          {ui.touch
            ? 'Ține telefonul orizontal. Jocul intră singur în ecran complet acolo unde browserul permite.'
            : 'Atenție: în browser, Ctrl+W închide tab-ul. Ca să alergi, apasă W de două ori. În Chrome sau Edge poți intra în ecran complet, unde jocul blochează scurtătura.'}
        </p>
      </div>
    </div>
  );
}

export function PauseMenu({ ui, game }) {
  return (
    <div className="screen">
      <div className="menu">
        <h2>Pauză</h2>
        <button onClick={() => game.resume()}>Continuă</button>
        <div className="row">
          <button className={ui.mode === 'survival' ? 'on' : ''} onClick={() => game.setMode('survival')}>Survival</button>
          <button className={ui.mode === 'creative' ? 'on' : ''} onClick={() => game.setMode('creative')}>Creative</button>
        </div>
        <button className="ghost" onClick={() => game.toggleFullscreen()}>{ui.fullscreen ? 'Ieși din ecran complet' : 'Ecran complet'}</button>
        <Controls touch={ui.touch} />
      </div>
    </div>
  );
}

export function DeathScreen({ ui, game }) {
  const { cause, pos } = ui.death;
  return (
    <div className="screen dead">
      <div className="menu">
        <h1>Ai murit!</h1>
        {cause && <p>{cause}</p>}
        <p className="sub">Obiectele tale au rămas la {pos.join(' ')} timp de 5 minute.</p>
        <button onClick={() => game.respawn()}>Renaște</button>
      </div>
    </div>
  );
}

const TITLES = { hand: 'Inventar', table: 'Banc de lucru', furnace: 'Cuptor' };

export function InventoryScreen({ ui, game }) {
  const [mouse, setMouse] = useState([-100, -100]);
  const creative = ui.mode === 'creative';
  const slot = i => (
    <Slot key={i} s={ui.slots[i]} sel={creative && i === ui.sel}
      onPointerDown={e => {
        e.preventDefault();
        if (!creative) game.clickSlot(i, e.button, e.shiftKey);
        else if (e.button === 2) game.clearSlot(i);
        else game.select(i);
      }} />
  );
  return (
    <div className="screen"
      onPointerMove={e => setMouse([e.clientX, e.clientY])}
      onPointerDownCapture={e => setMouse([e.clientX, e.clientY])}
      onContextMenu={e => e.preventDefault()}>
      <div className="panel">
        <div className="panel-head">
          <h2>{creative ? 'Toate blocurile' : TITLES[ui.station]}</h2>
          <button className="close" onClick={() => game.closeInventory()} aria-label="Închide">✕</button>
        </div>

        {creative ? (
          <>
            <div className="palette">
              {CREATIVE_ITEMS.map(id => <Slot key={id} s={{ id, count: 1 }} onPointerDown={e => { e.preventDefault(); game.creativePick(id); }} />)}
            </div>
            <p className="tip">
              {ui.touch
                ? 'Atinge un slot din bară ca să-l alegi, apoi un obiect ca să-l pui acolo.'
                : 'Click pe un obiect îl pune în slotul selectat din bară. Click dreapta pe bară golește slotul.'}
            </p>
          </>
        ) : (
          <>
            <div className="recipes">
              {ui.recipes.map(r => (
                <button key={r.i} className={'recipe' + (r.ok ? '' : ' off')} onClick={e => game.craft(r.i, e.shiftKey)}>
                  <span className="ing">
                    {r.ins.map(([id, n]) => (
                      <span key={id} className="ing-item" title={item(id).name}><ItemIcon id={id} size={24} />{n > 1 && <b>{n}</b>}</span>
                    ))}
                  </span>
                  <span className="arrow">→</span>
                  <span className="out"><ItemIcon id={r.out} />{r.n > 1 && <b>{r.n}</b>}</span>
                  <span className="rname">{item(r.out).name}</span>
                </button>
              ))}
            </div>
            {ui.station === 'furnace' && <p className="tip">Combustibil: {ui.fuel.toFixed(1)} topiri. Cuptorul folosește singur cărbune, scânduri, bețe sau lemn din inventar.</p>}
            {ui.station === 'hand' && <p className="tip">Pentru unelte, cuptor și pat: click dreapta pe un banc de lucru.</p>}
            <h3>Inventar</h3>
            <div className="grid">{range(9, 36).map(slot)}</div>
          </>
        )}
        <div className="grid hot">{range(0, 9).map(slot)}</div>
        {!creative && ui.touch && <p className="tip">Atinge un obiect ca să-l iei, apoi alt slot ca să-l pui acolo.</p>}
        {!creative && !ui.touch && <p className="tip">Click: ia / pune · Click dreapta: jumătate / câte unul · Shift+click: mută între bară și inventar · Shift+click pe rețetă: cât de multe poți.</p>}
      </div>
      {ui.cursor && <div className="cursor" style={{ left: mouse[0], top: mouse[1] }}><Slot s={ui.cursor} /></div>}
    </div>
  );
}
