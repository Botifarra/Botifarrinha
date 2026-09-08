// Desde Baileys v7, el paquete pasó a ser ESM puro (ver notas de migración:
// https://baileys.wiki/docs/migration/to-v7.0.0/). Node no permite hacer
// require() de un paquete ESM, pero sí permite `import()` dinámico incluso
// desde archivos CommonJS como los de este bot.
//
// Convertir TODO el bot a ESM solo por esto sería un cambio enorme y
// arriesgado para algo que en realidad se resuelve con una función chiquita:
// este helper carga el módulo una sola vez (se cachea la promesa, no se
// vuelve a importar en cada llamada) y lo reusan los pocos archivos que
// necesitan algo de Baileys que no vale la pena reimplementar a mano
// (como downloadMediaMessage).
//
// Uso: const { downloadMediaMessage } = await getBaileys();

let modulePromise;

function getBaileys() {
  if (!modulePromise) modulePromise = import("@whiskeysockets/baileys");
  return modulePromise;
}

module.exports = { getBaileys };
