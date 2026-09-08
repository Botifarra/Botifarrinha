#!/data/data/com.termux/files/usr/bin/bash
# update.sh — Actualiza el código del bot SIN perder:
#   - auth_info/  (la sesión de WhatsApp ya vinculada)
#   - data/       (co-owners, baneados, grupos bloqueados, grupo de sugerencias, etc.)
#
# Uso:
#   ./update.sh /ruta/a/la/carpeta/nueva
#
# Ejemplo (la carpeta que bajaste a Download):
#   ./update.sh /storage/emulated/0/Download/Botifarra
#
# Requiere rsync: si no lo tienes, instálalo una vez con:
#   pkg install rsync -y

set -e

SRC="$1"
DEST="$(cd "$(dirname "$0")" && pwd)"

if [ -z "$SRC" ]; then
  echo "Uso: ./update.sh /ruta/a/la/carpeta/nueva"
  exit 1
fi

if [ ! -d "$SRC" ]; then
  echo "❌ No existe la carpeta: $SRC"
  exit 1
fi

if ! command -v rsync >/dev/null 2>&1; then
  echo "❌ Falta rsync. Instálalo con: pkg install rsync -y"
  exit 1
fi

echo "📦 Copiando archivos nuevos desde:"
echo "    $SRC"
echo "  hacia:"
echo "    $DEST"
echo "  (sin tocar auth_info/, data/ ni node_modules/)"
echo

rsync -a --exclude 'auth_info' --exclude 'data' --exclude 'node_modules' --exclude '.git' "$SRC"/ "$DEST"/

echo
echo "📥 Instalando/actualizando dependencias..."
cd "$DEST"
npm install

echo
echo "✅ Listo. auth_info/ y data/ quedaron intactos."
echo "   Corre 'node index.js' o manda .re desde WhatsApp para reiniciar con lo nuevo."
