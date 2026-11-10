// Fereastra „Întrebări cu premii”: o întrebare, patru variante; răspunsul corect aduce bani.
import { useEffect, useRef, useState } from 'react';
import { CATS, makeQuestion } from './game/quiz-data.js';

const fmt = n => Math.round(n || 0).toLocaleString('ro-RO');

// steagul desenat în SVG (pe Windows emoji-urile cu steaguri apar doar ca litere)
export function Flag({ f }) {
  const W = 60, H = 40, parts = [];
  if (f.v || f.h) {
    const cols = f.v || f.h, w = f.w || cols.map(() => 1), tot = w.reduce((a, b) => a + b, 0);
    let at = 0;
    cols.forEach((c, k) => {
      const size = (f.v ? W : H) * w[k] / tot;
      parts.push(f.v ? <rect key={k} x={at} y={0} width={size + .3} height={H} fill={c} /> : <rect key={k} x={0} y={at} width={W} height={size + .3} fill={c} />);
      at += size;
    });
  } else parts.push(<rect key="bg" width={W} height={H} fill={f.bg} />);
  if (f.nordic) {
    parts.push(<rect key="n1" x={16} y={0} width={8} height={H} fill={f.nordic} />, <rect key="n2" x={0} y={16} width={W} height={8} fill={f.nordic} />);
    if (f.inner) parts.push(<rect key="n3" x={18} y={0} width={4} height={H} fill={f.inner} />, <rect key="n4" x={0} y={18} width={W} height={4} fill={f.inner} />);
  }
  if (f.swiss) parts.push(<rect key="s1" x={26} y={9} width={8} height={22} fill={f.swiss} />, <rect key="s2" x={19} y={16} width={22} height={8} fill={f.swiss} />);
  if (f.diamond) parts.push(<polygon key="d" points="30,5 55,20 30,35 5,20" fill={f.diamond} />);
  if (f.circle) parts.push(<circle key="c" cx={f.cx || 30} cy={20} r={f.r || 11} fill={f.circle} />);
  if (f.star) {
    const pts = Array.from({ length: 10 }, (_, k) => {
      const r = k % 2 ? f.sr * .42 : f.sr, a = -Math.PI / 2 + k * Math.PI / 5;
      return `${f.sx + r * Math.cos(a)},${f.sy + r * Math.sin(a)}`;
    }).join(' ');
    parts.push(<polygon key="st" points={pts} fill={f.star} />);
  }
  if (f.usa) {
    for (let k = 0; k < 13; k++) parts.push(<rect key={'u' + k} x={0} y={k * H / 13} width={W} height={H / 13 + .2} fill={k % 2 ? '#FFFFFF' : '#B22234'} />);
    parts.push(<rect key="cant" x={0} y={0} width={26} height={H * 7 / 13} fill="#3C3B6E" />);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) parts.push(<circle key={`p${r}${c}`} cx={3 + c * 5} cy={3 + r * 5.3} r={1} fill="#fff" />);
  }
  return (
    <svg className="flag" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="steag">
      {parts}
      {f.sym && <text x={30} y={27} textAnchor="middle" fontSize="18">{f.sym}</text>}
      <rect width={W} height={H} fill="none" stroke="rgba(0,0,0,.18)" strokeWidth="1" />
    </svg>
  );
}

export function QuizButton({ onClick }) {
  return <button className="icon quiz-btn" onClick={onClick} title="Întrebări cu premii: câștigă bani!" aria-label="Întrebări cu premii">❓</button>;
}

export function QuizPanel({ g, Modal, onClose }) {
  const [cat, setCat] = useState('all');
  const recent = useRef([]);
  const next = c => { const q = makeQuestion(c, recent.current); recent.current = [q.id, ...recent.current].slice(0, 25); return q; };
  const [q, setQ] = useState(() => next('all'));
  const [pick, setPick] = useState(null);
  const [res, setRes] = useState(() => g.quizState());
  const choose = c => { setCat(c); setPick(null); setQ(next(c)); };
  const answer = opt => {
    if (pick) return;
    setPick(opt);
    setRes(g.quizAnswer(opt === q.a));
  };
  const more = () => { setPick(null); setQ(next(cat)); };
  // tasta Enter trece la următoarea întrebare
  useEffect(() => {
    const k = e => { if (e.key === 'Enter' && pick) more(); };
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  });
  const ok = pick && pick === q.a;
  return (
    <Modal title="❓ Întrebări cu premii" onClose={onClose}>
      <div className="quiz-cats">
        {CATS.map(([id, label]) => <button key={id} className={'mini-btn plain' + (cat === id ? ' on' : '')} onClick={() => choose(id)}>{label}</button>)}
      </div>
      <p className="quiz-score">✅ {res.correct} corecte azi · 🔥 {res.streak} la rând · 💰 {fmt(res.earned)} $ câștigați azi</p>
      <div className="quiz-q">
        {q.flag && <Flag f={q.flag} />}
        <h3>{q.q}</h3>
      </div>
      <div className="quiz-opts">
        {q.options.map(o => (
          <button key={o} disabled={!!pick}
            className={'quiz-opt' + (pick ? (o === q.a ? ' right' : o === pick ? ' wrong' : ' dim') : '')}
            onClick={() => answer(o)}>{o}</button>
        ))}
      </div>
      {pick && (
        <div className={'quiz-result' + (ok ? ' good' : ' bad')}>
          <b>{ok ? (res.reward ? `🎉 Corect! +${fmt(res.reward)} $${res.reward > 50 ? ' (bonus pentru 5 la rând!)' : ''}` : '🎉 Corect! (azi ai luat deja toți banii, dar mai poți juca)') : `❌ Nu chiar. Răspunsul corect: ${q.a}`}</b>
          <button className="primary" onClick={more}>Următoarea întrebare ▶</button>
        </div>
      )}
      {!pick && <p className="muted">Fiecare răspuns corect aduce 50 $, iar la fiecare 5 corecte la rând primești încă 100 $.</p>}
    </Modal>
  );
}
