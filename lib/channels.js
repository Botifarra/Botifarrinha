const { load, save } = require("./db");

// --- Canales (@newsletter) vistos por el bot -------------------------------
// A diferencia de los grupos (sock.groupFetchAllParticipating), Baileys NO tiene
// una función para listar todos los canales que sigue la cuenta del bot. La única
// forma de "descubrirlos" es ir registrando el JID cada vez que llega un mensaje
// desde uno. Por eso .libc solo muestra canales que el bot ya vio pasar al menos
// un mensaje — no es una lista completa hasta que eso pase.

function getKnownChannels() {
  return load("channels", {}); // { [jid]: { name, lastSeen } }
}

function trackChannel(jid, name) {
  const known = getKnownChannels();
  known[jid] = { name: name || known[jid]?.name || "(sin nombre)", lastSeen: Date.now() };
  save("channels", known);
  return known[jid];
}

// --- Changelog del bot -------------------------------------------------------
// Lista de entradas { text, date }, la más reciente al final. La última es la
// que se manda al canal (CHANGELOG_CHANNEL_JID) cada vez que el bot arranca
// (ver index.js, evento connection.update).

function getChangelogEntries() {
  return load("changelog", []);
}

function addChangelogEntry(text) {
  const entries = getChangelogEntries();
  entries.push({ text, date: new Date().toISOString() });
  save("changelog", entries);
  return entries;
}

function getLatestChangelogEntry() {
  const entries = getChangelogEntries();
  return entries.length > 0 ? entries[entries.length - 1] : null;
}

// --- Canal donde se manda el changelog ---------------------------------------
// Configurable con .set_canal en vez de editar config.js a mano. Si no se definió
// con el comando, index.js cae de respaldo a config.CHANGELOG_CHANNEL_JID.

function getChangelogChannel() {
  return load("changelogChannel", null);
}

function setChangelogChannel(jid) {
  save("changelogChannel", jid);
  return jid;
}

module.exports = {
  getKnownChannels,
  trackChannel,
  getChangelogEntries,
  addChangelogEntry,
  getLatestChangelogEntry,
  getChangelogChannel,
  setChangelogChannel,
};
