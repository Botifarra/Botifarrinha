// lib/truecaller.js
//
// Cliente mínimo para la API de búsqueda de Truecaller, adaptado del paquete
// open-source "truecallerjs" (https://github.com/sumithemmadi/truecallerjs).
//
// Este módulo SOLO hace la búsqueda (search). No hace login: eso se hace una
// única vez, a mano, siguiendo TRUECALLER_SETUP.md, para obtener un
// "installationId" que después se guarda en config.js / .env.
//
// No depende de "awesome-phonenumber" (no viene instalado en el bot): en su
// lugar se usa una tabla simple de códigos de país para separar el código de
// discado del número significativo, con fallback razonable si no matchea nada.

const axios = require("axios");

// código de discado -> { región ISO, largos válidos del número sin el código }
const CALLING_CODES = {
  "56": { region: "CL", sigLengths: [8, 9] },
  "54": { region: "AR", sigLengths: [10, 11] },
  "57": { region: "CO", sigLengths: [10] },
  "51": { region: "PE", sigLengths: [9] },
  "52": { region: "MX", sigLengths: [10] },
  "34": { region: "ES", sigLengths: [9] },
  "1": { region: "US", sigLengths: [10] },
  "55": { region: "BR", sigLengths: [10, 11] },
  "58": { region: "VE", sigLengths: [10] },
  "593": { region: "EC", sigLengths: [9] },
  "591": { region: "BO", sigLengths: [8] },
  "595": { region: "PY", sigLengths: [9] },
  "598": { region: "UY", sigLengths: [8, 9] },
};

// Separa un número crudo en { significant, region }.
// Si regionOverride viene definido (ej: "AR"), se asume que "raw" YA es el
// número significativo (sin código de país) y no se intenta detectar nada.
function parseNumber(raw, regionOverride) {
  const digits = String(raw || "").replace(/\D/g, "");

  if (regionOverride) {
    return { significant: digits, region: regionOverride.toUpperCase() };
  }

  const codes = Object.keys(CALLING_CODES).sort((a, b) => b.length - a.length);
  for (const code of codes) {
    if (!digits.startsWith(code)) continue;
    const rest = digits.slice(code.length);
    if (CALLING_CODES[code].sigLengths.includes(rest.length)) {
      return { significant: rest, region: CALLING_CODES[code].region };
    }
  }

  // Fallback: no se detectó ningún código conocido, se usa el número
  // completo tal cual y Chile como región por defecto.
  return { significant: digits, region: "CL" };
}

async function searchNumber(rawNumber, installationId, regionOverride) {
  if (!installationId) {
    throw new Error("Falta installationId de Truecaller.");
  }

  const { significant, region } = parseNumber(rawNumber, regionOverride);
  if (!significant || significant.length < 5) {
    throw new Error("Número inválido.");
  }

  const response = await axios.get(
    "https://search5-noneu.truecaller.com/v2/search",
    {
      params: {
        q: significant,
        countryCode: region,
        type: 4,
        locAddr: "",
        placement: "SEARCHRESULTS,HISTORY,DETAILS",
        encoding: "json",
      },
      headers: {
        "content-type": "application/json; charset=UTF-8",
        "accept-encoding": "gzip",
        "user-agent": "Truecaller/11.75.5 (Android;10)",
        Authorization: `Bearer ${installationId}`,
      },
      timeout: 15000,
    }
  );

  return response.data;
}

module.exports = { searchNumber, parseNumber };
