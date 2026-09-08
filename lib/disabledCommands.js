// ═════════════════════════════════════════════════════════════════════════
// lib/disabledCommands.js
// Comandos desactivados PUNTUALMENTE por grupo, vía .off <comando> / .on
// <comando> (ver commands/commandToggle.js). Se guarda como un objeto
// { groupId: ["vc", "tts", ...] }, a diferencia de las listas planas de
// rpgEnabledGroups/botEnabledGroups porque acá hay un set de comandos por
// cada grupo, no un simple on/off global.
// ═════════════════════════════════════════════════════════════════════════
const { load, save } = require("./db");

const COLLECTION = "disabledCommands";

function getAll() {
  const data = load(COLLECTION, {});
  return data && typeof data === "object" && !Array.isArray(data) ? data : {};
}

function getDisabledCommands(groupId) {
  const all = getAll();
  const list = all[groupId];
  return Array.isArray(list) ? list : [];
}

function isCommandDisabled(groupId, command) {
  return getDisabledCommands(groupId).includes(command);
}

function disableCommand(groupId, command) {
  const all = getAll();
  const list = Array.isArray(all[groupId]) ? all[groupId] : [];
  if (!list.includes(command)) {
    list.push(command);
    all[groupId] = list;
    save(COLLECTION, all);
  }
  return list;
}

function enableCommand(groupId, command) {
  const all = getAll();
  const list = (Array.isArray(all[groupId]) ? all[groupId] : []).filter((c) => c !== command);
  if (list.length > 0) {
    all[groupId] = list;
  } else {
    delete all[groupId];
  }
  save(COLLECTION, all);
  return list;
}

module.exports = {
  getDisabledCommands,
  isCommandDisabled,
  disableCommand,
  enableCommand,
};
