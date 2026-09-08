// ═════════════════════════════════════════════════════════════════════════
// lib/rpgData.js
// Contenido estático del mundo de Elyndor: razas, clases, dioses, regiones,
// items, monstruos, mazmorras, recetas de crafteo, tienda NPC y misiones.
// Nada de esto se guarda por usuario -- es el "libro de reglas" que lee el
// motor (lib/rpg.js) y los comandos (commands/rpg.js).
// ═════════════════════════════════════════════════════════════════════════

// ── Atributos base ──────────────────────────────────────────────────────
const ATTRS = ["fue", "des", "con", "int", "sab", "car"];
const ATTR_NAMES = {
  fue: "Fuerza",
  des: "Destreza",
  con: "Constitución",
  int: "Inteligencia",
  sab: "Sabiduría",
  car: "Carisma",
};

// ── Razas jugables ──────────────────────────────────────────────────────
const RACES = {
  humano: {
    name: "Humano",
    emoji: "🧑",
    desc: "Adaptables y ambiciosos, los humanos de Elyndor prosperan en cualquier region.",
    bonus: { fue: 1, des: 1, con: 1, int: 1, sab: 1, car: 1 },
    passive: "Versatilidad: gana +5% de XP en todas las actividades.",
  },
  elfo: {
    name: "Elfo",
    emoji: "🧝",
    desc: "Hijos de los bosques ancestrales, longevos y afines a la magia.",
    bonus: { des: 3, int: 2, sab: 1 },
    passive: "Ojo Certero: +5% de probabilidad de golpe crítico.",
  },
  orco: {
    name: "Orco",
    emoji: "👹",
    desc: "Guerreros de las tierras baldías, fuertes y temidos en el campo de batalla.",
    bonus: { fue: 4, con: 2 },
    passive: "Furia de Sangre: +10% de daño cuando la vida baja del 30%.",
  },
  enano: {
    name: "Enano",
    emoji: "🧔",
    desc: "Herreros y mineros de las Montañas Grises, tercos e inquebrantables.",
    bonus: { con: 3, fue: 2, sab: 1 },
    passive: "Piel de Piedra: -10% de daño físico recibido.",
  },
  tiefling: {
    name: "Tiefling",
    emoji: "😈",
    desc: "Marcados por sangre infernal, desconfiados pero de voluntad de hierro.",
    bonus: { int: 2, car: 3, con: 1 },
    passive: "Resistencia Infernal: inmune a quemaduras/veneno un turno cada combate.",
  },
  draconiano: {
    name: "Draconiano",
    emoji: "🐉",
    desc: "Descendientes de los dragones ancestrales, escamas duras y aliento feroz.",
    bonus: { fue: 2, con: 2, car: 2 },
    passive: "Aliento Ancestral: el ultimate de clase inflige +15% de daño.",
  },
  gnomo: {
    name: "Gnomo",
    emoji: "🧙‍♂️",
    desc: "Ingeniosos habitantes de las Colinas Huecas, obsesionados con artefactos y arcanos menores.",
    bonus: { int: 3, des: 2, car: 1 },
    passive: "Mente Ágil: -10% de coste de maná en habilidades.",
  },
  semiorco: {
    name: "Semiorco",
    emoji: "🗿",
    desc: "Nacidos entre dos mundos, cargan la fuerza de los orcos y la tenacidad humana.",
    bonus: { fue: 3, con: 2, car: 1 },
    passive: "Sangre Mixta: +5% de vida máxima y +5% de resistencia al miedo.",
  },
  elfo_oscuro: {
    name: "Elfo Oscuro",
    emoji: "🖤",
    desc: "Exiliados de los bosques de luz, dominan las sombras de las Profundidades de Kaeloth.",
    bonus: { des: 3, int: 1, car: 2 },
    passive: "Paso de Sombra: +8% de evasión contra ataques.",
  },
  celestial: {
    name: "Celestial",
    emoji: "🕊️",
    desc: "Portadores de una chispa divina, guiados por los designios de los dioses de Elyndor.",
    bonus: { sab: 3, car: 2, con: 1 },
    passive: "Gracia Divina: +8% de curación recibida y otorgada.",
  },
  golem_viviente: {
    name: "Gólem Viviente",
    emoji: "🗻",
    desc: "Constructos animados por magia ancestral, lentos pero prácticamente indestructibles.",
    bonus: { con: 4, fue: 2 },
    passive: "Núcleo de Piedra: inmune a efectos de veneno y sangrado.",
  },
  fenrix: {
    name: "Fenrix",
    emoji: "🐺",
    desc: "Cazadores con sangre de bestia legendaria, veloces y de instintos afilados.",
    bonus: { des: 2, fue: 2, con: 2 },
    passive: "Instinto de Manada: +10% de daño cuando luchas junto a otro jugador.",
  },
};

// ── Clases iniciales y avanzadas ────────────────────────────────────────
// unlockLevel = 1 -> inicial. Las avanzadas se desbloquean con .rpgascender al llegar al nivel.
const CLASSES = {
  guerrero: {
    name: "Guerrero",
    emoji: "⚔️",
    tier: "inicial",
    unlockLevel: 1,
    advancesTo: "paladin",
    baseAttrs: { fue: 3, con: 2 },
    hpMul: 1.3,
    manaMul: 0.6,
    desc: "Maestro del acero y el escudo. Alta vida y daño físico sostenido.",
    skills: ["Golpe Poderoso", "Grito de Guerra", "Última Defensa (ult)"],
  },
  mago: {
    name: "Mago",
    emoji: "🔮",
    tier: "inicial",
    unlockLevel: 1,
    advancesTo: "nigromante",
    baseAttrs: { int: 3, sab: 1 },
    hpMul: 0.85,
    manaMul: 1.6,
    desc: "Manipula las energías arcanas de Elyndor. Frágil pero devastador.",
    skills: ["Bola de Fuego", "Escudo Arcano", "Meteoro (ult)"],
  },
  picaro: {
    name: "Pícaro",
    emoji: "🗡️",
    tier: "inicial",
    unlockLevel: 1,
    advancesTo: "asesino",
    baseAttrs: { des: 3, car: 1 },
    hpMul: 1.0,
    manaMul: 0.9,
    desc: "Rápido y letal, golpea antes de que lo vean venir.",
    skills: ["Puñalada Trasera", "Ataque Doble", "Sombra Mortal (ult)"],
  },
  clerigo: {
    name: "Clérigo",
    emoji: "✨",
    tier: "inicial",
    unlockLevel: 1,
    advancesTo: "sumosacerdote",
    baseAttrs: { sab: 3, con: 1 },
    hpMul: 1.05,
    manaMul: 1.3,
    desc: "Canaliza la fe de los dioses para sanar y castigar.",
    skills: ["Luz Sagrada", "Bendición", "Juicio Divino (ult)"],
  },
  barbaro: {
    name: "Bárbaro",
    emoji: "🪓",
    tier: "inicial",
    unlockLevel: 1,
    advancesTo: "campeon",
    baseAttrs: { fue: 3, con: 2 },
    hpMul: 1.45,
    manaMul: 0.3,
    desc: "Furia pura sin refinamiento. El que más vida tiene, el que más pega.",
    skills: ["Golpe Salvaje", "Rugido", "Ira Ancestral (ult)"],
  },
  hechicero: {
    name: "Hechicero",
    emoji: "🌀",
    tier: "inicial",
    unlockLevel: 1,
    advancesTo: "archimago",
    baseAttrs: { int: 2, car: 2 },
    hpMul: 0.9,
    manaMul: 1.5,
    desc: "Magia caótica heredada en la sangre, impredecible y poderosa.",
    skills: ["Descarga Caótica", "Distorsión", "Colapso Arcano (ult)"],
  },
  druida: {
    name: "Druida",
    emoji: "🌿",
    tier: "inicial",
    unlockLevel: 1,
    advancesTo: "guardianbosque",
    baseAttrs: { sab: 2, con: 2 },
    hpMul: 1.1,
    manaMul: 1.1,
    desc: "Guardián del equilibrio natural, se apoya en bestias y plantas.",
    skills: ["Zarpazo", "Enredadera", "Forma Bestial (ult)"],
  },
  paladin: {
    name: "Paladín",
    emoji: "🛡️",
    tier: "avanzada",
    unlockLevel: 15,
    requires: "guerrero",
    baseAttrs: { fue: 2, sab: 2, con: 1 },
    hpMul: 1.4,
    manaMul: 1.0,
    desc: "Guerrero sagrado, funde acero y fe en un solo golpe.",
    skills: ["Martillo Sagrado", "Aura de Justicia", "Castigo del Alba (ult)"],
  },
  nigromante: {
    name: "Nigromante",
    emoji: "💀",
    tier: "avanzada",
    unlockLevel: 15,
    requires: "mago",
    baseAttrs: { int: 3, con: 1 },
    hpMul: 0.95,
    manaMul: 1.7,
    desc: "Domina la muerte misma, drena vida y levanta a los caídos.",
    skills: ["Toque Necrótico", "Drenar Vida", "Legión de Huesos (ult)"],
  },
  asesino: {
    name: "Asesino",
    emoji: "🥷",
    tier: "avanzada",
    unlockLevel: 15,
    requires: "picaro",
    baseAttrs: { des: 4 },
    hpMul: 1.05,
    manaMul: 0.9,
    desc: "El pícaro perfeccionado: cada golpe busca ser el último.",
    skills: ["Marca de Sangre", "Golpe Fantasma", "Ejecución (ult)"],
  },
  sumosacerdote: {
    name: "Sumo Sacerdote",
    emoji: "🕊️",
    tier: "avanzada",
    unlockLevel: 15,
    requires: "clerigo",
    baseAttrs: { sab: 4 },
    hpMul: 1.15,
    manaMul: 1.5,
    desc: "Voz directa de los dioses, la fe se vuelve poder tangible.",
    skills: ["Resurrección Menor", "Ira Divina", "Apocalipsis Sagrado (ult)"],
  },
  campeon: {
    name: "Campeón",
    emoji: "🏆",
    tier: "avanzada",
    unlockLevel: 15,
    requires: "barbaro",
    baseAttrs: { fue: 4, con: 1 },
    hpMul: 1.6,
    manaMul: 0.3,
    desc: "Leyenda viviente de los campos de batalla de Elyndor.",
    skills: ["Devastación", "Grito del Campeón", "Masacre Total (ult)"],
  },
  archimago: {
    name: "Archimago",
    emoji: "🌌",
    tier: "avanzada",
    unlockLevel: 15,
    requires: "hechicero",
    baseAttrs: { int: 4 },
    hpMul: 0.95,
    manaMul: 1.8,
    desc: "Maestro absoluto del caos arcano, temido en toda region.",
    skills: ["Tormenta de Maná", "Anulación", "Fin de los Días (ult)"],
  },
  guardianbosque: {
    name: "Guardián del Bosque",
    emoji: "🌳",
    tier: "avanzada",
    unlockLevel: 15,
    requires: "druida",
    baseAttrs: { sab: 3, con: 2 },
    hpMul: 1.3,
    manaMul: 1.2,
    desc: "El druida asciende a protector eterno de la naturaleza salvaje.",
    skills: ["Furia Natural", "Raíces Ancestrales", "Corazón del Bosque (ult)"],
  },

  // ── Clases iniciales nuevas ──────────────────────────────────────────
  cazador: {
    name: "Cazador",
    emoji: "🏹",
    tier: "inicial",
    unlockLevel: 1,
    advancesTo: "guardabosques",
    baseAttrs: { des: 2, sab: 2 },
    hpMul: 1.1,
    manaMul: 0.8,
    desc: "Rastreador experto de las fronteras salvajes de Elyndor, letal a distancia.",
    skills: ["Disparo Certero", "Trampa de Caza", "Lluvia de Flechas (ult)"],
  },
  monje: {
    name: "Monje",
    emoji: "🥋",
    tier: "inicial",
    unlockLevel: 1,
    advancesTo: "maestrozen",
    baseAttrs: { des: 2, sab: 1, con: 1 },
    hpMul: 1.15,
    manaMul: 1.0,
    desc: "Disciplina corporal y espiritual de los templos de Kaeloth, combate a mano desnuda.",
    skills: ["Golpe de Chi", "Meditación de Combate", "Puño del Vacío (ult)"],
  },
  invocador: {
    name: "Invocador",
    emoji: "📜",
    tier: "inicial",
    unlockLevel: 1,
    advancesTo: "archiinvocador",
    baseAttrs: { int: 2, car: 2 },
    hpMul: 0.9,
    manaMul: 1.5,
    desc: "Convoca criaturas menores desde otros planos para que luchen a su lado.",
    skills: ["Invocar Espíritu", "Pacto Menor", "Legión Convocada (ult)"],
  },
  bardo: {
    name: "Bardo",
    emoji: "🎻",
    tier: "inicial",
    unlockLevel: 1,
    advancesTo: "virtuoso",
    baseAttrs: { car: 3, des: 1 },
    hpMul: 1.0,
    manaMul: 1.2,
    desc: "Sus canciones inspiran a aliados y desmoralizan enemigos por igual.",
    skills: ["Melodía Alentadora", "Nota Discordante", "Sinfonía de Guerra (ult)"],
  },

  // ── Clases avanzadas nuevas ───────────────────────────────────────────
  guardabosques: {
    name: "Guardabosques",
    emoji: "🌲",
    tier: "avanzada",
    unlockLevel: 15,
    requires: "cazador",
    baseAttrs: { des: 4, sab: 1 },
    hpMul: 1.2,
    manaMul: 0.9,
    desc: "El cazador se convierte en protector implacable de sus territorios.",
    skills: ["Ráfaga Perforante", "Compañero Fiel", "Tormenta de Flechas (ult)"],
  },
  maestrozen: {
    name: "Maestro Zen",
    emoji: "☯️",
    tier: "avanzada",
    unlockLevel: 15,
    requires: "monje",
    baseAttrs: { des: 3, sab: 2 },
    hpMul: 1.3,
    manaMul: 1.1,
    desc: "Alcanza la armonía absoluta entre cuerpo y espíritu.",
    skills: ["Torbellino de Golpes", "Cuerpo de Jade", "Iluminación Marcial (ult)"],
  },
  archiinvocador: {
    name: "Archiinvocador",
    emoji: "🐲",
    tier: "avanzada",
    unlockLevel: 15,
    requires: "invocador",
    baseAttrs: { int: 3, car: 2 },
    hpMul: 0.95,
    manaMul: 1.7,
    desc: "Sus pactos alcanzan a entidades mayores de otros planos de existencia.",
    skills: ["Portal Menor", "Pacto Mayor", "Convocar Titán (ult)"],
  },
  virtuoso: {
    name: "Virtuoso",
    emoji: "🎭",
    tier: "avanzada",
    unlockLevel: 15,
    requires: "bardo",
    baseAttrs: { car: 4, des: 1 },
    hpMul: 1.1,
    manaMul: 1.4,
    desc: "Su arte se vuelve leyenda: una sola nota puede cambiar el rumbo de una batalla.",
    skills: ["Réquiem de Guerra", "Improvisación Letal", "Obra Maestra (ult)"],
  },
};

// ── Dioses y religiones ─────────────────────────────────────────────────
const GODS = {
  aurelion: {
    name: "Aurelion, el Alba Eterna",
    emoji: "☀️",
    alignment: "Legal Bueno",
    domain: "Luz, honor, sanación",
    blessing: "+10% de vida máxima y curación en combate",
    curse: "Los que rompen juramentos pierden favor rápidamente",
    mission: "Derrotar 20 monstruos de las tierras malditas",
  },
  nyxara: {
    name: "Nyxara, la Dama de Sombras",
    emoji: "🌑",
    alignment: "Caótico Neutral",
    domain: "Sigilo, secretos, fortuna",
    blessing: "+8% de oro obtenido y +5% crítico",
    curse: "La deshonestidad pública le enfurece",
    mission: "Completar 5 subastas en el mercado",
  },
  thalgrim: {
    name: "Thalgrim, Forjador de Montañas",
    emoji: "⛏️",
    alignment: "Legal Neutral",
    domain: "Forja, minería, resistencia",
    blessing: "-15% de coste en crafteo",
    curse: "Odia a quienes destruyen sin construir",
    mission: "Forjar 10 objetos en la forja",
  },
  sylvane: {
    name: "Sylvane, Madre Verde",
    emoji: "🌿",
    alignment: "Neutral Bueno",
    domain: "Naturaleza, vida, equilibrio",
    blessing: "+10% de regeneración de vida y maná fuera de combate",
    curse: "La deforestación y la crueldad animal la ofenden",
    mission: "Explorar el Bosque Ancestral 15 veces",
  },
  morvakh: {
    name: "Morvakh, el Devorador",
    emoji: "🔥",
    alignment: "Caótico Malvado",
    domain: "Guerra, destrucción, dolor",
    blessing: "+12% de daño en combate",
    curse: "Penaliza la piedad y la rendición",
    mission: "Ganar 10 duelos PvP",
  },
  ithara: {
    name: "Ithara, Tejedora del Destino",
    emoji: "🔮",
    alignment: "Neutral",
    domain: "Destino, conocimiento, magia",
    blessing: "+10% de XP obtenida",
    curse: "Castiga a quienes ignoran las profecías (misiones)",
    mission: "Completar 3 misiones épicas",
  },
  drennok: {
    name: "Drennok, Señor de Huesos",
    emoji: "☠️",
    alignment: "Legal Malvado",
    domain: "Muerte, orden, tributo",
    blessing: "-25% de costo de resurrección",
    curse: "Quienes evitan la muerte demasiado tiempo pierden su favor",
    mission: "Morir y resucitar 3 veces (sí, en serio)",
  },
  ozmentia: {
    name: "Ozmentia, la Corriente Infinita",
    emoji: "🌊",
    alignment: "Caótico Bueno",
    domain: "Viajes, libertad, cambio",
    blessing: "-30% de cooldown en viajes",
    curse: "Aborrece la vida sedentaria y los grilletes",
    mission: "Viajar a las 7 regiones al menos una vez",
  },
};

// ── Regiones del mundo de Elyndor ───────────────────────────────────────
const REGIONS = {
  capital: {
    name: "Valdorien, la Ciudad Dorada",
    emoji: "🏰",
    desc: "Capital de Elyndor, cuna del comercio y la política. Zona segura.",
    minLevel: 1,
    travelCost: 0,
  },
  bosque: {
    name: "Bosque Ancestral de Sylmara",
    emoji: "🌲",
    desc: "Árboles milenarios que susurran secretos olvidados.",
    minLevel: 1,
    travelCost: 20,
  },
  montanas: {
    name: "Montañas Grises de Kharzun",
    emoji: "🏔️",
    desc: "Picos nevados habitados por enanos, gigantes y bestias heladas.",
    minLevel: 5,
    travelCost: 50,
  },
  desierto: {
    name: "Desierto Maldito de Ashkar",
    emoji: "🏜️",
    desc: "Arenas ardientes que ocultan ruinas y muertos vivientes.",
    minLevel: 10,
    travelCost: 90,
  },
  ruinas: {
    name: "Ruinas de Eldrathis",
    emoji: "🏛️",
    desc: "Restos de una civilización que desafió a los dioses.",
    minLevel: 15,
    travelCost: 140,
  },
  ciudadflotante: {
    name: "Aerathas, la Ciudad Flotante",
    emoji: "🌆",
    desc: "Una metrópolis suspendida por magia antigua, hogar de archimagos.",
    minLevel: 20,
    travelCost: 200,
  },
  infierno: {
    name: "Fauces de Morvakh",
    emoji: "🌋",
    desc: "Un infierno menor donde la lava y los demonios nunca descansan.",
    minLevel: 25,
    travelCost: 300,
  },
};

// ── Rareza de items ──────────────────────────────────────────────────────
const RARITY = {
  comun: { label: "Común", emoji: "⚪", mult: 1.0, order: 1 },
  pocoComun: { label: "Poco Común", emoji: "🟢", mult: 1.3, order: 2 },
  raro: { label: "Raro", emoji: "🔵", mult: 1.7, order: 3 },
  epico: { label: "Épico", emoji: "🟣", mult: 2.3, order: 4 },
  legendario: { label: "Legendario", emoji: "🟠", mult: 3.2, order: 5 },
  mitico: { label: "Mítico", emoji: "🔴", mult: 4.5, order: 6 },
};

// ── Catálogo de items ────────────────────────────────────────────────────
// type: weapon | armor | accessory | relic | consumable | material
const ITEMS = {
  espada_oxidada: { name: "Espada Oxidada", emoji: "🗡️", type: "weapon", rarity: "comun", atk: 4, weight: 3, price: 30 },
  espada_acero: { name: "Espada de Acero", emoji: "⚔️", type: "weapon", rarity: "pocoComun", atk: 9, weight: 4, price: 120 },
  espada_elfica: { name: "Espada Élfica Curva", emoji: "🗡️", type: "weapon", rarity: "raro", atk: 15, weight: 2, price: 350 },
  bordon_arcano: { name: "Bordón Arcano", emoji: "🪄", type: "weapon", rarity: "pocoComun", atk: 7, mag: 6, weight: 2, price: 130 },
  bordon_ancestral: { name: "Bordón Ancestral de Sylmara", emoji: "🪄", type: "weapon", rarity: "epico", atk: 10, mag: 18, weight: 2, price: 900 },
  dagas_gemelas: { name: "Dagas Gemelas", emoji: "🔪", type: "weapon", rarity: "raro", atk: 13, crit: 8, weight: 1, price: 300 },
  hacha_barbara: { name: "Hacha Bárbara", emoji: "🪓", type: "weapon", rarity: "pocoComun", atk: 11, weight: 5, price: 140 },
  martillo_thalgrim: { name: "Martillo de Thalgrim", emoji: "🔨", type: "weapon", rarity: "legendario", atk: 30, weight: 6, price: 2200 },
  espada_dragon: { name: "Colmillo de Dragón", emoji: "🐲", type: "weapon", rarity: "mitico", atk: 45, mag: 15, weight: 4, price: 6000 },

  ropa_viajero: { name: "Ropa de Viajero", emoji: "🧥", type: "armor", rarity: "comun", def: 3, weight: 2, price: 25 },
  cota_malla: { name: "Cota de Malla", emoji: "🥋", type: "armor", rarity: "pocoComun", def: 8, weight: 6, price: 110 },
  armadura_enana: { name: "Armadura Enana de Kharzun", emoji: "🛡️", type: "armor", rarity: "raro", def: 14, weight: 8, price: 320 },
  tunica_arcana: { name: "Túnica Arcana", emoji: "👘", type: "armor", rarity: "raro", def: 8, mag: 10, weight: 2, price: 300 },
  placas_paladin: { name: "Placas del Paladín", emoji: "🛡️", type: "armor", rarity: "epico", def: 22, weight: 9, price: 950 },
  escamas_dracas: { name: "Escamas Draconianas", emoji: "🦴", type: "armor", rarity: "legendario", def: 32, weight: 7, price: 2400 },
  egida_eldrathis: { name: "Égida de Eldrathis", emoji: "🏺", type: "armor", rarity: "mitico", def: 45, weight: 5, price: 6500 },

  anillo_cobre: { name: "Anillo de Cobre", emoji: "💍", type: "accessory", rarity: "comun", allAttr: 1, weight: 0, price: 40 },
  amuleto_sylmara: { name: "Amuleto de Sylmara", emoji: "🧿", type: "accessory", rarity: "pocoComun", sab: 3, weight: 0, price: 150 },
  colgante_sombras: { name: "Colgante de Sombras", emoji: "🖤", type: "accessory", rarity: "raro", des: 4, crit: 5, weight: 0, price: 340 },
  corona_valdorien: { name: "Corona Menor de Valdorien", emoji: "👑", type: "accessory", rarity: "epico", car: 6, allAttr: 2, weight: 0, price: 1000 },
  reliquia_dioses: { name: "Reliquia de los Siete Dioses", emoji: "🔱", type: "relic", rarity: "legendario", allAttr: 5, weight: 0, price: 2600 },
  corazon_dragon: { name: "Corazón de Dragón Ancestral", emoji: "❤️‍🔥", type: "relic", rarity: "mitico", allAttr: 8, hpBonus: 100, weight: 0, price: 7000 },

  pocion_menor: { name: "Poción de Vida Menor", emoji: "🧪", type: "consumable", rarity: "comun", heal: 40, weight: 1, price: 15 },
  pocion_mayor: { name: "Poción de Vida Mayor", emoji: "🧪", type: "consumable", rarity: "pocoComun", heal: 120, weight: 1, price: 60 },
  elixir_mana: { name: "Elixir de Maná", emoji: "🔵", type: "consumable", rarity: "pocoComun", manaRestore: 80, weight: 1, price: 55 },
  antidoto: { name: "Antídoto de Sylmara", emoji: "🍃", type: "consumable", rarity: "comun", cureStatus: true, weight: 1, price: 20 },
  pan_viajero: { name: "Pan de Viajero", emoji: "🍞", type: "consumable", rarity: "comun", heal: 15, weight: 1, price: 8 },
  elixir_fenix: { name: "Elixir de Fénix", emoji: "🔥", type: "consumable", rarity: "epico", reviveFull: true, weight: 1, price: 500 },

  cuero_lobo: { name: "Cuero de Lobo", emoji: "🐺", type: "material", rarity: "comun", weight: 1, price: 10 },
  mineral_hierro: { name: "Mineral de Hierro", emoji: "⛏️", type: "material", rarity: "comun", weight: 2, price: 12 },
  mineral_mithril: { name: "Mineral de Mithril", emoji: "💎", type: "material", rarity: "raro", weight: 2, price: 200 },
  esencia_arcana: { name: "Esencia Arcana", emoji: "🔷", type: "material", rarity: "pocoComun", weight: 1, price: 45 },
  hueso_dracaniano: { name: "Hueso Draconiano", emoji: "🦴", type: "material", rarity: "epico", weight: 3, price: 600 },
  escama_infernal: { name: "Escama Infernal", emoji: "🔥", type: "material", rarity: "raro", weight: 2, price: 180 },
};

// ── Tienda NPC (precios fijos, siempre disponibles) ─────────────────────
const NPC_SHOP = [
  "espada_oxidada", "ropa_viajero", "pocion_menor", "pocion_mayor",
  "elixir_mana", "antidoto", "pan_viajero", "anillo_cobre", "espada_acero",
  "cota_malla", "hacha_barbara",
];

// ── Recetas de crafteo (forja / alquimia) ───────────────────────────────
const RECIPES = {
  espada_acero: {
    result: "espada_acero",
    qty: 1,
    materials: { mineral_hierro: 4, cuero_lobo: 1 },
    craftLevel: 3,
    gold: 40,
  },
  cota_malla: {
    result: "cota_malla",
    qty: 1,
    materials: { mineral_hierro: 6 },
    craftLevel: 4,
    gold: 50,
  },
  tunica_arcana: {
    result: "tunica_arcana",
    qty: 1,
    materials: { esencia_arcana: 5, mineral_hierro: 2 },
    craftLevel: 8,
    gold: 120,
  },
  colgante_sombras: {
    result: "colgante_sombras",
    qty: 1,
    materials: { esencia_arcana: 3, cuero_lobo: 4 },
    craftLevel: 10,
    gold: 150,
  },
  armadura_enana: {
    result: "armadura_enana",
    qty: 1,
    materials: { mineral_mithril: 3, mineral_hierro: 8 },
    craftLevel: 14,
    gold: 250,
  },
  espada_elfica: {
    result: "espada_elfica",
    qty: 1,
    materials: { mineral_mithril: 2, esencia_arcana: 4 },
    craftLevel: 14,
    gold: 260,
  },
  elixir_mana: {
    result: "elixir_mana",
    qty: 3,
    materials: { esencia_arcana: 2 },
    craftLevel: 5,
    gold: 20,
  },
  pocion_mayor: {
    result: "pocion_mayor",
    qty: 3,
    materials: { cuero_lobo: 2, mineral_hierro: 1 },
    craftLevel: 6,
    gold: 25,
  },
  placas_paladin: {
    result: "placas_paladin",
    qty: 1,
    materials: { mineral_mithril: 5, hueso_dracaniano: 1 },
    craftLevel: 22,
    gold: 500,
  },
  escamas_dracas: {
    result: "escamas_dracas",
    qty: 1,
    materials: { hueso_dracaniano: 3, escama_infernal: 3 },
    craftLevel: 28,
    gold: 900,
  },
};

// ── Monstruos ─────────────────────────────────────────────────────────
// hp/atk/def escalan con el nivel del monstruo. xp y gold son la recompensa base.
const MONSTERS = [
  { id: "rata_gigante", name: "Rata Gigante", emoji: "🐀", level: 1, hp: 30, atk: 4, def: 1, xp: 12, gold: 8 },
  { id: "lobo_salvaje", name: "Lobo Salvaje", emoji: "🐺", level: 2, hp: 45, atk: 6, def: 2, xp: 18, gold: 12 },
  { id: "bandido", name: "Bandido de Camino", emoji: "🗡️", level: 3, hp: 55, atk: 8, def: 3, xp: 24, gold: 20 },
  { id: "goblin", name: "Goblin Merodeador", emoji: "👺", level: 4, hp: 65, atk: 9, def: 3, xp: 28, gold: 22 },
  { id: "arana_venenosa", name: "Araña Venenosa", emoji: "🕷️", level: 6, hp: 80, atk: 12, def: 4, xp: 38, gold: 30, statusChance: { poison: 0.3 } },
  { id: "troll_montana", name: "Troll de Montaña", emoji: "🧌", level: 9, hp: 140, atk: 16, def: 8, xp: 60, gold: 55 },
  { id: "espectro_helado", name: "Espectro Helado", emoji: "👻", level: 11, hp: 120, atk: 20, def: 5, xp: 75, gold: 65, statusChance: { stun: 0.15 } },
  { id: "momia_ashkar", name: "Momia de Ashkar", emoji: "🧟", level: 13, hp: 170, atk: 22, def: 9, xp: 95, gold: 85, statusChance: { poison: 0.25 } },
  { id: "guardian_ruinas", name: "Guardián de las Ruinas", emoji: "🗿", level: 16, hp: 230, atk: 26, def: 14, xp: 130, gold: 120 },
  { id: "elemental_arcano", name: "Elemental Arcano", emoji: "🌀", level: 19, hp: 210, atk: 32, def: 10, xp: 160, gold: 150 },
  { id: "quimera", name: "Quimera Alada", emoji: "🐲", level: 22, hp: 300, atk: 36, def: 16, xp: 210, gold: 200, statusChance: { bleed: 0.2 } },
  { id: "diablillo_menor", name: "Diablillo Menor", emoji: "😈", level: 26, hp: 260, atk: 42, def: 12, xp: 250, gold: 240 },
  { id: "dragon_joven", name: "Dragón Joven de Elyndor", emoji: "🐉", level: 30, hp: 420, atk: 50, def: 20, xp: 340, gold: 320 },
];

function monstersForLevel(level) {
  // Devuelve monstruos "razonables" para el nivel del jugador (± rango).
  return MONSTERS.filter((m) => Math.abs(m.level - level) <= 4 || m.level <= level);
}

// ── Mazmorras ────────────────────────────────────────────────────────────
// Cada mazmorra tiene pisos (con monstruos que escalan) y un jefe final.
const DUNGEONS = {
  cripta_susurros: {
    name: "Cripta de los Susurros",
    emoji: "⚰️",
    minLevel: 3,
    floors: 3,
    region: "bosque",
    monsterPool: ["rata_gigante", "lobo_salvaje", "bandido", "goblin"],
    boss: { id: "senor_criptas", name: "Señor de las Criptas", emoji: "💀", level: 6, hp: 220, atk: 18, def: 6, xp: 150, gold: 130 },
    rewardPool: ["espada_acero", "cota_malla", "pocion_mayor", "mineral_hierro"],
    cooldownMs: 60 * 60 * 1000,
  },
  minas_kharzun: {
    name: "Minas Perdidas de Kharzun",
    emoji: "⛏️",
    minLevel: 8,
    floors: 4,
    region: "montanas",
    monsterPool: ["goblin", "arana_venenosa", "troll_montana"],
    boss: { id: "rey_troll", name: "Rey Troll de las Minas", emoji: "🧌", level: 12, hp: 420, atk: 28, def: 12, xp: 300, gold: 280 },
    rewardPool: ["armadura_enana", "mineral_mithril", "martillo_thalgrim", "elixir_mana"],
    cooldownMs: 3 * 60 * 60 * 1000,
  },
  tumbas_ashkar: {
    name: "Tumbas Malditas de Ashkar",
    emoji: "🏜️",
    minLevel: 14,
    floors: 5,
    region: "desierto",
    monsterPool: ["momia_ashkar", "espectro_helado", "guardian_ruinas"],
    boss: { id: "faraon_caido", name: "Faraón Caído", emoji: "👑", level: 18, hp: 650, atk: 34, def: 16, xp: 480, gold: 450, statusChance: { poison: 0.3 } },
    rewardPool: ["tunica_arcana", "colgante_sombras", "elixir_fenix", "escama_infernal"],
    cooldownMs: 5 * 60 * 60 * 1000,
  },
  torre_eldrathis: {
    name: "Torre Colapsada de Eldrathis",
    emoji: "🏛️",
    minLevel: 20,
    floors: 6,
    region: "ruinas",
    monsterPool: ["elemental_arcano", "guardian_ruinas", "quimera"],
    boss: { id: "arconte_perdido", name: "Arconte Perdido", emoji: "🔱", level: 25, hp: 900, atk: 44, def: 22, xp: 700, gold: 650 },
    rewardPool: ["placas_paladin", "reliquia_dioses", "hueso_dracaniano", "espada_elfica"],
    cooldownMs: 8 * 60 * 60 * 1000,
  },
  abismo_morvakh: {
    name: "Abismo de Morvakh",
    emoji: "🌋",
    minLevel: 28,
    floors: 7,
    region: "infierno",
    monsterPool: ["diablillo_menor", "quimera", "dragon_joven"],
    boss: { id: "morvakh_avatar", name: "Avatar de Morvakh", emoji: "🔥", level: 35, hp: 1400, atk: 60, def: 28, xp: 1200, gold: 1100, statusChance: { bleed: 0.35 } },
    rewardPool: ["espada_dragon", "escamas_dracas", "corazon_dragon", "hueso_dracaniano"],
    cooldownMs: 12 * 60 * 60 * 1000,
  },
};

// ── Misiones ──────────────────────────────────────────────────────────
const DAILY_QUEST_POOL = [
  { id: "cazar3", desc: "Derrota 3 monstruos", type: "kills", target: 3, xp: 40, gold: 30 },
  { id: "explorar2", desc: "Explora tu región 2 veces", type: "explore", target: 2, xp: 25, gold: 20 },
  { id: "orar1", desc: "Ora a tu dios una vez", type: "pray", target: 1, xp: 15, gold: 15 },
  { id: "vender1", desc: "Vende un item en el mercado", type: "marketSell", target: 1, xp: 20, gold: 25 },
  { id: "duelo1", desc: "Participa en un duelo PvP", type: "duel", target: 1, xp: 30, gold: 20 },
];

const WEEKLY_QUEST_POOL = [
  { id: "mazmorra3", desc: "Completa 3 mazmorras", type: "dungeon", target: 3, xp: 200, gold: 180 },
  { id: "cazar25", desc: "Derrota 25 monstruos", type: "kills", target: 25, xp: 180, gold: 150 },
  { id: "forjar5", desc: "Forja 5 objetos", type: "craft", target: 5, xp: 150, gold: 130 },
  { id: "viajar5", desc: "Viaja a 5 regiones distintas (o repetidas)", type: "travel", target: 5, xp: 120, gold: 100 },
];

const EPIC_QUESTS = {
  heroe_valdorien: {
    name: "El Héroe de Valdorien",
    desc: "Alcanza el nivel 10 y derrota al Señor de las Criptas.",
    reqLevel: 10,
    reqBoss: "senor_criptas",
    reward: { xp: 300, gold: 250, item: "espada_elfica" },
  },
  furia_kharzun: {
    name: "La Furia de Kharzun",
    desc: "Alcanza el nivel 15 y derrota al Rey Troll de las Minas.",
    reqLevel: 15,
    reqBoss: "rey_troll",
    reward: { xp: 500, gold: 450, item: "armadura_enana" },
  },
  maldicion_ashkar: {
    name: "La Maldición de Ashkar",
    desc: "Alcanza el nivel 20 y derrota al Faraón Caído.",
    reqLevel: 20,
    reqBoss: "faraon_caido",
    reward: { xp: 800, gold: 700, item: "elixir_fenix" },
  },
};

// ── Contenido personalizado creado por el owner vía IA (.rpgcrearclase /
// .rpgcrearraza) -- se persiste en data/customClasses.json y data/customRaces.json.
// Se fusiona acá al arrancar el bot para que sobreviva a un reinicio; los
// comandos de creación/borrado además lo reflejan en vivo sin reiniciar
// (ver lib/customRpgContent.js).
const customContent = require("./customRpgContent");
Object.assign(RACES, customContent.getCustomRaces());
Object.assign(CLASSES, customContent.getCustomClasses());

// ── Overrides de clases/razas FIJAS modificadas con IA (.rpgmodclase /
// .rpgmodraza) -- se aplican después para que, si el owner rediseñó por
// ejemplo "guerrero" o "humano", el cambio también sobreviva a un reinicio.
Object.assign(RACES, customContent.getRaceOverrides());
Object.assign(CLASSES, customContent.getClassOverrides());

module.exports = {
  ATTRS,
  ATTR_NAMES,
  RACES,
  CLASSES,
  GODS,
  REGIONS,
  RARITY,
  ITEMS,
  NPC_SHOP,
  RECIPES,
  MONSTERS,
  monstersForLevel,
  DUNGEONS,
  DAILY_QUEST_POOL,
  WEEKLY_QUEST_POOL,
  EPIC_QUESTS,
};
