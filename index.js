// Carga el archivo .env (si existe) ANTES que cualquier otro módulo, porque
// config.js y varios comandos leen process.env.* apenas se importan.
// override:true fuerza a que el .env siempre gane sobre lo que ya haya en
// process.env -- sin esto, si el bot se reinicia con .re (que lanza un
// proceso hijo heredando el entorno del viejo, ver commands/restart.js) un
// valor vacío o viejo de una variable puede quedar "pegado" para siempre,
// aunque el .env se edite después: dotenv por defecto NUNCA pisa una
// variable que ya exista en el entorno, así sea "".
require("dotenv").config({ override: true });

const { getBaileys } = require("./lib/baileysEsm");
const pino = require("pino");
const readline = require("readline");

const config = require("./config");

// --- Helper para preguntar el número por consola ---
function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer.trim());
    })
  );
}
const { isOwner, isOwnerOrCoOwner, getMessageText, isBotAdmin, isBotJid, jidToNumber, requireGroupAdmins, toJidString } = require("./lib/utils");
const { isRestarting } = require("./lib/restartFlag");
const groupMetadataCache = require("./lib/groupMetadataCache");

const cmdJoin = require("./commands/join");
const cmdSticker = require("./commands/sticker");
const cmdRs = require("./commands/rs");
const cmdPf = require("./commands/pf");
const cmdKiss = require("./commands/kiss");
const cmdHug = require("./commands/hug");
const cmdPat = require("./commands/pat");
const cmdTop = require("./commands/top");
const { cmdAdd, cmdKick, cmdVaciar, cmdVcName, cmdVcDesc, cmdVcFoto, cmdVcWlist } = require("./commands/participants");
const { cmdSetPP, cmdSetName, cmdSetDesc } = require("./commands/groupSettings");
const cmdSolicitudes = require("./commands/groupRequests");
const { cmdSetBotPP, cmdSetBotName } = require("./commands/botProfile");
const cmdSelfAdmin = require("./commands/selfAdmin");
const cmdPromote = require("./commands/promote");
const cmdDemote = require("./commands/demote");
const cmdCoOwner = require("./commands/coowner");
const { cmdMute, cmdUnmute } = require("./commands/mute");
const { cmdWarn, cmdUnwarn, cmdResetWarn, cmdWarns } = require("./commands/warn");
const cmdGroupBroadcast = require("./commands/broadcastGroups");
const { isMuted } = require("./lib/mutes");
const cmdOwner = require("./commands/owner");
const cmdAntilink = require("./commands/antilink");
const cmdDebugAdmin = require("./commands/debugAdmin");
const cmdCheckWhatsApp = require("./commands/checkWhatsApp");
const cmdRob = require("./commands/rob");
const cmdPing = require("./commands/ping");
const cmdPull = require("./commands/poll");
const cmdStalker = require("./commands/stalker");
const cmdTc = require("./commands/tc");
const {
  cmdMp3, cmdMp4, cmdTik, cmdIg, cmdSc,
  cmdFb, cmdX, cmdThreads, cmdCapcut, cmdDouyin,
  cmdMediafire, cmdGdrive, cmdTerabox, cmdPlay, cmdYtsearch,
  cmdIgstory, cmdAsupan, cmdSpotify,
} = require("./commands/download");
const cmdRestart = require("./commands/restart");
const cmdLib = require("./commands/lib");
const { cmdOpen, cmdClose } = require("./commands/groupOpenClose");
const { cmdBlock, cmdUnblock } = require("./commands/blockGroup");
const cmdListGroups = require("./commands/listGroups");
const cmdLibG = require("./commands/libGroup");
const { isGroupBlocked } = require("./lib/blockedGroups");
const { cmdRpgOn, cmdRpgOff } = require("./commands/rpgToggle");
const { isRpgDisabledForGroup } = require("./lib/rpgEnabledGroups");
const { cmdOnBot, cmdOffBot } = require("./commands/botToggle");
const { isBotEnabledForGroup } = require("./lib/botEnabledGroups");
const { cmdOn, cmdOff, PROTECTED_COMMANDS } = require("./commands/commandToggle");
const { isCommandDisabled } = require("./lib/disabledCommands");
const { trackMessage } = require("./lib/messageStore");
const cmdClear = require("./commands/clear");
const { isBanned } = require("./lib/bannedUsers");
const { cmdBan, cmdUnban } = require("./commands/ban");
const cmdSetSug = require("./commands/setSug");
const cmdSug = require("./commands/sug");
const cmdDiag = require("./commands/diag");
const { cmdLibC, cmdChangelog, cmdSetCanal } = require("./commands/channels");
const { cmdLink, cmdLinkAll } = require("./commands/groupLinks");
const { trackChannel, getLatestChangelogEntry, getChangelogChannel } = require("./lib/channels");
const { cmdC, cmdAct, cmdVer } = require("./commands/adminTools");
const cmdTts = require("./commands/tts");
const cmdSetVoz = require("./commands/setVoz");
const cmdVoz = require("./commands/voz");
// RPG v2 -- sistema RPG completamente nuevo (ver carpeta rpgv2/). El RPG
// antiguo ("Elyndor") fue eliminado por completo: sus archivos (commands/rpg.js,
// lib/rpg.js, lib/rpgData.js, lib/rpgAiCreator.js, lib/customRpgContent.js,
// lib/aiClient.js) ya no existen en el proyecto.
const rpgv2 = require("./rpgv2");

// Comandos "jugables" del RPG v2 que *.rpgoff* apaga en un grupo (ver
// commands/rpgToggle.js). *.rpg* (el menú) y *.rpgon*/*.rpgoff* mismos NO se
// listan acá a propósito: siempre tienen que poder verse/usarse para poder
// prender el RPG de nuevo. Los comandos *.add** de owner tampoco se listan:
// ya están protegidos por su propio chequeo de senderIsOwnerOrCo.
const RPG_GAMEPLAY_COMMANDS = new Set([
  "crear",
  "perfil",
  "perfilmundo",
  "mundo",
  "clima",
  "viajar",
  "recolectar",
  "explorar",
  "profesion",
  "mapa",
  "stats",
  "inv",
  "usar",
  "equipar",
  "desequipar",
  "luchar",
  "duelo",
  "mazmorra",
  "raid",
  "enemigos",
  "boss",
  "rendirse",
]);
const {
  cmdCartera,
  cmdDeposit,
  cmdWithdraw,
  cmdRegalar,
  cmdRankCoins,
  cmdDaily,
  cmdWork,
  cmdCrimen,
  cmdRobar,
  cmdPescar,
  cmdMinar,
  cmdInvertir,
  cmdNegocio,
  cmdCasino,
  cmdDado,
  cmdFlip,
  cmdBlackdice,
  cmdBlackjack,
  cmdRuleta,
  cmdBaccarat,
  cmdKeno,
  cmdTiendaRpg,
  cmdRankNivel,
  cmdMiNivel,
  cmdVerNivel,
  cmdNiveles,
  cmdSetMoneda,
  cmdEconomyMenu,
} = require("./commands/economy");
const {
  cmdRw,
  cmdClain,
  cmdHarem,
  cmdDelChar,
  cmdSell,
  cmdWshop,
  cmdBuyc,
  cmdGiveChar,
  cmdGiveAll,
  cmdTrade,
  cmdVotar,
  cmdWtop,
  cmdNewChar,
  cmdClaimPj,
  cmdVerPj,
  cmdSetImg,
  cmdGachaMenu,
} = require("./commands/gacha");

// --- Red de seguridad: un error suelto (ej. rate-limit de WhatsApp) no debe
// tumbar el proceso completo. Solo lo logueamos y seguimos corriendo.
process.on("unhandledRejection", (err) => {
  console.error("⚠️ Unhandled rejection (bot sigue corriendo):", err);
});
process.on("uncaughtException", (err) => {
  console.error("⚠️ Uncaught exception (bot sigue corriendo):", err);
});

// Se pone en true la primera vez que el bot avisa el changelog en este proceso.
// Evita que se repita el mensaje en el canal cada vez que hay una reconexión
// automática (misma ejecución de node), y solo lo manda en un arranque real
// del proceso (ej: primera vez, o tras un .re / crash-restart).
let changelogNotified = false;

async function startBot() {
  const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
  } = await getBaileys();

  const { state, saveCreds } = await useMultiFileAuthState("auth_info");
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    browser: ["Ubuntu", "Chrome", "20.0.04"], // NO cambiar "Ubuntu" acá: Baileys necesita este valor específico para que el pairing code (vinculación por número) funcione bien. El nombre "Botifarra" ya queda puesto en package.json, config.js (autor de stickers) y el README.
    cachedGroupMetadata: async (jid) => groupMetadataCache.get(jid),
  });

  // --- Vinculación por código en vez de QR ---
  // Si la sesión todavía no está registrada (no hay auth guardada), pedimos el
  // número de WhatsApp del bot (con código de país, sin "+" ni espacios) y
  // solicitamos el código de emparejamiento a WhatsApp.
  if (!sock.authState.creds.registered) {
    const phoneNumber =
      config.PAIRING_NUMBER ||
      process.env.PAIRING_NUMBER ||
      (await askQuestion(
        "📱 Ingresa el número de WhatsApp del bot (con código de país, sin '+' ni espacios, ej: 56912345678): "
      ));

    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(phoneNumber.replace(/[^0-9]/g, ""));
        console.log(`🔑 Tu código de emparejamiento es: ${code}`);
        console.log("Ve a WhatsApp > Dispositivos vinculados > Vincular con número de teléfono e ingresa este código.");
      } catch (err) {
        console.error("❌ Error solicitando el código de emparejamiento:", err.message);
      }
    }, 3000);
  }

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut && !isRestarting();
      if (isRestarting()) {
        console.log("🔌 Conexión cerrada por reinicio manual (.re), no reconecto en este proceso.");
      } else {
        console.log("🔌 Conexión cerrada.", shouldReconnect ? "Reconectando..." : "Sesión cerrada, borra auth_info/ y vuelve a escanear.");
      }
      if (shouldReconnect) startBot();
    } else if (connection === "open") {
      console.log("✅ Bot conectado a WhatsApp.");

      // Si este proceso nació de un .re, avisamos en el mismo chat que el
      // reinicio ya terminó y el bot quedó conectado de nuevo.
      const notifyJid = process.env.NOTIFY_RESTART_JID;
      if (notifyJid) {
        delete process.env.NOTIFY_RESTART_JID; // que no se repita en futuras reconexiones de este mismo proceso
        sock
          .sendMessage(notifyJid, { text: "✅ Reinicio completado. El bot ya está en línea de nuevo." })
          .catch((err) => console.error("No se pudo avisar que el reinicio terminó:", err.message));
      }

      // Aviso de cambios al canal configurado (con .set_canal, o CHANGELOG_CHANNEL_JID
      // en config.js como respaldo si nunca se usó el comando), una sola vez por
      // proceso real (no en cada reconexión automática).
      if (!changelogNotified) {
        changelogNotified = true;
        const channelJid = getChangelogChannel() || config.CHANGELOG_CHANNEL_JID;
        if (channelJid) {
          const latest = getLatestChangelogEntry();
          const text = latest
            ? `🔄 *Botifarra se reinició*\n\n📝 Último cambio:\n${latest.text}`
            : `🔄 *Botifarra se reinició*\n\n(sin cambios registrados todavía — usa .changelog <texto> para agregar uno)`;
          sock
            .sendMessage(channelJid, { text })
            .catch((err) => console.error("No se pudo avisar el changelog en el canal:", err.message));
        }
      }
    }
  });

  // --- Cache de groupMetadata: la mantenemos al día con los eventos del grupo ---
  sock.ev.on("groups.update", async (updates) => {
    for (const update of updates) {
      if (!update.id) continue;
      try {
        groupMetadataCache.set(update.id, await sock.groupMetadata(update.id));
      } catch {
        groupMetadataCache.invalidate(update.id);
      }
    }
  });

  // --- Aviso de cambios de admin (dar/quitar) + auto-admin al owner ---
  sock.ev.on("group-participants.update", async (event) => {
    const { id: groupId, action } = event;
    // Baileys 7 puede mandar cada participante (y a veces "author") como un
    // objeto { id, phoneNumber, lid } en vez de un string plano de JID.
    // Normalizamos todo a string acá mismo, una sola vez.
    const author = toJidString(event.author);
    const participants = (event.participants || []).map(toJidString).filter(Boolean);

    try {
      groupMetadataCache.invalidate(groupId);
      try {
        groupMetadataCache.set(groupId, await sock.groupMetadata(groupId));
      } catch {
        // Si falla el refresco, no pasa nada: seguimos sin cache hasta la próxima consulta.
      }

      if (action === "promote" || action === "demote") {
        // Si la acción la ejecutó el bot (porque vino de .promote o .demote), esos
        // comandos ya mandaron su propio aviso mencionando correctamente a quién lo pidió.
        // Si no filtramos esto, saldría un segundo mensaje atribuyéndole la acción al
        // número del bot (porque técnicamente es la cuenta del bot la que la ejecuta),
        // en vez de a la persona real que escribió el comando.
        const authorIsBot = isBotJid(sock, author);

        if (!authorIsBot) {
          const verb = action === "promote" ? "le dio admin a" : "le quitó el admin a";
          const authorTag = author ? `@${jidToNumber(author)}` : "Alguien";
          const targetsTag = participants.map((p) => `@${jidToNumber(p)}`).join(", ");

          await sock.sendMessage(groupId, {
            text: `👑 ${authorTag} ${verb} ${targetsTag}`,
            mentions: [author, ...participants].filter(Boolean),
          });
        }
      }

      if (action === "add" && config.AUTO_ADMIN_OWNER) {
        for (const p of participants) {
          if (isOwner(p)) {
            const botAdmin = await isBotAdmin(sock, groupId);
            if (botAdmin) {
              await sock.groupParticipantsUpdate(groupId, [p], "promote");
              await sock.sendMessage(groupId, {
                text: `✅ Bienvenido owner @${jidToNumber(p)}, te di admin automáticamente.`,
                mentions: [p],
              });
            }
          }
        }
      }
    } catch (err) {
      console.error("Error en group-participants-update:", err.message);
    }
  });

  // --- Router de comandos ---
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    // Antes se ignoraba TODO mensaje "fromMe" (o sea, cualquier mensaje enviado
    // desde el propio número vinculado al bot, incluso si lo escribías vos a mano
    // desde el celular). Ahora sí los dejamos pasar: como los comandos siempre
    // requieren el prefijo (config.PREFIX = "."), no hay riesgo de que el bot se
    // responda a sí mismo en bucle, porque sus propias respuestas normales no
    // empiezan con ".".
    if (!msg.message) return;

    const from = msg.key.remoteJid;

    // Los canales (@newsletter) no son chats normales: nadie corre comandos ahí,
    // pero sí vamos registrando cada uno que veamos pasar, para poder listarlos
    // después con .libc (ver nota en lib/channels.js sobre por qué es necesario).
    if (from.endsWith("@newsletter")) {
      trackChannel(from, msg.pushName);
      return;
    }

    const isGroup = from.endsWith("@g.us");
    const sender = isGroup ? msg.key.participant : from;

    // Si el grupo está bloqueado, el bot ignora TODO (ni siquiera responde).
    // Solo se desbloquea con .unblock desde otro chat (ver commands/blockGroup.js).
    if (isGroup && isGroupBlocked(from)) return;

    // .mute: si quien escribió está muteado EN ESTE grupo, le borramos el
    // mensaje (si el bot es admin) y cortamos acá: no procesamos comandos
    // de alguien muteado tampoco.
    if (isGroup && isMuted(from, sender)) {
      try {
        if (await isBotAdmin(sock, from)) {
          await sock.sendMessage(from, { delete: msg.key });
        }
      } catch (err) {
        console.error("Error borrando mensaje de usuario muteado:", err.message);
      }
      return;
    }

    // Guarda la clave de este mensaje para que .clear la pueda borrar más adelante.
    if (isGroup) {
      trackMessage(from, msg.key);
    }

    const body = getMessageText(msg);
    if (!body || !body.startsWith(config.PREFIX)) return;

    const args = body.slice(config.PREFIX.length).trim().split(/\s+/);
    const command = args.shift().toLowerCase();
    const senderIsOwner = isOwner(sender);
    const senderIsOwnerOrCo = isOwnerOrCoOwner(sender);

    // Chat privado (DM): antes cualquier persona podía escribirle comandos al
    // bot directo por privado. Ahora solo el owner o un co-owner pueden.
    if (!isGroup && !senderIsOwnerOrCo) {
      return sock.sendMessage(
        from,
        { text: "⛔ Este bot no responde comandos por chat privado, salvo al owner." },
        { quoted: msg }
      );
    }

    // .offbot: el bot viene APAGADO por defecto en todo grupo nuevo (a
    // diferencia del RPG, que viene prendido). Mientras esté apagado en este
    // grupo, nadie que no sea owner/co-owner puede usar NINGÚN comando: se le
    // avisa que le pida al owner que lo active con .onbot. El owner/co-owner
    // sigue teniendo acceso completo siempre (para poder activarlo).
    if (isGroup && !senderIsOwnerOrCo && !isBotEnabledForGroup(from)) {
      return sock.sendMessage(
        from,
        { text: "🛑 El bot está desactivado en este grupo. Pedile al owner que lo active con *.onbot*." },
        { quoted: msg }
      );
    }

    // .off <comando>: ese comando puntual quedó desactivado en este grupo.
    // Los comandos protegidos (.on/.off/.onbot/.offbot/.owner/.menu/.help)
    // nunca se ven afectados, para que siempre se pueda revertir esto.
    if (isGroup && !PROTECTED_COMMANDS.has(command) && isCommandDisabled(from, command)) {
      return sock.sendMessage(
        from,
        { text: `🛑 *.${command}* está desactivado en este grupo. Un owner/co-owner puede reactivarlo con *.on ${command}*.` },
        { quoted: msg }
      );
    }

    // Un usuario baneado (.ban) no puede usar NINGÚN comando, salvo que sea el
    // owner (así nunca queda el bot bloqueado para sí mismo por accidente) o
    // que esté pidiendo el contacto del owner (.owner) para poder resolverlo.
    // .rpgoff: el RPG quedó apagado en este grupo. Dejamos pasar *.rpg* (el
    // menú) y *.rpgon*/*.rpgoff* mismos para que se pueda prender de nuevo;
    // el resto de comandos del bot (no-RPG) tampoco se ve afectado.
    if (isGroup && RPG_GAMEPLAY_COMMANDS.has(command) && isRpgDisabledForGroup(from)) {
      return sock.sendMessage(
        from,
        { text: "🛑 El RPG está desactivado en este grupo. Un owner/co-owner puede reactivarlo con *.rpgon*." },
        { quoted: msg }
      );
    }

    if (!senderIsOwner && command !== "owner" && isBanned(sender)) {
      return sock.sendMessage(
        from,
        {
          text:
            "⛔ *Acceso restringido*\n\n" +
            "Tu número ha sido bloqueado del uso de este bot.\n\n" +
            "Para resolver la situación, por favor contacta al owner (puedes usar .owner para ver sus datos de contacto).",
        },
        { quoted: msg }
      );
    }

    try {
      switch (command) {
        case "join":
          await cmdJoin(sock, msg, args, sender);
          break;

        case "solicitudes":
          await cmdSolicitudes(sock, msg, args, isGroup, sender);
          break;

        case "setbotpp":
          await cmdSetBotPP(sock, msg, sender);
          break;

        case "setbotname":
          await cmdSetBotName(sock, msg, args, sender);
          break;

        case "sticker":
        case "s":
          await cmdSticker(sock, msg, args);
          break;

        case "rs":
          await cmdRs(sock, msg, args);
          break;

        case "pf":
          await cmdPf(sock, msg);
          break;

        case "kiss":
          await cmdKiss(sock, msg);
          break;

        case "hug":
          await cmdHug(sock, msg);
          break;

        case "pat":
          await cmdPat(sock, msg);
          break;

        case "top":
          await cmdTop(sock, msg, args, isGroup, sender);
          break;

        case "agg":
        case "add":
          await cmdAdd(sock, msg, args, isGroup, sender);
          break;

        case "kick":
        case "del":
          await cmdKick(sock, msg, args, isGroup, sender);
          break;

        case "open":
          await cmdOpen(sock, msg, isGroup, sender);
          break;

        case "close":
          await cmdClose(sock, msg, isGroup, sender);
          break;

        case "vc":
          await cmdVaciar(sock, msg, args, isGroup, sender, senderIsOwnerOrCo);
          break;

        case "vcname":
          await cmdVcName(sock, msg, args, senderIsOwnerOrCo);
          break;

        case "vcdesc":
          await cmdVcDesc(sock, msg, args, senderIsOwnerOrCo);
          break;

        case "vcfoto":
          await cmdVcFoto(sock, msg, senderIsOwnerOrCo);
          break;

        case "vcwlist":
          await cmdVcWlist(sock, msg, args, isGroup, senderIsOwnerOrCo);
          break;

        case "rpgon":
          await cmdRpgOn(sock, msg, args, isGroup, sender, senderIsOwnerOrCo);
          break;

        case "rpgoff":
          await cmdRpgOff(sock, msg, args, isGroup, sender, senderIsOwnerOrCo);
          break;

        case "onbot":
          await cmdOnBot(sock, msg, args, isGroup, sender, senderIsOwnerOrCo);
          break;

        case "offbot":
          await cmdOffBot(sock, msg, args, isGroup, sender, senderIsOwnerOrCo);
          break;

        case "on":
          await cmdOn(sock, msg, args, isGroup, sender, senderIsOwnerOrCo);
          break;

        case "off":
          await cmdOff(sock, msg, args, isGroup, sender, senderIsOwnerOrCo);
          break;

        case "rob":
          await cmdRob(sock, msg, isGroup, sender, senderIsOwnerOrCo);
          break;

        case "ping":
        case "p":
          await cmdPing(sock, msg);
          break;

        // ── Economía ──
        case "cartera":
          await cmdCartera(sock, msg, args, sender);
          break;

        case "dep":
          await cmdDeposit(sock, msg, args, sender);
          break;

        case "ret":
          await cmdWithdraw(sock, msg, args, sender);
          break;

        case "regalar":
          await cmdRegalar(sock, msg, args, sender);
          break;

        case "rankcoins":
          await cmdRankCoins(sock, msg);
          break;

        case "daily":
          await cmdDaily(sock, msg, args, sender);
          break;

        case "work":
          await cmdWork(sock, msg, args, sender, senderIsOwnerOrCo);
          break;

        case "crimen":
          await cmdCrimen(sock, msg, args, sender);
          break;

        case "robar":
          await cmdRobar(sock, msg, args, sender);
          break;

        case "pescar":
          await cmdPescar(sock, msg, args, sender);
          break;

        case "minar":
          await cmdMinar(sock, msg, args, sender);
          break;

        case "invertir":
          await cmdInvertir(sock, msg, args, sender);
          break;

        case "negocio":
        case "negocios":
          await cmdNegocio(sock, msg, args, sender);
          break;

        case "casino":
          await cmdCasino(sock, msg, args, sender);
          break;

        case "dado":
          await cmdDado(sock, msg, args, sender);
          break;

        case "flip":
          await cmdFlip(sock, msg, args, sender);
          break;

        case "blackdice":
          await cmdBlackdice(sock, msg, args, sender);
          break;

        case "blackjack":
        case "bj":
          await cmdBlackjack(sock, msg, args, sender);
          break;

        case "ruleta":
          await cmdRuleta(sock, msg, args, sender);
          break;

        case "baccarat":
          await cmdBaccarat(sock, msg, args, sender);
          break;

        case "keno":
          await cmdKeno(sock, msg, args, sender);
          break;

        case "tiendarpg":
          await cmdTiendaRpg(sock, msg, args, sender);
          break;

        case "ranknivel":
          await cmdRankNivel(sock, msg);
          break;

        case "minivel":
          await cmdMiNivel(sock, msg, args, sender);
          break;

        case "vernivel":
          await cmdVerNivel(sock, msg, args);
          break;

        case "niveles":
          await cmdNiveles(sock, msg, args);
          break;

        case "setmoneda":
          await cmdSetMoneda(sock, msg, args, isGroup, sender, senderIsOwnerOrCo);
          break;

        case "economy":
          await cmdEconomyMenu(sock, msg);
          break;

        // ── Gacha ──
        case "rw":
          await cmdRw(sock, msg, sender);
          break;

        case "clain":
          await cmdClain(sock, msg, args, sender);
          break;

        case "harem":
          await cmdHarem(sock, msg, args, sender);
          break;

        case "delchar":
          await cmdDelChar(sock, msg, args, sender);
          break;

        case "sell":
          await cmdSell(sock, msg, args, sender);
          break;

        case "wshop":
          await cmdWshop(sock, msg);
          break;

        case "buyc":
          await cmdBuyc(sock, msg, args, sender);
          break;

        case "givechar":
          await cmdGiveChar(sock, msg, args, sender);
          break;

        case "giveall":
          await cmdGiveAll(sock, msg, args, sender);
          break;

        case "trade":
          await cmdTrade(sock, msg, args, sender);
          break;

        case "votar":
          await cmdVotar(sock, msg, args, sender);
          break;

        case "wtop":
          await cmdWtop(sock, msg);
          break;

        case "newchar":
          await cmdNewChar(sock, msg, args, sender);
          break;

        case "claimpj":
          await cmdClaimPj(sock, msg, args, sender);
          break;

        case "verpj":
          await cmdVerPj(sock, msg, args);
          break;

        case "setimg":
          await cmdSetImg(sock, msg, args, sender);
          break;

        case "gacha":
          await cmdGachaMenu(sock, msg, sender);
          break;

        case "pull":
          await cmdPull(sock, msg, args);
          break;

        case "stalker":
          await cmdStalker(sock, msg, args);
          break;

        case "tc":
          await cmdTc(sock, msg, args);
          break;

        case "mp3":
          await cmdMp3(sock, msg, args);
          break;

        case "mp4":
          await cmdMp4(sock, msg, args);
          break;

        case "tik":
          await cmdTik(sock, msg, args);
          break;

        case "ig":
          await cmdIg(sock, msg, args);
          break;

        case "sc":
          await cmdSc(sock, msg, args);
          break;

        case "fb":
        case "facebook":
          await cmdFb(sock, msg, args);
          break;

        case "x":
        case "twitter":
        case "xbuddy":
          await cmdX(sock, msg, args);
          break;

        case "threads":
          await cmdThreads(sock, msg, args);
          break;

        case "capcut":
          await cmdCapcut(sock, msg, args);
          break;

        case "douyin":
          await cmdDouyin(sock, msg, args);
          break;

        case "mediafire":
          await cmdMediafire(sock, msg, args);
          break;

        case "gdrive":
        case "drive":
          await cmdGdrive(sock, msg, args);
          break;

        case "terabox":
          await cmdTerabox(sock, msg, args);
          break;

        case "play":
          await cmdPlay(sock, msg, args);
          break;

        case "ytsearch":
        case "yts":
          await cmdYtsearch(sock, msg, args);
          break;

        case "igstory":
          await cmdIgstory(sock, msg, args);
          break;

        case "asupan":
          await cmdAsupan(sock, msg, args);
          break;

        case "spotify":
          await cmdSpotify(sock, msg, args);
          break;

        case "ytmp3":
        case "yta":
          await cmdMp3(sock, msg, args);
          break;

        case "ytmp4":
        case "ytv":
          await cmdMp4(sock, msg, args);
          break;

        case "setpp":
          await cmdSetPP(sock, msg, isGroup, sender);
          break;

        case "setname":
          await cmdSetName(sock, msg, args, isGroup, sender);
          break;

        case "setdesc":
          await cmdSetDesc(sock, msg, args, isGroup, sender);
          break;

        case "admin":
          await cmdSelfAdmin(sock, msg, isGroup, senderIsOwnerOrCo);
          break;

        case "promote":
          await cmdPromote(sock, msg, args, isGroup, sender);
          break;

        case "demote":
          await cmdDemote(sock, msg, args, isGroup, sender);
          break;

        case "co":
          await cmdCoOwner(sock, msg, args, senderIsOwner, isGroup);
          break;

        case "re":
          await cmdRestart(sock, msg, senderIsOwner);
          break;

        case "lib":
          await cmdLib(sock, msg, senderIsOwner);
          break;

        case "clear":
          await cmdClear(sock, msg, isGroup);
          break;

        case "ban":
          await cmdBan(sock, msg, senderIsOwner);
          break;

        case "unban":
          await cmdUnban(sock, msg, senderIsOwner);
          break;

        case "set_sug":
          await cmdSetSug(sock, msg, args, isGroup, senderIsOwner);
          break;

        case "sug":
          await cmdSug(sock, msg, args, sender);
          break;

        case "diag":
          await cmdDiag(sock, msg, isGroup, senderIsOwner);
          break;

        case "block":
          await cmdBlock(sock, msg, args, senderIsOwner);
          break;

        case "unblock":
          await cmdUnblock(sock, msg, args, senderIsOwner);
          break;

        case "libgp":
          await cmdListGroups(sock, msg, senderIsOwner);
          break;

        case "libg":
          await cmdLibG(sock, msg, isGroup, senderIsOwner);
          break;

        case "mute":
          await cmdMute(sock, msg, args, isGroup, sender, senderIsOwnerOrCo);
          break;

        case "unmute":
          await cmdUnmute(sock, msg, args, isGroup, sender, senderIsOwnerOrCo);
          break;

        case "warn":
          await cmdWarn(sock, msg, args, isGroup, sender, senderIsOwnerOrCo);
          break;

        case "unwarn":
          await cmdUnwarn(sock, msg, args, isGroup, sender, senderIsOwnerOrCo);
          break;

        case "resetwarn":
          await cmdResetWarn(sock, msg, args, isGroup, sender, senderIsOwnerOrCo);
          break;

        case "warns":
          await cmdWarns(sock, msg, args, isGroup, sender);
          break;

        case "group":
          await cmdGroupBroadcast(sock, msg, args, senderIsOwnerOrCo);
          break;

        case "link":
          await cmdLink(sock, msg, isGroup, sender, senderIsOwnerOrCo);
          break;

        case "linkall":
          await cmdLinkAll(sock, msg, senderIsOwnerOrCo);
          break;

        case "libc":
          await cmdLibC(sock, msg, senderIsOwner);
          break;

        case "changelog":
          await cmdChangelog(sock, msg, args, senderIsOwner);
          break;

        case "set_canal":
          await cmdSetCanal(sock, msg, args, senderIsOwner);
          break;

        case "c":
          await cmdC(sock, msg, args, senderIsOwnerOrCo, sender);
          break;

        case "act":
          await cmdAct(sock, msg, senderIsOwner);
          break;

        case "ver":
          await cmdVer(sock, msg, senderIsOwnerOrCo);
          break;

        case "antilink":
          await cmdAntilink(sock, msg, args, isGroup, sender);
          break;

        case "debugadmin":
          await cmdDebugAdmin(sock, msg, isGroup);
          break;

        case "wa":
          await cmdCheckWhatsApp(sock, msg, args);
          break;

        case "tts":
          await cmdTts(sock, msg, args);
          break;

        case "voz":
          await cmdVoz(sock, msg, args);
          break;

        case "setvoz":
          await cmdSetVoz(sock, msg, args, senderIsOwner);
          break;

        case "owner":
          await cmdOwner(sock, msg);
          break;

        case "menu":
        case "help": {
          let senderIsGroupAdmin = false;
          if (isGroup) {
            const { senderIsAdmin } = await requireGroupAdmins(sock, from, sender);
            senderIsGroupAdmin = senderIsAdmin;
          }

          const section = (emoji, title, lines) =>
            `┌ ${emoji} *${title}*\n` +
            lines.map((l) => `│ ${l}`).join("\n") +
            `\n└─────────────`;

          const generalSection = section("👤", "GENERAL", [
            "*.menu* / *.help* — ver este menú",
            "*.ping* / *.p* — latencia y estado del bot",
            "*.owner* — contacto del owner y co-owners",
            "*.wa* <número> — revisa si tiene WhatsApp y si parece suspendido",
            "*.tc* <número> [país] — busca el número en Truecaller (nombre, operadora, etc)",
            "*.stalker* <nombre> — edad/género/nacionalidad probable (por diversión)",
            "*.sug* <mensaje> — mandar una sugerencia al staff (podés adjuntar una foto)",
          ]);

          const stickersSection = section("🎨", "STICKERS Y PERFIL", [
            "*.sticker* <paquete> — crear sticker (imagen/video)",
            "*.rs* <paquete> | <autor> — robar sticker (respondé a uno)",
            "*.pf* [@/número] — foto de perfil (.pf +569... / 569... / @mención; sin nada: la tuya)",
            "*.kiss* / *.hug* / *.pat* @mención — GIFs de reacción",
          ]);

          const descargasSection = section("⬇️", "DESCARGAS", [
            "*.mp3* / *.ytmp3* <link o nombre> — audio de YouTube",
            "*.mp4* / *.ytmp4* <link o nombre> — video de YouTube",
            "*.play* <nombre> — busca y descarga audio de YT",
            "*.ytsearch* / *.yts* <query> — buscar en YouTube",
            "*.tik* <link TikTok> — video de TikTok",
            "*.asupan* [user] — video random / de usuario TikTok",
            "*.ig* <link Instagram> — video/foto de Instagram",
            "*.igstory* <link> — historia de Instagram",
            "*.sc* <link SoundCloud> — audio de SoundCloud",
            "*.spotify* <link/búsqueda> — audio de Spotify",
            "*.fb* / *.facebook* <link> — video de Facebook",
            "*.x* / *.twitter* <link> — video/media de X",
            "*.threads* <link> — media de Threads",
            "*.capcut* <link> — video de CapCut",
            "*.douyin* <link> — video de Douyin",
            "*.mediafire* <link> — archivo de MediaFire",
            "*.gdrive* / *.drive* <link> — archivo de Google Drive",
            "*.terabox* <link> — archivo de Terabox",
          ]);

          const extrasSection = section("✨", "EXTRAS", [
            "*.tts* <texto> — texto a nota de voz (*.tts -alias* <texto> para otra voz, ver *.setvoz list*)",
            "*.voz* <nombre>: <texto> — nota de voz con una voz de la Voice Library de Fish Audio (ej: *.voz Homero Simpson: hola*)",
            "*.pull* p: <pregunta> o1: <op1> o2: <op2>... — encuesta fijada",
          ]);

          const economiaSection = section("🪙", "ECONOMÍA", [
            "*.cartera* [@mención] — saldo disponible (efectivo + banco)",
            "*.dep* <cantidad|todo> — deposita dinero en el banco",
            "*.ret* <cantidad|todo> — retira dinero del banco",
            "*.regalar* @mención <cantidad> — transfiere dinero a otro usuario",
            "*.rankcoins* — ranking global de los más ricos",
            "*.daily* — recompensa diaria",
            "*.work* — trabaja para ganar dinero",
            "*.crimen* — intenta un golpe (puede salir mal)",
            "*.robar* @mención — intenta robarle a otro usuario",
            "*.pescar* — pesca y vende lo que saques",
            "*.minar* — extrae y vende recursos",
            "*.casino* <cantidad> — tragamonedas",
            "*.dado* <cantidad> — tirada de dado contra el bot",
            "*.flip* <cara|cruz> <cantidad> — lanzamiento de moneda",
            "*.blackdice* @mención <cantidad> — duelo de dados contra otro usuario",
            "*.tiendarpg* comprar/vender <cantidad> — cambia monedas por XP o viceversa",
            "*.ranknivel* — ranking global por nivel/XP",
            "*.minivel* — tu nivel y progreso actual",
            "*.vernivel* @mención — nivel de otro usuario",
            "*.niveles* — lista completa de rangos",
            "*.economy* — ver este mismo listado aparte, como comando propio",
          ]);

          const rpgv2Section = section("🛡️", "RPG", [
            "*.crear <raza> <clase>* — crea tu personaje",
            "*.perfil* [@mención] — ve tu perfil o el de otro jugador",
            "*.stats* [atributo] [cantidad] — ve o sube tus atributos",
            "*.inv* [página] — tu inventario",
            "*.equipar* <item> / *.desequipar* <slot> — gestiona tu equipo",
            "*.mundo* — panorama del mundo",
            "*.clima* <continente|region|ciudad> <id> — consulta el clima",
            "*.viajar* <continente> <región> <ciudad> — cámbiate de ciudad",
            "*.recolectar* — recolecta recursos de tu región",
            "*.explorar* — explora tu región en busca de eventos",
            "*.profesion* <profesión> — elige o ve tu profesión",
            "*.mapa* — resumen rápido del mapa",
            "*.rpg* — ver este mismo listado aparte, como comando propio",
          ]);

          const gachaSection = section("🧩", "GACHA (personajes)", [
            "*.gacha* — menú completo con TODOS los comandos de gacha",
            "*.rw* — tira un waifu/husband aleatorio",
            "*.clain* <nombre> — reclama el personaje tirado",
            "*.harem* [@mención] — ver personajes reclamados",
            "*.wshop* / *.buyc* / *.sell* — mercado de personajes",
            "*.trade* / *.givechar* / *.giveall* — intercambia o regala",
            "*.votar* / *.wtop* — vota y ve el ranking de valor",
          ]);

          const adminSection = section("👮", "ADMINISTRACIÓN DEL GRUPO", [
            "*.agg* <número> — agregar al grupo",
            "*.kick* <número/mención/respuesta> — eliminar del grupo",
            "*.promote* / *.demote* <mención/respuesta> — dar/quitar admin",
            "*.setpp* — cambiar foto del grupo (respondé a una imagen)",
            "*.setname* <texto> — cambiar nombre del grupo",
            "*.setdesc* <texto> — cambiar descripción del grupo",
            "*.open* / *.close* — abrir/cerrar el grupo para escribir",
            "*.link* — link de invitación de este grupo",
            "*.mute* <mención/número/respuesta> <10m/2h/1d> — mutear",
            "*.unmute* <mención/número/respuesta> — sacar el mute",
            "*.clear* — borrar mensajes vistos por el bot en este grupo",
            "*.warn* <mención/número/respuesta> [motivo] — advertir a alguien",
            "*.unwarn* <mención/número/respuesta> — quita la última advertencia",
            "*.resetwarn* <mención/número/respuesta> — borra todas sus advertencias",
            "*.warns* [mención/número/respuesta] — ve las advertencias de alguien",
            "*.antilink* on/off — bloquea automáticamente links en el grupo (sin nada: ve el estado actual)",
          ]);

          const ownerSection = section("👑", "OWNER", [
            "*.join* <link> — unirse a un grupo",
            "*.admin* — autoascenderte a admin",
            "*.vc* <id de grupo> — vaciar TODO un grupo (sin etiquetar ni salir)",
            "*.vcname* <nombre> — nombre que usa .vc al vaciar",
            "*.vcdesc* <texto> — descripción que usa .vc al vaciar",
            "*.vcfoto* — foto que usa .vc (responde a una imagen)",
            "*.vcwlist* [@/número] — whitelist de .vc (quién no se elimina)",
            "*.rpgon* / *.rpgoff* [id de grupo] — activar/desactivar el RPG v2 en un grupo (mismo esquema que .vc: con ID desde cualquier chat, o sin ID desde adentro del grupo)",
            "*.onbot* / *.offbot* [id de grupo] — activar/desactivar el BOT ENTERO en un grupo (mismo esquema que .vc; por defecto el bot está apagado en todo grupo nuevo)",
            "*.on* <comando> / *.off* <comando> — activar/desactivar un comando puntual en el grupo actual (ej: .off vc)",
            "*.rob* — quitar admin a todos y dárselo al owner (broma)",
            "*.co* <número> / *.co del* <número> / *.co list* — gestionar co-owners",
            "*.group* <mensaje> — mensaje a TODOS los grupos donde soy admin",
            "*.re* — git pull + reiniciar el bot",
            "*.lib* @mención — sacar el LID/JID real de alguien",
            "*.ban* / *.unban* @mención — bloquear/permitir uso del bot",
            "*.set_sug* <id de grupo> — grupo donde llegan las *.sug*",
            "*.diag* — diagnóstico completo del bot y sus comandos",
            "*.libgp* — IDs de los grupos donde está el bot",
            "*.libg* — ID de ESTE grupo",
            "*.linkall* — links de todos los grupos donde soy admin",
            "*.libc* — canales que el bot ha visto pasar",
            "*.set_canal* <jid> — canal para el changelog al reiniciar",
            "*.c* <mensaje> — comunicado al canal, te menciona",
            "*.act* — recargar config.js en caliente",
            "*.ver* — owners/co-owners reconocidos ahora mismo",
            "*.changelog* <texto> — agregar entrada de cambios",
            "*.block* / *.unblock* <id de grupo> — (des)bloquear un grupo para el bot",
            "*.debugadmin* — diagnóstico de admins del grupo",
            "*.setvoz* list / *.setvoz* <alias> <voz> / *.setvoz del* <alias> — voces para *.tts*",
            "*.addxp/.addlvl/.addgold/.additem/.addclass/.addrace/.addtitle/.addskill/.addstats* [@mención] ... — admin del RPG v2 (sin mención afecta al propio owner)",
          ]);

          let text =
            `╭───────────────────╮\n` +
            `   🧉 *BOTIFARRA BOT*\n` +
            `╰───────────────────╯\n` +
            `_Prefijo:_ \`.\`   _Escribí *.menu* cuando quieras volver a verlo_\n\n` +
            `${generalSection}\n\n${economiaSection}\n\n${rpgv2Section}\n\n${gachaSection}\n\n${stickersSection}\n\n${descargasSection}\n\n${extrasSection}`;

          if (senderIsOwnerOrCo) {
            text += `\n\n${adminSection}\n\n${ownerSection}`;
          } else if (senderIsGroupAdmin) {
            text += `\n\n${adminSection}`;
          }

          text += `\n\n_🧉 Botifarra Bot — hecho con cariño (y algo de café)_`;

          await sock.sendMessage(from, { text }, { quoted: msg });
          break;
        }

        // ── RPG v2 (nuevo, aislado del RPG "Elyndor" de arriba) ──
        case "rpg":
          await rpgv2.cmdRpgMenu(sock, msg, senderIsOwnerOrCo);
          break;

        case "crear":
          await rpgv2.cmdCrear(sock, msg, args, sender);
          break;

        case "perfil":
          await rpgv2.cmdPerfil(sock, msg, args, sender);
          break;

        case "perfilmundo":
          await rpgv2.cmdPerfilMundo(sock, msg, args, sender);
          break;

        case "mundo":
          await rpgv2.cmdMundo(sock, msg, args, sender);
          break;

        case "clima":
          await rpgv2.cmdClima(sock, msg, args, sender);
          break;

        case "viajar":
          await rpgv2.cmdViajar(sock, msg, args, sender);
          break;

        case "recolectar":
          await rpgv2.cmdRecolectar(sock, msg, args, sender);
          break;

        case "explorar":
          await rpgv2.cmdExplorar(sock, msg, args, sender);
          break;

        case "profesion":
          await rpgv2.cmdProfesion(sock, msg, args, sender);
          break;

        case "mapa":
          await rpgv2.cmdMapa(sock, msg, args, sender);
          break;

        case "stats":
          await rpgv2.cmdStats(sock, msg, args, sender);
          break;

        case "inv":
          await rpgv2.cmdInv(sock, msg, args, sender);
          break;

        case "usar":
          await rpgv2.cmdUsar(sock, msg, args, sender);
          break;

        case "luchar":
          await rpgv2.cmdLuchar(sock, msg, args, sender);
          break;

        case "duelo":
          await rpgv2.cmdDuelo(sock, msg, args, sender);
          break;

        case "mazmorra":
          await rpgv2.cmdMazmorra(sock, msg, args, sender);
          break;

        case "raid":
          await rpgv2.cmdRaid(sock, msg, args, sender);
          break;

        case "enemigos":
          await rpgv2.cmdEnemigos(sock, msg, args, sender);
          break;

        case "boss":
          await rpgv2.cmdBoss(sock, msg, args, sender);
          break;

        case "rendirse":
          await rpgv2.cmdRendirse(sock, msg, args, sender);
          break;

        case "equipar":
          await rpgv2.cmdEquipar(sock, msg, args, sender);
          break;

        case "desequipar":
          await rpgv2.cmdDesequipar(sock, msg, args, sender);
          break;

        case "addxp":
          await rpgv2.cmdAddXp(sock, msg, args, sender, senderIsOwnerOrCo);
          break;

        case "addlvl":
          await rpgv2.cmdAddLvl(sock, msg, args, sender, senderIsOwnerOrCo);
          break;

        case "addgold":
          await rpgv2.cmdAddGold(sock, msg, args, sender, senderIsOwnerOrCo);
          break;

        case "additem":
          await rpgv2.cmdAddItem(sock, msg, args, sender, senderIsOwnerOrCo);
          break;

        case "spawnenemy":
          await rpgv2.cmdSpawnEnemy(sock, msg, args, sender, senderIsOwnerOrCo);
          break;

        case "spawnboss":
          await rpgv2.cmdSpawnBoss(sock, msg, args, sender, senderIsOwnerOrCo);
          break;

        case "kill":
          await rpgv2.cmdKill(sock, msg, args, sender, senderIsOwnerOrCo);
          break;

        case "adddrop":
          await rpgv2.cmdAddDrop(sock, msg, args, sender, senderIsOwnerOrCo);
          break;

        case "reloadcombat":
          await rpgv2.cmdReloadCombat(sock, msg, args, sender, senderIsOwnerOrCo);
          break;

        case "setenemy":
          await rpgv2.cmdSetEnemy(sock, msg, args, sender, senderIsOwnerOrCo);
          break;

        case "setboss":
          await rpgv2.cmdSetBoss(sock, msg, args, sender, senderIsOwnerOrCo);
          break;

        case "addclass":
          await rpgv2.cmdAddClass(sock, msg, args, sender, senderIsOwnerOrCo);
          break;

        case "addrace":
          await rpgv2.cmdAddRace(sock, msg, args, sender, senderIsOwnerOrCo);
          break;

        case "addtitle":
          await rpgv2.cmdAddTitle(sock, msg, args, sender, senderIsOwnerOrCo);
          break;

        case "addskill":
          await rpgv2.cmdAddSkill(sock, msg, args, sender, senderIsOwnerOrCo);
          break;

        case "addstats":
          await rpgv2.cmdAddStats(sock, msg, args, sender, senderIsOwnerOrCo);
          break;

        case "skills":
          await rpgv2.cmdSkills(sock, msg, args, sender);
          break;

        case "skilltree":
          await rpgv2.cmdSkillTree(sock, msg, args, sender);
          break;

        case "skill":
          await rpgv2.cmdSkill(sock, msg, args, sender);
          break;

        case "aprender":
          await rpgv2.cmdAprender(sock, msg, args, sender);
          break;

        case "olvidar":
          await rpgv2.cmdOlvidar(sock, msg, args, sender);
          break;

        case "removeskill":
          await rpgv2.cmdRemoveSkill(sock, msg, args, sender, senderIsOwnerOrCo);
          break;

        case "resetskills":
          await rpgv2.cmdResetSkills(sock, msg, args, sender, senderIsOwnerOrCo);
          break;

        case "reloadskills":
          await rpgv2.cmdReloadSkills(sock, msg, args, sender, senderIsOwnerOrCo);
          break;

        case "evolucionar":
          await rpgv2.cmdEvolucionar(sock, msg, args, sender);
          break;

        case "especializar":
          await rpgv2.cmdEspecializar(sock, msg, args, sender);
          break;

        case "setclass":
          await rpgv2.cmdSetClass(sock, msg, args, sender, senderIsOwnerOrCo);
          break;

        case "setspecialization":
          await rpgv2.cmdSetSpecialization(sock, msg, args, sender, senderIsOwnerOrCo);
          break;

        case "reloadworld":
          await rpgv2.cmdReloadWorld(sock, msg, args, sender, senderIsOwnerOrCo);
          break;

        case "addregion":
          await rpgv2.cmdAddRegion(sock, msg, args, sender, senderIsOwnerOrCo);
          break;

        case "addcity":
          await rpgv2.cmdAddCity(sock, msg, args, sender, senderIsOwnerOrCo);
          break;

        case "addresource":
          await rpgv2.cmdAddResource(sock, msg, args, sender, senderIsOwnerOrCo);
          break;

        case "adddungeon":
          await rpgv2.cmdAddDungeon(sock, msg, args, sender, senderIsOwnerOrCo);
          break;

        case "setlocation":
          await rpgv2.cmdSetLocation(sock, msg, args, sender, senderIsOwnerOrCo);
          break;

        case "addprofessionxp":
          await rpgv2.cmdAddProfessionXp(sock, msg, args, sender, senderIsOwnerOrCo);
          break;

        case "maestro":
          await rpgv2.cmdMaestro(sock, msg, args, sender);
          break;

        case "discipulo":
          await rpgv2.cmdDiscipulo(sock, msg, args, sender);
          break;

        case "libro":
          await rpgv2.cmdLibro(sock, msg, args, sender);
          break;

        case "addbook":
          await rpgv2.cmdAddBook(sock, msg, args, sender, senderIsOwnerOrCo);
          break;

        case "unlockclass":
          await rpgv2.cmdUnlockClass(sock, msg, args, sender, senderIsOwnerOrCo);
          break;

        case "addmaster":
          await rpgv2.cmdAddMaster(sock, msg, args, sender, senderIsOwnerOrCo);
          break;

        case "maestria":
          await rpgv2.cmdMaestria(sock, msg, args, sender);
          break;

        case "talentos":
          await rpgv2.cmdTalentos(sock, msg, args, sender);
          break;

        case "afinidad":
          await rpgv2.cmdAfinidad(sock, msg, args, sender);
          break;

        case "runa":
          await rpgv2.cmdRuna(sock, msg, args, sender);
          break;

        case "reparar":
          await rpgv2.cmdReparar(sock, msg, args, sender);
          break;

        case "craftear":
          await rpgv2.cmdCraftear(sock, msg, args, sender);
          break;

        case "recetas":
          await rpgv2.cmdRecetas(sock, msg, args, sender);
          break;

        case "addrecipe":
          await rpgv2.cmdAddRecipe(sock, msg, args, sender, senderIsOwnerOrCo);
          break;

        case "reloaditems":
          await rpgv2.cmdReloadItems(sock, msg, args, sender, senderIsOwnerOrCo);
          break;

        case "encantar":
          await rpgv2.cmdEncantar(sock, msg, args, sender);
          break;

        case "addenchant":
          await rpgv2.cmdAddEnchant(sock, msg, args, sender, senderIsOwnerOrCo);
          break;

        case "gema":
          await rpgv2.cmdGema(sock, msg, args, sender);
          break;

        case "addgem":
          await rpgv2.cmdAddGem(sock, msg, args, sender, senderIsOwnerOrCo);
          break;

        case "reliquia":
          await rpgv2.cmdReliquia(sock, msg, args, sender);
          break;

        case "addrelic":
          await rpgv2.cmdAddRelic(sock, msg, args, sender, senderIsOwnerOrCo);
          break;

        case "tienda":
          await rpgv2.cmdTienda(sock, msg, args, sender);
          break;

        case "comprar":
          await rpgv2.cmdComprar(sock, msg, args, sender);
          break;

        case "vender":
          await rpgv2.cmdVender(sock, msg, args, sender);
          break;

        case "addshop":
          await rpgv2.cmdAddShop(sock, msg, args, sender, senderIsOwnerOrCo);
          break;

        case "objeto":
          await rpgv2.cmdObjeto(sock, msg, args, sender);
          break;

        case "createitem":
          await rpgv2.cmdCreateItem(sock, msg, args, sender, senderIsOwnerOrCo);
          break;

        case "setdurability":
          await rpgv2.cmdSetDurability(sock, msg, args, sender, senderIsOwnerOrCo);
          break;

        case "mercado":
          await rpgv2.cmdMercado(sock, msg, args, sender);
          break;

        case "subasta":
          await rpgv2.cmdSubasta(sock, msg, args, sender);
          break;

        case "intercambio":
          await rpgv2.cmdIntercambio(sock, msg, args, sender);
          break;

        case "banco":
          await rpgv2.cmdBanco(sock, msg, args, sender);
          break;

        case "depositar":
          await rpgv2.cmdDepositar(sock, msg, args, sender);
          break;

        case "retirar":
          await rpgv2.cmdRetirar(sock, msg, args, sender);
          break;

        case "transferir":
          await rpgv2.cmdTransferir(sock, msg, args, sender);
          break;

        case "almacen":
          await rpgv2.cmdAlmacen(sock, msg, args, sender);
          break;

        case "reputacion":
          await rpgv2.cmdReputacion(sock, msg, args, sender);
          break;

        case "mercaderes":
          await rpgv2.cmdMercaderes(sock, msg, args, sender);
          break;

        case "mercader":
          await rpgv2.cmdMercader(sock, msg, args, sender);
          break;

        case "comprarmercader":
          await rpgv2.cmdComprarMercader(sock, msg, args, sender);
          break;

        case "vendermercader":
          await rpgv2.cmdVenderMercader(sock, msg, args, sender);
          break;

        case "especiales":
          await rpgv2.cmdEspeciales(sock, msg, args, sender);
          break;

        case "comprarespecial":
          await rpgv2.cmdComprarEspecial(sock, msg, args, sender);
          break;

        case "venderespecial":
          await rpgv2.cmdVenderEspecial(sock, msg, args, sender);
          break;

        case "gremio":
          await rpgv2.cmdGremio(sock, msg, args, sender);
          break;

        case "contrato":
          await rpgv2.cmdContrato(sock, msg, args, sender);
          break;

        default:
          // Comando desconocido: no hacemos nada (el bot simplemente lo ignora).
          break;
      }
    } catch (err) {
      console.error("Error procesando comando:", err);
      try {
        await sock.sendMessage(from, { text: `❌ Ocurrió un error: ${err.message}` }, { quoted: msg });
      } catch (sendErr) {
        console.error("Además, no se pudo avisar del error en el chat:", sendErr.message);
      }
    }
  });
}

startBot();
