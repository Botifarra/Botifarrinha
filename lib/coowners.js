const { load, save } = require("./db");

const NAME = "coowners";

// Cada co-owner se guarda igual que un OWNER del config.js:
//   { number: "56912345678", lids: ["79401697992881", ...] }
// Así, sin importar si ".co" se usó con @mención o escribiendo el número,
// quedan guardados AMBOS identificadores (número real y @lid) y el bot
// reconoce a la persona sin importar cuál de los dos use WhatsApp esa vez.

// Migra datos viejos (array de strings tipo ["56912345678"]) al nuevo formato.
function migrate(list) {
  return list.map((entry) =>
    typeof entry === "string" ? { number: entry, lids: [] } : entry
  );
}

// Devuelve la lista de co-owners: [{ number, lids: [] }, ...]
function getCoOwners() {
  const list = migrate(load(NAME, []));
  return list;
}

function findEntry(list, number, lid) {
  return list.find(
    (e) =>
      (number && e.number === number) ||
      (lid && (e.lids || []).includes(lid))
  );
}

// Agrega (o completa) un co-owner. Se puede llamar con solo número, solo lid,
// o ambos: si ya existe una entrada para esa persona (por cualquiera de los
// dos identificadores), se completa con el que falte en vez de duplicarla.
function addCoOwner(number, lid) {
  const list = getCoOwners();
  let entry = findEntry(list, number, lid);

  if (!entry) {
    entry = { number: number || null, lids: [] };
    list.push(entry);
  }

  if (number && !entry.number) entry.number = number;
  if (lid && !(entry.lids || []).includes(lid)) {
    entry.lids = [...(entry.lids || []), lid];
  }

  save(NAME, list);
  return list;
}

function removeCoOwner(number) {
  const list = getCoOwners().filter((e) => e.number !== number);
  save(NAME, list);
  return list;
}

module.exports = { getCoOwners, addCoOwner, removeCoOwner };
