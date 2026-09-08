const config = require("../config");
const { getCoOwners } = require("./coowners");

// Desde Baileys v7, en varios lugares (participants de grupos, author de
// group-participants.update, etc.) ya no siempre llega un JID como string
// plano: a veces llega un objeto tipo { id, phoneNumber, lid } (el mismo
// cambio que aplicaron al tipo "Contact"). Esta función normaliza cualquiera
// de los dos casos a un string de JID, para no tener que acordarnos en cada
// lugar del código de qué versión de Baileys estamos corriendo.
function toJidString(value) {
  if (!value) return value;
  if (typeof value === "string") return value;
  // Preferimos "id" (es el que WhatsApp marca como preferido), después lid,
  // después phoneNumber.
  return value.id || value.lid || value.phoneNumber || null;
}

// Reimplementado localmente (igual a como lo hace Baileys): normaliza un JID
// sacándole el sufijo de dispositivo ("...:12@s.whatsapp.net" -> "...@s.whatsapp.net").
// Lo hacemos acá en vez de importarlo de @whiskeysockets/baileys porque desde
// la v7 el paquete es ESM puro, y usar `require()` normal para algo tan chico
// no vale la pena el lío de import dinámico en cada archivo que lo usa.
function jidNormalizedUser(jid) {
  const raw = toJidString(jid);
  if (!raw) return raw;
  const [userAndDevice, server] = raw.split("@");
  if (!server) return raw;
  const user = userAndDevice.split(":")[0];
  return `${user}@${server}`;
}

// Convierte un número "56977776666" (o con +, espacios, guiones) a JID de WhatsApp
function numberToJid(number) {
  const clean = number.replace(/[^0-9]/g, "");
  return `${clean}@s.whatsapp.net`;
}

function jidToNumber(jid) {
  const raw = toJidString(jid);
  if (!raw) return "";
  return raw.split("@")[0].split(":")[0];
}

function isOwner(jid) {
  if (!jid) return false;
  const num = jidToNumber(jid);
  return config.OWNERS.some((o) => o.number === num || (o.lids || []).includes(num));
}

// Devuelve solo los números reales de los owners (para mostrar, ej. en .owner con links wa.me)
function getOwnerNumbers() {
  return config.OWNERS.map((o) => o.number).filter(Boolean);
}

// Owner original O agregado como co-owner con .co
function isOwnerOrCoOwner(jid) {
  if (!jid) return false;
  if (isOwner(jid)) return true;
  const num = jidToNumber(jid);
  return getCoOwners().some(
    (o) => o.number === num || (o.lids || []).includes(num)
  );
}

// Extrae el texto de cualquier tipo de mensaje (texto normal, con caption, etc.)
function getMessageText(msg) {
  const m = msg.message;
  if (!m) return "";
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    ""
  );
}

// Devuelve el mensaje citado (si el usuario respondió a otro mensaje)
function getQuotedMessage(msg) {
  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  if (!ctx?.quotedMessage) return null;
  return {
    message: ctx.quotedMessage,
    participant: ctx.participant,
    stanzaId: ctx.stanzaId,
  };
}

// Revisa si el bot es admin dentro de un grupo.
// OJO: esto es solo informativo (para el .menu o avisos), NO se usa para bloquear
// comandos, porque la detección de JIDs con el sistema @lid de WhatsApp no siempre
// es exacta. Los comandos que necesitan ser admin intentan la acción directamente
// y manejan el error si WhatsApp la rechaza (ver friendlyGroupError más abajo).
async function isBotAdmin(sock, groupId) {
  try {
    const metadata = await sock.groupMetadata(groupId);
    const myId = jidNormalizedUser(sock.user.id);
    const myNumber = jidToNumber(myId);
    const myLid = sock.user.lid ? jidNormalizedUser(sock.user.lid) : null;

    const botParticipant = metadata.participants.find((p) => {
      const pId = jidNormalizedUser(p.id);
      if (pId === myId) return true;
      if (myLid && pId === myLid) return true;
      if (jidToNumber(pId) === myNumber) return true;
      return false;
    });

    return !!botParticipant?.admin;
  } catch {
    return false;
  }
}

// Revisa si un participante específico es admin (informativo)
async function isParticipantAdmin(sock, groupId, jid) {
  try {
    const metadata = await sock.groupMetadata(groupId);
    const target = jidNormalizedUser(jid);
    const targetNumber = jidToNumber(target);

    const participant = metadata.participants.find((p) => {
      const pId = jidNormalizedUser(p.id);
      return pId === target || jidToNumber(pId) === targetNumber;
    });

    return !!participant?.admin;
  } catch {
    return false;
  }
}

// Compara un JID cualquiera contra la identidad del bot (número real o @lid).
// Sirve para saber si UNA acción de grupo (promote/demote) la ejecutó el bot mismo
// (por ejemplo desde .promote o .demote) en vez de un admin desde la app de WhatsApp.
function isBotJid(sock, jid) {
  if (!jid) return false;
  const target = jidNormalizedUser(jid);
  const targetNumber = jidToNumber(target);

  const myId = jidNormalizedUser(sock.user.id);
  const myNumber = jidToNumber(myId);
  const myLid = sock.user.lid ? jidNormalizedUser(sock.user.lid) : null;

  if (target === myId) return true;
  if (myLid && target === myLid) return true;
  if (targetNumber === myNumber) return true;
  return false;
}

// Verifica que TANTO el que envía el comando COMO el bot sean admins del grupo.
// Devuelve { senderIsAdmin, botIsAdmin, ok } donde ok = ambos son admin.
async function requireGroupAdmins(sock, groupId, sender) {
  const [senderIsAdmin, botIsAdmin] = await Promise.all([
    isParticipantAdmin(sock, groupId, sender),
    isBotAdmin(sock, groupId),
  ]);
  return { senderIsAdmin, botIsAdmin, ok: senderIsAdmin && botIsAdmin };
}

// Traduce errores típicos de WhatsApp/Baileys al intentar acciones de grupo
// (agregar, eliminar, cambiar foto/nombre, promover) a un mensaje entendible.
function friendlyGroupError(err) {
  const statusCode = err?.output?.statusCode || err?.status || err?.data?.status;
  const raw = (err?.message || "").toLowerCase();

  if (
    statusCode === 401 ||
    statusCode === 403 ||
    raw.includes("not-authorized") ||
    raw.includes("forbidden")
  ) {
    return (
      "⛔ WhatsApp rechazó la acción: el bot no tiene permisos de admin en este grupo " +
      "(o los perdió). Verifica en la info del grupo que el bot siga apareciendo como administrador."
    );
  }

  if (raw.includes("reachout_restricted")) {
    return (
      "⚠️ WhatsApp no permite agregar a ese número directamente (su privacidad no lo permite, " +
      "o WhatsApp está limitando temporalmente esta acción en la cuenta del bot). " +
      "Prueba enviándole el link de invitación del grupo en su lugar."
    );
  }

  if (raw.includes("no image processing library available")) {
    return (
      "⚠️ Falta una librería para procesar imágenes. Corre `npm install` de nuevo en la carpeta " +
      "del bot (se agregó `jimp` a package.json) y vuelve a intentar el comando."
    );
  }

  return `❌ Error: ${err.message || err}`;
}

// Saca el código de invitación de un link tipo https://chat.whatsapp.com/XXXXXXXX
function extractInviteCode(link) {
  const match = link.match(/chat\.whatsapp\.com\/([A-Za-z0-9]+)/);
  return match ? match[1] : null;
}

// Intenta sacar el NÚMERO REAL detrás de un JID (sirve cuando el JID que
// tenemos es un @lid, el identificador anónimo que WhatsApp usa a veces en
// vez del número real).
//
// OJO: esto es "mejor esfuerzo", no una garantía. WhatsApp diseñó el sistema
// @lid justo para poder ocultar el número real en ciertos grupos/cuentas, así
// que el bot no siempre va a poder resolverlo — depende de si Baileys alcanzó
// a sincronizar esa relación lid↔número (por ejemplo, viendo los metadatos
// del grupo). Si no se puede resolver, devuelve null; quien llame a esta
// función debe manejar ese caso (ej. no mostrar el link de wa.me).
async function resolveRealNumber(sock, jid, groupId) {
  if (!jid) return null;
  if (jid.endsWith("@s.whatsapp.net")) return jidToNumber(jid);
  if (!jid.endsWith("@lid")) return null;

  // Camino 1: algunas versiones de Baileys exponen un mapeo lid -> número
  // real directamente (sock.signalRepository.lidMapping).
  try {
    const mapping = sock?.signalRepository?.lidMapping;
    if (mapping?.getPNForLID) {
      const pn = await mapping.getPNForLID(jid);
      if (pn) return jidToNumber(pn);
    }
  } catch {
    // Si esto falla o no existe en la versión instalada, seguimos al camino 2.
  }

  // Camino 2: dentro de un grupo, a veces los metadatos traen ambos JIDs
  // (el @lid y el número real) para el mismo participante.
  if (groupId) {
    try {
      const metadata = await sock.groupMetadata(groupId);
      const participant = metadata.participants.find((p) => p.id === jid || p.lid === jid);
      const realJid = participant?.phoneNumber || participant?.jid;
      if (realJid && realJid.endsWith("@s.whatsapp.net")) return jidToNumber(realJid);
    } catch {
      // No se pudo, seguimos con null.
    }
  }

  return null;
}

// Dado un target (JID de mención/respuesta, o un número escrito a mano),
// intenta averiguar TANTO el número real COMO el @lid de esa persona, para
// poder guardar ambos con .co sin importar cuál de los dos usó WhatsApp esa
// vez. Es "mejor esfuerzo": si el bot no tiene forma de relacionarlos (por
// ejemplo fuera de un grupo, o si WhatsApp no sincronizó ese lid todavía),
// devuelve null en el campo que no pudo resolver.
async function resolveCoOwnerIdentifiers(sock, target, groupId) {
  let number = null;
  let lid = null;

  if (!target) return { number, lid };

  if (target.includes("@")) {
    // Casos normales: JID de teléfono real o @lid.
    if (target.endsWith("@lid")) lid = jidToNumber(target);
    else if (target.endsWith("@s.whatsapp.net")) number = jidToNumber(target);
    else {
      // Formato de JID que no reconocemos (WhatsApp cambia esto de vez en
      // cuando). Mejor guardar ALGO que quedarnos con null/null y perder el
      // dato: si contiene "lid" en el dominio lo tratamos como lid, si no,
      // como número. De todas formas, el matching de permisos compara el
      // string tal cual, así que sigue funcionando aunque la etiqueta no sea
      // 100% exacta.
      const raw = jidToNumber(target);
      if (target.includes("lid")) lid = raw;
      else number = raw;
    }
  } else {
    // Vino escrito a mano: ".co 56912345678"
    number = target.replace(/[^0-9]/g, "");
  }

  // Camino 1: el mapeo interno de Baileys (el mismo que usa resolveRealNumber
  // más arriba). Es la fuente más confiable porque WhatsApp la sincroniza a
  // nivel de cuenta, no depende de que la persona esté en ESTE grupo puntual.
  try {
    const mapping = sock?.signalRepository?.lidMapping;
    if (mapping) {
      if (number && !lid && mapping.getLIDForPN) {
        const l = await mapping.getLIDForPN(`${number}@s.whatsapp.net`);
        if (l) lid = jidToNumber(l);
      }
      if (lid && !number && mapping.getPNForLID) {
        const pn = await mapping.getPNForLID(`${lid}@lid`);
        if (pn) number = jidToNumber(pn);
      }
    }
  } catch {
    // Si esto falla o no existe en la versión instalada, seguimos al camino 2.
  }

  // Camino 2: dentro de un grupo, a veces los metadatos traen ambos JIDs
  // (el @lid y el número real) para el mismo participante.
  if (groupId && (!number || !lid)) {
    try {
      const metadata = await sock.groupMetadata(groupId);
      const participant = metadata.participants.find((p) => {
        const pId = p.id || "";
        const pLid = p.lid || "";
        const pPhone = p.phoneNumber || p.jid || "";
        return (
          (number &&
            (jidToNumber(pPhone) === number || jidToNumber(pId) === number)) ||
          (lid && (jidToNumber(pId) === lid || jidToNumber(pLid) === lid))
        );
      });

      if (participant) {
        if (!number) {
          const phoneSrc =
            participant.phoneNumber ||
            (participant.id?.endsWith("@s.whatsapp.net") ? participant.id : null) ||
            (participant.jid?.endsWith("@s.whatsapp.net") ? participant.jid : null);
          if (phoneSrc) number = jidToNumber(phoneSrc);
        }
        if (!lid) {
          const lidSrc =
            participant.lid ||
            (participant.id?.endsWith("@lid") ? participant.id : null);
          if (lidSrc) lid = jidToNumber(lidSrc);
        }
      }
    } catch {
      // No se pudo leer group metadata; seguimos con lo que ya teníamos.
    }
  }

  return { number, lid };
}

module.exports = {
  numberToJid,
  jidToNumber,
  jidNormalizedUser,
  toJidString,
  isOwner,
  getOwnerNumbers,
  isOwnerOrCoOwner,
  getMessageText,
  getQuotedMessage,
  isBotAdmin,
  isBotJid,
  isParticipantAdmin,
  requireGroupAdmins,
  friendlyGroupError,
  extractInviteCode,
  resolveRealNumber,
  resolveCoOwnerIdentifiers,
};
