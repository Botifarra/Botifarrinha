const { load, save } = require("./db");
const { jidToNumber } = require("./utils");

const NAME = "mutes";

// Estructura guardada: { [groupId]: { [numero]: expiresAtMs } }

function getAll() {
  return load(NAME, {});
}

function saveAll(data) {
  save(NAME, data);
}

// Muteado por `durationMs` a partir de ahora. Si ya estaba muteado, reemplaza
// el tiempo (no se suma).
function muteUser(groupId, jid, durationMs) {
  const num = jidToNumber(jid);
  const data = getAll();
  if (!data[groupId]) data[groupId] = {};
  data[groupId][num] = Date.now() + durationMs;
  saveAll(data);
}

function unmuteUser(groupId, jid) {
  const num = jidToNumber(jid);
  const data = getAll();
  if (data[groupId]) {
    delete data[groupId][num];
    if (Object.keys(data[groupId]).length === 0) delete data[groupId];
    saveAll(data);
  }
}

// true si sigue muteado ahora mismo. De paso limpia la entrada si ya venció.
function isMuted(groupId, jid) {
  const num = jidToNumber(jid);
  const data = getAll();
  const expiresAt = data[groupId]?.[num];
  if (!expiresAt) return false;

  if (Date.now() >= expiresAt) {
    unmuteUser(groupId, jid);
    return false;
  }
  return true;
}

// Milisegundos restantes de mute (0 si no está muteado)
function remainingMs(groupId, jid) {
  const num = jidToNumber(jid);
  const data = getAll();
  const expiresAt = data[groupId]?.[num];
  if (!expiresAt) return 0;
  return Math.max(0, expiresAt - Date.now());
}

module.exports = { muteUser, unmuteUser, isMuted, remainingMs };
