# BTC Paper Wallet — Generador Air-Gapped

Generador de carteras de papel para Bitcoin, 100% del lado del cliente. El
entregable final es **un único archivo `index.html`** autocontenido: sin
llamadas de red, sin dependencias externas en tiempo de ejecución, apto para
abrir con doble clic (`file://`) en un equipo desconectado de internet.

## Cómo usarlo

Abre `index.html` en cualquier navegador moderno (Chrome, Firefox, Edge). No
requiere servidor, instalación ni conexión. Para máxima seguridad:
transfiérelo a un equipo air-gapped (USB) y ábrelo allí.

## Modo Básico / Avanzado

Un interruptor en la barra superior oculta o muestra las funciones para
usuarios avanzados (Taproot, cifrado AES de la semilla, entropía por dados,
direcciones adicionales, cartera señuelo). En modo Básico solo se ve el
flujo esencial. Cada campo tiene un icono `?` con una explicación al pasar
el cursor o navegar con teclado (`:hover`/`:focus`, sin JavaScript).

## Idioma (Español / English)

Otro interruptor en la barra superior traduce toda la interfaz —
incluyendo tooltips, mensajes de estado, y el propio PDF generado— entre
español e inglés. Todo el texto vive en un único diccionario
(`src/lib/i18n.js`) usado tanto por `app.js` (vía atributos
`data-i18n`/`data-i18n-tip`/`data-i18n-placeholder`/`data-i18n-aria` que un
único "walker" recorre en cada cambio de idioma) como por `pdf.js` (que
recibe un parámetro `lang` y renderiza el PDF directamente en ese idioma).
Las notas de seguridad al pie del PDF (Randstorm, tinta, laminado) son la
única excepción: se imprimen siempre en ambos idiomas a la vez, sin
importar el idioma de la interfaz, porque son parte del documento físico
que podría leer alguien más adelante.

Cambiar de idioma mientras hay una cartera en pantalla vuelve a renderizar
el panel — esto re-enmascara cualquier semilla o clave privada que
estuviera revelada en ese momento. Es un efecto intencional, no un bug.

## Inventario de la sesión

Un botón "🗂 Inventario" en la barra superior lleva la cuenta de las
carteras generadas durante la sesión actual — útil si generás varias de
una sentada (por ejemplo, para regalos). Guarda **solo datos públicos**
(dirección, tipo, ruta de derivación, y una etiqueta opcional que vos le
pongas): nunca la semilla, la clave privada, ni el blob cifrado. Vive
enteramente en una variable de JavaScript (`state.sessionInventory`) — no
toca `localStorage`, `IndexedDB`, cookies ni el disco en ningún momento, y
desaparece por completo al recargar o cerrar la pestaña. El panel muestra
este aviso de forma permanente, no como un tooltip que se pueda pasar por
alto. No sustituye al PDF: es una lista de referencia temporal, nada más.

## Modelo de seguridad

- **CSPRNG**: la semilla usa `crypto.getRandomValues()` (vía
  `@noble/hashes/utils.randomBytes`). El "recolector de entropía" (mover el
  ratón) es una capa complementaria que se mezcla por XOR — nunca reduce la
  aleatoriedad, solo puede añadirla. En modo avanzado se puede sumar
  entropía de dados físicos (diceware): se reduce con SHA-256 y se mezcla
  de la misma forma.
- **BIP39 / BIP32 / BIP44-49-84-86**: mnemonic de 12 o 24 palabras,
  derivación HD estándar. Direcciones Legacy (`m/44'`), SegWit-compatible
  (`m/49'`), Native SegWit (`m/84'`) y Taproot (`m/86'`, BIP341/BIP349,
  bech32m). La tweak de Taproot está verificada contra los vectores de
  prueba oficiales de BIP341.
- **BIP39 Passphrase**: capa opcional ("palabra 25"), nunca se imprime en el
  PDF ni se persiste en ningún almacenamiento.
- **BIP38**: cifrado opcional de la clave privada (WIF) impresa, usando la
  passphrase como contraseña. El *salt* (`addressHash`) siempre se calcula
  sobre la dirección Legacy (P2PKH) del mismo par de claves, conforme al
  estándar BIP38 (anterior a SegWit), independientemente del tipo de
  dirección elegido para recibir fondos.
- **Cifrado AES-256-GCM de la semilla impresa** (modo avanzado, independiente
  de BIP38): cifra las palabras del mnemonic con una contraseña propia antes
  de imprimirlas. Al usar un cifrado autenticado (GCM), una contraseña
  incorrecta falla de forma explícita en vez de devolver datos corruptos en
  silencio, a diferencia de BIP38.
- **Direcciones adicionales** (modo avanzado): muestra e imprime, como
  referencia en una página aparte, las otras 3 direcciones derivables de la
  misma semilla. Deliberadamente **no** imprime sus claves privadas — se
  pueden re-derivar desde el mnemonic en cualquier billetera compatible —
  para no multiplicar el número de claves sensibles en un mismo documento.
- **Cartera oculta / señuelo** (modo avanzado): la semilla BIP39 es idéntica
  para cualquier passphrase, solo cambia la contraseña. Por eso la app
  **nunca** imprime el mismo mnemonic dos veces: la sección de señuelo
  calcula únicamente la dirección/clave resultante de una passphrase
  distinta (o vacía) y permite descargar una tarjeta separada que contiene
  solo esa dirección y su WIF — sin ningún mnemonic — para que sea un
  documento independiente y creíble si hace falta entregarlo bajo presión.
- **Cero red**: la Content-Security-Policy del documento (`default-src
  'none'; connect-src 'none'; frame-src 'none'; …`) bloquea cualquier
  petición saliente a nivel de navegador. `script-src` está restringido a un
  hash SHA-256 del único bloque de script inline — no se permite ningún otro
  script, ni siquiera inyectado.
- **Cero persistencia**: no se usa `localStorage`, `sessionStorage`,
  cookies, ni IndexedDB en ningún punto del código.
- **PDF sin metadatos**: título/autor/creador vacíos y fecha de creación fija
  (no identificable) antes de exportar.
- **Higiene de memoria**: al generar la cartera, la semilla (`seed`) y la
  clave privada en bruto se sobrescriben con ceros (`.fill(0)`) en cuanto se
  derivan el WIF/BIP38 y ya no se necesitan.

Nada de esto sustituye la revisión de código por tu parte: **lee el código
fuente antes de confiar en él**, especialmente si vas a custodiar fondos
reales.

## Estructura del proyecto

```
src/
  lib/
    wordlist.js    wordlist BIP39 en inglés (@scure/bip39)
    i18n.js        diccionario ES/EN único, usado por app.js y pdf.js
    entropy.js     colector de entropía de puntero/teclado + mezcla externa (dados)
    diceware.js    conversión de tiradas de dados a bytes de entropía
    mnemonic.js    generación/validación de mnemonic, derivación de seed
    wallet.js      derivación BIP32, direcciones (P2PKH/P2SH-P2WPKH/P2WPKH/P2TR), WIF
    taproot.js     tweak BIP341 (Taproot) y dirección bech32m
    bip38.js       cifrado BIP38 (scrypt + AES-256-ECB, no-EC-multiply)
    seedCipher.js  cifrado AES-256-GCM de la semilla impresa (independiente de BIP38)
    pdf.js         maquetación del PDF imprimible (jsPDF + QR) + tarjeta señuelo
  app.js           controlador de la UI (sin frameworks)
  styles.css       tema oscuro/claro, tooltips, modo básico/avanzado
index.src.html     plantilla HTML fuente (con placeholders __CSS__/__SCRIPT__/__CSP__)
build.mjs          empaqueta todo en un único index.html autocontenido
test/
  fixtures/        vectores de prueba oficiales, vendorizados como JSON
  *.test.mjs       tests (node:test) para cada módulo de src/lib/
```

Librerías usadas (todas JS puro, sin WASM ni bindings nativos, auditadas):
`@scure/bip39`, `@scure/bip32`, `@scure/base`, `@noble/hashes`,
`@noble/curves`, `@noble/ciphers`, `qrcode`, `jspdf`.

## Reconstruir desde el código fuente

```bash
npm install
npm run build     # genera dist/index.html e index.html
```

`build.mjs` usa esbuild para empaquetar `src/app.js` (formato IIFE, sin
módulos ES, para máxima compatibilidad con `file://`) y minifica el CSS;
ambos se inyectan inline en `index.src.html`. El hash SHA-256 del bundle se
calcula en el build y se usa como `script-src` en la CSP — así cualquiera
puede verificar que el script servido es exactamente el que declara la
política.

## Tests

```bash
npm test          # node --test — sin dependencias de testing externas
```

27 tests sobre la lógica criptográfica en `src/lib/`, anclados a vectores de
prueba **oficiales** (vendorizados en `test/fixtures/`, no se descargan en
tiempo de test — corren igual de offline que la propia app):

- **BIP39** — vectores canónicos de `trezor/python-mnemonic` (entropía → mnemonic, 12 y 24 palabras).
- **BIP84** (Native SegWit) — vector oficial del BIP: mnemonic → semilla → dirección/WIF, extremo a extremo.
- **BIP49** (P2SH-SegWit) — hashes intermedios oficiales del BIP (su vector completo es testnet-only; se reutilizan los `HASH160` intermedios, que son independientes de red, para validar `p2pkhAddress` y `p2shP2wpkhAddress`).
- **BIP341** (Taproot) — vector oficial de `bitcoin/bips` para el *key-path spend* (tweak + dirección bech32m).
- **BIP38** — los dos vectores oficiales de clave comprimida del BIP: se verifica que `bip38Encrypt` reproduce exactamente el cifrado esperado, y que un descifrador de referencia (escrito aparte, desde la especificación) recupera la clave original desde el cifrado oficial.

El resto (`seedCipher.js`, `diceware.js`, `entropy.js`) no tiene vectores
oficiales por ser protocolos propios de esta app; se prueban por propiedades
(roundtrip, determinismo, rechazo explícito de contraseña incorrecta, nunca
constante entre llamadas). `test/entropy.test.mjs` en particular fija la
invariante que hizo que la barra de progreso pareciera congelarse en una
versión anterior — que el progreso depende del tiempo transcurrido y no solo
de la cantidad de eventos — para que no vuelva a romperse en silencio.

## Limitaciones conocidas

- El cifrado BIP38 (`scrypt` N=16384, r=8, p=8, según el estándar) es
  intencionalmente lento; en JS puro puede tardar varios segundos en equipos
  modestos. La UI se mantiene responsiva mientras tanto (yields periódicos).
- No implementa descifrado BIP38 ni importación de carteras existentes: es
  una herramienta de generación, no una billetera completa.
- No verifica balances ni transmite transacciones — deliberadamente no tiene
  ninguna función de red. Tampoco implementa "sweep" (importar y gastar):
  requeriría construir y difundir una transacción, es decir, conexión a
  internet. Para gastar, importa el WIF en una billetera offline compatible
  (Electrum, Sparrow, etc.).
- Solo Bitcoin. No incluye Ethereum/EVM, Solana ni otras cadenas: son
  sistemas criptográficos distintos (Monero, por ejemplo, ni siquiera usa
  BIP32/39 de forma compatible) con su propio modelo de amenaza.
- No implementa Shamir's Secret Sharing (división de la semilla en N-de-M
  partes). Es una función valiosa pero de alto riesgo de implementar mal;
  si la necesitas, quedó fuera de este alcance deliberadamente.
