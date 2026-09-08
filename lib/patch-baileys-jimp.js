// Corrige un bug de @whiskeysockets/baileys al detectar la librería "jimp".
//
// El archivo messages-media.js tiene DOS lugares con el texto
// "No image processing library available":
//   1) Dentro de getImageProcessingLibrary() -- no es el problema.
//   2) Dentro de extractImageThumb() / generateProfilePicture(), que usan:
//        typeof Lib.jimp?.Jimp === 'object'
//      Ese es el que falla: en jimp v1.x, "Jimp" es una CLASE (typeof 'function'),
//      no un objeto plano, así que esa comparación nunca es true.
//
// Este script busca específicamente el patrón "Lib.jimp?.Jimp === 'object'" (tolerante
// a comillas simples/dobles y espacios) y lo corrige para que acepte también 'function'.
// Se corre solo (via "postinstall" en package.json) cada vez que haces npm install.

const fs = require("fs");
const path = require("path");

const CANDIDATE_PATHS = [
  "node_modules/@whiskeysockets/baileys/lib/Utils/messages-media.js",
  "node_modules/baileys/lib/Utils/messages-media.js",
];

// Coincide con: typeof lib.jimp?.Jimp === 'object' (comillas simples o dobles,
// y con "lib"/"Lib" en cualquier combinación de mayúsculas/minúsculas, porque
// distintas versiones de Baileys lo escriben distinto)
const PATTERN = /typeof\s+(lib\.jimp\?\.Jimp)\s*===\s*(['"])object\2/gi;
// Ya corregido si aparece el "||" justo después apuntando a 'function'
const ALREADY_FIXED = /lib\.jimp\?\.Jimp\s*===\s*(['"])object\1\s*\|\|\s*typeof\s+lib\.jimp\?\.Jimp\s*===\s*(['"])function\2/i;

let patchedAny = false;
let foundFileButNoMatch = false;

for (const rel of CANDIDATE_PATHS) {
  const filePath = path.join(process.cwd(), rel);
  if (!fs.existsSync(filePath)) continue;

  const content = fs.readFileSync(filePath, "utf-8");

  if (ALREADY_FIXED.test(content)) {
    console.log(`✅ [patch-baileys-jimp] ${rel} ya estaba corregido.`);
    patchedAny = true;
    continue;
  }

  const matches = content.match(PATTERN) || [];

  if (matches.length === 0) {
    foundFileButNoMatch = true;
    // Diagnóstico: busca TODAS las apariciones de "lib.jimp?.Jimp" (mayúsc./minúsc.
    // indistinta; no del mensaje de error, que aparece dos veces y puede confundir)
    // y muestra el contexto real.
    const needleRegex = /lib\.jimp\?\.Jimp/gi;
    let shown = 0;
    let out = "";
    let m;
    while (shown < 5 && (m = needleRegex.exec(content)) !== null) {
      const idx = m.index;
      out += `\n--- ocurrencia en la posición ${idx} ---\n` + content.slice(Math.max(0, idx - 150), idx + 150) + "\n";
      shown++;
    }
    console.log(
      `ℹ️  [patch-baileys-jimp] ${rel}: no coincidió el patrón exacto. ` +
      (out ? `Ocurrencias de "lib.jimp?.Jimp" encontradas:${out}` : `Ni siquiera se encontró el texto "lib.jimp?.Jimp" en el archivo.`)
    );
    continue;
  }

  const newContent = content.replace(
    PATTERN,
    (full, prefix, quote) => `(typeof ${prefix} === ${quote}object${quote} || typeof ${prefix} === ${quote}function${quote})`
  );
  fs.writeFileSync(filePath, newContent, "utf-8");
  console.log(`✅ [patch-baileys-jimp] ${rel} corregido correctamente (${matches.length} ocurrencia(s)).`);
  patchedAny = true;
}

if (!patchedAny) {
  if (foundFileButNoMatch) {
    console.log("⚠️  [patch-baileys-jimp] Se encontró el archivo pero no el patrón esperado. Copia el texto de arriba y compártelo.");
  } else {
    console.log("⚠️  [patch-baileys-jimp] No se encontró el archivo de Baileys a corregir. Si .setpp sigue fallando, avisa.");
  }
}
