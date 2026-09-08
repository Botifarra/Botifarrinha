const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");

// Se asegura de que la carpeta data/ exista (se crea sola al instalar el bot)
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function filePath(name) {
  return path.join(DATA_DIR, `${name}.json`);
}

/**
 * Carga data/<name>.json. Si no existe, lo crea con defaultValue.
 * Uso: const coowners = load("coowners", []);
 */
function load(name, defaultValue) {
  const file = filePath(name);
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(defaultValue, null, 2));
    return defaultValue;
  }
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch (err) {
    console.error(`⚠️  data/${name}.json estaba corrupto, se reinicia vacío:`, err.message);
    fs.writeFileSync(file, JSON.stringify(defaultValue, null, 2));
    return defaultValue;
  }
}

/**
 * Escribe data/<name>.json inmediatamente en disco.
 * Llamar a esto después de cada cambio es lo que hace que sobreviva a un reinicio.
 */
function save(name, data) {
  fs.writeFileSync(filePath(name), JSON.stringify(data, null, 2));
}

/**
 * Helper para el patrón más común (el que usa Naufrabot en antilink.json,
 * modo_admin.json, grupo.json, etc.): una lista de IDs donde
 * "estar en la lista" = la función está activada para ese chat/usuario.
 *
 * Ejemplo:
 *   const antilink = createToggleList("antilink");
 *   antilink.enable(groupId);
 *   antilink.isEnabled(groupId); // true
 */
function createToggleList(name) {
  let list = load(name, []);

  return {
    isEnabled(id) {
      return list.includes(id);
    },
    enable(id) {
      if (!list.includes(id)) {
        list.push(id);
        save(name, list);
      }
      return list;
    },
    disable(id) {
      list = list.filter((x) => x !== id);
      save(name, list);
      return list;
    },
    all() {
      return list;
    },
  };
}

module.exports = { load, save, createToggleList };
