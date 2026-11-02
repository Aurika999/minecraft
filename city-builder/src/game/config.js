// Regulile jocului: unelte, costuri, întreținere, raze de acțiune.
export const N = 48; // harta are N × N pătrățele
export const START_MONEY = 20000;
export const DAYS_PER_MONTH = 30;
// cât durează o zi de joc, în secunde, pentru fiecare viteză (0 = pauză)
export const DAY_SECONDS = [Infinity, .6, .3, .12];
export const ROAD_UPKEEP = 1; // $ pe lună pentru fiecare pătrățel de drum
export const FOREST_CLEAR = 5; // cost în plus când construiești peste pădure

// locuitori / locuri de muncă pentru fiecare nivel de clădire (0 = zonă goală)
export const RESIDENTS = [0, 8, 30, 90];
export const JOBS_C = [0, 6, 20, 60];
export const JOBS_I = [0, 10, 30, 70];

// mode: 'line' = tragi un drum, 'rect' = tragi o suprafață, 'tap' = un singur pătrățel
export const TOOLS = [
  { id: 'inspect', name: 'Info', icon: '🔍', cost: 0, mode: 'tap', help: 'Atinge un pătrățel ca să vezi detalii. Trage ca să muți harta.' },
  { id: 'road', name: 'Drum', icon: '🛣️', cost: 10, mode: 'line', help: 'Trage ca să construiești drum. Zonele cresc doar lângă drumuri.' },
  { id: 'R', name: 'Locuințe', icon: '🏠', cost: 20, mode: 'rect', zone: true, help: 'Zonă rezidențială: aici se mută oamenii.' },
  { id: 'C', name: 'Comerț', icon: '🏬', cost: 25, mode: 'rect', zone: true, help: 'Zonă comercială: magazine și birouri, dau locuri de muncă.' },
  { id: 'I', name: 'Industrie', icon: '🏭', cost: 25, mode: 'rect', zone: true, help: 'Zonă industrială: multe locuri de muncă, dar poluează.' },
  { id: 'power', name: 'Centrală', icon: '⚡', cost: 3000, upkeep: 80, radius: 12, mode: 'tap', help: 'Dă curent clădirilor din jur. Poluează puțin.' },
  { id: 'water', name: 'Turn de apă', icon: '💧', cost: 1200, upkeep: 30, radius: 10, mode: 'tap', help: 'Fără apă, clădirile rămân mici.' },
  { id: 'park', name: 'Parc', icon: '🌳', cost: 150, upkeep: 2, radius: 4, mode: 'rect', help: 'Crește valoarea terenului din jur.' },
  { id: 'police', name: 'Poliție', icon: '👮', cost: 800, upkeep: 40, radius: 9, mode: 'tap', help: 'Siguranță: oamenii sunt mai mulțumiți.' },
  { id: 'fire', name: 'Pompieri', icon: '🚒', cost: 800, upkeep: 40, radius: 9, mode: 'tap', help: 'Fără pompieri pot izbucni incendii.' },
  { id: 'school', name: 'Școală', icon: '🏫', cost: 1000, upkeep: 50, radius: 9, mode: 'tap', help: 'Educația crește valoarea terenului.' },
  { id: 'bulldoze', name: 'Demolează', icon: '🚜', cost: 5, mode: 'rect', help: 'Trage peste ce vrei să dărâmi (sau să tai pădurea).' },
];
export const TOOL = Object.fromEntries(TOOLS.map(t => [t.id, t]));

export const KINDS = [null, 'road', 'R', 'C', 'I', 'power', 'water', 'park', 'police', 'fire', 'school'];
export const KIND_NAME = {
  road: 'Drum', R: 'Zonă rezidențială', C: 'Zonă comercială', I: 'Zonă industrială', power: 'Centrală electrică',
  water: 'Turn de apă', park: 'Parc', police: 'Secție de poliție', fire: 'Stație de pompieri', school: 'Școală',
};
export const MONTHS = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie', 'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'];
