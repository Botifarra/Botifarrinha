# Botifarra — Bot de WhatsApp con moderación de grupo

Bot hecho con [Baileys](https://github.com/WhiskeySockets/Baileys), la librería no oficial de WhatsApp Web más usada para este tipo de proyectos.

## ⚠️ Antes de empezar

- Esto usa la **API no oficial** de WhatsApp. WhatsApp puede banear o restringir temporalmente números que usen bots de forma agresiva o para spam. Úsalo con criterio.
- Necesitas **Node.js 18 o superior**.
- Necesitas **ffmpeg** instalado (para los stickers): en Termux, `pkg install ffmpeg -y`.
- Para los comandos de descarga (`.mp3`, `.mp4`, `.play`, `.tik`, `.ig`, `.fb`, `.x`, `.spotify`, etc.) necesitas **yt-dlp**: `pip install -U yt-dlp --break-system-packages`.

## Instalación en Termux desde tu almacenamiento (sin GitHub)

Esto asume que ya tienes la carpeta del bot descargada en tu celular (por ejemplo en Descargas), no que la vas a clonar desde un repositorio.

```bash
# 1. Actualizar Termux
pkg update -y && pkg upgrade -y

# 2. Instalar lo que necesita el bot: Node.js, ffmpeg y python (para yt-dlp)
pkg install -y nodejs ffmpeg python

# 3. Instalar yt-dlp (para descargas: .mp3/.mp4/.play/.tik/.ig/.fb/.x/etc.)
pip install -U yt-dlp --break-system-packages

# 4. Dar acceso de Termux al almacenamiento del celular (una sola vez, pide un permiso en pantalla)
termux-setup-storage

# 5. Copiar la carpeta del bot desde tu almacenamiento a la carpeta personal de Termux.
#    Ajusta la ruta de origen según dónde hayas guardado la carpeta.
cp -r /storage/emulated/0/Download/Wa_bot ~/Wa_bot

# 6. Entrar a la carpeta
cd ~/Wa_bot

# 7. Instalar las dependencias del proyecto (esto también corre el patch de jimp automáticamente)
npm install

# 8. Iniciar el bot
node index.js
```

**Sobre el paso 5:** si tu carpeta no se llama `Wa_bot` o está en otra ubicación, ajusta la ruta. Para ver qué hay en tu carpeta de Descargas desde Termux: `ls /storage/emulated/0/Download/`

## Primera conexión (vincular el número)

- **Con QR** (si no configuraste `PAIRING_NUMBER`): al correr `node index.js` aparece un código QR en la terminal. Escanéalo desde WhatsApp: `Ajustes > Dispositivos vinculados > Vincular un dispositivo`.
- **Con código de emparejamiento** (si configuraste `PAIRING_NUMBER`, o si te lo pregunta por consola): te da un código de varios dígitos. En WhatsApp: `Ajustes > Dispositivos vinculados > Vincular con número de teléfono`.

Se creará una carpeta `auth_info/` con la sesión — **no la compartas ni la subas a ningún repo público**, es literalmente el acceso a tu cuenta.

## Configuración

Edita `config.js`:

```js
module.exports = {
  OWNERS: [
    {
      number: "56512222222", // tu número real, sin + ni espacios
      lids: ["79401697992881"], // opcional, ver nota abajo
    },
  ],
  PAIRING_NUMBER: "", // número del bot para vincular por código (opcional, si no usas QR)
  PREFIX: ".",
  DEFAULT_PACK_NAME: "Mi Bot",
  DEFAULT_AUTHOR: "Botifarra",
  AUTO_ADMIN_OWNER: true,
};
```

**Sobre `number` y `lids`:** WhatsApp a veces identifica a una cuenta con un ID anónimo interno (`@lid`) en vez del número real, dependiendo del grupo. `number` es tu número real (reconoce al owner Y se muestra en `.owner`). `lids` es opcional: solo hace falta si el bot no te reconoce con tu número — corre `.debugadmin` en un grupo para ver tu lid actual.

⚠️ **Revisa que no tengas el mismo lid repetido en dos owners distintos** — cada lid debería pertenecer a una sola cuenta real.

También se puede configurar por variables de entorno: `OWNER_NUMBER`, `OWNER_LIDS` (separados por comas) y `PAIRING_NUMBER`.

## Comandos

### Para cualquiera
| Comando | Descripción |
|---|---|
| `.sticker <paquete>` / `.s` | Convierte imagen/video en sticker |
| `.rs <paquete> \| <autor>` | Roba un sticker cambiando su nombre de paquete/autor |
| `.pf [número o @mención]` | Foto de perfil de alguien (sin nada: la tuya) |
| `.kiss` / `.hug` / `.pat` `@mención` | GIFs de reacción wholesome de anime |
| `.mp3` / `.mp4` / `.tik` / `.ig` / `.sc` `<link>` | Descargas de audio/video |
| `.wa <número>` | Revisa si un número tiene cuenta de WhatsApp |
| `.ping` / `.p` | Latencia y estado del bot |
| `.pull p: <pregunta> o1: <op1> o2: <op2>...` | Crea una encuesta nativa de WhatsApp |
| `.stalker <nombre>` | Reporte gracioso de edad/género/nacionalidad probable (pura estadística) |
| `.owner` | Contacto (wa.me) del owner y co-owners |
| `.sug <mensaje>` | Manda una sugerencia al grupo configurado con `.set_sug` |
| `.menu` / `.help` | Lista de comandos según tus permisos |

### 🪙 Economía
| Comando | Descripción |
|---|---|
| `.cartera [@mención]` | Muestra el saldo disponible (efectivo + banco) |
| `.dep <cantidad\|todo>` | Deposita dinero en el banco, a salvo de `.robar` |
| `.ret <cantidad\|todo>` | Retira dinero del banco para gastarlo |
| `.regalar @mención <cantidad>` | Transfiere dinero a otro usuario |
| `.rankcoins` | Ranking global de los usuarios más ricos (top 10) |
| `.daily` | Reclama la recompensa diaria (cooldown 24h) |
| `.work` | Trabaja para ganar dinero (cooldown 1h) |
| `.crimen` | Intenta un golpe: 50% de ganar, 50% de multa (cooldown 45min) |
| `.robar @mención` | Intenta robarle efectivo a otro usuario (cooldown 1h) |
| `.pescar` | Pesca y vende lo que saques (cooldown 8min) |
| `.minar` | Extrae y vende recursos (cooldown 10min) |
| `.casino <cantidad>` | Tragamonedas: hasta 5x o pierdes todo |
| `.dado <cantidad>` | Tirada de dado 1 vs 1 contra el bot |
| `.flip <cara\|cruz> <cantidad>` | Lanzamiento de moneda, doble o nada |
| `.blackdice @mención <cantidad>` | Duelo de dados por dinero contra otro usuario |
| `.tiendarpg comprar\|vender <cantidad>` | Cambia monedas por XP o XP por monedas |
| `.ranknivel` | Ranking global por nivel/XP (top 10) |
| `.minivel` | Tu nivel, XP total y progreso al siguiente |
| `.vernivel @mención` | Nivel/XP de otro usuario |
| `.niveles` | Lista completa de rangos alcanzables |

Los datos de economía se guardan en `data/economy.json` (se crea solo, igual que el resto de `data/`).

### Admin del grupo
| Comando | Descripción |
|---|---|
| `.agg <número>` | Agrega un número al grupo |
| `.kick <número/mención/respuesta>` | Elimina a alguien del grupo |
| `.setpp` / `.setname` / `.setdesc` | Cambian foto/nombre/descripción del grupo |
| `.promote` / `.demote` `<número/mención/respuesta>` | Da/quita admin (avisa mencionando a ambos) |
| `.antilink on / off` | Activa/desactiva antilink (por ahora solo guarda el estado; el borrado automático de links no está implementado todavía) |
| `.open` / `.close` | Abre/cierra el grupo — también lo puede usar el owner/co-owner del bot |

### Owner o co-owner
| Comando | Descripción |
|---|---|
| `.join <link>` | Une el bot a un grupo desde un link de invitación |
| `.admin` | Te autoasciendes a admin |
| `.vc` | Cambia foto/nombre, etiqueta a todos y elimina a TODOS del grupo (sin confirmación, cuidado) |
| `.rob` | Broma: quita admin a todos y se lo da al owner, cambia nombre y foto |

### Solo owner
| Comando | Descripción |
|---|---|
| `.co <número>` / `.co del <número>` / `.co list` | Dar/quitar/ver co-owners |
| `.re` | Hace `git pull` y reinicia el bot |
| `.libgp` | Lista nombre + ID de los grupos donde está el bot |
| `.block <id>` / `.unblock <id>` | El bot ignora completamente un grupo hasta desbloquearlo |
| `.ban` / `.unban` `@mención` | Prohíbe/permite que alguien use el bot |
| `.clear` | Borra los mensajes que el bot vio en el grupo desde que arrancó |
| `.lib @mención` | Muestra el JID/lid real de quien menciones |
| `.set_sug <id de grupo>` | Define a qué grupo llegan las sugerencias de `.sug` |
| `.debugadmin` | Diagnóstico de admins/lid del grupo |

Los comandos que necesitan que el bot sea admin **intentan la acción directamente** y muestran el error real de WhatsApp si falla, en vez de bloquear antes con una detección propia (que puede fallar con el sistema `@lid`).

## Datos guardados localmente

Todo esto vive en `data/` (se crea solo, no se sube a GitHub por el `.gitignore`) y sobrevive a reinicios:
- `data/coowners.json`, `data/blockedGroups.json`, `data/bannedUsers.json`, `data/suggestionsGroup.json`

Como el bot ignora *todo* en un grupo bloqueado, `.block`/`.unblock` se mandan desde **otro chat**, nunca desde el grupo que se quiere bloquear. Usa `.libgp` primero para el ID.

## `.re` (reiniciar)

Corre `git pull` antes de reiniciar. Si instalaste el bot **desde tu almacenamiento local (sin GitHub)**, ese paso va a fallar silenciosamente porque no hay un repositorio Git — no pasa nada grave, el bot avisa y reinicia igual con el código que ya tiene.

## Funciones automáticas

- **Aviso de admin**: si alguien da/quita admin desde la app, el bot avisa mencionando a ambos. Si viene de `.promote`/`.demote`, el aviso lo manda el comando mismo (no se duplica).
- **Auto-admin al owner**: si `AUTO_ADMIN_OWNER` es `true` y el bot ya es admin, al unirse el owner lo asciende automáticamente.

## Descargas de Instagram (`.ig`) y cookies

Si `.ig` falla pidiendo login: instala "Get cookies.txt LOCALLY", entra a instagram.com con tu cuenta, exporta las cookies y guárdalas como `data/cookies/instagram.txt` (no se sube a GitHub, son credenciales de tu sesión).

## Estructura del proyecto

```
Wa_bot/
├── index.js                    # conexión + router de comandos
├── config.js
├── package.json
├── .gitignore
├── lib/
│   ├── utils.js, db.js
│   ├── coowners.js, blockedGroups.js, bannedUsers.js, suggestionsConfig.js
│   ├── messageStore.js, restartFlag.js
│   ├── reactionGifs.js          # .kiss/.hug/.pat vía nekos.best
│   └── patch-baileys-jimp.js
├── scripts/patch-baileys-jimp.js
├── assets/vc-photo.jpg, rob-photo.jpg
└── commands/
    ├── join.js, sticker.js, rs.js, pf.js
    ├── kiss.js, hug.js, pat.js
    ├── participants.js, groupSettings.js, groupOpenClose.js
    ├── selfAdmin.js, promote.js, demote.js, rob.js
    ├── coowner.js, owner.js, restart.js
    ├── blockGroup.js, listGroups.js
    ├── ban.js, clear.js, lib.js
    ├── setSug.js, sug.js
    ├── antilink.js, debugAdmin.js, checkWhatsApp.js
    ├── ping.js, poll.js, stalker.js
    └── download.js
```

## Notas sobre `.agg`

WhatsApp a veces bloquea agregar directamente por privacidad (status `403`, se manda invitación en su lugar) o limita temporalmente la cuenta del bot (`reachout_restricted`) — en ese caso hay que esperar.

## Ampliar el bot

1. Crea `commands/tuComando.js` exportando `async (sock, msg, args, ...) => {}`.
2. Impórtalo en `index.js` y agrega un `case` en el switch.
3. Si debe salir en `.menu`, agrégalo a `memberCommands`, `adminCommands` u `ownerCommands`.
