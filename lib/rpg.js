// ═════════════════════════════════════════════════════════════════════════
// lib/rpg.js
// Motor del sistema RPG "Elyndor". Toda la lógica de juego (perfiles,
// combate, inventario, mazmorras, mercado, subastas, gremios y misiones)
// vive acá. commands/rpg.js solo arma los mensajes bonitos y llama a estas
// funciones. Los datos estáticos (razas, clases, items, etc.) están en
// lib/rpgData.js.
//
// Persistencia: reutiliza lib/db.js (mismo patrón que el resto del bot).
// Archivos que este módulo puede crear en data/:
//   rpg.json          -> perfiles de personaje por número
//   rpgMarket.json     -> mercado global (ventas directas)
//   rpgAuctions.json   -> subastas activas
//   rpgGuilds.json      -> gremios/clanes
//   rpgEnabledChats.json -> lista de chats con .rpgon activado (toggle list)
// ═════════════════════════════════════════════════════════════════════════

const { load, save, createToggleList } = require("./db");
const data = require("./rpgData");

const PROFILES_FILE = "rpg";
const MARKET_FILE = "rpgMarket";
const AUCTIONS_FILE = "rpgAuctions";
const GUILDS_FILE = "rpgGuilds";

// Chats (grupos o DMs) donde el sistema RPG está activado con .rpgon
const enabledChats = createToggleList("rpgEnabledChats");

const MAX_LEVEL = 40;
const DEATH_GOLD_LOSS_PCT = 0.15; // % de oro (billetera rpg) que se pierde al morir
const RESURRECT_BASE_COST = 25; // costo base por nivel para revivir

// ─────────────────────────────────────────────────────────────
// Persistencia de perfiles
// ─────────────────────────────────────────────────────────────

function getAll() {
  return load(PROFILES_FILE, {});
}

function persistAll(all) {
  save(PROFILES_FILE, all);
}

function hasCharacter(number) {
  const all = getAll();
  return !!all[number];
}

function getProfile(number) {
  const all = getAll();
  return all[number] || null;
}

function saveProfile(number, profile) {
  const all = getAll();
  all[number] = profile;
  persistAll(all);
  return profile;
}

function xpThreshold(level) {
  // Umbral de XP TOTAL necesaria para alcanzar `level`.
  if (level <= 1) return 0;
  return Math.floor(45 * level * level + 55 * level);
}

function baseAttrs() {
  const obj = {};
  for (const a of data.ATTRS) obj[a] = 8;
  return obj;
}

function createCharacter(number, displayName, raceKey, classKey) {
  const race = data.RACES[raceKey];
  const cls = data.CLASSES[classKey];
  if (!race || !cls) return null;
  if (cls.tier !== "inicial") return null; // las avanzadas no se eligen al crear

  const attrs = baseAttrs();
  for (const a of data.ATTRS) {
    attrs[a] += race.bonus[a] || 0;
    attrs[a] += cls.baseAttrs[a] || 0;
  }

  const profile = {
    name: displayName || `+${number}`,
    race: raceKey,
    class: classKey,
    level: 1,
    xp: 0,
    freePoints: 0,
    attrs,
    hpCurrent: null, // se setea abajo con el máximo calculado
    manaCurrent: null,
    gold: 150,
    inventory: [
      { id: "espada_oxidada", qty: 1 },
      { id: "ropa_viajero", qty: 1 },
      { id: "pocion_menor", qty: 3 },
    ],
    equipment: { weapon: "espada_oxidada", armor: "ropa_viajero", accessory: null, relic: null },
    region: "capital",
    travelCooldownTs: 0,
    god: null,
    godFavor: {},
    alignment: "neutral",
    guild: null,
    reputation: {},
    quests: {
      daily: [],
      dailyResetTs: 0,
      weekly: [],
      weeklyResetTs: 0,
      epicCompleted: [],
    },
    stats: { pvpWins: 0, pvpLosses: 0, dungeonsCleared: 0, monstersKilled: 0, deaths: 0 },
    alive: true,
    cooldowns: {}, // { explorar, cazar, duelo, orar, dungeon:<id>, boss }
    visitedRegions: ["capital"],
    createdAt: Date.now(),
  };

  const derived = computeDerived(profile);
  profile.hpCurrent = derived.maxHp;
  profile.manaCurrent = derived.maxMana;

  saveProfile(number, profile);
  return profile;
}

function touchName(number, displayName) {
  const p = getProfile(number);
  if (p && displayName && p.name !== displayName) {
    p.name = displayName;
    saveProfile(number, p);
  }
  return p;
}

// ─────────────────────────────────────────────────────────────
// Stats derivados (atk/def/mag/crit/maxHp/maxMana) según raza+clase+attrs+equipo
// ─────────────────────────────────────────────────────────────

function itemStat(itemId, key) {
  const it = data.ITEMS[itemId];
  return it && it[key] ? it[key] : 0;
}

function computeDerived(profile) {
  const cls = data.CLASSES[profile.class] || data.CLASSES.guerrero;
  const race = data.RACES[profile.race] || data.RACES.humano;
  const a = profile.attrs;
  const eq = profile.equipment || {};

  let weaponAtk = itemStat(eq.weapon, "atk");
  let weaponMag = itemStat(eq.weapon, "mag");
  let weaponCrit = itemStat(eq.weapon, "crit");
  let armorDef = itemStat(eq.armor, "def");
  let accDef = itemStat(eq.accessory, "def") + itemStat(eq.relic, "def");
  let hpBonus = itemStat(eq.accessory, "hpBonus") + itemStat(eq.relic, "hpBonus");

  // allAttr de accesorios/reliquias se suma a todos los atributos para el cálculo
  const allAttrBonus =
    itemStat(eq.accessory, "allAttr") + itemStat(eq.relic, "allAttr") + itemStat(eq.weapon, "allAttr") + itemStat(eq.armor, "allAttr");

  const fue = a.fue + allAttrBonus;
  const des = a.des + allAttrBonus;
  const con = a.con + allAttrBonus;
  const int = a.int + allAttrBonus;
  const sab = a.sab + allAttrBonus;
  const car = a.car + allAttrBonus;

  const atk = Math.round(5 + fue * 2 + weaponAtk + profile.level * 1.1);
  const mag = Math.round(int * 2 + weaponMag + sab * 0.5);
  const def = Math.round(2 + con * 1.2 + armorDef + accDef);
  let crit = Math.round((5 + des * 0.5 + weaponCrit) * 10) / 10;
  if (race.passive && race.passive.startsWith("Ojo Certero")) crit += 5;

  let maxHp = Math.round((50 + con * 8 + profile.level * 12) * cls.hpMul) + hpBonus;
  let maxMana = Math.round((20 + int * 6 + profile.level * 4) * cls.manaMul);

  return { atk, def, mag, crit, maxHp, maxMana, fue, des, con, int, sab, car };
}

// ─────────────────────────────────────────────────────────────
// Experiencia y niveles
// ─────────────────────────────────────────────────────────────

function addXp(number, amount) {
  const p = getProfile(number);
  if (!p) return null;
  const race = data.RACES[p.race];
  let gained = amount;
  if (race && race.passive && race.passive.startsWith("Versatilidad")) gained = Math.round(gained * 1.05);
  if (p.god && data.GODS[p.god] && data.GODS[p.god].blessing.includes("XP")) gained = Math.round(gained * 1.1);

  p.xp += gained;
  let leveledUp = 0;
  while (p.level < MAX_LEVEL && p.xp >= xpThreshold(p.level + 1)) {
    p.level += 1;
    p.freePoints += 3;
    leveledUp += 1;
  }
  if (leveledUp > 0) {
    const derived = computeDerived(p);
    p.hpCurrent = derived.maxHp; // al subir de nivel, restablece vida/maná (recompensa)
    p.manaCurrent = derived.maxMana;
  }
  saveProfile(number, p);
  return { profile: p, gained, leveledUp };
}

function addGold(number, amount) {
  const p = getProfile(number);
  if (!p) return null;
  p.gold = Math.max(0, p.gold + amount);
  saveProfile(number, p);
  return p;
}

function assignAttrPoint(number, attrKey) {
  const p = getProfile(number);
  if (!p) return { ok: false, reason: "sin_personaje" };
  if (!data.ATTRS.includes(attrKey)) return { ok: false, reason: "atributo_invalido" };
  if (p.freePoints <= 0) return { ok: false, reason: "sin_puntos" };
  p.attrs[attrKey] += 1;
  p.freePoints -= 1;
  saveProfile(number, p);
  return { ok: true, profile: p };
}

// ─────────────────────────────────────────────────────────────
// Cooldowns (mismo patrón que lib/economy.js)
// ─────────────────────────────────────────────────────────────

function checkCooldown(profile, key, ms) {
  const last = profile.cooldowns[key];
  if (!last) return null;
  const remaining = last + ms - Date.now();
  return remaining > 0 ? remaining : null;
}

function setCooldown(number, key) {
  const p = getProfile(number);
  if (!p) return;
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

function formatGold(n) {
  return `⚜️ ${Math.round(n).toLocaleString("es-CL")} EC`;
}

// ─────────────────────────────────────────────────────────────
// Inventario
// ─────────────────────────────────────────────────────────────

const MAX_WEIGHT_BASE = 60;

function maxWeight(profile) {
  return MAX_WEIGHT_BASE + profile.attrs.con * 2 + profile.level;
}

function currentWeight(profile) {
  return profile.inventory.reduce((sum, stack) => {
    const it = data.ITEMS[stack.id];
    return sum + (it ? it.weight * stack.qty : 0);
  }, 0);
}

function findStack(profile, itemId) {
  return profile.inventory.find((s) => s.id === itemId);
}

function addItem(profile, itemId, qty = 1) {
  if (!data.ITEMS[itemId]) return false;
  const stack = findStack(profile, itemId);
  if (stack) stack.qty += qty;
  else profile.inventory.push({ id: itemId, qty });
  return true;
}

function removeItem(profile, itemId, qty = 1) {
  const stack = findStack(profile, itemId);
  if (!stack || stack.qty < qty) return false;
  stack.qty -= qty;
  if (stack.qty <= 0) profile.inventory = profile.inventory.filter((s) => s.id !== itemId);
  return true;
}

function equipItem(number, itemId) {
  const p = getProfile(number);
  if (!p) return { ok: false, reason: "sin_personaje" };
  const it = data.ITEMS[itemId];
  if (!it) return { ok: false, reason: "item_invalido" };
  if (!["weapon", "armor", "accessory", "relic"].includes(it.type)) return { ok: false, reason: "no_equipable" };
  const stack = findStack(p, itemId);
  if (!stack || stack.qty < 1) return { ok: false, reason: "no_en_inventario" };

  const slot = it.type;
  p.equipment[slot] = itemId;
  saveProfile(number, p);
  return { ok: true, profile: p, slot };
}

function unequipSlot(number, slot) {
  const p = getProfile(number);
  if (!p) return { ok: false, reason: "sin_personaje" };
  if (!["weapon", "armor", "accessory", "relic"].includes(slot)) return { ok: false, reason: "slot_invalido" };
  if (!p.equipment[slot]) return { ok: false, reason: "vacio" };
  p.equipment[slot] = null;
  saveProfile(number, p);
  return { ok: true, profile: p };
}

// ─────────────────────────────────────────────────────────────
// Combate genérico (PvE y PvP usan el mismo núcleo)
// ─────────────────────────────────────────────────────────────

function randRange(min, max) {
  return Math.random() * (max - min) + min;
}

// combatant esperado: { name, hp, maxHp, atk, def, mag, crit, statusImmune, isPlayerRace }
function makeCombatantFromMonster(monster) {
  return {
    name: `${monster.emoji} ${monster.name}`,
    hp: monster.hp,
    maxHp: monster.hp,
    atk: monster.atk,
    def: monster.def,
    mag: 0,
    crit: 5,
    statusChance: monster.statusChance || null,
    isMonster: true,
  };
}

function makeCombatantFromProfile(profile, label) {
  const d = computeDerived(profile);
  const race = data.RACES[profile.race];
  return {
    name: `${race.emoji} ${label || profile.name}`,
    hp: profile.hpCurrent,
    maxHp: d.maxHp,
    atk: Math.max(d.atk, d.mag), // usa el mayor entre físico y mágico como daño principal
    def: d.def,
    mag: d.mag,
    crit: d.crit,
    race: profile.race,
    isMonster: false,
  };
}

// Simula un combate por turnos completo y devuelve el log narrativo + resultado.
function runBattle(a, b, opts = {}) {
  const log = [];
  const maxRounds = opts.maxRounds || 25;
  let round = 1;
  let statusA = null; // { type, turns }
  let statusB = null;

  log.push(`⚔️ *${a.name}* (${Math.round(a.hp)} HP) vs *${b.name}* (${Math.round(b.hp)} HP)`);

  // El de mayor "crit" (proxy de velocidad/destreza) golpea primero.
  let attacker = a.crit >= b.crit ? a : b;
  let defender = attacker === a ? b : a;

  while (a.hp > 0 && b.hp > 0 && round <= maxRounds) {
    const atkStatus = attacker === a ? statusA : statusB;
    if (atkStatus && atkStatus.type === "aturdido" && atkStatus.turns > 0) {
      log.push(`😵 ${attacker.name} está aturdido y pierde el turno.`);
      atkStatus.turns -= 1;
    } else {
      let dmg = Math.max(1, Math.round((attacker.atk - defender.def * 0.5) * randRange(0.85, 1.15)));
      const isCrit = Math.random() * 100 < attacker.crit;
      if (isCrit) dmg = Math.round(dmg * 1.6);

      // Pasivas raciales simples
      if (attacker.race === "orco" && attacker.hp / attacker.maxHp < 0.3) dmg = Math.round(dmg * 1.1);
      if (defender.race === "enano") dmg = Math.round(dmg * 0.9);

      defender.hp -= dmg;
      log.push(
        `${isCrit ? "💥 ¡CRÍTICO! " : "🗡️ "}${attacker.name} golpea a ${defender.name} por *${dmg}* de daño.` +
          (defender.hp > 0 ? ` (${Math.max(0, Math.round(defender.hp))} HP restante)` : "")
      );

      // Estados alterados que puede infligir un monstruo
      if (attacker.statusChance) {
        const roll = Math.random();
        if (attacker.statusChance.poison && roll < attacker.statusChance.poison) {
          const s = { type: "envenenado", turns: 3 };
          if (defender === a) statusA = s;
          else statusB = s;
          log.push(`🤢 ${defender.name} queda *envenenado*.`);
        } else if (attacker.statusChance.stun && roll < attacker.statusChance.stun) {
          const s = { type: "aturdido", turns: 1 };
          if (defender === a) statusA = s;
          else statusB = s;
          log.push(`😵 ${defender.name} queda *aturdido*.`);
        } else if (attacker.statusChance.bleed && roll < attacker.statusChance.bleed) {
          const s = { type: "sangrado", turns: 3 };
          if (defender === a) statusA = s;
          else statusB = s;
          log.push(`🩸 ${defender.name} queda *sangrando*.`);
        }
      }
    }

    // Aplica veneno/sangrado de fin de turno
    for (const [combatant, status] of [
      [a, statusA],
      [b, statusB],
    ]) {
      if (status && (status.type === "envenenado" || status.type === "sangrado") && status.turns > 0) {
        const dot = Math.max(1, Math.round(combatant.maxHp * 0.04));
        combatant.hp -= dot;
        status.turns -= 1;
        log.push(`☠️ ${combatant.name} sufre *${dot}* de daño por ${status.type}.`);
      }
    }

    if (a.hp <= 0 || b.hp <= 0) break;

    // cambia el turno
    const tmp = attacker;
    attacker = defender;
    defender = tmp;
    round += 1;
  }

  const aWon = b.hp <= 0 && a.hp > 0;
  const bWon = a.hp <= 0 && b.hp > 0;
  const draw = !aWon && !bWon;

  if (aWon) log.push(`🏆 *${a.name}* gana el combate!`);
  else if (bWon) log.push(`🏆 *${b.name}* gana el combate!`);
  else log.push(`⏱️ El combate se extendió demasiado y terminó en empate.`);

  return { log, aWon, bWon, draw, finalHpA: Math.max(0, a.hp), finalHpB: Math.max(0, b.hp) };
}

// ─────────────────────────────────────────────────────────────
// Muerte y resurrección
// ─────────────────────────────────────────────────────────────

function applyDeath(number) {
  const p = getProfile(number);
  if (!p) return null;
  const goldLost = Math.round(p.gold * DEATH_GOLD_LOSS_PCT);
  p.gold -= goldLost;
  p.alive = false;
  p.hpCurrent = 0;
  p.stats.deaths += 1;
  saveProfile(number, p);
  return { profile: p, goldLost };
}

function resurrectCost(profile) {
  let cost = RESURRECT_BASE_COST * profile.level;
  if (profile.god === "drennok") cost = Math.round(cost * 0.75);
  return cost;
}

function resurrect(number) {
  const p = getProfile(number);
  if (!p) return { ok: false, reason: "sin_personaje" };
  if (p.alive) return { ok: false, reason: "ya_vivo" };
  const cost = resurrectCost(p);
  if (p.gold < cost) return { ok: false, reason: "sin_oro", cost };
  p.gold -= cost;
  p.alive = true;
  const d = computeDerived(p);
  p.hpCurrent = Math.round(d.maxHp * 0.5);
  p.manaCurrent = d.maxMana;
  saveProfile(number, p);
  return { ok: true, profile: p, cost };
}

function healToFull(number) {
  const p = getProfile(number);
  if (!p) return null;
  const d = computeDerived(p);
  p.hpCurrent = d.maxHp;
  p.manaCurrent = d.maxMana;
  saveProfile(number, p);
  return p;
}

// ─────────────────────────────────────────────────────────────
// Regiones / viajes
// ─────────────────────────────────────────────────────────────

const TRAVEL_COOLDOWN_MS = 15 * 60 * 1000;

function travel(number, regionKey) {
  const p = getProfile(number);
  if (!p) return { ok: false, reason: "sin_personaje" };
  const region = data.REGIONS[regionKey];
  if (!region) return { ok: false, reason: "region_invalida" };
  if (p.region === regionKey) return { ok: false, reason: "ya_ahi" };
  if (p.level < region.minLevel) return { ok: false, reason: "nivel_bajo", need: region.minLevel };

  let cd = TRAVEL_COOLDOWN_MS;
  if (p.god === "ozmentia") cd = Math.round(cd * 0.7);
  const remaining = checkCooldown(p, "viajar", cd);
  if (remaining) return { ok: false, reason: "cooldown", remaining };

  if (p.gold < region.travelCost) return { ok: false, reason: "sin_oro", need: region.travelCost };

  p.gold -= region.travelCost;
  p.region = regionKey;
  p.cooldowns.viajar = Date.now();
  if (!p.visitedRegions.includes(regionKey)) p.visitedRegions.push(regionKey);
  saveProfile(number, p);
  incrementQuestProgress(number, "travel", 1);
  return { ok: true, profile: p, region };
}

// ─────────────────────────────────────────────────────────────
// Reputación
// ─────────────────────────────────────────────────────────────

function addReputation(number, regionKey, amount) {
  const p = getProfile(number);
  if (!p) return null;
  p.reputation[regionKey] = (p.reputation[regionKey] || 0) + amount;
  saveProfile(number, p);
  return p.reputation[regionKey];
}

// ─────────────────────────────────────────────────────────────
// Misiones (diarias / semanales / épicas)
// ─────────────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

function pickRandom(arr, n) {
  const copy = [...arr];
  const out = [];
  while (out.length < n && copy.length > 0) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

function refreshQuests(number) {
  const p = getProfile(number);
  if (!p) return null;
  const now = Date.now();
  if (now >= p.quests.dailyResetTs) {
    const picks = pickRandom(data.DAILY_QUEST_POOL, 3);
    p.quests.daily = picks.map((q) => ({ ...q, progress: 0, done: false, claimed: false }));
    p.quests.dailyResetTs = now + DAY_MS;
  }
  if (now >= p.quests.weeklyResetTs) {
    const picks = pickRandom(data.WEEKLY_QUEST_POOL, 2);
    p.quests.weekly = picks.map((q) => ({ ...q, progress: 0, done: false, claimed: false }));
    p.quests.weeklyResetTs = now + WEEK_MS;
  }
  saveProfile(number, p);
  return p;
}

function incrementQuestProgress(number, type, amount = 1) {
  const p = getProfile(number);
  if (!p) return;
  let changed = false;
  for (const list of [p.quests.daily, p.quests.weekly]) {
    for (const q of list) {
      if (q.type === type && !q.done) {
        q.progress = Math.min(q.target, q.progress + amount);
        if (q.progress >= q.target) q.done = true;
        changed = true;
      }
    }
  }
  if (changed) saveProfile(number, p);
}

function claimQuest(number, questId) {
  const p = getProfile(number);
  if (!p) return { ok: false, reason: "sin_personaje" };
  let found = null;
  for (const list of [p.quests.daily, p.quests.weekly]) {
    const q = list.find((x) => x.id === questId && !x.claimed);
    if (q) {
      found = q;
      break;
    }
  }
  if (!found) return { ok: false, reason: "no_encontrada" };
  if (!found.done) return { ok: false, reason: "incompleta" };
  found.claimed = true;
  p.xp += found.xp;
  p.gold += found.gold;
  saveProfile(number, p);
  addXp(number, 0); // no-op para forzar guardado consistente si hiciera falta
  return { ok: true, profile: p, quest: found };
}

// ─────────────────────────────────────────────────────────────
// Mazmorras
// ─────────────────────────────────────────────────────────────

function runDungeon(number, dungeonKey) {
  const p = getProfile(number);
  if (!p) return { ok: false, reason: "sin_personaje" };
  const dungeon = data.DUNGEONS[dungeonKey];
  if (!dungeon) return { ok: false, reason: "invalida" };
  if (!p.alive) return { ok: false, reason: "muerto" };
  if (p.level < dungeon.minLevel) return { ok: false, reason: "nivel_bajo", need: dungeon.minLevel };

  const remaining = checkCooldown(p, `dungeon:${dungeonKey}`, dungeon.cooldownMs);
  if (remaining) return { ok: false, reason: "cooldown", remaining };

  const fullLog = [`🏰 Entrando a *${dungeon.emoji} ${dungeon.name}* (${dungeon.floors} pisos)...`];
  const combatant = makeCombatantFromProfile(p);
  let survived = true;
  let totalXp = 0;
  let totalGold = 0;

  for (let floor = 1; floor <= dungeon.floors && survived; floor++) {
    const pool = dungeon.monsterPool.map((id) => data.MONSTERS.find((m) => m.id === id)).filter(Boolean);
    const monster = pool[Math.floor(Math.random() * pool.length)];
    const monsterCombatant = makeCombatantFromMonster(monster);
    fullLog.push(`\n🚪 *Piso ${floor}/${dungeon.floors}*`);
    const result = runBattle(combatant, monsterCombatant);
    fullLog.push(...result.log);
    combatant.hp = result.finalHpA;

    if (!result.aWon) {
      survived = false;
      break;
    }
    totalXp += monster.xp;
    totalGold += monster.gold;
    // pequeño respiro entre pisos
    combatant.hp = Math.min(combatant.maxHp, combatant.hp + Math.round(combatant.maxHp * 0.12));
  }

  let bossResult = null;
  if (survived) {
    const bossCombatant = makeCombatantFromMonster(dungeon.boss);
    fullLog.push(`\n👑 *JEFE FINAL:* ${dungeon.boss.emoji} ${dungeon.boss.name}`);
    bossResult = runBattle(combatant, bossCombatant);
    fullLog.push(...bossResult.log);
    combatant.hp = bossResult.finalHpA;
    if (bossResult.aWon) {
      totalXp += dungeon.boss.xp;
      totalGold += dungeon.boss.gold;
    } else {
      survived = false;
    }
  }

  p.hpCurrent = Math.max(0, Math.round(combatant.hp));
  setCooldown(number, `dungeon:${dungeonKey}`);

  let droppedItem = null;
  if (survived) {
    p.stats.dungeonsCleared += 1;
    p.stats.monstersKilled += dungeon.floors + 1;
    if (Math.random() < 0.65) {
      droppedItem = dungeon.rewardPool[Math.floor(Math.random() * dungeon.rewardPool.length)];
      addItem(p, droppedItem, 1);
    }
    addReputation(number, dungeon.region, 5);
    incrementQuestProgress(number, "dungeon", 1);
  } else {
    fullLog.push(`\n💀 *${p.name}* cae derrotado dentro de la mazmorra...`);
  }

  saveProfile(number, p);
  let deathInfo = null;
  if (p.hpCurrent <= 0) {
    deathInfo = applyDeath(number);
  }

  const xpInfo = totalXp > 0 ? addXp(number, totalXp) : null;
  if (totalGold > 0) addGold(number, totalGold);

  return {
    ok: true,
    survived,
    log: fullLog,
    totalXp,
    totalGold,
    droppedItem,
    bossName: dungeon.boss.name,
    deathInfo,
    leveledUp: xpInfo ? xpInfo.leveledUp : 0,
  };
}

// ─────────────────────────────────────────────────────────────
// Mercado global (venta directa entre jugadores)
// ─────────────────────────────────────────────────────────────

function getMarket() {
  return load(MARKET_FILE, { nextId: 1, listings: [] });
}

function saveMarket(m) {
  save(MARKET_FILE, m);
}

function listItemOnMarket(number, itemId, qty, price) {
  const p = getProfile(number);
  if (!p) return { ok: false, reason: "sin_personaje" };
  if (!data.ITEMS[itemId]) return { ok: false, reason: "item_invalido" };
  if (!removeItem(p, itemId, qty)) return { ok: false, reason: "sin_stock" };
  saveProfile(number, p);

  const market = getMarket();
  const listing = { id: market.nextId++, seller: number, itemId, qty, price, ts: Date.now() };
  market.listings.push(listing);
  saveMarket(market);
  return { ok: true, listing };
}

function buyFromMarket(number, listingId) {
  const market = getMarket();
  const listing = market.listings.find((l) => l.id === listingId);
  if (!listing) return { ok: false, reason: "no_existe" };
  if (listing.seller === number) return { ok: false, reason: "propio" };

  const buyer = getProfile(number);
  if (!buyer) return { ok: false, reason: "sin_personaje" };
  if (buyer.gold < listing.price) return { ok: false, reason: "sin_oro" };

  buyer.gold -= listing.price;
  addItem(buyer, listing.itemId, listing.qty);
  saveProfile(number, buyer);

  const seller = getProfile(listing.seller);
  if (seller) {
    seller.gold += listing.price;
    saveProfile(listing.seller, seller);
  }

  market.listings = market.listings.filter((l) => l.id !== listingId);
  saveMarket(market);
  incrementQuestProgress(listing.seller, "marketSell", 1);
  return { ok: true, listing };
}

function cancelMarketListing(number, listingId) {
  const market = getMarket();
  const listing = market.listings.find((l) => l.id === listingId);
  if (!listing) return { ok: false, reason: "no_existe" };
  if (listing.seller !== number) return { ok: false, reason: "no_es_tuyo" };
  const p = getProfile(number);
  addItem(p, listing.itemId, listing.qty);
  saveProfile(number, p);
  market.listings = market.listings.filter((l) => l.id !== listingId);
  saveMarket(market);
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────
// Subastas
// ─────────────────────────────────────────────────────────────

function getAuctions() {
  return load(AUCTIONS_FILE, { nextId: 1, list: [] });
}

function saveAuctions(a) {
  save(AUCTIONS_FILE, a);
}

function createAuction(number, itemId, qty, startPrice, hours) {
  const p = getProfile(number);
  if (!p) return { ok: false, reason: "sin_personaje" };
  if (!data.ITEMS[itemId]) return { ok: false, reason: "item_invalido" };
  if (!removeItem(p, itemId, qty)) return { ok: false, reason: "sin_stock" };
  saveProfile(number, p);

  const auctions = getAuctions();
  const auction = {
    id: auctions.nextId++,
    seller: number,
    itemId,
    qty,
    currentBid: startPrice,
    bidder: null,
    endsAt: Date.now() + hours * 60 * 60 * 1000,
    closed: false,
  };
  auctions.list.push(auction);
  saveAuctions(auctions);
  return { ok: true, auction };
}

function bidAuction(number, auctionId, amount) {
  const auctions = getAuctions();
  const auction = auctions.list.find((a) => a.id === auctionId && !a.closed);
  if (!auction) return { ok: false, reason: "no_existe" };
  if (auction.endsAt < Date.now()) return { ok: false, reason: "finalizada" };
  if (auction.seller === number) return { ok: false, reason: "propio" };
  if (amount <= auction.currentBid) return { ok: false, reason: "puja_baja" };

  const bidder = getProfile(number);
  if (!bidder) return { ok: false, reason: "sin_personaje" };
  if (bidder.gold < amount) return { ok: false, reason: "sin_oro" };

  // Devuelve el oro al pujador anterior, si había
  if (auction.bidder) {
    const prev = getProfile(auction.bidder);
    if (prev) {
      prev.gold += auction.currentBid;
      saveProfile(auction.bidder, prev);
    }
  }

  bidder.gold -= amount;
  saveProfile(number, bidder);
  auction.currentBid = amount;
  auction.bidder = number;
  saveAuctions(auctions);
  return { ok: true, auction };
}

// Cierra subastas vencidas: entrega item al mejor postor u oro/item de vuelta al vendedor.
function settleExpiredAuctions() {
  const auctions = getAuctions();
  const now = Date.now();
  let changed = false;
  for (const auction of auctions.list) {
    if (auction.closed || auction.endsAt > now) continue;
    auction.closed = true;
    changed = true;
    if (auction.bidder) {
      const winner = getProfile(auction.bidder);
      if (winner) {
        addItem(winner, auction.itemId, auction.qty);
        saveProfile(auction.bidder, winner);
      }
      const seller = getProfile(auction.seller);
      if (seller) {
        seller.gold += auction.currentBid;
        saveProfile(auction.seller, seller);
      }
    } else {
      const seller = getProfile(auction.seller);
      if (seller) {
        addItem(seller, auction.itemId, auction.qty);
        saveProfile(auction.seller, seller);
      }
    }
  }
  if (changed) {
    auctions.list = auctions.list.filter((a) => !a.closed || now - a.endsAt < DAY_MS);
    saveAuctions(auctions);
  }
  return auctions;
}

// ─────────────────────────────────────────────────────────────
// Crafteo / forja
// ─────────────────────────────────────────────────────────────

function craftItem(number, recipeKey) {
  const p = getProfile(number);
  if (!p) return { ok: false, reason: "sin_personaje" };
  const recipe = data.RECIPES[recipeKey];
  if (!recipe) return { ok: false, reason: "invalida" };
  if (p.level < recipe.craftLevel) return { ok: false, reason: "nivel_bajo", need: recipe.craftLevel };

  let cost = recipe.gold;
  if (p.god === "thalgrim") cost = Math.round(cost * 0.85);
  if (p.gold < cost) return { ok: false, reason: "sin_oro", need: cost };

  for (const [matId, qty] of Object.entries(recipe.materials)) {
    const stack = findStack(p, matId);
    if (!stack || stack.qty < qty) return { ok: false, reason: "sin_materiales", missing: matId };
  }

  for (const [matId, qty] of Object.entries(recipe.materials)) removeItem(p, matId, qty);
  p.gold -= cost;
  addItem(p, recipe.result, recipe.qty);
  saveProfile(number, p);
  incrementQuestProgress(number, "craft", 1);
  return { ok: true, profile: p, recipe };
}

// ─────────────────────────────────────────────────────────────
// Gremios
// ─────────────────────────────────────────────────────────────

function getGuilds() {
  return load(GUILDS_FILE, {});
}

function saveGuilds(g) {
  save(GUILDS_FILE, g);
}

function createGuild(number, name) {
  const p = getProfile(number);
  if (!p) return { ok: false, reason: "sin_personaje" };
  if (p.guild) return { ok: false, reason: "ya_en_gremio" };
  const guilds = getGuilds();
  const key = name.toLowerCase().trim();
  if (guilds[key]) return { ok: false, reason: "nombre_tomado" };
  if (p.gold < 200) return { ok: false, reason: "sin_oro", need: 200 };

  p.gold -= 200;
  p.guild = key;
  saveProfile(number, p);

  guilds[key] = { name, owner: number, members: [number], createdAt: Date.now(), level: 1 };
  saveGuilds(guilds);
  return { ok: true, guild: guilds[key] };
}

function inviteToGuild(number, targetNumber) {
  const p = getProfile(number);
  if (!p || !p.guild) return { ok: false, reason: "sin_gremio" };
  const guilds = getGuilds();
  const guild = guilds[p.guild];
  if (!guild || guild.owner !== number) return { ok: false, reason: "no_lider" };
  const target = getProfile(targetNumber);
  if (!target) return { ok: false, reason: "objetivo_sin_personaje" };
  if (target.guild) return { ok: false, reason: "objetivo_ya_en_gremio" };
  if (guild.members.length >= 20) return { ok: false, reason: "gremio_lleno" };

  guild.members.push(targetNumber);
  target.guild = p.guild;
  saveGuilds(guilds);
  saveProfile(targetNumber, target);
  return { ok: true, guild };
}

function leaveGuild(number) {
  const p = getProfile(number);
  if (!p || !p.guild) return { ok: false, reason: "sin_gremio" };
  const guilds = getGuilds();
  const guild = guilds[p.guild];
  if (guild) {
    guild.members = guild.members.filter((m) => m !== number);
    if (guild.owner === number) {
      if (guild.members.length > 0) guild.owner = guild.members[0];
      else delete guilds[p.guild];
    }
    saveGuilds(guilds);
  }
  p.guild = null;
  saveProfile(number, p);
  return { ok: true };
}

function guildRanking(limit = 10) {
  const guilds = getGuilds();
  return Object.entries(guilds)
    .map(([key, g]) => ({ key, ...g, memberCount: g.members.length }))
    .sort((a, b) => b.memberCount - a.memberCount)
    .slice(0, limit);
}

// ─────────────────────────────────────────────────────────────
// Rankings
// ─────────────────────────────────────────────────────────────

function rankingByLevel(limit = 10) {
  const all = getAll();
  return Object.entries(all)
    .map(([number, p]) => ({ number, name: p.name, level: p.level, xp: p.xp }))
    .sort((a, b) => b.xp - a.xp)
    .slice(0, limit);
}

function rankingByGold(limit = 10) {
  const all = getAll();
  return Object.entries(all)
    .map(([number, p]) => ({ number, name: p.name, gold: p.gold }))
    .sort((a, b) => b.gold - a.gold)
    .slice(0, limit);
}

function rankingByPvp(limit = 10) {
  const all = getAll();
  return Object.entries(all)
    .map(([number, p]) => ({ number, name: p.name, wins: p.stats.pvpWins, losses: p.stats.pvpLosses }))
    .sort((a, b) => b.wins - a.wins)
    .slice(0, limit);
}

module.exports = {
  // toggle chats
  enabledChats,
  // perfiles
  hasCharacter,
  getProfile,
  saveProfile,
  createCharacter,
  touchName,
  computeDerived,
  xpThreshold,
  addXp,
  addGold,
  assignAttrPoint,
  MAX_LEVEL,
  // cooldowns
  checkCooldown,
  setCooldown,
  formatCooldown,
  formatGold,
  // inventario
  maxWeight,
  currentWeight,
  findStack,
  addItem,
  removeItem,
  equipItem,
  unequipSlot,
  // combate
  makeCombatantFromMonster,
  makeCombatantFromProfile,
  runBattle,
  // muerte
  applyDeath,
  resurrectCost,
  resurrect,
  healToFull,
  // regiones
  travel,
  addReputation,
  // misiones
  refreshQuests,
  incrementQuestProgress,
  claimQuest,
  // mazmorras
  runDungeon,
  // mercado
  getMarket,
  listItemOnMarket,
  buyFromMarket,
  cancelMarketListing,
  // subastas
  getAuctions,
  createAuction,
  bidAuction,
  settleExpiredAuctions,
  // crafteo
  craftItem,
  // gremios
  getGuilds,
  createGuild,
  inviteToGuild,
  leaveGuild,
  guildRanking,
  // rankings
  rankingByLevel,
  rankingByGold,
  rankingByPvp,
};
