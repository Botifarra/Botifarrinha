// lib/reactionGifs.js
// GIFs de reacción de anime wholesome (kiss/hug/pat/etc), usando nekos.best,
// una API pública que separa explícitamente sus categorías SFW de las NSFW.

const { getQuotedMessage, jidToNumber } = require("./utils");

async function sendReactionGif(sock, msg, category, actionText) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
  const quoted = getQuotedMessage(msg);

  const targetJid = mentioned?.[0] || quoted?.participant || sender;

  const senderNum = jidToNumber(sender);
  const targetNum = jidToNumber(targetJid);

  try {
    // nekos.best exige un header User-Agent en todas las peticiones (lo dice su
    // documentación); sin él, la API a veces responde 403 aunque no haya ningún
    // otro problema. Si el 403 sigue apareciendo después de este cambio, ya no es
    // esto — sería que la IP del bot quedó bloqueada del lado de nekos.best (les
    // pasa a IPs compartidas/sospechosas; solo ellos pueden levantar ese bloqueo).
    const res = await fetch(`https://nekos.best/api/v2/${category}`, {
      headers: { "User-Agent": "Botifarra-WhatsApp-Bot/1.0" },
    });
    if (!res.ok) throw new Error(`API respondió ${res.status}`);
    const data = await res.json();
    const gifUrl = data?.results?.[0]?.url;

    if (!gifUrl) throw new Error("La API no devolvió ningún GIF");

    const caption = actionText
      .replace("{sender}", `@${senderNum}`)
      .replace("{target}", `@${targetNum}`);

    await sock.sendMessage(
      from,
      {
        video: { url: gifUrl },
        caption,
        gifPlayback: true,
        mentions: [sender, targetJid],
      },
      { quoted: msg }
    );
  } catch (err) {
    await sock.sendMessage(from, { text: `❌ Error al enviar GIF de ${category}: ${err.message}` }, { quoted: msg });
  }
}

module.exports = { sendReactionGif };
