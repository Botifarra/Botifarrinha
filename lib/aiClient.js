// ═════════════════════════════════════════════════════════════════════════
// lib/aiClient.js
// Wrapper mínimo sobre la API de Groq (https://api.groq.com), que expone
// modelos open-source (Llama, etc.) con un formato de chat completions
// idéntico al de OpenAI. Es gratis, no pide tarjeta y tiene límites generosos
// para un uso como este (unos pocos comandos por día).
//
// Para conseguir la clave: https://console.groq.com/keys (login con Google,
// sin tarjeta) -> "Create API Key" -> pegarla en GROQ_API_KEY en el .env.
//
// No usa ningún SDK externo -- solo `fetch`, incluido desde Node 18+.
// ═════════════════════════════════════════════════════════════════════════

const API_URL = "https://api.groq.com/openai/v1/chat/completions";

// Modelo por defecto: Llama 3.3 70B, buen balance calidad/velocidad para
// generar un JSON chico como una clase o raza. Se puede cambiar con GROQ_MODEL
// (ej: "llama-3.1-8b-instant" para respuestas más rápidas y aún más livianas).
const DEFAULT_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

/**
 * Llama a la API de Groq con un system prompt + un mensaje de usuario
 * y devuelve el texto de la respuesta (string).
 *
 * @param {Object} opts
 * @param {string} opts.system - Instrucciones de sistema (reglas de formato, etc).
 * @param {string} opts.prompt - Lo que le pedimos a la IA.
 * @param {number} [opts.maxTokens=1200]
 * @param {string} [opts.model]
 */
async function askAI({ system, prompt, maxTokens = 1200, model }) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    const err = new Error(
      "Falta GROQ_API_KEY en el .env del bot. Consigue una clave gratis (sin tarjeta) en https://console.groq.com/keys y agrégala al .env."
    );
    err.code = "NO_API_KEY";
    throw err;
  }

  let res;
  try {
    res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || DEFAULT_MODEL,
        max_tokens: maxTokens,
        temperature: 0.9,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
      }),
    });
  } catch (networkErr) {
    const err = new Error(`No se pudo conectar con la API de Groq: ${networkErr.message}`);
    err.code = "NETWORK_ERROR";
    throw err;
  }

  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body?.error?.message || JSON.stringify(body);
    } catch {
      detail = await res.text().catch(() => "");
    }
    const err = new Error(`La API de Groq respondió ${res.status}: ${detail.slice(0, 300)}`);
    err.code = "API_ERROR";
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("La IA respondió sin contenido de texto.");
  }
  return text;
}

/**
 * Extrae el primer objeto JSON válido de un texto (por si el modelo lo
 * envuelve en ```json ... ``` o agrega alguna palabra antes/después pese a
 * las instrucciones del system prompt -- los modelos open-source lo hacen
 * más seguido que Claude, así que esto importa más acá).
 */
function extractJson(text) {
  const cleaned = String(text).replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("La IA no devolvió un JSON válido.");
  }
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch (e) {
    throw new Error(`La IA devolvió un JSON con errores de formato: ${e.message}`);
  }
}

module.exports = { askAI, extractJson, DEFAULT_MODEL };
