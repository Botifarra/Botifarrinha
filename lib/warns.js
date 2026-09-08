const { load, save } = require("./db");
const { jidToNumber } = require("./utils");

const NAME = "warns";
const MAX_WARNS = 3;

// Estructura guardada: { [groupId]: { [numero]: [tsMs, tsMs, ...] } }
// El warn es por grupo: si te dan un warn en el grupo A, no afecta al grupo B.

function getAll() {
  return load(NAME, {});
}

function saveAll(data) {
  save(NAME, data);
}

// Agrega un warn. Devuelve { count, reachedLimit } — reachedLimit = true si
// con este warn se llegó (o superó) el máximo y corresponde kickear.
function addWarn(groupId, jid) {
  const num = jidToNumber(jid);
  const data = getAll();
  if (!data[groupId]) data[groupId] = {};
  if (!data[groupId][num]) data[groupId][num] = [];

  data[groupId][num].push(Date.now());
  const count = data[groupId][num].length;
  saveAll(data);

  return { count, reachedLimit: count >= MAX_WARNS };
}

// Quita el warn más reciente. Devuelve el conteo restante.
function removeWarn(groupId, jid) {
  const num = jidToNumber(jid);
  const data = getAll();
  if (!data[groupId]?.[num] || data[groupId][num].length === 0) return 0;

  data[groupId][num].pop();
  const count = data[groupId][num].length;

  if (count === 0) {
    delete data[groupId][num];
    if (Object.keys(data[groupId]).length === 0) delete data[groupId];
  }
  saveAll(data);
  return count;
}

// Resetea todos los warns de esa persona en ese grupo (ej: tras el kick, o con .resetwarn)
function resetWarns(groupId, jid) {
  const num = jidToNumber(jid);
  const data = getAll();
  if (data[groupId]) {
    delete data[groupId][num];
    if (Object.keys(data[groupId]).length === 0) delete data[groupId];
    saveAll(data);
  }
}

function getWarnCount(groupId, jid) {
  const num = jidToNumber(jid);
  const data = getAll();
  return data[groupId]?.[num]?.length || 0;
}

module.exports = { addWarn, removeWarn, resetWarns, getWarnCount, MAX_WARNS };
