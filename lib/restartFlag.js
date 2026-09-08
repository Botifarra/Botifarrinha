// Bandera simple en memoria para saber si el proceso está cerrando por un
// reinicio intencional (.re). Sirve para que el listener de
// "connection.update" en index.js NO dispare su propia reconexión
// (startBot()) cuando la conexión se cierra por el reinicio manual — eso era
// lo que causaba que el bot terminara reiniciándose 2 veces (una por el
// proceso hijo que lanza .re, y otra por la reconexión automática del
// proceso viejo antes de morir).
let restarting = false;

function setRestarting(value) {
  restarting = value;
}

function isRestarting() {
  return restarting;
}

module.exports = { setRestarting, isRestarting };
