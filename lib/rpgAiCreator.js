// ═════════════════════════════════════════════════════════════════════════
// lib/rpgAiCreator.js
// Construye los prompts para pedirle a la IA una clase o raza nueva del RPG,
// y sobre todo: SANEA lo que la IA devuelve antes de que toque el juego.
//
// Filosofía de seguridad/balance: la IA solo controla texto de sabor (nombre,
// emoji, descripción, habilidades) y números que quedan siempre clampeados
// dentro de rangos razonables. Todo lo que podría romper el motor del RPG
// (tier, unlockLevel, requires, advancesTo) lo decide el código, nunca la IA.
// ═════════════════════════════════════════════════════════════════════════

const ATTRS = ["fue", "des", "con", "int", "sab", "car"];

// ── CLASES ──────────────────────────────────────────────────────────────

const CLASS_SYSTEM_PROMPT =
  "Eres un diseñador de juegos ayudando a crear una clase nueva para un RPG de fantasía de WhatsApp llamado Elyndor.\n" +
  "Responde ÚNICAMENTE con un objeto JSON válido. Nada de texto antes o después, nada de explicaciones, nada de markdown ni bloques de código.\n" +
  "El JSON debe tener EXACTAMENTE esta forma:\n" +
  '{"inicial":{"name":"","emoji":"","desc":"","baseAttrs":{},"hpMul":1.0,"manaMul":1.0,"skills":["","",""]},' +
  '"avanzada":{"name":"","emoji":"","desc":"","baseAttrs":{},"hpMul":1.0,"manaMul":1.0,"skills":["","",""]}}\n\n' +
  "Reglas:\n" +
  `- baseAttrs solo puede usar estas claves: ${ATTRS.join(", ")} (fuerza, destreza, constitución, inteligencia, sabiduría, carisma).\n` +
  "- 'inicial' reparte entre 3 y 6 puntos totales en baseAttrs. 'avanzada' reparte entre 5 y 9 puntos, sintiéndose como la evolución natural de 'inicial'.\n" +
  "- hpMul y manaMul son multiplicadores de vida/maná, números entre 0.6 y 1.8.\n" +
  "- skills es un arreglo de EXACTAMENTE 3 nombres de habilidades cortos en español. La tercera habilidad de 'avanzada' debe terminar con '(ult)'.\n" +
  "- desc: 1-2 frases en español, tono de fantasía épica, coherente con el mundo de Elyndor.\n" +
  "- emoji: un solo emoji representativo.";

function buildClassPrompt(slug, description) {
  return (
    `Crea una clase de RPG (clave interna: "${slug}") a partir de esta breve descripción de funcionamiento que dio el owner del bot:\n\n` +
    `"${description}"\n\n` +
    "Genera la versión inicial (nivel 1) y su evolución avanzada (nivel 15), siguiendo el esquema JSON indicado."
  );
}

function buildClassModPrompt(slug, description) {
  return (
    `La clase de RPG con clave interna "${slug}" ya existe en el juego y el owner del bot quiere REDISEÑARLA por completo ` +
    `a partir de esta nueva descripción de funcionamiento:\n\n"${description}"\n\n` +
    "Ignorá cómo era la clase antes: generá una versión inicial (nivel 1) y su evolución avanzada (nivel 15) totalmente " +
    "nuevas y coherentes con la nueva descripción, siguiendo el esquema JSON indicado."
  );
}

// ── RAZAS ───────────────────────────────────────────────────────────────

const RACE_SYSTEM_PROMPT =
  "Eres un diseñador de juegos ayudando a crear una raza jugable nueva para un RPG de fantasía de WhatsApp llamado Elyndor.\n" +
  "Responde ÚNICAMENTE con un objeto JSON válido. Nada de texto antes o después, nada de explicaciones, nada de markdown ni bloques de código.\n" +
  "El JSON debe tener EXACTAMENTE esta forma:\n" +
  '{"name":"","emoji":"","desc":"","bonus":{},"passive":""}\n\n' +
  "Reglas:\n" +
  `- bonus solo puede usar estas claves: ${ATTRS.join(", ")}.\n` +
  "- El total de puntos repartidos en bonus debe estar entre 4 y 7.\n" +
  "- passive: una frase describiendo un efecto pasivo simple, con un número concreto (ej: '+5% de daño', '-10% de daño recibido', '+8% de oro obtenido').\n" +
  "- desc: 1-2 frases en español, tono de fantasía épica, coherente con el mundo de Elyndor.\n" +
  "- emoji: un solo emoji representativo.";

function buildRacePrompt(slug, description) {
  return (
    `Crea una raza jugable de RPG (clave interna: "${slug}") a partir de esta breve descripción que dio el owner del bot:\n\n` +
    `"${description}"\n\n` +
    "Sigue el esquema JSON indicado."
  );
}

function buildRaceModPrompt(slug, description) {
  return (
    `La raza jugable de RPG con clave interna "${slug}" ya existe en el juego y el owner del bot quiere REDISEÑARLA por ` +
    `completo a partir de esta nueva descripción:\n\n"${description}"\n\n` +
    "Ignorá cómo era la raza antes: generá una versión totalmente nueva y coherente con la nueva descripción, siguiendo " +
    "el esquema JSON indicado."
  );
}

// ── Saneamiento / validación ───────────────────────────────────────────

function clampNum(n, min, max, fallback) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, v));
}

function sanitizeAttrs(obj, maxTotal, perStatMax, fallbackKey = "fue") {
  const out = {};
  if (obj && typeof obj === "object") {
    for (const k of ATTRS) {
      if (obj[k] !== undefined) {
        const v = Math.round(clampNum(obj[k], 0, perStatMax, 0));
        if (v > 0) out[k] = v;
      }
    }
  }
  if (Object.keys(out).length === 0) out[fallbackKey] = 2;

  const total = Object.values(out).reduce((a, b) => a + b, 0);
  if (total > maxTotal) {
    const scale = maxTotal / total;
    for (const k of Object.keys(out)) {
      out[k] = Math.max(1, Math.round(out[k] * scale));
    }
  }
  return out;
}

function sanitizeSkills(skills, requireUltSuffix) {
  let arr = Array.isArray(skills)
    ? skills.filter((s) => typeof s === "string" && s.trim()).map((s) => s.trim().slice(0, 40))
    : [];
  while (arr.length < 3) arr.push(`Habilidad ${arr.length + 1}`);
  arr = arr.slice(0, 3);
  if (requireUltSuffix && !/\(ult\)/i.test(arr[2])) arr[2] = `${arr[2]} (ult)`;
  return arr;
}

function sanitizeText(text, maxLen, fallback) {
  if (typeof text !== "string" || !text.trim()) return fallback;
  return text.trim().slice(0, maxLen);
}

function sanitizeEmoji(emoji, fallback) {
  if (typeof emoji !== "string" || !emoji.trim()) return fallback;
  return Array.from(emoji.trim())[0] || fallback;
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Convierte lo que devolvió la IA en un par { inicial, avanzada } listo para
 * agregar a data.CLASSES. slug es la clave interna elegida por el owner.
 *
 * advancedKey es opcional: por defecto se arma como "${slug}_asc" (caso de
 * una clase nueva creada con IA). Al MODIFICAR una clase ya existente (fija
 * o custom) hay que pasar el advancedKey real que ya tenía, para no romper
 * la cadena advancesTo/requires con el resto del árbol de clases (ej: la
 * clase fija "guerrero" evoluciona a "paladin", no a "guerrero_asc").
 */
function validateClassPair(slug, json, advancedKey = `${slug}_asc`) {
  if (!json || typeof json !== "object" || !json.inicial || !json.avanzada) {
    throw new Error("La respuesta de la IA no tiene el formato esperado (faltan 'inicial'/'avanzada').");
  }

  const inicial = {
    name: sanitizeText(json.inicial.name, 30, capitalize(slug)),
    emoji: sanitizeEmoji(json.inicial.emoji, "🧙"),
    tier: "inicial",
    unlockLevel: 1,
    advancesTo: advancedKey,
    baseAttrs: sanitizeAttrs(json.inicial.baseAttrs, 6, 5),
    hpMul: clampNum(json.inicial.hpMul, 0.6, 1.8, 1.0),
    manaMul: clampNum(json.inicial.manaMul, 0.6, 1.8, 1.0),
    desc: sanitizeText(json.inicial.desc, 220, "Una clase misteriosa forjada en Elyndor."),
    skills: sanitizeSkills(json.inicial.skills, false),
    custom: true,
  };

  const avanzada = {
    name: sanitizeText(json.avanzada.name, 30, `${inicial.name} Ascendido`),
    emoji: sanitizeEmoji(json.avanzada.emoji, inicial.emoji),
    tier: "avanzada",
    unlockLevel: 15,
    requires: slug,
    baseAttrs: sanitizeAttrs(json.avanzada.baseAttrs, 9, 6),
    hpMul: clampNum(json.avanzada.hpMul, 0.6, 2.0, inicial.hpMul),
    manaMul: clampNum(json.avanzada.manaMul, 0.6, 2.0, inicial.manaMul),
    desc: sanitizeText(json.avanzada.desc, 220, `La evolución definitiva de ${inicial.name}.`),
    skills: sanitizeSkills(json.avanzada.skills, true),
    custom: true,
  };

  return { inicial, avanzada, advancedKey };
}

/**
 * Convierte lo que devolvió la IA en un objeto listo para agregar a data.RACES.
 */
function validateRace(slug, json) {
  if (!json || typeof json !== "object") {
    throw new Error("La respuesta de la IA no tiene el formato esperado.");
  }
  return {
    name: sanitizeText(json.name, 30, capitalize(slug)),
    emoji: sanitizeEmoji(json.emoji, "🧬"),
    desc: sanitizeText(json.desc, 220, "Una raza misteriosa nativa de Elyndor."),
    bonus: sanitizeAttrs(json.bonus, 7, 4),
    passive: sanitizeText(json.passive, 140, "Pasiva desconocida: no otorga efecto adicional."),
    custom: true,
  };
}

module.exports = {
  ATTRS,
  CLASS_SYSTEM_PROMPT,
  RACE_SYSTEM_PROMPT,
  buildClassPrompt,
  buildClassModPrompt,
  buildRacePrompt,
  buildRaceModPrompt,
  validateClassPair,
  validateRace,
};
