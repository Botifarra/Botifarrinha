// ═════════════════════════════════════════════════════════════════════════
// lib/customRpgContent.js
// Guarda en data/*.json las razas y clases que el owner crea con la IA
// (.rpgcrearclase / .rpgcrearraza) y las refleja EN VIVO dentro de
// data.RACES / data.CLASSES (lib/rpgData.js) para que estén disponibles de
// inmediato, sin reiniciar el bot.
//
// require("./rpgData") se hace siempre DENTRO de las funciones (no al tope
// del archivo) a propósito: rpgData.js requiere este archivo para cargar lo
// ya guardado al arrancar, así que un require circular al tope rompería la
// carga. Haciéndolo perezoso, para cuando estas funciones se llaman de
// verdad (durante un comando) rpgData.js ya terminó de cargar tranquilo.
// ═════════════════════════════════════════════════════════════════════════

const { load, save } = require("./db");

const CLASSES_KEY = "customClasses";
const CLASS_META_KEY = "customClassMeta";
const RACES_KEY = "customRaces";

// Overrides: permiten MODIFICAR con IA una clase/raza FIJA del juego (ej.
// "guerrero", "humano") sin tocar el código fuente de lib/rpgData.js. Se
// guardan y aplican por separado de customClasses/customRaces porque esos
// dos son exclusivamente para contenido creado desde cero con IA (y son la
// base de qué se puede borrar con .rpgborrarclase/.rpgborrarraza).
const CLASS_OVERRIDES_KEY = "classOverrides";
const CLASS_OVERRIDE_META_KEY = "classOverrideMeta";
const RACE_OVERRIDES_KEY = "raceOverrides";

function getCustomClasses() {
  return load(CLASSES_KEY, {});
}
function getCustomClassMeta() {
  return load(CLASS_META_KEY, {});
}
function getCustomRaces() {
  return load(RACES_KEY, {});
}
function getClassOverrides() {
  return load(CLASS_OVERRIDES_KEY, {});
}
function getClassOverrideMeta() {
  return load(CLASS_OVERRIDE_META_KEY, {});
}
function getRaceOverrides() {
  return load(RACE_OVERRIDES_KEY, {});
}

function hasClassKey(slug) {
  const data = require("./rpgData");
  return Boolean(data.CLASSES[slug]);
}
function hasRaceKey(slug) {
  const data = require("./rpgData");
  return Boolean(data.RACES[slug]);
}

/**
 * True si la clase (tier inicial) fue creada desde cero con .rpgcrearclase.
 * False si es una clase fija del juego (aunque ya se le haya aplicado un
 * override por .rpgmodclase).
 */
function isCustomClass(slug) {
  return Boolean(getCustomClassMeta()[slug]);
}

/**
 * True si la raza fue creada desde cero con .rpgcrearraza.
 * False si es una raza fija del juego (aunque ya tenga un override aplicado).
 */
function isCustomRace(slug) {
  return Object.prototype.hasOwnProperty.call(getCustomRaces(), slug);
}

/**
 * Agrega un par inicial/avanzada a data.CLASSES (en vivo) y lo persiste.
 */
function addCustomClassPair(slug, inicial, avanzada, meta = {}) {
  const data = require("./rpgData");
  const advancedKey = `${slug}_asc`;

  const classes = getCustomClasses();
  classes[slug] = inicial;
  classes[advancedKey] = avanzada;
  save(CLASSES_KEY, classes);

  const metaAll = getCustomClassMeta();
  metaAll[slug] = { advancedKey, createdAt: new Date().toISOString(), ...meta };
  save(CLASS_META_KEY, metaAll);

  data.CLASSES[slug] = inicial;
  data.CLASSES[advancedKey] = avanzada;

  return { slug, advancedKey };
}

/**
 * Elimina un par inicial/avanzada creado por IA. Devuelve false si no existía.
 */
function removeCustomClassPair(slug) {
  const data = require("./rpgData");
  const metaAll = getCustomClassMeta();
  const entry = metaAll[slug];
  if (!entry) return false;

  const classes = getCustomClasses();
  delete classes[slug];
  delete classes[entry.advancedKey];
  save(CLASSES_KEY, classes);

  delete metaAll[slug];
  save(CLASS_META_KEY, metaAll);

  delete data.CLASSES[slug];
  delete data.CLASSES[entry.advancedKey];

  return true;
}

/**
 * Agrega una raza a data.RACES (en vivo) y la persiste.
 */
function addCustomRace(slug, raceObj) {
  const data = require("./rpgData");

  const races = getCustomRaces();
  races[slug] = raceObj;
  save(RACES_KEY, races);

  data.RACES[slug] = raceObj;

  return { slug };
}

/**
 * Elimina una raza creada por IA. Devuelve false si no existía.
 */
function removeCustomRace(slug) {
  const data = require("./rpgData");
  const races = getCustomRaces();
  if (!races[slug]) return false;

  delete races[slug];
  save(RACES_KEY, races);

  delete data.RACES[slug];

  return true;
}

/**
 * Reemplaza con IA una clase FIJA del juego (par inicial/avanzada) por una
 * versión rediseñada, conservando el advancedKey original (ej: guerrero ->
 * paladin) para no romper la cadena advancesTo/requires. Se persiste aparte
 * de customClasses para que .rpgborrarclase siga sin poder tocar clases
 * fijas del juego.
 */
function setClassOverride(slug, advancedKey, inicial, avanzada, meta = {}) {
  const data = require("./rpgData");

  const overrides = getClassOverrides();
  overrides[slug] = inicial;
  overrides[advancedKey] = avanzada;
  save(CLASS_OVERRIDES_KEY, overrides);

  const metaAll = getClassOverrideMeta();
  metaAll[slug] = { advancedKey, updatedAt: new Date().toISOString(), ...meta };
  save(CLASS_OVERRIDE_META_KEY, metaAll);

  data.CLASSES[slug] = inicial;
  data.CLASSES[advancedKey] = avanzada;

  return { slug, advancedKey };
}

/**
 * Reemplaza con IA una raza FIJA del juego por una versión rediseñada. Se
 * persiste aparte de customRaces para que .rpgborrarraza siga sin poder
 * tocar razas fijas del juego.
 */
function setRaceOverride(slug, raceObj, meta = {}) {
  const data = require("./rpgData");

  const overrides = getRaceOverrides();
  overrides[slug] = raceObj;
  save(RACE_OVERRIDES_KEY, overrides);

  data.RACES[slug] = raceObj;

  return { slug };
}

module.exports = {
  getCustomClasses,
  getCustomClassMeta,
  getCustomRaces,
  getClassOverrides,
  getClassOverrideMeta,
  getRaceOverrides,
  hasClassKey,
  hasRaceKey,
  isCustomClass,
  isCustomRace,
  addCustomClassPair,
  removeCustomClassPair,
  addCustomRace,
  removeCustomRace,
  setClassOverride,
  setRaceOverride,
};
