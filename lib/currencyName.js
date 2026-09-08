const { load, save } = require("./db");

// data/currencyNames.json — { [groupId]: "Nombre elegido por el grupo" }
// Cada grupo puede ponerle su propio nombre a la moneda del bot (solo visual,
// el saldo real sigue siendo el mismo en todo el bot).
const FILE = "currencyNames";

function getAll() {
  return load(FILE, {});
}

function get(groupId) {
  if (!groupId) return null;
  const all = getAll();
  return all[groupId] || null;
}

function set(groupId, name) {
  const all = getAll();
  all[groupId] = name;
  save(FILE, all);
  return name;
}

function clear(groupId) {
  const all = getAll();
  delete all[groupId];
  save(FILE, all);
}

module.exports = { get, set, clear };
