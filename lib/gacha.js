const { load, save } = require("./db");
const basePool = require("./characterPool");

// ─────────────────────────────────────────────────────────────
// Archivos de datos
//   data/gachaCustomChars.json  -> personajes creados por el owner con .newchar
//   data/gachaClaims.json       -> instancias de personajes que la gente posee
//   data/gachaMarket.json       -> publicaciones activas en .wshop
//   data/gachaProfiles.json     -> cooldowns de .rw / .clain / .votar por número
// ─────────────────────────────────────────────────────────────

const CUSTOM_FILE = "gachaCustomChars";
const CLAIMS_FILE = "gachaClaims";
const MARKET_FILE = "gachaMarket";
const PROFILES_FILE = "gachaProfiles";
const IMAGES_FILE = "gachaCharImages"; // -> { [charId]: "https://..." } fotos asignadas con .setimg

// Roll y trade "pendientes" son de corta duración (minutos) y no necesitan
// sobrevivir un reinicio del bot, así que viven solo en memoria.
const pendingRolls = new Map(); // chatJid -> { charId, name, rolledBy, expiresAt }
const pendingTrades = new Map(); // targetNumber -> { fromNumber, myInstanceId, theirInstanceId, createdAt }

const RARITY_ORDER = ["comun", "rara", "epica", "legendaria", "mitica"];

const RARITY_WEIGHTS = {
  comun: 45,
  rara: 30,
  epica: 15,
  legendaria: 8,
  mitica: 2,
};

const TIERS = {
  comun: { label: "Común", stars: 1, statMin: 20, statMax: 45, valMin: 50, valMax: 120 },
  rara: { label: "Rara", stars: 2, statMin: 40, statMax: 65, valMin: 150, valMax: 350 },
  epica: { label: "Épica", stars: 3, statMin: 60, statMax: 80, valMin: 400, valMax: 800 },
  legendaria: { label: "Legendaria", stars: 4, statMin: 75, statMax: 92, valMin: 1000, valMax: 1800 },
  mitica: { label: "Mítica", stars: 5, statMin: 88, statMax: 99, valMin: 2500, valMax: 4000 },
};

// Sistema de "pity": si llevas muchas tiradas sin sacar algo bueno, la siguiente
// tirada te garantiza al menos esa rareza. Se resetea al sacar (o superar) esa rareza.
const PITY_LEGENDARY_THRESHOLD = 30; // tiradas sin legendaria+ -> garantizada
const PITY_MITICA_THRESHOLD = 100; // tiradas sin mítica -> garantizada

const RW_COOLDOWN_MS = 3 * 60 * 1000; // 3 min entre tiradas
const CLAIM_COOLDOWN_MS = 40 * 60 * 1000; // 40 min entre reclamos exitosos
const VOTE_COOLDOWN_MS = 12 * 60 * 60 * 1000; // 12h por personaje votado
const ROLL_EXPIRES_MS = 90 * 1000; // 90s para reclamar una tirada

// ─────────────────────────────────────────────────────────────
// Pool de personajes (base + custom)
// ─────────────────────────────────────────────────────────────

function getCustomChars() {
  return load(CUSTOM_FILE, []);
}

function saveCustomChars(list) {
  save(CUSTOM_FILE, list);
}

function getPool() {
  return [...basePool, ...getCustomChars()];
}

// ─────────────────────────────────────────────────────────────
// Fotos de personaje (overlay independiente del pool base/custom,
// así .setimg funciona igual para personajes base y creados con .newchar)
// ─────────────────────────────────────────────────────────────

function getCharImages() {
  return load(IMAGES_FILE, {});
}

function saveCharImages(map) {
  save(IMAGES_FILE, map);
}

function getCharacterImage(charId) {
  const images = getCharImages();
  return images[charId] || null;
}

function setCharacterImage(charId, url) {
  const images = getCharImages();
  images[charId] = url;
  saveCharImages(images);
}

function removeCharacterImage(charId) {
  const images = getCharImages();
  if (!(charId in images)) return false;
  delete images[charId];
  saveCharImages(images);
  return true;
}

function getCharacterById(charId) {
  const found = getPool().find((c) => c.id === charId);
  if (!found) return null;
  // La imagen puede venir del overlay (.setimg) o venir ya incluida en el
  // personaje custom (.newchar con imagen); el overlay tiene prioridad.
  const image = getCharacterImage(charId) || found.image || null;
  return { ...found, image };
}

// Resuelve un ID escrito por el usuario, sea el ID único de una ficha
// reclamada (el mismo que se muestra en .harem) o el ID de personaje del
// pool (ej: c001, c051x, usado para ver personajes que nadie ha reclamado
// todavía). Devuelve { character, instance, owner } o null.
//   - instance/owner vienen rellenos solo si el ID era de una ficha reclamada.
function findAnyById(rawId) {
  if (!rawId) return null;

  if (/^[A-Za-z0-9]{6}$/.test(rawId)) {
    const found = findInstanceAnywhere(rawId);
    if (found) {
      const character = getCharacterById(found.instance.charId);
      if (character) return { character, instance: found.instance, owner: found.owner };
    }
  }

  const character = getCharacterById(rawId.toLowerCase());
  if (character) return { character, instance: null, owner: null };

  return null;
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Elige un personaje al azar de todo el pool, respetando los pesos por rareza.
function weightedRandomCharacter() {
  const pool = getPool();
  const byRarity = {};
  for (const c of pool) {
    (byRarity[c.rarityKey] = byRarity[c.rarityKey] || []).push(c);
  }

  const available = RARITY_ORDER.filter((r) => byRarity[r] && byRarity[r].length > 0);
  const totalWeight = available.reduce((sum, r) => sum + RARITY_WEIGHTS[r], 0);
  let roll = Math.random() * totalWeight;

  for (const r of available) {
    roll -= RARITY_WEIGHTS[r];
    if (roll <= 0) {
      const list = byRarity[r];
      return list[randInt(0, list.length - 1)];
    }
  }
  // Fallback improbable
  return pool[randInt(0, pool.length - 1)];
}

// Igual que weightedRandomCharacter, pero restringido a una lista de rarezas
// (usado por el sistema de pity para forzar legendaria+ o mítica).
function weightedRandomCharacterFromRarities(allowedRarities) {
  const pool = getPool().filter((c) => allowedRarities.includes(c.rarityKey));
  if (pool.length === 0) return weightedRandomCharacter();

  const byRarity = {};
  for (const c of pool) {
    (byRarity[c.rarityKey] = byRarity[c.rarityKey] || []).push(c);
  }

  const available = RARITY_ORDER.filter((r) => byRarity[r] && byRarity[r].length > 0);
  const totalWeight = available.reduce((sum, r) => sum + RARITY_WEIGHTS[r], 0);
  let roll = Math.random() * totalWeight;

  for (const r of available) {
    roll -= RARITY_WEIGHTS[r];
    if (roll <= 0) {
      const list = byRarity[r];
      return list[randInt(0, list.length - 1)];
    }
  }
  return pool[randInt(0, pool.length - 1)];
}

// Tirada de .rw con sistema de pity aplicado. Lleva la cuenta de tiradas
// consecutivas sin legendaria+ / mítica por número y fuerza esa rareza si
// se alcanza el umbral. Devuelve { character, pityTriggered, pity }.
function rollWithPity(number) {
  const all = getProfiles();
  if (!all[number]) all[number] = { cooldowns: {}, votes: {} };
  const profile = all[number];
  profile.pity = profile.pity || { legendary: 0, mitica: 0 };

  let pityTriggered = null;
  let character;

  if (profile.pity.mitica + 1 >= PITY_MITICA_THRESHOLD) {
    character = weightedRandomCharacterFromRarities(["mitica"]);
    pityTriggered = "mitica";
  } else if (profile.pity.legendary + 1 >= PITY_LEGENDARY_THRESHOLD) {
    character = weightedRandomCharacterFromRarities(["legendaria", "mitica"]);
    pityTriggered = "legendaria";
  } else {
    character = weightedRandomCharacter();
  }

  if (character.rarityKey === "mitica") {
    profile.pity.legendary = 0;
    profile.pity.mitica = 0;
  } else if (character.rarityKey === "legendaria") {
    profile.pity.legendary = 0;
    profile.pity.mitica += 1;
  } else {
    profile.pity.legendary += 1;
    profile.pity.mitica += 1;
  }

  saveProfiles(all);
  return { character, pityTriggered, pity: profile.pity };
}

// Crea un personaje nuevo para el pool (usado por .newchar). Genera stats
// e ID automáticamente según la rareza elegida.
function createCharacter({ name, series, gender, rarityKey, image = null }) {
  const tier = TIERS[rarityKey];
  const pool = getPool();
  const nextNum = pool.length + 1;
  const id = "c" + String(nextNum).padStart(3, "0") + "x"; // sufijo 'x' = personaje custom, evita choques de ID

  const character = {
    id,
    name,
    series,
    gender,
    rarityKey,
    rarity: tier.label,
    stars: tier.stars,
    stats: {
      poder: randInt(tier.statMin, tier.statMax),
      defensa: randInt(tier.statMin, tier.statMax),
      velocidad: randInt(tier.statMin, tier.statMax),
      carisma: randInt(tier.statMin, tier.statMax),
    },
    baseValue: randInt(tier.valMin, tier.valMax),
    image: image || null,
  };

  const custom = getCustomChars();
  custom.push(character);
  saveCustomChars(custom);
  return character;
}

function isValidRarityKey(key) {
  return RARITY_ORDER.includes(key);
}

// ─────────────────────────────────────────────────────────────
// Perfiles (cooldowns por número)
// ─────────────────────────────────────────────────────────────

function getProfiles() {
  return load(PROFILES_FILE, {});
}

function saveProfiles(all) {
  save(PROFILES_FILE, all);
}

function getProfile(number) {
  const all = getProfiles();
  if (!all[number]) {
    all[number] = { cooldowns: {}, votes: {} }; // votes: { [instanceId]: timestamp }
    saveProfiles(all);
  }
  all[number].cooldowns = all[number].cooldowns || {};
  all[number].votes = all[number].votes || {};
  all[number].pity = all[number].pity || { legendary: 0, mitica: 0 };
  return all[number];
}

function checkCooldown(profile, key, ms) {
  const last = profile.cooldowns[key];
  if (!last) return null;
  const remaining = last + ms - Date.now();
  return remaining > 0 ? remaining : null;
}

function setCooldown(number, key) {
  const all = getProfiles();
  if (!all[number]) all[number] = { cooldowns: {}, votes: {} };
  all[number].cooldowns[key] = Date.now();
  saveProfiles(all);
}

function formatCooldown(ms) {
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m <= 0) return `${s}s`;
  return `${m}m ${s}s`;
}

// ─────────────────────────────────────────────────────────────
// Instancias reclamadas (lo que la gente posee)
// ─────────────────────────────────────────────────────────────

function getAllClaims() {
  return load(CLAIMS_FILE, {}); // { [number]: [instance, ...] }
}

function saveAllClaims(all) {
  save(CLAIMS_FILE, all);
}

function getOwnedInstances(number) {
  const all = getAllClaims();
  return all[number] || [];
}

function genInstanceId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

// Da un personaje nuevo (recién sacado de .rw) a un usuario.
function grantCharacter(number, charId) {
  const all = getAllClaims();
  if (!all[number]) all[number] = [];
  const instance = {
    instanceId: genInstanceId(),
    charId,
    obtainedAt: Date.now(),
    votes: 0,
  };
  all[number].push(instance);
  saveAllClaims(all);
  return instance;
}

// Busca una instancia por su ID corto, sin importar quién sea el dueño.
// Devuelve { owner, instance } o null.
function findInstanceAnywhere(instanceId) {
  const all = getAllClaims();
  for (const owner of Object.keys(all)) {
    const inst = all[owner].find((i) => i.instanceId === instanceId.toUpperCase());
    if (inst) return { owner, instance: inst };
  }
  return null;
}

function findOwnedInstance(number, instanceId) {
  const list = getOwnedInstances(number);
  return list.find((i) => i.instanceId === instanceId.toUpperCase()) || null;
}

function removeInstance(number, instanceId) {
  const all = getAllClaims();
  if (!all[number]) return false;
  const before = all[number].length;
  all[number] = all[number].filter((i) => i.instanceId !== instanceId.toUpperCase());
  saveAllClaims(all);
  return all[number].length < before;
}

// Cambia de dueño una instancia (sin tocar dinero: usado por regalos/trades/ventas)
function transferInstance(fromNumber, toNumber, instanceId) {
  const all = getAllClaims();
  const fromList = all[fromNumber] || [];
  const idx = fromList.findIndex((i) => i.instanceId === instanceId.toUpperCase());
  if (idx === -1) return false;

  const [instance] = fromList.splice(idx, 1);
  all[fromNumber] = fromList;
  if (!all[toNumber]) all[toNumber] = [];
  all[toNumber].push(instance);
  saveAllClaims(all);
  return true;
}

function transferAll(fromNumber, toNumber) {
  const all = getAllClaims();
  const fromList = all[fromNumber] || [];
  if (fromList.length === 0) return 0;
  if (!all[toNumber]) all[toNumber] = [];
  all[toNumber].push(...fromList);
  all[fromNumber] = [];
  saveAllClaims(all);
  return fromList.length;
}

// Valor actual de una instancia: valor base del personaje + bonus por votos (2% c/u)
function instanceValue(instance, character) {
  const base = character ? character.baseValue : 0;
  const votes = instance.votes || 0;
  return Math.round(base * (1 + votes * 0.02));
}

// ─────────────────────────────────────────────────────────────
// Votos
// ─────────────────────────────────────────────────────────────

function addVote(number, instanceOwner, instanceId) {
  const all = getAllClaims();
  const list = all[instanceOwner] || [];
  const inst = list.find((i) => i.instanceId === instanceId.toUpperCase());
  if (!inst) return null;
  inst.votes = (inst.votes || 0) + 1;
  saveAllClaims(all);

  const profile = getProfile(number);
  profile.votes[instanceId.toUpperCase()] = Date.now();
  const allProfiles = getProfiles();
  allProfiles[number] = profile;
  saveProfiles(allProfiles);

  return inst;
}

function lastVoteFor(number, instanceId) {
  const profile = getProfile(number);
  return profile.votes[instanceId.toUpperCase()] || null;
}

// ─────────────────────────────────────────────────────────────
// Mercado (.sell / .wshop / .buyc)
// ─────────────────────────────────────────────────────────────

function getMarket() {
  return load(MARKET_FILE, []);
}

function saveMarket(list) {
  save(MARKET_FILE, list);
}

function isListed(instanceId) {
  return getMarket().some((l) => l.instanceId === instanceId.toUpperCase());
}

function createListing(sellerNumber, instanceId, price) {
  const market = getMarket();
  const listing = {
    listingId: genInstanceId(),
    instanceId: instanceId.toUpperCase(),
    sellerNumber,
    price,
    listedAt: Date.now(),
  };
  market.push(listing);
  saveMarket(market);
  return listing;
}

function findListing(listingId) {
  return getMarket().find((l) => l.listingId === listingId.toUpperCase()) || null;
}

function removeListing(listingId) {
  const market = getMarket();
  const next = market.filter((l) => l.listingId !== listingId.toUpperCase());
  saveMarket(next);
  return next.length < market.length;
}

// ─────────────────────────────────────────────────────────────
// Tiradas pendientes (.rw -> .clain)
// ─────────────────────────────────────────────────────────────

function setPendingRoll(chatJid, data) {
  pendingRolls.set(chatJid, data);
}

function getPendingRoll(chatJid) {
  const roll = pendingRolls.get(chatJid);
  if (!roll) return null;
  if (Date.now() > roll.expiresAt) {
    pendingRolls.delete(chatJid);
    return null;
  }
  return roll;
}

function clearPendingRoll(chatJid) {
  pendingRolls.delete(chatJid);
}

// ─────────────────────────────────────────────────────────────
// Intercambios pendientes (.trade)
// ─────────────────────────────────────────────────────────────

function setPendingTrade(targetNumber, data) {
  pendingTrades.set(targetNumber, data);
}

function getPendingTrade(targetNumber) {
  return pendingTrades.get(targetNumber) || null;
}

function clearPendingTrade(targetNumber) {
  pendingTrades.delete(targetNumber);
}

// ─────────────────────────────────────────────────────────────
// Formato de texto reutilizable
// ─────────────────────────────────────────────────────────────

function starBar(stars) {
  return "⭐".repeat(stars) + "▫️".repeat(5 - stars);
}

function rarityEmoji(rarityKey) {
  return (
    {
      comun: "⚪",
      rara: "🔵",
      epica: "🟣",
      legendaria: "🟠",
      mitica: "🔴",
    }[rarityKey] || "⚪"
  );
}

function genderLabel(gender) {
  return gender === "waifu" ? "Waifu 💠" : "Husband 🔷";
}

function formatCoinsPlain(n) {
  return `🪙 ${Math.round(n).toLocaleString("es-CL")}`;
}

function statsBlock(stats) {
  return (
    `⚔️ Poder: ${stats.poder}   🛡️ Defensa: ${stats.defensa}\n` +
    `💨 Velocidad: ${stats.velocidad}   💘 Carisma: ${stats.carisma}`
  );
}

module.exports = {
  RARITY_ORDER,
  TIERS,
  RW_COOLDOWN_MS,
  CLAIM_COOLDOWN_MS,
  VOTE_COOLDOWN_MS,
  ROLL_EXPIRES_MS,

  PITY_LEGENDARY_THRESHOLD,
  PITY_MITICA_THRESHOLD,

  getPool,
  getCharacterById,
  findAnyById,
  getCharacterImage,
  setCharacterImage,
  removeCharacterImage,
  weightedRandomCharacter,
  weightedRandomCharacterFromRarities,
  rollWithPity,
  createCharacter,
  isValidRarityKey,

  getProfile,
  checkCooldown,
  setCooldown,
  formatCooldown,

  getOwnedInstances,
  getAllClaims,
  grantCharacter,
  findInstanceAnywhere,
  findOwnedInstance,
  removeInstance,
  transferInstance,
  transferAll,
  instanceValue,

  addVote,
  lastVoteFor,

  getMarket,
  isListed,
  createListing,
  findListing,
  removeListing,

  setPendingRoll,
  getPendingRoll,
  clearPendingRoll,

  setPendingTrade,
  getPendingTrade,
  clearPendingTrade,

  starBar,
  rarityEmoji,
  genderLabel,
  formatCoinsPlain,
  statsBlock,
};
