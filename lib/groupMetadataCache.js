// Cache simple en memoria para groupMetadata, tal como recomienda la
// documentación oficial de Baileys para cualquier bot que use grupos
// seguido: sin esto, Baileys termina pidiéndole metadata del grupo al
// servidor de WhatsApp muchas veces por segundo (por ejemplo, cada vez que
// se manda un mensaje a un grupo, para saber a quién cifrarlo), lo que puede
// ser lento o toparse con límites de WhatsApp.
//
// Se pasa como `cachedGroupMetadata` al crear el socket. Baileys lo consulta
// primero; si no hay nada en cache, sigue con la consulta normal al servidor.
// Nosotros lo invalidamos (borramos la entrada) cada vez que el propio grupo
// cambia, para no servir datos viejos.

const cache = new Map();
const TTL_MS = 5 * 60 * 1000; // 5 minutos

function get(jid) {
  const entry = cache.get(jid);
  if (!entry) return undefined;
  if (Date.now() - entry.at > TTL_MS) {
    cache.delete(jid);
    return undefined;
  }
  return entry.value;
}

function set(jid, value) {
  cache.set(jid, { value, at: Date.now() });
}

function invalidate(jid) {
  cache.delete(jid);
}

module.exports = { get, set, invalidate };
