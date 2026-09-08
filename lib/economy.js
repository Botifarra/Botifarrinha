const { load, save } = require("./db");

// data/economy.json — un objeto { [numero]: perfil }
const FILE = "economy";

function getAll() {
  return load(FILE, {});
}

function persist(all) {
  save(FILE, all);
}

// Perfil por defecto para un usuario nuevo
function defaultProfile() {
  return {
    wallet: 100, // arranca con un poco de plata para poder probar el bot
    bank: 0,
    xp: 0,
    name: null,
    cooldowns: {}, // { daily: ts, work: ts, crimen: ts, robar: ts, pescar: ts, minar: ts, invertir: ts }
    businesses: {}, // { [businessId]: { boughtAt: ts, lastCollect: ts } }
  };
}

/**
 * Trae el perfil de un usuario (por número, sin @). Lo crea si no existe.
 * Si se pasa displayName, lo actualiza (para los rankings).
 */
function getProfile(number, displayName) {
  const all = getAll();
  if (!all[number]) {
    all[number] = defaultProfile();
    persist(all);
  }
  if (displayName && all[number].name !== displayName) {
    all[number].name = displayName;
    persist(all);
  }
  // Por compatibilidad si el perfil viene de una versión vieja sin algún campo
  all[number].cooldowns = all[number].cooldowns || {};
  all[number].businesses = all[number].businesses || {};
  return all[number];
}

function saveProfile(number, profile) {
  const all = getAll();
  all[number] = profile;
  persist(all);
}

function addWallet(number, amount) {
  const p = getProfile(number);
  p.wallet = Math.max(0, p.wallet + amount);
  saveProfile(number, p);
  return p;
}

function addXp(number, amount) {
  const p = getProfile(number);
  p.xp = Math.max(0, p.xp + amount);
  saveProfile(number, p);
  return p;
}

// --- Cooldowns ---
// Devuelve null si ya puede usar el comando, o los ms restantes si no.
function checkCooldown(profile, key, ms) {
  const last = profile.cooldowns[key];
  if (!last) return null;
  const remaining = last + ms - Date.now();
  return remaining > 0 ? remaining : null;
}

function setCooldown(number, key) {
  const p = getProfile(number);
  p.cooldowns[key] = Date.now();
  saveProfile(number, p);
}

function formatCooldown(ms) {
  const totalSec = Math.ceil(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const parts = [];
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (s || parts.length === 0) parts.push(`${s}s`);
  return parts.join(" ");
}

// --- Dinero ---
function formatCoins(n) {
  return `🪙 ${Math.round(n).toLocaleString("es-CL")}`;
}

// --- Niveles ---
// Tabla de rangos por XP acumulada. El nivel de un usuario es el rango más
// alto cuyo xpRequired ya alcanzó.
//
// 200 niveles temáticos de "carrera empresarial" repartidos en 13 tramos
// (tiers) de duración DESIGUAL — no todos los tramos tienen la misma
// cantidad de sub-niveles, así que el ritmo de progreso cambia de tramo en
// tramo (los primeros son más cortos, los últimos son maratónicos).
// La XP necesaria crece de forma mucho más empinada que antes para que
// llegar a los niveles altos sea un objetivo de largo plazo real.
const RANK_TIER_DEFS = [
  { name: "Vendedor Ambulante", levels: 8 },
  { name: "Comerciante de Barrio", levels: 10 },
  { name: "Dueño de Tienda", levels: 10 },
  { name: "Emprendedor", levels: 12 },
  { name: "Empresario", levels: 12 },
  { name: "Ejecutivo Corporativo", levels: 14 },
  { name: "Director de Empresa", levels: 14 },
  { name: "CEO", levels: 16 },
  { name: "Magnate de los Negocios", levels: 18 },
  { name: "Emperador Empresarial", levels: 20 }, // tier 10 — el mismo tope que usan los negocios de .negocio
  { name: "Inversionista Global", levels: 16 },
  { name: "Titán de la Industria", levels: 20 },
  { name: "Leyenda Empresarial", levels: 30 },
];
const RANK_TIERS = RANK_TIER_DEFS.map((t) => t.name);

// Convierte un entero a numeral romano (soporta los niveles necesarios, hasta 30+).
function toRoman(num) {
  const table = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
    [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  let result = "";
  let n = num;
  for (const [value, symbol] of table) {
    while (n >= value) {
      result += symbol;
      n -= value;
    }
  }
  return result;
}

function buildRanks() {
  const ranks = [];
  const bounds = [];
  let level = 1;
  RANK_TIER_DEFS.forEach((tierDef, tierIdx) => {
    const firstLevel = level;
    for (let sub = 1; sub <= tierDef.levels; sub++) {
      const name = `${tierDef.name} ${toRoman(sub)}`;
      // Curva exponencial mucho más empinada que la versión anterior:
      // nivel 1 = 0 XP, nivel 200 ronda ~23.000.000 XP.
      const xpRequired = level === 1 ? 0 : Math.round(40 * Math.pow(level, 2.5));
      ranks.push({ level, name, xpRequired, tier: tierIdx + 1 });
      level++;
    }
    const lastLevel = level - 1;
    bounds.push({
      tier: tierIdx + 1,
      name: tierDef.name,
      firstLevel,
      lastLevel,
      firstXp: ranks[firstLevel - 1].xpRequired,
      lastXp: ranks[lastLevel - 1].xpRequired,
    });
  });
  return { ranks, bounds };
}

const { ranks: RANKS, bounds: RANK_TIER_BOUNDS } = buildRanks();

// --- Negocios (.negocio) ---
// Cada negocio pertenece a un tramo de nivel (tier 1-10, ver RANK_TIERS) y
// requiere haber alcanzado ese tramo para poder comprarlo. Comprarlo cuesta
// dinero de una vez; después genera ingresos pasivos que hay que ir a cobrar
// cada cierto tiempo con ".negocio cobrar" (no se acumulan indefinidamente).
const BUSINESS_COLLECT_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4 horas
const BUSINESSES = [
  { id: "puesto", name: "Puesto ambulante", tier: 1, cost: 400, income: 90 },
  { id: "kiosco", name: "Kiosco de barrio", tier: 2, cost: 1200, income: 220 },
  { id: "tienda", name: "Tienda de abarrotes", tier: 3, cost: 3000, income: 480 },
  { id: "foodtruck", name: "Food truck", tier: 4, cost: 7000, income: 950 },
  { id: "restaurante", name: "Restaurante", tier: 5, cost: 15000, income: 1900 },
  { id: "gimnasio", name: "Gimnasio", tier: 6, cost: 32000, income: 3800 },
  { id: "agencia", name: "Agencia de marketing", tier: 7, cost: 65000, income: 7200 },
  { id: "fabrica", name: "Fábrica", tier: 8, cost: 130000, income: 13500 },
  { id: "cadena", name: "Cadena de tiendas", tier: 9, cost: 260000, income: 24000 },
  { id: "corporacion", name: "Corporación multinacional", tier: 10, cost: 500000, income: 42000 },
];

function getBusiness(id) {
  return BUSINESSES.find((b) => b.id === id) || null;
}

function getLevelInfo(xp) {
  let current = RANKS[0];
  let next = RANKS[1] || null;
  for (let i = 0; i < RANKS.length; i++) {
    if (xp >= RANKS[i].xpRequired) {
      current = RANKS[i];
      next = RANKS[i + 1] || null;
    }
  }
  const xpIntoLevel = xp - current.xpRequired;
  const xpForNext = next ? next.xpRequired - current.xpRequired : null;
  return {
    level: current.level,
    name: current.name,
    tier: current.tier,
    xp,
    xpIntoLevel,
    xpForNext,
    nextName: next ? next.name : null,
    isMax: !next,
  };
}

// --- Rankings (globales, entre todos los usuarios que hayan usado el bot) ---
function topByWallet(limit = 10) {
  const all = getAll();
  return Object.entries(all)
    .map(([number, p]) => ({ number, total: p.wallet + p.bank, name: p.name }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

function topByXp(limit = 10) {
  const all = getAll();
  return Object.entries(all)
    .map(([number, p]) => ({ number, xp: p.xp, name: p.name }))
    .sort((a, b) => b.xp - a.xp)
    .slice(0, limit);
}

module.exports = {
  getProfile,
  saveProfile,
  addWallet,
  addXp,
  checkCooldown,
  setCooldown,
  formatCooldown,
  formatCoins,
  getLevelInfo,
  topByWallet,
  topByXp,
  RANKS,
  RANK_TIERS,
  RANK_TIER_BOUNDS,
  BUSINESSES,
  BUSINESS_COLLECT_COOLDOWN_MS,
  getBusiness,
};
