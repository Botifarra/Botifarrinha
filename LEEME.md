# Fase 6 — Paso 1: Arquitectura y base económica

Copia estas carpetas dentro de tu `rpgv2/` existente (mismo nivel que
`items/`, `inventory/`, `shops/`, etc). No pisan ni modifican nada de las
Fases 1-5.

## Qué incluye

- `currency/currency.js` — monedas múltiples. "oro" sigue siendo
  `player.gold` (compatibilidad total con Fases 1-5); Plata y Cobre viven en
  `player.wallet`. `registerCurrency()` permite agregar monedas especiales
  (Cristales, Fichas, etc.) sin tocar código.
- `pricing/pricing.js` — precio dinámico por objeto (base/min/max/actual +
  oferta y demanda), derivado siempre de `item.value` (Fase 5), nunca un
  valor fijo.
- `history/history.js` — historial económico centralizado; todo módulo de
  economía futuro debe registrar ahí sus operaciones.
- `economy/economy.js` — fachada que reexporta los tres anteriores.
- `market/`, `auction/`, `trade/`, `bank/`, `warehouse/`, `guilds/`,
  `tax/`, `caravans/` — carpetas ya creadas con su nombre de colección de
  datos definido y comentario de qué Paso (2, 3 o 4) implementa su lógica.
  `tax/tax.js` ya tiene lectura/escritura de tasas configurables funcional
  (mercado 5%, subasta 10%, comercio 0% por defecto).

## Verificado

Todos los módulos cargan sin errores (`node -e "require(...)"`) y se probó
en memoria: multi-moneda, ajuste de precio por compra/venta, y registro de
historial.

## Siguiente paso

Paso 2: mercado global (`.mercado`), casa de subastas (`.subasta`), comercio
entre jugadores (`.trade`), banco (`.banco`) y almacén (`.almacen`).
