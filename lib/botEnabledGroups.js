// ═════════════════════════════════════════════════════════════════════════
// lib/botEnabledGroups.js
// Lista de grupos donde el bot está ACTIVADO. Por defecto el bot NO
// funciona en ningún grupo nuevo: hay que activarlo explícitamente con
// .onbot. .offbot lo saca de esta lista. Mismo patrón de almacenamiento
// que lib/rpgEnabledGroups.js, pero sin invertir (acá se guarda quién
// está ON, no quién está OFF, porque el default es apagado).
// ═════════════════════════════════════════════════════════════════════════
const { load, save } = require("./db");

const COLLECTION = "botEnabledGroups";

function getBotEnabledGroups() {
  const list = load(COLLECTION, []);
  return Array.isArray(list) ? list : [];
}

function isBotEnabledForGroup(groupId) {
  return getBotEnabledGroups().includes(groupId);
}

function enableBotForGroup(groupId) {
  const list = getBotEnabledGroups();
  if (!list.includes(groupId)) {
    list.push(groupId);
    save(COLLECTION, list);
  }
  return list;
}

function disableBotForGroup(groupId) {
  const list = getBotEnabledGroups().filter((g) => g !== groupId);
  save(COLLECTION, list);
  return list;
}

module.exports = {
  getBotEnabledGroups,
  isBotEnabledForGroup,
  enableBotForGroup,
  disableBotForGroup,
};
