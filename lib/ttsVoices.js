const fs = require("fs");
const path = require("path");

const FILE_PATH = path.join(__dirname, "..", "data", "ttsVoices.json");

// Voces neuronales de Edge en español que suenan bien (no son las clásicas
// robóticas de espeak/gTTS). Podés agregar más ids acá abajo; la lista
// completa se puede sacar corriendo `npx edge-tts --list-voices` o viendo
// la doc de msedge-tts. Estas son solo las que vienen precargadas como
// "de fábrica" antes de que el owner configure alias con .setvoz.
const DEFAULT_VOICES = {
  default: "es-MX-DaliaNeural", // voz por defecto si no se especifica -alias
  hombre: "es-MX-JorgeNeural",
  mujer: "es-MX-DaliaNeural",
};

function ensureFile() {
  const dir = path.dirname(FILE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(FILE_PATH)) {
    fs.writeFileSync(FILE_PATH, JSON.stringify(DEFAULT_VOICES, null, 2));
  }
}

function loadVoices() {
  ensureFile();
  try {
    const raw = fs.readFileSync(FILE_PATH, "utf8");
    return { ...DEFAULT_VOICES, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_VOICES };
  }
}

function saveVoices(voices) {
  ensureFile();
  fs.writeFileSync(FILE_PATH, JSON.stringify(voices, null, 2));
}

// Devuelve el id de voz de Edge (ej: "es-MX-JorgeNeural") para un alias
// (ej: "juanito"), o null si ese alias no existe.
function getVoiceId(alias) {
  const voices = loadVoices();
  return voices[alias.toLowerCase()] || null;
}

function getDefaultVoiceId() {
  const voices = loadVoices();
  return voices.default || DEFAULT_VOICES.default;
}

// Guarda/actualiza un alias -> id de voz de Edge.
function setVoiceAlias(alias, edgeVoiceId) {
  const voices = loadVoices();
  voices[alias.toLowerCase()] = edgeVoiceId;
  saveVoices(voices);
}

function removeVoiceAlias(alias) {
  const voices = loadVoices();
  const key = alias.toLowerCase();
  if (!(key in voices)) return false;
  delete voices[key];
  saveVoices(voices);
  return true;
}

function listVoices() {
  return loadVoices();
}

module.exports = {
  getVoiceId,
  getDefaultVoiceId,
  setVoiceAlias,
  removeVoiceAlias,
  listVoices,
};
