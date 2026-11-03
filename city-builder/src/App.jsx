import { useEffect, useRef, useState } from 'react';
import { Engine } from './game/engine.js';
import { TOOLS, TOOL } from './game/config.js';

const fmt = n => Math.round(n).toLocaleString('ro-RO');

export default function App() {
  const mountRef = useRef(null), engineRef = useRef(null);
  const [ui, setUi] = useState(null);
  const [panel, setPanel] = useState(null); // 'budget' | 'menu' | null

  useEffect(() => {
    const e = new Engine(mountRef.current, setUi);
    engineRef.current = e;
    return () => { e.dispose(); engineRef.current = null; };
  }, []);

  const g = engineRef.current;
  return (
    <>
      <div ref={mountRef} className="view" />
      {ui && g && (
        <>
          <TopBar ui={ui} g={g} setPanel={setPanel} />
          <Demand d={ui.demand} />
          <Messages list={ui.messages} />
          {ui.info && <Info info={ui.info} onClose={() => g.select(null)} />}
          <MapButtons g={g} />
          <Toolbar ui={ui} g={g} />
          {panel === 'budget' && <Budget ui={ui} g={g} onClose={() => setPanel(null)} />}
          {panel === 'menu' && <Menu g={g} onClose={() => setPanel(null)} />}
          {ui.welcome && <Welcome onStart={() => g.closeWelcome()} />}
        </>
      )}
    </>
  );
}

function TopBar({ ui, g, setPanel }) {
  const speeds = [['⏸', 'Pauză'], ['▶', 'Normal'], ['▶▶', 'Rapid'], ['▶▶▶', 'Foarte rapid']];
  return (
    <header className="topbar">
      <div className="stats">
        <button className={'chip money' + (ui.money < 0 ? ' neg' : '')} onClick={() => setPanel('budget')} title="Buget">
          💰 {fmt(ui.money)} $
        </button>
        <span className="chip" title="Populație">👥 {fmt(ui.pop)}</span>
        <span className="chip" title="Locuri de muncă">💼 {fmt(ui.jobs)}</span>
        <span className="chip" title="Mulțumire">{ui.happiness > .66 ? '😊' : ui.happiness > .4 ? '😐' : '😟'} {Math.round(ui.happiness * 100)}%</span>
        <span className="chip date">📅 {ui.date}</span>
      </div>
      <div className="controls">
        <div className="speeds" role="group" aria-label="Viteza timpului">
          {speeds.map(([icon, label], s) => (
            <button key={s} className={ui.speed === s ? 'on' : ''} onClick={() => g.setSpeed(s)} title={label} aria-label={label}>{icon}</button>
          ))}
        </div>
        <button className="icon" onClick={() => setPanel('budget')} title="Buget" aria-label="Buget">📊</button>
        <button className="icon" onClick={() => setPanel('menu')} title="Meniu" aria-label="Meniu">☰</button>
      </div>
    </header>
  );
}

function Demand({ d }) {
  const bars = [['R', 'Locuințe'], ['C', 'Comerț'], ['I', 'Industrie']];
  return (
    <div className="demand" title="Cererea pentru fiecare tip de zonă">
      {bars.map(([k, label]) => (
        <div key={k} className="dbar" aria-label={`Cerere ${label}: ${Math.round(d[k] * 100)}%`}>
          <div className="track">
            <i className={'fill ' + k + (d[k] < 0 ? ' neg' : '')} style={{ height: `${Math.abs(d[k]) * 50}%` }} />
          </div>
          <b>{k}</b>
        </div>
      ))}
    </div>
  );
}

function Messages({ list }) {
  return <div className="messages">{list.map(m => <div key={m.id}>{m.text}</div>)}</div>;
}

function Info({ info, onClose }) {
  const yes = (v, label) => <li className={v ? 'ok' : 'bad'}>{v ? '✔' : '✖'} {label}</li>;
  return (
    <aside className="card info">
      <div className="card-head">
        <h3>{info.title}</h3>
        <button className="icon small" onClick={onClose} aria-label="Închide">✕</button>
      </div>
      <p className="muted">Pătrățelul ({info.x}, {info.z})</p>
      {info.level != null && <p>Nivel <b>{info.level}</b> din 3 · {info.residents != null ? `${info.residents} locuitori` : `${info.jobs} locuri de muncă`}</p>}
      {info.crop && <p>🌱 <b>{info.crop}</b> · {info.stage}</p>}
      {!info.crop && <ul className="checks">
        {yes(info.road, 'Drum aproape')}
        {yes(info.powered, 'Curent electric')}
        {yes(info.watered, 'Apă')}
      </ul>}
      <Meter label="Valoarea terenului" v={info.value} good />
      <Meter label="Poluare" v={info.pollution} />
      {info.problem && <p className="problem">⚠ {info.problem}</p>}
    </aside>
  );
}

function Meter({ label, v, good }) {
  const color = good ? `hsl(${v * 1.2},65%,45%)` : `hsl(${120 - v * 1.2},65%,45%)`;
  return (
    <div className="meter">
      <span>{label}</span><b>{v}%</b>
      <div className="mtrack"><i style={{ width: `${v}%`, background: color }} /></div>
    </div>
  );
}

function MapButtons({ g }) {
  return (
    <div className="mapbtns">
      <button className="icon" onClick={() => g.rotate(-1)} title="Rotește stânga (Q)" aria-label="Rotește stânga">⟲</button>
      <button className="icon" onClick={() => g.rotate(1)} title="Rotește dreapta (E)" aria-label="Rotește dreapta">⟳</button>
      <button className="icon" onClick={() => g.zoom(1.25)} title="Apropie" aria-label="Apropie">＋</button>
      <button className="icon" onClick={() => g.zoom(.8)} title="Depărtează" aria-label="Depărtează">－</button>
    </div>
  );
}

function Toolbar({ ui, g }) {
  const t = TOOL[ui.tool];
  return (
    <footer className="toolbar">
      <div className="tool-help">
        <b>{t.icon} {t.name}</b> {t.help}
        {ui.previewCost > 0 && <span className={'cost' + (ui.previewCost > ui.money ? ' neg' : '')}> · Cost: {fmt(ui.previewCost)} $</span>}
      </div>
      <div className="tools">
        {TOOLS.map(tool => (
          <button key={tool.id} className={'tool' + (ui.tool === tool.id ? ' on' : '')} onClick={() => g.setTool(tool.id)} title={tool.help}>
            <span className="ti">{tool.icon}</span>
            <span className="tn">{tool.name}</span>
            {tool.cost > 0 && <span className="tc">{fmt(tool.cost)} $</span>}
          </button>
        ))}
      </div>
    </footer>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="backdrop" onPointerDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="card modal" role="dialog" aria-label={title}>
        <div className="card-head">
          <h2>{title}</h2>
          {onClose && <button className="icon small" onClick={onClose} aria-label="Închide">✕</button>}
        </div>
        {children}
      </div>
    </div>
  );
}

function Budget({ ui, g, onClose }) {
  const m = ui.lastMonth;
  return (
    <Modal title="Buget" onClose={onClose}>
      <p className="big">💰 {fmt(ui.money)} $</p>
      {m ? (
        <table className="budget">
          <tbody>
            <tr><td>Taxe încasate</td><td className="pos">+{fmt(m.income)} $</td></tr>
            {m.energy > 0 && <tr><td>Energie vândută</td><td className="pos">+{fmt(m.energy)} $</td></tr>}
            {m.ranch > 0 && <tr><td>Lapte și ouă de la fermă</td><td className="pos">+{fmt(m.ranch)} $</td></tr>}
            {m.farm > 0 && <tr><td>Legume vândute</td><td className="pos">+{fmt(m.farm)} $</td></tr>}
            <tr><td>Întreținere drumuri</td><td className="neg">−{fmt(m.roads)} $</td></tr>
            <tr><td>Servicii (curent, apă, poliție…)</td><td className="neg">−{fmt(m.services)} $</td></tr>
            <tr className="total"><td>Luna trecută</td><td className={m.net >= 0 ? 'pos' : 'neg'}>{m.net >= 0 ? '+' : '−'}{fmt(Math.abs(m.net))} $</td></tr>
          </tbody>
        </table>
      ) : <p className="muted">Primul raport apare la sfârșitul lunii.</p>}
      <label className="tax">
        <span>Taxe: <b>{ui.tax}%</b></span>
        <input type="range" min="0" max="20" value={ui.tax} onChange={e => g.setTax(+e.target.value)} />
      </label>
      <p className="muted">Taxe mari aduc bani, dar oamenii și firmele vin mai greu. 9% e echilibrat.</p>
    </Modal>
  );
}

function Menu({ g, onClose }) {
  return (
    <Modal title="Meniu" onClose={onClose}>
      <p className="muted">Orașul se salvează automat în browser.</p>
      <div className="menu-actions">
        <button className="primary" onClick={onClose}>Continuă</button>
        <button className="danger" onClick={() => {
          if (confirm('Sigur începi un oraș nou? Orașul de acum se pierde.')) { g.newCity(); onClose(); }
        }}>Oraș nou</button>
      </div>
      <h3>Controale</h3>
      <ul className="help">
        <li><b>Mouse:</b> click stânga construiește (trage pentru drumuri și zone), click dreapta + tragere mută harta, rotița = zoom, Q / E rotesc.</li>
        <li><b>Telefon:</b> un deget construiește, două degete mută harta și fac zoom. Cu unealta 🔍 Info, un deget mută harta.</li>
        <li><b>Spațiu</b> = pauză, <b>Esc</b> = unealta Info.</li>
      </ul>
    </Modal>
  );
}

function Welcome({ onStart }) {
  return (
    <Modal title="Bine ai venit, primarule!">
      <p>Construiește-ți orașul de la zero. Pașii de început:</p>
      <ol className="steps">
        <li>🛣️ Trage un <b>drum</b>.</li>
        <li>🏠 🏬 🏭 Pune <b>zone</b> de-a lungul drumului: locuințe, comerț, industrie.</li>
        <li>⚡ Construiește o <b>centrală</b>, ca zonele să aibă curent.</li>
        <li>💧 Pune un <b>turn de apă</b>, ca să crească clădirile.</li>
        <li>🌷 🥕 Fă curți cu flori și plantează legume: legumele coapte se vând.</li>
        <li>🌳 👮 🚒 🏫 Parcurile și serviciile fac oamenii mulțumiți și clădirile mai înalte.</li>
      </ol>
      <p className="muted">Barele R C I din stânga arată ce tip de zonă își doresc oamenii acum.</p>
      <button className="primary wide" onClick={onStart}>Să începem!</button>
    </Modal>
  );
}
