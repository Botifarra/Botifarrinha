// ═════════════════════════════════════════════════════════════════════════
// lib/rpgEnabledGroups.js
// Lista de grupos donde el RPG v2 (rpgv2/) está DESACTIVADO. Por defecto el
// RPG está activo en todos los grupos; .rpgoff agrega el grupo a esta lista
// y .rpgon lo saca. Mismo patrón de almacenamiento que lib/blockedGroups.js,
// pero invertido (acá se guarda quién está OFF, no quién está bloqueado).
// ═════════════════════════════════════════════════════════════════════════
const { load, save } = require("./db");

const COLLECTION = "rpgDisabledGroups";

function getRpgDisabledGroups() {
  const list = load(COLLECTION, []);
  return Array.isArray(list) ? list : [];
}

function isRpgDisabledForGroup(groupId) {
  return getRpgDisabledGroups().includes(groupId);
}

function disableRpgForGroup(groupId) {
  const list = getRpgDisabledGroups();
  if (!list.includes(groupId)) {
    list.push(groupId);
    save(COLLECTION, list);
  }
  return list;
}

function enableRpgForGroup(groupId) {
  const list = getRpgDisabledGroups().filter((g) => g !== groupId);
  save(COLLECTION, list);
  return list;
}

module.exports = {
  getRpgDisabledGroups,
  isRpgDisabledForGroup,
  disableRpgForGroup,
  enableRpgForGroup,
};
