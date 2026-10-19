// Blocuri, obiecte, unelte și rețete.
export const B = {
  AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, COBBLE: 4, LOG: 5, LEAVES: 6, PLANKS: 7, SAND: 8,
  COAL_ORE: 9, IRON_ORE: 10, DIAMOND_ORE: 11, BEDROCK: 12, TABLE: 13, FURNACE: 14,
  TORCH: 15, BED: 16, WOOL: 17, LAVA: 18,
};

export const I = {
  STICK: 100, COAL: 101, IRON: 102, DIAMOND: 103, APPLE: 104, BEEF: 105, STEAK: 106,
  PORK: 107, COOKED_PORK: 108, CHICKEN: 109, COOKED_CHICKEN: 110, MUTTON: 111,
  COOKED_MUTTON: 112, FLESH: 113,
};

// tier = nivelul minim de târnăcop ca blocul să lase ceva (1 lemn, 2 piatră, 3 fier)
const BLOCK_DEFS = {
  [B.GRASS]: { name: 'Iarbă', tex: ['grass_top', 'grass_side', 'dirt'], hardness: .6, tool: 'shovel', drop: B.DIRT },
  [B.DIRT]: { name: 'Pământ', tex: 'dirt', hardness: .5, tool: 'shovel' },
  [B.STONE]: { name: 'Piatră', tex: 'stone', hardness: 1.5, tool: 'pickaxe', tier: 1, drop: B.COBBLE },
  [B.COBBLE]: { name: 'Piatră spartă', tex: 'cobble', hardness: 2, tool: 'pickaxe', tier: 1 },
  [B.LOG]: { name: 'Lemn', tex: ['log_top', 'log_side', 'log_top'], hardness: 2, tool: 'axe', fuel: 1.5 },
  [B.LEAVES]: { name: 'Frunze', tex: 'leaves', hardness: .2, drop: null },
  [B.PLANKS]: { name: 'Scânduri', tex: 'planks', hardness: 2, tool: 'axe', fuel: 1.5 },
  [B.SAND]: { name: 'Nisip', tex: 'sand', hardness: .5, tool: 'shovel' },
  [B.COAL_ORE]: { name: 'Minereu de cărbune', tex: 'coal_ore', hardness: 3, tool: 'pickaxe', tier: 1, drop: I.COAL },
  [B.IRON_ORE]: { name: 'Minereu de fier', tex: 'iron_ore', hardness: 3, tool: 'pickaxe', tier: 2 },
  [B.DIAMOND_ORE]: { name: 'Minereu de diamant', tex: 'diamond_ore', hardness: 3, tool: 'pickaxe', tier: 3, drop: I.DIAMOND },
  [B.BEDROCK]: { name: 'Rocă de bază', tex: 'bedrock', hardness: Infinity },
  [B.TABLE]: { name: 'Banc de lucru', tex: ['table_top', 'table_side', 'planks'], hardness: 2.5, tool: 'axe', fuel: 1.5 },
  [B.FURNACE]: { name: 'Cuptor', tex: ['furnace_top', 'furnace_front', 'furnace_top'], hardness: 3.5, tool: 'pickaxe', tier: 1 },
  [B.TORCH]: { name: 'Torță', tex: ['torch_top', 'torch_side', 'torch_top'], hardness: 0, solid: false, opaque: false, light: 14, box: [7 / 16, 0, 7 / 16, 9 / 16, 10 / 16, 9 / 16] },
  [B.BED]: { name: 'Pat', tex: ['bed_top', 'bed_side', 'planks'], hardness: .2, opaque: false, box: [0, 0, 0, 1, 9 / 16, 1] },
  [B.WOOL]: { name: 'Lână', tex: 'wool', hardness: .8 },
  [B.LAVA]: { name: 'Lavă', tex: 'lava', hardness: Infinity, solid: false, light: 15 },
};

export const BLOCK = [];
for (const [id, d] of Object.entries(BLOCK_DEFS)) {
  BLOCK[id] = {
    id: +id, solid: true, opaque: true, light: 0, tier: 0, tool: null, drop: +id, box: null,
    ...d, tex: Array.isArray(d.tex) ? d.tex : [d.tex, d.tex, d.tex],
  };
}

export const SOLID = new Uint8Array(256), OPAQUE = new Uint8Array(256), EMIT = new Uint8Array(256);
for (const d of BLOCK) if (d) { SOLID[d.id] = d.solid ? 1 : 0; OPAQUE[d.id] = d.opaque ? 1 : 0; EMIT[d.id] = d.light; }

// unelte: id = 200 + tip * 10 + nivel
export const TOOL_TYPES = ['pickaxe', 'axe', 'shovel', 'sword'];
const TOOL_INFO = {
  pickaxe: { name: 'Târnăcop', heads: 3, sticks: 2, dmg: 2 },
  axe: { name: 'Secure', heads: 3, sticks: 2, dmg: 3 },
  shovel: { name: 'Lopată', heads: 1, sticks: 2, dmg: 1.5 },
  sword: { name: 'Sabie', heads: 2, sticks: 1, dmg: 4 },
};
const TIERS = [null,
  { name: 'lemn', color: [168, 128, 70], speed: 2, dur: 60, mat: B.PLANKS },
  { name: 'piatră', color: [140, 140, 140], speed: 4, dur: 132, mat: B.COBBLE },
  { name: 'fier', color: [232, 232, 232], speed: 6, dur: 251, mat: I.IRON },
  { name: 'diamant', color: [92, 232, 222], speed: 8, dur: 1562, mat: I.DIAMOND },
];
export const toolId = (type, tier) => 200 + TOOL_TYPES.indexOf(type) * 10 + tier;

const ITEM = {};
for (const d of BLOCK) if (d) ITEM[d.id] = { name: d.name, block: d.id, fuel: d.fuel };
Object.assign(ITEM, {
  [I.STICK]: { name: 'Băț', icon: 'stick', fuel: .5 },
  [I.COAL]: { name: 'Cărbune', icon: 'coal', fuel: 8 },
  [I.IRON]: { name: 'Lingou de fier', icon: 'ingot' },
  [I.DIAMOND]: { name: 'Diamant', icon: 'diamond' },
  [I.APPLE]: { name: 'Măr', icon: 'apple', food: 4 },
  [I.BEEF]: { name: 'Carne de vită crudă', icon: 'beef', food: 3 },
  [I.STEAK]: { name: 'Friptură de vită', icon: 'steak', food: 8 },
  [I.PORK]: { name: 'Carne de porc crudă', icon: 'pork', food: 3 },
  [I.COOKED_PORK]: { name: 'Cotlet de porc gătit', icon: 'pork_c', food: 8 },
  [I.CHICKEN]: { name: 'Pui crud', icon: 'chicken', food: 2 },
  [I.COOKED_CHICKEN]: { name: 'Pui gătit', icon: 'chicken_c', food: 6 },
  [I.MUTTON]: { name: 'Carne de oaie crudă', icon: 'mutton', food: 2 },
  [I.COOKED_MUTTON]: { name: 'Carne de oaie gătită', icon: 'mutton_c', food: 6 },
  [I.FLESH]: { name: 'Carne putredă', icon: 'flesh', food: 4 },
});
const TOOL_IDS = [];
for (let tier = 1; tier <= 4; tier++) for (const type of TOOL_TYPES) {
  const t = TIERS[tier], info = TOOL_INFO[type], id = toolId(type, tier);
  ITEM[id] = {
    name: `${info.name} de ${t.name}`, icon: type, color: t.color,
    tool: { type, tier, speed: t.speed, dur: t.dur, dmg: info.dmg + tier - 1 },
  };
  TOOL_IDS.push(id);
}

export const item = id => ITEM[id];
export const maxStack = id => (ITEM[id]?.tool ? 1 : 64);

// st: 'hand' (inventar), 'table' (banc de lucru), 'furnace' (cuptor)
const r = (out, n, ins, st) => ({ out, n, ins, st });
export const RECIPES = [
  r(B.PLANKS, 4, [[B.LOG, 1]], 'hand'),
  r(I.STICK, 4, [[B.PLANKS, 2]], 'hand'),
  r(B.TABLE, 1, [[B.PLANKS, 4]], 'hand'),
  r(B.TORCH, 4, [[I.COAL, 1], [I.STICK, 1]], 'hand'),
];
for (let tier = 1; tier <= 4; tier++) for (const type of TOOL_TYPES) {
  const info = TOOL_INFO[type];
  RECIPES.push(r(toolId(type, tier), 1, [[TIERS[tier].mat, info.heads], [I.STICK, info.sticks]], 'table'));
}
RECIPES.push(
  r(B.FURNACE, 1, [[B.COBBLE, 8]], 'table'),
  r(B.BED, 1, [[B.WOOL, 3], [B.PLANKS, 3]], 'table'),
  r(I.STEAK, 1, [[I.BEEF, 1]], 'furnace'),
  r(I.COOKED_PORK, 1, [[I.PORK, 1]], 'furnace'),
  r(I.COOKED_CHICKEN, 1, [[I.CHICKEN, 1]], 'furnace'),
  r(I.COOKED_MUTTON, 1, [[I.MUTTON, 1]], 'furnace'),
  r(I.IRON, 1, [[B.IRON_ORE, 1]], 'furnace'),
  r(I.COAL, 1, [[B.LOG, 1]], 'furnace'),
  r(B.STONE, 1, [[B.COBBLE, 1]], 'furnace'),
);

export const recipesFor = station => RECIPES
  .map((rc, i) => ({ ...rc, i }))
  .filter(rc => station === 'furnace' ? rc.st === 'furnace' : rc.st === 'hand' || (station === 'table' && rc.st === 'table'));

// combustibil consumat automat de cuptor, în ordinea asta
export const FUEL_ORDER = [I.COAL, B.PLANKS, I.STICK, B.LOG];

export const CREATIVE_ITEMS = [
  ...BLOCK.filter(Boolean).map(d => d.id),
  ...Object.values(I),
  ...TOOL_IDS,
];
