// Regulile jocului: unelte, costuri, întreținere, raze de acțiune.
export const N = 48; // harta are N × N pătrățele
export const START_MONEY = 20000;
export const DAYS_PER_MONTH = 30;
// cât durează o zi de joc, în secunde, pentru fiecare viteză (0 = pauză)
export const DAY_SECONDS = [Infinity, .6, .3, .12];
export const ROAD_UPKEEP = 1; // $ pe lună pentru fiecare pătrățel de drum
export const FOREST_CLEAR = 5; // cost în plus când construiești peste pădure
export const BRIDGE_COST = 60; // un pătrățel de pod (drum peste apă)
export const BRIDGE_UPKEEP = 3; // $ pe lună pentru fiecare pătrățel de pod
export const BRIDGE_H = .5; // cât de sus e podul peste drum sau peste șine (trenul are cam .3)

// locuitori / locuri de muncă pentru fiecare nivel de clădire (0 = zonă goală)
export const RESIDENTS = [0, 8, 30, 90];
export const RESIDENTS_H = [0, 45, 120, 240]; // blocuri cu etaje
export const JOBS_C = [0, 6, 20, 60];
export const JOBS_I = [0, 10, 30, 70];

// mode: 'line' = tragi un drum, 'rect' = tragi o suprafață, 'tap' = un singur pătrățel
export const TOOLS = [
  { id: 'inspect', name: 'Info', icon: '🔍', cost: 0, mode: 'tap', help: 'Atinge un pătrățel ca să vezi detalii. Trage ca să muți harta.' },
  { id: 'road', name: 'Drum', icon: '🛣️', cost: 10, mode: 'line', help: 'Trage ca să construiești drum. Peste apă devine pod (60 $). Zonele cresc doar lângă drumuri.' },
  { id: 'rail', name: 'Cale ferată', icon: '🛤️', cost: 25, upkeep: 2, mode: 'line', help: 'Trage ca să pui șine. Peste un drum faci o trecere la nivel, peste apă un pod. Pe șine vin trenuri.' },
  { id: 'flyover', name: 'Pod rutier', icon: '🌉', cost: 150, upkeep: 4, mode: 'line', bridge: 'road', help: 'Trage în linie dreaptă peste o cale ferată sau peste alt drum: capetele devin rampe, iar la mijloc se face podul. Mașinile trec pe sus, trenurile și mașinile de jos pe dedesubt, fără să se mai aștepte.' },
  { id: 'viaduct', name: 'Pod de tren', icon: '🚝', cost: 200, upkeep: 5, mode: 'line', bridge: 'rail', help: 'Trage în linie dreaptă peste un drum: capetele devin rampe de cale ferată, iar trenul trece pe pod, pe deasupra mașinilor.' },
  { id: 'R', name: 'Locuințe', icon: '🏠', cost: 20, mode: 'rect', zone: true, help: 'Zonă rezidențială: aici se mută oamenii.' },
  { id: 'H', name: 'Blocuri', icon: '🏢', cost: 40, mode: 'rect', zone: true, help: 'Zonă pentru blocuri cu etaje: încap foarte mulți oameni. Au nevoie de drum, curent și apă; cresc mai înalte unde terenul e valoros.' },
  { id: 'C', name: 'Comerț', icon: '🏬', cost: 25, mode: 'rect', zone: true, help: 'Zonă comercială: magazine și birouri, dau locuri de muncă.' },
  { id: 'I', name: 'Industrie', icon: '🏭', cost: 25, mode: 'rect', zone: true, help: 'Zonă industrială: multe locuri de muncă, dar poluează.' },
  { id: 'power', name: 'Centrală', icon: '⚡', cost: 3000, upkeep: 80, radius: 12, mode: 'tap', help: 'Dă curent clădirilor din jur. Poluează puțin.' },
  { id: 'wind', name: 'Eoliană', icon: '🌬️', cost: 600, upkeep: 5, radius: 6, sells: 45, mode: 'rect', help: 'Curent curat în jur, fără poluare. Vinde energie: +45 $ pe lună fiecare. Trage ca să faci un parc eolian.' },
  { id: 'solar', name: 'Panouri solare', icon: '☀️', cost: 900, upkeep: 5, radius: 7, sells: 70, mode: 'rect', help: 'Curent de la soare, fără poluare. Vinde energie: +70 $ pe lună fiecare pătrățel.' },
  { id: 'water', name: 'Turn de apă', icon: '💧', cost: 1200, upkeep: 30, radius: 10, mode: 'tap', help: 'Fără apă, clădirile rămân mici.' },
  { id: 'park', name: 'Parc', icon: '🌳', cost: 150, upkeep: 2, radius: 4, mode: 'rect', help: 'Crește valoarea terenului din jur.' },
  { id: 'garden', name: 'Curte cu flori', icon: '🌷', cost: 40, upkeep: 1, radius: 3, mode: 'rect', help: 'Straturi de flori, gard viu și alei. Oamenii se plimbă aici, iar terenul din jur se scumpește.' },
  { id: 'farm', name: 'Legume', icon: '🥕', cost: 30, mode: 'rect', help: 'Plantează legume. Cresc singure, iar când sunt coapte se culeg și se vând. Lângă apă cresc mai repede.' },
  { id: 'ranch', name: 'Fermă', icon: '🐄', cost: 600, mode: 'tap', help: 'Fermă cu animale sau păsări. Apasă pe ea cu 🔍 Info ca să alegi ce crești: fiecare aduce alți bani.' },
  { id: 'station', name: 'Gară', icon: '🚉', cost: 1500, upkeep: 30, radius: 10, mode: 'tap', help: 'Pune-o lângă șine: vin mai multe trenuri, iar terenul din jur se scumpește.' },
  { id: 'fun', name: 'Parc de distracții', icon: '🎡', cost: 1200, upkeep: 20, radius: 6, sells: 60, mode: 'rect', help: 'Roată mare, carusel, montagne russe și chioșcuri cu baloane. Vinde bilete: +60 $ pe lună fiecare pătrățel, iar oamenii din jur sunt mai fericiți.' },
  { id: 'beach', name: 'Plajă', icon: '🏖️', cost: 200, upkeep: 2, radius: 5, sells: 25, biz: true, mode: 'rect', help: 'Doar pe malul apei: nisip, umbrele, șezlonguri și oameni care fac plajă. Închiriază umbrele: +25 $ pe lună fiecare pătrățel, iar terenul din jur se scumpește.' },
  { id: 'cafe', name: 'Cafenea', icon: '☕', cost: 500, upkeep: 5, radius: 4, sells: 40, biz: true, mode: 'tap', help: 'Cafenea cu terasă și umbrele: terenul din jur se scumpește. Aduce +40 $ pe lună.' },
  { id: 'gas', name: 'Benzinărie', icon: '⛽', cost: 900, upkeep: 10, sells: 70, biz: true, mode: 'tap', help: 'Benzinărie cu pompe, copertină și magazin. Aduce +70 $ pe lună. Pune-o lângă drum.' },
  { id: 'parking', name: 'Parcare', icon: '🅿️', cost: 120, upkeep: 2, radius: 3, sells: 12, biz: true, mode: 'rect', help: 'Parcare cu mașini: +12 $ pe lună pentru fiecare pătrățel. Magazinele din jur au mai mulți clienți.' },
  { id: 'airport', name: 'Aeroport', icon: '✈️', cost: 600, upkeep: 10, radius: 12, sells: 45, biz: true, mode: 'rect', help: 'Trage o suprafață lungă (de exemplu 2 × 5): pistă, turn de control, terminal și hangar. Avioanele decolează! +45 $ pe lună fiecare pătrățel.' },
  { id: 'police', name: 'Poliție', icon: '👮', cost: 800, upkeep: 40, radius: 9, mode: 'tap', help: 'Siguranță: oamenii sunt mai mulțumiți.' },
  { id: 'fire', name: 'Pompieri', icon: '🚒', cost: 800, upkeep: 40, radius: 9, mode: 'tap', help: 'Fără pompieri pot izbucni incendii.' },
  { id: 'school', name: 'Școală', icon: '🏫', cost: 1000, upkeep: 50, radius: 9, mode: 'tap', help: 'Educația crește valoarea terenului.' },
  { id: 'bulldoze', name: 'Demolează', icon: '🚜', cost: 5, mode: 'rect', help: 'Trage peste ce vrei să dărâmi (sau să tai pădurea).' },
];
export const TOOL = Object.fromEntries(TOOLS.map(t => [t.id, t]));

export const KINDS = [null, 'road', 'R', 'C', 'I', 'power', 'water', 'park', 'police', 'fire', 'school', 'garden', 'farm', 'rail', 'crossing', 'station', 'H', 'wind', 'solar', 'ranch', 'fun', 'bridge', 'cafe', 'gas', 'parking', 'airport', 'beach'];
export const KIND_NAME = {
  road: 'Drum', R: 'Zonă rezidențială', C: 'Zonă comercială', I: 'Zonă industrială', power: 'Centrală electrică',
  water: 'Turn de apă', park: 'Parc', police: 'Secție de poliție', fire: 'Stație de pompieri', school: 'Școală',
  garden: 'Curte cu flori', farm: 'Grădină de legume',
  fun: 'Parc de distracții', wind: 'Eoliană', solar: 'Parc de panouri solare', ranch: 'Fermă de animale',
  H: 'Zonă de blocuri', rail: 'Cale ferată', crossing: 'Trecere la nivel cu calea ferată', station: 'Gară', bridge: 'Pod',
  cafe: 'Cafenea', gas: 'Benzinărie', parking: 'Parcare', airport: 'Aeroport', beach: 'Plajă',
};
// legumele: tipul depinde de pătrățel; prețul e pentru un pătrățel cules
export const CROPS = ['Varză', 'Morcovi', 'Roșii', 'Dovleci', 'Porumb', 'Vinete', 'Grâu'];
export const CROP_STAGES = ['Semințe puse', 'Răsaduri', 'Cresc', 'Gata de cules'];
export const HARVEST_PRICE = 12;
// ce poți crește la fermă: prețul se plătește când schimbi, venitul vine lunar
export const ANIMALS = [
  { id: 'cow', name: 'Vaci', icon: '🐄', product: 'lapte', price: 300, income: 80, count: 3 },
  { id: 'pig', name: 'Porci', icon: '🐖', product: 'carne', price: 250, income: 70, count: 4 },
  { id: 'sheep', name: 'Oi', icon: '🐑', product: 'lână', price: 250, income: 65, count: 4 },
  { id: 'goat', name: 'Capre', icon: '🐐', product: 'brânză', price: 200, income: 60, count: 4 },
  { id: 'horse', name: 'Cai', icon: '🐴', product: 'plimbări călare', price: 500, income: 110, count: 2 },
  { id: 'chicken', name: 'Găini', icon: '🐔', product: 'ouă', price: 100, income: 45, count: 7, bird: true },
  { id: 'turkey', name: 'Curcani', icon: '🦃', product: 'carne de curcan', price: 200, income: 60, count: 4, bird: true },
  { id: 'duck', name: 'Rațe', icon: '🦆', product: 'ouă și pene', price: 150, income: 50, count: 6, bird: true },
];

export const MONTHS = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie', 'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'];
