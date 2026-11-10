// Întrebările de cultură generală: capitale și steaguri (generate din lista de țări) plus întrebări scrise de mână.
// Fiecare întrebare: { cat, q, a (răspunsul corect), wrong (variante greșite), flag (opțional) }

export const CATS = [
  ['all', '🎲 Toate'], ['capital', '🏛️ Capitale'], ['flag', '🚩 Steaguri'], ['animals', '🐾 Animale'], ['nature', '🔬 Natură'],
  ['romania', '🏔️ România'], ['world', '🌍 Lumea'], ['body', '🫀 Corpul'], ['math', '➗ Matematică'],
];

// țara, capitala și steagul (desenat simplu: dungi, cerc, cruce, stea)
// v = dungi verticale, h = dungi orizontale, w = lățimea fiecărei dungi
export const COUNTRIES = [
  { n: 'România', c: 'București', f: { v: ['#002B7F', '#FCD116', '#CE1126'] } },
  { n: 'Franța', c: 'Paris', f: { v: ['#0055A4', '#FFFFFF', '#EF4135'] } },
  { n: 'Italia', c: 'Roma', f: { v: ['#009246', '#FFFFFF', '#CE2B37'] } },
  { n: 'Irlanda', c: 'Dublin', f: { v: ['#169B62', '#FFFFFF', '#FF883E'] } },
  { n: 'Belgia', c: 'Bruxelles', f: { v: ['#000000', '#FDDA24', '#EF3340'] } },
  { n: 'Germania', c: 'Berlin', f: { h: ['#000000', '#DD0000', '#FFCE00'] } },
  { n: 'Ungaria', c: 'Budapesta', f: { h: ['#CE2939', '#FFFFFF', '#477050'] } },
  { n: 'Bulgaria', c: 'Sofia', f: { h: ['#FFFFFF', '#00966E', '#D62612'] } },
  { n: 'Țările de Jos (Olanda)', c: 'Amsterdam', f: { h: ['#AE1C28', '#FFFFFF', '#21468B'] } },
  { n: 'Rusia', c: 'Moscova', f: { h: ['#FFFFFF', '#0039A6', '#D52B1E'] } },
  { n: 'Austria', c: 'Viena', f: { h: ['#ED2939', '#FFFFFF', '#ED2939'] } },
  { n: 'Ucraina', c: 'Kiev', f: { h: ['#0057B7', '#FFD700'] } },
  { n: 'Polonia', c: 'Varșovia', f: { h: ['#FFFFFF', '#DC143C'] } },
  { n: 'Estonia', c: 'Tallinn', f: { h: ['#0072CE', '#000000', '#FFFFFF'] } },
  { n: 'Lituania', c: 'Vilnius', f: { h: ['#FDB913', '#006A44', '#C1272D'] } },
  { n: 'Spania', c: 'Madrid', f: { h: ['#AA151B', '#F1BF00', '#AA151B'], w: [1, 2, 1] } },
  { n: 'Columbia', c: 'Bogotá', f: { h: ['#FCD116', '#003893', '#CE1126'], w: [2, 1, 1] } },
  { n: 'Armenia', c: 'Erevan', f: { h: ['#D90012', '#0033A0', '#F2A800'] } },
  { n: 'Gabon', c: 'Libreville', f: { h: ['#009E60', '#FCD116', '#3A75C4'] } },
  { n: 'Indonezia', c: 'Jakarta', f: { h: ['#CE1126', '#FFFFFF'] } },
  { n: 'Nigeria', c: 'Abuja', f: { v: ['#008751', '#FFFFFF', '#008751'] } },
  { n: 'Mali', c: 'Bamako', f: { v: ['#14B53A', '#FCD116', '#CE1126'] } },
  { n: 'Peru', c: 'Lima', f: { v: ['#D91023', '#FFFFFF', '#D91023'] } },
  { n: 'Canada', c: 'Ottawa', f: { v: ['#D52B1E', '#FFFFFF', '#D52B1E'], w: [1, 2, 1], sym: '🍁' } },
  { n: 'Japonia', c: 'Tokyo', f: { bg: '#FFFFFF', circle: '#BC002D' } },
  { n: 'Bangladesh', c: 'Dhaka', f: { bg: '#006A4E', circle: '#F42A41', cx: 27 } },
  { n: 'Elveția', c: 'Berna', f: { bg: '#DA291C', swiss: '#FFFFFF' } },
  { n: 'Danemarca', c: 'Copenhaga', f: { bg: '#C8102E', nordic: '#FFFFFF' } },
  { n: 'Suedia', c: 'Stockholm', f: { bg: '#006AA7', nordic: '#FECC00' } },
  { n: 'Finlanda', c: 'Helsinki', f: { bg: '#FFFFFF', nordic: '#002F6C' } },
  { n: 'Norvegia', c: 'Oslo', f: { bg: '#BA0C2F', nordic: '#FFFFFF', inner: '#00205B' } },
  { n: 'China', c: 'Beijing', f: { bg: '#DE2910', star: '#FFDE00', sx: 14, sy: 13, sr: 7 } },
  { n: 'Vietnam', c: 'Hanoi', f: { bg: '#DA251D', star: '#FFFF00', sx: 30, sy: 20, sr: 10 } },
  { n: 'Brazilia', c: 'Brasília', f: { bg: '#009C3B', diamond: '#FFDF00', circle: '#002776', r: 7.5 } },
  { n: 'Statele Unite ale Americii', c: 'Washington', f: { usa: true } },
  { n: 'Grecia', c: 'Atena' }, { n: 'Portugalia', c: 'Lisabona' }, { n: 'Marea Britanie', c: 'Londra' },
  { n: 'Republica Moldova', c: 'Chișinău' }, { n: 'Serbia', c: 'Belgrad' }, { n: 'Turcia', c: 'Ankara' },
  { n: 'Egipt', c: 'Cairo' }, { n: 'Australia', c: 'Canberra' }, { n: 'Argentina', c: 'Buenos Aires' },
  { n: 'Mexic', c: 'Ciudad de México' }, { n: 'India', c: 'New Delhi' }, { n: 'Coreea de Sud', c: 'Seul' },
  { n: 'Cehia', c: 'Praga' }, { n: 'Croația', c: 'Zagreb' }, { n: 'Slovacia', c: 'Bratislava' },
  { n: 'Kenya', c: 'Nairobi' }, { n: 'Maroc', c: 'Rabat' },
];

// întrebări scrise de mână: [categorie, întrebare, răspuns corect, ...variante greșite]
const HAND = [
  ['animals', 'Care este cel mai mare animal de pe Pământ?', 'Balena albastră', 'Elefantul', 'Girafa', 'Rechinul alb'],
  ['animals', 'Câte picioare are un păianjen?', '8', '6', '10', '4'],
  ['animals', 'Câte picioare are o insectă?', '6', '8', '4', '10'],
  ['animals', 'Care este cel mai rapid animal de pe uscat?', 'Ghepardul', 'Leul', 'Calul', 'Iepurele'],
  ['animals', 'Ce mănâncă ursul panda aproape tot timpul?', 'Bambus', 'Pește', 'Miere', 'Morcovi'],
  ['animals', 'Ce animal este numit „regele junglei”?', 'Leul', 'Tigrul', 'Elefantul', 'Gorila'],
  ['animals', 'Ce animal își poate schimba culoarea pielii?', 'Cameleonul', 'Broasca', 'Șopârla verde', 'Șarpele'],
  ['animals', 'Unde trăiește ursul polar?', 'În Arctica', 'În Africa', 'În Australia', 'În Amazonia'],
  ['animals', 'Ce pasăre nu poate zbura, dar înoată foarte bine?', 'Pinguinul', 'Rața', 'Lebăda', 'Pescărușul'],
  ['animals', 'Cum se numește puiul de cal?', 'Mânz', 'Vițel', 'Ied', 'Purcel'],
  ['animals', 'Cum se numește puiul de vacă?', 'Vițel', 'Mânz', 'Miel', 'Cățel'],
  ['animals', 'Ce animal are cel mai lung gât?', 'Girafa', 'Struțul', 'Cămila', 'Lama'],
  ['animals', 'Ce animal are o trompă lungă?', 'Elefantul', 'Rinocerul', 'Hipopotamul', 'Tapirul'],
  ['animals', 'Cu ce respiră peștii?', 'Cu branhiile', 'Cu plămânii', 'Prin piele', 'Cu nasul'],
  ['animals', 'Care animal doarme agățat cu capul în jos?', 'Liliacul', 'Bufnița', 'Veverița', 'Maimuța'],
  ['animals', 'Unde trăiește cangurul?', 'În Australia', 'În Africa', 'În Europa', 'În America de Sud'],
  ['animals', 'Ce produc albinele?', 'Miere', 'Lapte', 'Mătase', 'Lână'],
  ['animals', 'Ce animal ne dă lâna?', 'Oaia', 'Vaca', 'Porcul', 'Calul'],
  ['animals', 'Cum se numește casa albinelor?', 'Stup', 'Cuib', 'Vizuină', 'Coteț'],
  ['animals', 'Câte inimi are o caracatiță?', '3', '1', '2', '8'],

  ['nature', 'Care este planeta cea mai apropiată de Soare?', 'Mercur', 'Venus', 'Marte', 'Pământul'],
  ['nature', 'Care este cea mai mare planetă din Sistemul Solar?', 'Jupiter', 'Saturn', 'Pământul', 'Neptun'],
  ['nature', 'Ce planetă este numită „planeta roșie”?', 'Marte', 'Venus', 'Jupiter', 'Mercur'],
  ['nature', 'Ce planetă are inele mari și frumoase?', 'Saturn', 'Marte', 'Mercur', 'Venus'],
  ['nature', 'Câte planete are Sistemul Solar?', '8', '7', '9', '10'],
  ['nature', 'Ce este Soarele?', 'O stea', 'O planetă', 'Un satelit', 'O cometă'],
  ['nature', 'Cum se numește satelitul natural al Pământului?', 'Luna', 'Soarele', 'Marte', 'Steaua Polară'],
  ['nature', 'La câte grade fierbe apa?', '100 °C', '50 °C', '0 °C', '200 °C'],
  ['nature', 'La câte grade îngheață apa?', '0 °C', '10 °C', '-50 °C', '100 °C'],
  ['nature', 'Câte culori are curcubeul?', '7', '5', '6', '9'],
  ['nature', 'Ce gaz respirăm ca să trăim?', 'Oxigen', 'Heliu', 'Fum', 'Azot'],
  ['nature', 'Ce dă culoarea verde frunzelor?', 'Clorofila', 'Apa', 'Soarele', 'Pământul'],
  ['nature', 'Care este cel mai mare ocean?', 'Oceanul Pacific', 'Oceanul Atlantic', 'Oceanul Indian', 'Oceanul Arctic'],
  ['nature', 'Care este cel mai înalt munte din lume?', 'Everest', 'Mont Blanc', 'Kilimanjaro', 'Omu'],
  ['nature', 'Care este cel mai mare deșert fierbinte?', 'Sahara', 'Gobi', 'Kalahari', 'Atacama'],
  ['nature', 'Ce culoare iese din galben amestecat cu albastru?', 'Verde', 'Portocaliu', 'Mov', 'Maro'],
  ['nature', 'Ce culoare iese din roșu amestecat cu galben?', 'Portocaliu', 'Verde', 'Roz', 'Mov'],
  ['nature', 'Ce culoare iese din roșu amestecat cu albastru?', 'Mov', 'Verde', 'Portocaliu', 'Gri'],
  ['nature', 'Din ce se formează ploaia?', 'Din nori', 'Din vânt', 'Din soare', 'Din munți'],
  ['nature', 'În ce anotimp cad frunzele copacilor?', 'Toamna', 'Primăvara', 'Vara', 'Iarna'],
  ['nature', 'Ce atrage magnetul?', 'Fierul', 'Lemnul', 'Plasticul', 'Hârtia'],

  ['romania', 'Care este capitala României?', 'București', 'Cluj-Napoca', 'Iași', 'Brașov'],
  ['romania', 'Ce fluviu se varsă în Marea Neagră și formează o deltă?', 'Dunărea', 'Mureșul', 'Oltul', 'Prutul'],
  ['romania', 'Care este cel mai înalt vârf din România?', 'Moldoveanu', 'Omu', 'Negoiu', 'Ceahlău'],
  ['romania', 'Ce munți trec prin România?', 'Munții Carpați', 'Munții Alpi', 'Munții Himalaya', 'Munții Urali'],
  ['romania', 'La ce mare are ieșire România?', 'Marea Neagră', 'Marea Mediterană', 'Marea Baltică', 'Marea Roșie'],
  ['romania', 'Când este Ziua Națională a României?', '1 Decembrie', '1 Iunie', '24 Ianuarie', '1 Mai'],
  ['romania', 'Cum se numește moneda României?', 'Leul', 'Euro', 'Dolarul', 'Forintul'],
  ['romania', 'Cine a scris poezia „Luceafărul”?', 'Mihai Eminescu', 'Ion Creangă', 'George Coșbuc', 'Vasile Alecsandri'],
  ['romania', 'Cine a scris „Amintiri din copilărie”?', 'Ion Creangă', 'Mihai Eminescu', 'I. L. Caragiale', 'Mihail Sadoveanu'],
  ['romania', 'Ce gimnastă româncă a primit prima notă 10 la Olimpiadă?', 'Nadia Comăneci', 'Simona Halep', 'Gabriela Szabo', 'Andreea Răducan'],
  ['romania', 'Ce castel din România e legat de legenda lui Dracula?', 'Castelul Bran', 'Castelul Peleș', 'Castelul Corvinilor', 'Cetatea Rupea'],
  ['romania', 'Ce culori are steagul României?', 'Albastru, galben, roșu', 'Roșu, alb, verde', 'Alb, albastru, roșu', 'Verde, galben, roșu'],
  ['romania', 'Ce oraș românesc este cel mai mare după București?', 'Cluj-Napoca', 'Sibiu', 'Suceava', 'Tulcea'],
  ['romania', 'Ce animal sălbatic mare trăiește în Carpați?', 'Ursul brun', 'Leul', 'Cangurul', 'Ursul polar'],
  ['romania', 'Cine a scris „Moara cu noroc”?', 'Ioan Slavici', 'Ion Creangă', 'Mihai Eminescu', 'Liviu Rebreanu'],

  ['world', 'În ce țară sunt piramidele de la Giza?', 'Egipt', 'Mexic', 'Grecia', 'India'],
  ['world', 'În ce oraș este Turnul Eiffel?', 'Paris', 'Londra', 'Roma', 'Berlin'],
  ['world', 'În ce oraș este Statuia Libertății?', 'New York', 'Paris', 'Londra', 'Sydney'],
  ['world', 'În ce țară se află Marele Zid?', 'China', 'Japonia', 'India', 'Rusia'],
  ['world', 'În ce oraș este Colosseumul?', 'Roma', 'Atena', 'Madrid', 'Paris'],
  ['world', 'În ce oraș este ceasul Big Ben?', 'Londra', 'Dublin', 'New York', 'Viena'],
  ['world', 'Care este cea mai mare țară din lume?', 'Rusia', 'China', 'Canada', 'Brazilia'],
  ['world', 'Ce limbă se vorbește în Brazilia?', 'Portugheza', 'Spaniola', 'Engleza', 'Franceza'],
  ['world', 'Pe ce continent este Egiptul?', 'Africa', 'Asia', 'Europa', 'America de Sud'],
  ['world', 'Ce continent este acoperit aproape tot de gheață?', 'Antarctica', 'Europa', 'Australia', 'Africa'],
  ['world', 'Câte continente are Pământul?', '7', '5', '6', '9'],
  ['world', 'Cât de des au loc Jocurile Olimpice de vară?', 'O dată la 4 ani', 'În fiecare an', 'O dată la 2 ani', 'O dată la 10 ani'],
  ['world', 'Câte inele are steagul olimpic?', '5', '4', '6', '7'],
  ['world', 'Câți jucători are pe teren o echipă de fotbal?', '11', '9', '7', '12'],
  ['world', 'Ce oraș este numit „Orașul Luminilor”?', 'Paris', 'Las Vegas', 'Tokyo', 'Veneția'],
  ['world', 'În ce oraș se plimbă oamenii cu gondola pe canale?', 'Veneția', 'Amsterdam', 'Praga', 'Lisabona'],

  ['body', 'Ce organ pompează sângele în corp?', 'Inima', 'Plămânii', 'Stomacul', 'Creierul'],
  ['body', 'Cu ce organe respirăm?', 'Plămânii', 'Rinichii', 'Ficatul', 'Inima'],
  ['body', 'Care este cel mai mare organ al corpului?', 'Pielea', 'Inima', 'Creierul', 'Ficatul'],
  ['body', 'Câți dinți are de obicei un om adult?', '32', '20', '28', '40'],
  ['body', 'Cu ce simț simțim mirosurile?', 'Mirosul (nasul)', 'Văzul', 'Auzul', 'Gustul'],
  ['body', 'Câte simțuri are omul?', '5', '3', '4', '7'],
  ['body', 'Ce organ ne ajută să gândim?', 'Creierul', 'Inima', 'Stomacul', 'Plămânii'],
  ['body', 'Câte degete are o mână?', '5', '4', '6', '10'],

  ['math', 'Câte laturi are un triunghi?', '3', '4', '5', '6'],
  ['math', 'Câte laturi are un hexagon?', '6', '5', '8', '7'],
  ['math', 'Câte minute are o oră?', '60', '100', '30', '24'],
  ['math', 'Câte ore are o zi?', '24', '12', '60', '20'],
  ['math', 'Câte luni are un an?', '12', '10', '11', '13'],
  ['math', 'Câte zile are o săptămână?', '7', '5', '6', '10'],
  ['math', 'Câte zile are un an obișnuit?', '365', '360', '300', '366'],
  ['math', 'Cât face o duzină?', '12', '10', '6', '20'],
];

const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pickOther = (list, not, n) => shuffle(list.filter(x => x !== not)).slice(0, n);

// o întrebare nouă din categorie; ocolește ce s-a întrebat de curând
export function makeQuestion(cat = 'all', recent = []) {
  const kinds = cat === 'all' ? ['capital', 'flag', 'hand', 'hand', 'math'] : [cat === 'capital' || cat === 'flag' || cat === 'math' ? cat : 'hand'];
  for (let tries = 0; tries < 30; tries++) {
    const kind = kinds[Math.random() * kinds.length | 0];
    let q;
    if (kind === 'capital') {
      const c = COUNTRIES[Math.random() * COUNTRIES.length | 0];
      q = Math.random() < .5
        ? { id: 'cap:' + c.n, cat: 'capital', q: `Care este capitala țării ${c.n}?`, a: c.c, wrong: pickOther([...new Set(COUNTRIES.map(x => x.c))], c.c, 3) }
        : { id: 'cap2:' + c.n, cat: 'capital', q: `${c.c} este capitala cărei țări?`, a: c.n, wrong: pickOther([...new Set(COUNTRIES.map(x => x.n))], c.n, 3) };
    } else if (kind === 'flag') {
      const list = COUNTRIES.filter(x => x.f), c = list[Math.random() * list.length | 0];
      q = { id: 'flag:' + c.n, cat: 'flag', q: 'Al cărei țări este acest steag?', flag: c.f, a: c.n, wrong: pickOther(list.map(x => x.n), c.n, 3) };
    } else if (kind === 'math' && (cat === 'math' ? Math.random() < .6 : true)) {
      const op = Math.random() * 3 | 0, a = 2 + (Math.random() * 9 | 0), b = 2 + (Math.random() * 9 | 0);
      const [text, res] = op === 0 ? [`${a} + ${b}`, a + b] : op === 1 ? [`${a + b} − ${b}`, a] : [`${a} × ${b}`, a * b];
      const wrong = shuffle([res + 1, res - 1, res + 2, res - 2, res + 10].filter(x => x >= 0 && x !== res)).slice(0, 3);
      q = { id: 'm:' + text, cat: 'math', q: `Cât face ${text}?`, a: String(res), wrong: wrong.map(String) };
    } else {
      const pool = HAND.filter(h => cat === 'all' || h[0] === cat);
      if (!pool.length) continue;
      const h = pool[Math.random() * pool.length | 0];
      q = { id: 'h:' + h[1], cat: h[0], q: h[1], a: h[2], wrong: h.slice(3) };
    }
    if (recent.includes(q.id) && tries < 25) continue;
    return { ...q, options: shuffle([q.a, ...q.wrong]) };
  }
  return null;
}
