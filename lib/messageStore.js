// Guarda en memoria las claves (key) de los mensajes vistos en cada grupo,
// para que .clear pueda borrarlos después con sock.sendMessage(jid, { delete: key }).
//
// OJO — limitaciones importantes:
// - Solo guarda mensajes vistos MIENTRAS el bot está corriendo. No hay forma de
//   borrar mensajes de ANTES de que el bot arrancara (o de antes del último
//   reinicio), porque WhatsApp no entrega el historial completo del grupo vía API.
// - Vive solo en memoria: se reinicia cada vez que el bot se reinicia (.re, caída, etc.).
// - No guarda los mensajes que el bot mismo mandó (index.js ignora sus propios
//   mensajes antes de llegar a esta función).

const MAX_PER_GROUP = 3000;

const store = new Map(); // groupId -> array de keys

function trackMessage(groupId, key) {
  if (!groupId || !key) return;
  let list = store.get(groupId);
  if (!list) {
    list = [];
    store.set(groupId, list);
  }
  list.push(key);
  if (list.length > MAX_PER_GROUP) {
    list.splice(0, list.length - MAX_PER_GROUP);
  }
}

function getMessages(groupId) {
  return store.get(groupId) || [];
}

function clearMessages(groupId) {
  store.delete(groupId);
}

module.exports = { trackMessage, getMessages, clearMessages };
