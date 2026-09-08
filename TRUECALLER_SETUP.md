# Configurar .tc (Truecaller)

El comando `.tc` necesita un `installationId` de Truecaller para poder consultar
números. Esto se obtiene **una sola vez**, a mano, iniciando sesión con tu
propio número (o uno dedicado) — el bot no puede hacer este login solo, porque
Truecaller manda un código (OTP) por SMS/llamada que hay que ingresar
manualmente.

No hace falta dejar instalado el paquete `truecallerjs` completo: el bot ya
trae su propio cliente mínimo en `lib/truecaller.js`. El login se hace UNA vez
desde cualquier PC/Termux con Node, usando el paquete original solo para eso.

## Pasos

1. En cualquier carpeta (no hace falta que sea la del bot), instala el
   paquete original solo para el login:
   ```
   npm install -g truecallerjs
   ```

2. Corre el login:
   ```
   truecallerjs login
   ```
   Te va a pedir tu número (con código de país, ej: `+56912345678`) y luego
   un código OTP que llega por SMS o llamada. Ingrésalo cuando te lo pida.

   > Nota: Truecaller a veces pide verificar el número a través de su app
   > oficial (instalada temporalmente) o mediante un flujo con un archivo JSON
   > descargado desde tu cuenta de Google/Truecaller. Si el login por consola
   > falla, revisa el README del proyecto original:
   > https://github.com/sumithemmadi/truecallerjs#login

3. Al terminar, la consola va a mostrar algo como:
   ```
   Your installationId : xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
   Copia ese valor completo.

4. Pégalo en el `.env` del bot:
   ```
   TRUECALLER_INSTALLATION_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
   (o directamente en `config.js`, en `TRUECALLER_INSTALLATION_ID`).

5. Reinicia el bot. Listo, `.tc <número>` ya debería funcionar.

## Uso del comando

```
.tc 56912345678              → busca ese número (detecta el país por el código)
.tc 987654321 AR             → fuerza el número como argentino
.tc @mención / respondiendo  → busca el número de la persona mencionada/citada
```

## Notas

- La información que devuelve Truecaller es la que otros usuarios cargaron en
  la app (nombre, a veces email/ubicación). Puede estar desactualizada,
  incompleta o directamente no existir para un número.
- Si el `installationId` deja de funcionar (error 401/403), hay que repetir el
  login (paso 2) y actualizar el `.env`.
- Usa este comando con criterio: es información que la gente compartió en
  Truecaller, no una base de datos oficial, y no debería usarse para acosar o
  molestar a nadie.
