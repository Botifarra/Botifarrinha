// ═════════════════════════════════════════════════════════════════════════
// lib/fishAudio.js
// Wrapper mínimo sobre la API de Fish Audio (https://fish.audio), usada por
// .voz para generar audio con voces de su Voice Library pública (personajes,
// famosos que la gente haya subido, etc.) o con modelos propios. Solo usa
// `fetch`, incluido desde Node 18+ (mismo criterio que lib/aiClient.js, que
// usa el mismo patrón para la API de Groq).
//
// Para conseguir la clave: https://fish.audio/app/api-keys/ -> pegarla en
// FISH_API_KEY en el .env.
//
// Docs: https://docs.fish.audio/api-reference
// ═════════════════════════════════════════════════════════════════════════
const fs = require("fs");

const API_BASE = "https://api.fish.audio";

// Modelo de SÍNTESIS a usar (no confundir con el "modelo de voz"/reference_id
// que devuelve searchVoiceModel: eso es QUIÉN habla, esto es QUÉ IA lo genera).
// s2.1-pro-free es el nivel gratuito de Fish Audio; se puede subir de nivel
// con FISH_TTS_MODEL en el .env si el owner paga un plan (s2-pro / s2.1-pro).
const TTS_MODEL = process.env.FISH_TTS_MODEL || "s2.1-pro-free";

function getApiKey() {
  const apiKey = process.env.FISH_API_KEY;
  if (!apiKey) {
    const err = new Error(
      "Falta FISH_API_KEY en el .env del bot. Consigue una clave gratis en https://fish.audio/app/api-keys/ y agrégala al .env."
    );
    err.code = "NO_API_KEY";
    throw err;
  }
  return apiKey;
}

async function readErrorDetail(res) {
  try {
    const body = await res.json();
    return body?.message || JSON.stringify(body);
  } catch {
    return (await res.text().catch(() => "")).slice(0, 300);
  }
}

/**
 * Busca en la Voice Library pública de Fish Audio la voz que mejor matchea
 * `query` (ej: "Homero Simpson"), ordenada por `score` -- el ranking propio
 * de Fish Audio que combina uso (task_count) y valoración (like_count) --
 * y devuelve la primera voz pública de esa lista. Devuelve null si no
 * encontró ninguna.
 */
async function searchVoiceModel(query) {
  const apiKey = getApiKey();

  const url = new URL(`${API_BASE}/model`);
  url.searchParams.set("title", query);
  url.searchParams.set("sort_by", "score");
  url.searchParams.set("page_size", "5");

  let res;
  try {
    res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
  } catch (networkErr) {
    const err = new Error(`No se pudo conectar con Fish Audio: ${networkErr.message}`);
    err.code = "NETWORK_ERROR";
    throw err;
  }

  if (!res.ok) {
    const detail = await readErrorDetail(res);
    const err = new Error(`Fish Audio respondió ${res.status}: ${detail}`);
    err.code = "API_ERROR";
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  const items = Array.isArray(data?.items) ? data.items : [];

  // .self=false (default, no lo mandamos) ya debería devolver solo voces
  // públicas de la Library, pero filtramos de nuevo acá por las dudas (y
  // para descartar cualquier voz dada de baja por DMCA).
  const publicItems = items.filter((m) => m.visibility === "public" && !m.dmca_taken_down);
  const best = publicItems[0] || items[0];
  if (!best) return null;

  return {
    id: best._id,
    title: best.title,
    author: best.author?.nickname || "desconocido",
    likeCount: best.like_count ?? 0,
    taskCount: best.task_count ?? 0,
  };
}

/**
 * Genera el audio de `text` con la voz `referenceId` y lo guarda directo
 * como opus/ogg en `outputPath`. Fish Audio puede devolver opus 48kHz mono
 * nativamente -- el mismo formato que WhatsApp usa para notas de voz --, así
 * que a diferencia de .tts (Edge TTS) acá NO hace falta pasar por ffmpeg.
 */
async function synthesizeSpeech(text, referenceId, outputPath) {
  const apiKey = getApiKey();

  let res;
  try {
    res = await fetch(`${API_BASE}/v1/tts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        model: TTS_MODEL,
      },
      body: JSON.stringify({
        text,
        reference_id: referenceId,
        format: "opus",
        opus_bitrate: 64000,
        sample_rate: 48000,
      }),
    });
  } catch (networkErr) {
    const err = new Error(`No se pudo conectar con Fish Audio: ${networkErr.message}`);
    err.code = "NETWORK_ERROR";
    throw err;
  }

  if (!res.ok) {
    const detail = await readErrorDetail(res);
    const err = new Error(`Fish Audio respondió ${res.status}: ${detail}`);
    err.code = "API_ERROR";
    err.status = res.status;
    throw err;
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outputPath, buffer);
}

module.exports = { searchVoiceModel, synthesizeSpeech };
