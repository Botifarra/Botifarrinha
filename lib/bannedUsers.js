const { load, save } = require("./db");
const { jidToNumber } = require("./utils");

const NAME = "bannedUsers";

// Devuelve la lista de números/lids (strings) que están baneados del bot
function getBanned() {
  return load(NAME, []);
}

function banUser(numberOrLid) {
  const list = getBanned();
  if (!list.includes(numberOrLid)) {
    list.push(numberOrLid);
    save(NAME, list);
  }
  return list;
}

function unbanUser(numberOrLid) {
  const list = getBanned().filter((n) => n !== numberOrLid);
  save(NAME, list);
  return list;
}

// Acepta cualquier JID (número o @lid) y revisa si está baneado
function isBanned(jid) {
  if (!jid) return false;
  const num = jidToNumber(jid);
  return getBanned().includes(num);
}

module.exports = { getBanned, banUser, unbanUser, isBanned };
