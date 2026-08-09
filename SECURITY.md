# Política de seguridad

## Alcance

Este repositorio produce **un único archivo `index.html`** que genera
carteras de papel para Bitcoin, 100% del lado del cliente. No hay backend,
servidor, API ni infraestructura propia: el "producto" que la gente ejecuta
es ese archivo, abierto directamente en un navegador (idealmente en un
equipo desconectado de internet).

## Estado actual: sin auditoría externa

Este proyecto **todavía no pasó por una auditoría de seguridad
independiente**. La criptografía está construida sobre librerías auditadas
(`@scure/*`, `@noble/*`) y verificada contra vectores de prueba oficiales
(BIP38, BIP39, BIP84, BIP341 — ver `test/`), pero eso cubre corrección
funcional, no reemplaza una revisión externa dedicada a seguridad.

**Recomendación mientras tanto**: probá la herramienta primero con montos
pequeños o carteras de prueba antes de confiarle fondos importantes, y
verificá vos mismo el código fuente — está pensado para poder leerse
(`src/`, sin ofuscar, sin minificar en el repo).

## Reportar una vulnerabilidad

Si encontrás un problema de seguridad (por ejemplo: una debilidad en la
generación de entropía, un error en la derivación de direcciones/claves,
una forma de filtrar datos sensibles fuera del navegador, o un bypass de la
Content-Security-Policy):

1. **No abras un issue público** describiendo cómo explotarlo — podría
   exponer a otros usuarios antes de que exista un arreglo.
2. Usá el reporte privado de GitHub: pestaña **Security → Report a
   vulnerability** en `satsforge/paper-wallet-btc`. Es el canal preferido:
   queda privado entre quien reporta y quien mantiene el repo hasta que se
   resuelva.
3. Si preferís otro medio, abrí un issue pidiendo un canal de contacto sin
   detallar el problema todavía.

Es un proyecto de código abierto mantenido en tiempo libre: no hay SLA
formal de respuesta, pero los reportes de seguridad tienen prioridad sobre
cualquier otro trabajo pendiente.

## Qué queda fuera de este repositorio

Vulnerabilidades en las dependencias de terceros (`@scure/*`, `@noble/*`,
`jspdf`, `qrcode`) deben reportarse directamente a esos proyectos. Este
repo las consume como paquetes fijados en `package-lock.json`; si se libera
un parche upstream, se actualiza la dependencia acá.

## Buenas prácticas al usar la herramienta

- Descargá o cloná el repo y **generá vos mismo** `index.html` con
  `npm run build` en vez de confiar ciegamente en un binario/HTML de
  terceros.
- La política CSP incluye un hash SHA-256 del script (`script-src
  'sha256-...'`); podés recalcularlo tras el build y compararlo con el que
  aparece en el `<meta>` del HTML para confirmar que no fue alterado.
- Ejecutalo en un equipo air-gapped para la generación real de una cartera
  con fondos.
- Si usás el cifrado AES-256 de la semilla (no estándar, propio de esta
  app), guardá una copia de `index.html` junto a tus respaldos físicos —
  ver la sección "Modelo de seguridad" del `README.md`.
