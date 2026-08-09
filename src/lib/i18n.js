/**
 * Single source of truth for every user-facing string, both for the DOM
 * (values may contain HTML — the dictionary is entirely author-controlled,
 * never derived from user input, so innerHTML assignment is safe) and for
 * the PDF (values there are always plain text, since jsPDF renders text
 * directly, not markup).
 */
export const LANGS = ['es', 'en'];
export const DEFAULT_LANG = 'es';

const dict = {
  'meta.title': {
    es: 'BTC Paper Wallet — Generador Air-Gapped',
    en: 'BTC Paper Wallet — Air-Gapped Generator',
  },
  'topbar.mode.tip': {
    es: 'Básico: solo lo esencial para generar una cartera segura. Avanzado: añade Taproot, cifrado AES de la semilla, entropía por dados, direcciones adicionales y cartera señuelo — pensado para usuarios que ya entienden estos conceptos.',
    en: 'Basic: only the essentials to generate a secure wallet. Advanced: adds Taproot, AES seed encryption, dice entropy, additional addresses, and a decoy wallet — meant for users who already understand these concepts.',
  },
  'topbar.mode.prefix': { es: 'Modo:', en: 'Mode:' },
  'topbar.mode.basic': { es: 'Básico', en: 'Basic' },
  'topbar.mode.advanced': { es: 'Avanzado', en: 'Advanced' },
  'topbar.theme.toLight': { es: '☀ Modo claro', en: '☀ Light mode' },
  'topbar.theme.toDark': { es: '🌙 Modo oscuro', en: '🌙 Dark mode' },
  'topbar.lang.toEnglish': { es: '🌐 English', en: '🌐 English' },
  'topbar.lang.toSpanish': { es: '🌐 Español', en: '🌐 Español' },
  'topbar.inventory.label': { es: '🗂 Inventario', en: '🗂 Inventory' },

  'inventory.title': { es: 'Inventario de esta sesión', en: 'This session’s inventory' },
  'inventory.notice': {
    es: '<strong>Solo vive en la memoria de esta pestaña.</strong> No se guarda en el disco, ni en localStorage, ni en ningún otro lugar: se borra por completo al recargar o cerrar la página. Muestra únicamente direcciones públicas — nunca la semilla ni la clave privada — como ayuda para llevar la cuenta si generás varias carteras en la misma sesión (por ejemplo, para regalos). No reemplaza al PDF: es solo una lista de referencia temporal.',
    en: '<strong>Lives only in this tab’s memory.</strong> It is never saved to disk, localStorage, or anywhere else: it’s completely gone when you reload or close the page. It shows only public addresses — never the seed or private key — as a way to keep track if you generate several wallets in the same session (for gifts, for example). It doesn’t replace the PDF: it’s just a temporary reference list.',
  },
  'inventory.empty': {
    es: 'Todavía no generaste ninguna cartera en esta sesión.',
    en: 'You haven’t generated any wallet in this session yet.',
  },
  'inventory.labelPlaceholder': { es: 'Nombre para identificarla (opcional)', en: 'Name to identify it (optional)' },
  'inventory.pdfBadge': { es: 'PDF generado', en: 'PDF generated' },
  'inventory.remove': { es: 'Quitar', en: 'Remove' },
  'inventory.clearAll': { es: 'Vaciar inventario', en: 'Clear inventory' },
  'inventory.close': { es: 'Cerrar', en: 'Close' },

  'welcome.title': {
    es: 'Generador de Carteras de Papel para Bitcoin',
    en: 'Bitcoin Paper Wallet Generator',
  },
  'welcome.intro': {
    es: 'Herramienta 100% del lado del cliente: nada de lo que generes aquí — semillas, claves, direcciones — sale de esta pestaña ni toca ningún servidor. No hay llamadas de red (compruébalo: la política de seguridad de esta página las bloquea por completo).',
    en: 'A 100% client-side tool: nothing you generate here — seeds, keys, addresses — leaves this tab or touches any server. There are no network calls (check for yourself: this page’s security policy blocks them entirely).',
  },
  'welcome.warning': {
    es: '<strong>Recomendación de seguridad:</strong> para máxima protección, desconecta este equipo de internet (modo avión / cable de red) antes de generar tu cartera, y no lo vuelvas a conectar hasta borrar todo rastro sensible (portapapeles, etc.). Esta página funciona igual sin conexión: ábrela una vez y luego desconéctate.',
    en: '<strong>Security recommendation:</strong> for maximum protection, disconnect this device from the internet (airplane mode / unplug the network cable) before generating your wallet, and don’t reconnect it until you’ve cleared any sensitive trace (clipboard, etc.). This page works the same offline: open it once, then disconnect.',
  },
  'welcome.flow': {
    es: 'El flujo consta de: 1) recolectar entropía adicional, 2) elegir el tipo de dirección y una frase de protección opcional, 3) generar tu semilla, dirección y clave privada, y 4) exportar un PDF listo para imprimir y guardar físicamente. Usa el interruptor <strong>Modo: Básico/Avanzado</strong> arriba a la derecha según tu experiencia, y pasa el cursor sobre cualquier icono <span class="tip" tabindex="0" data-tip="Así se ven los iconos de ayuda: pasa el cursor (o tabula con el teclado) sobre cualquiera de ellos para ver una explicación breve del campo o la opción.">?</span> para ver una explicación.',
    en: 'The flow has four steps: 1) collect extra entropy, 2) choose the address type and an optional protection phrase, 3) generate your seed, address, and private key, and 4) export a PDF ready to print and keep physically. Use the <strong>Mode: Basic/Advanced</strong> switch at the top right depending on your experience, and hover over any <span class="tip" tabindex="0" data-tip="This is what help icons look like: hover (or tab to them with the keyboard) to see a short explanation of the field or option.">?</span> icon to see an explanation.',
  },
  'welcome.button': { es: 'Generar Nueva Cartera', en: 'Generate New Wallet' },
  'welcome.recoverButton': { es: '🔓 Recuperar semilla cifrada', en: '🔓 Recover encrypted seed' },

  'recover.title': { es: 'Recuperar semilla cifrada', en: 'Recover encrypted seed' },
  'recover.intro': {
    es: 'Pegá aquí el bloque cifrado que imprimiste en el PDF (o el texto que obtengas al escanear su código QR con la cámara del celular), junto con la contraseña que usaste para cifrarlo. Funciona sin haber generado nada en esta sesión: no necesitás la cartera original, solo el PDF y la contraseña.',
    en: 'Paste here the encrypted block you printed on the PDF (or the text you get from scanning its QR code with your phone’s camera), along with the password you used to encrypt it. This works without having generated anything in this session: you only need the PDF and the password.',
  },
  'recover.blobLabel': { es: 'Bloque cifrado (AES-256-GCM)', en: 'Encrypted block (AES-256-GCM)' },
  'recover.blobPlaceholder': {
    es: 'Pegá o escribí aquí el bloque cifrado…',
    en: 'Paste or type the encrypted block here…',
  },
  'recover.passwordLabel': { es: 'Contraseña de cifrado', en: 'Encryption password' },
  'recover.decryptButton': { es: 'Descifrar', en: 'Decrypt' },
  'recover.decrypting': { es: 'Descifrando…', en: 'Decrypting…' },
  'recover.close': { es: 'Cerrar', en: 'Close' },
  'recover.resultLabel': { es: 'Semilla recuperada', en: 'Recovered seed' },
  'recover.resultNote': {
    es: 'Esta semilla no vuelve a cifrarse ni a guardarse en ningún lado: solo se muestra en pantalla. Copiala a mano o usá el botón "Copiar" para importarla en tu wallet, y cerrá esta ventana cuando termines.',
    en: 'This seed is not re-encrypted or saved anywhere: it’s only shown on screen. Write it down or use the "Copy" button to import it into your wallet, and close this screen when you’re done.',
  },
  'recover.error.empty': { es: 'Pegá el bloque cifrado y la contraseña primero.', en: 'Paste the encrypted block and the password first.' },
  'recover.error.failed': {
    es: 'No se pudo descifrar. Revisá que copiaste el bloque completo (sin que falte ni sobre nada) y que la contraseña sea exactamente la que usaste.',
    en: 'Could not decrypt. Check that you copied the entire block (nothing missing or extra) and that the password is exactly the one you used.',
  },

  'entropy.title': { es: 'Paso 1 — Recolección de entropía', en: 'Step 1 — Entropy collection' },
  'entropy.intro': {
    es: 'Mueve el ratón o desliza el dedo dentro del recuadro durante unos segundos para mezclar aleatoriedad adicional con el generador criptográfico seguro del navegador (<code>crypto.getRandomValues</code>). Esto es una capa extra de tranquilidad: el generador del navegador ya es seguro por sí solo.',
    en: 'Move the mouse or slide your finger inside the box for a few seconds to mix extra randomness with the browser’s secure cryptographic generator (<code>crypto.getRandomValues</code>). This is an extra layer of reassurance: the browser’s generator is already secure on its own.',
  },
  'entropy.hint': {
    es: 'Mueve el cursor o toca aquí…<br/><span style="font-size:11px">(o pulsa teclas si no tienes puntero)</span>',
    en: 'Move the cursor or tap here…<br/><span style="font-size:11px">(or press keys if you have no pointer)</span>',
  },
  'entropy.hint.ready': { es: '✓ Entropía suficiente recolectada', en: '✓ Enough entropy collected' },
  'entropy.back': { es: 'Atrás', en: 'Back' },
  'entropy.continue': { es: 'Continuar', en: 'Continue' },

  'dice.legend': { es: 'Entropía por dados físicos (diceware)', en: 'Physical dice entropy (diceware)' },
  'dice.legend.tip': {
    es: 'Lanza un dado de 6 caras y escribe cada resultado (1-6). Se combina con el generador criptográfico del navegador igual que el movimiento del cursor: nunca lo sustituye, solo añade aleatoriedad extra verificable con tus propias manos, para quienes no quieren depender solo de la entropía digital.',
    en: 'Roll a 6-sided die and type each result (1-6). It’s mixed in with the browser’s cryptographic generator the same way cursor movement is: it never replaces it, it only adds extra randomness you can verify with your own hands, for anyone who doesn’t want to rely on digital entropy alone.',
  },
  'dice.label': {
    es: 'Tiradas (solo dígitos 1–6, separados como quieras)',
    en: 'Rolls (digits 1–6 only, separated however you like)',
  },
  'dice.placeholder': { es: 'Ej: 3 6 1 4 2 5 6 1 4 3 2 …', en: 'E.g.: 3 6 1 4 2 5 6 1 4 3 2 …' },
  'dice.counter': { es: '{count} tiradas registradas', en: '{count} rolls recorded' },
  'dice.counter.bits': { es: '{count} tiradas registradas · ~{bits} bits', en: '{count} rolls recorded · ~{bits} bits' },
  'dice.counter.enough': { es: ' · suficiente ✓', en: ' · enough ✓' },

  'config.title': { es: 'Paso 2 — Configuración', en: 'Step 2 — Configuration' },
  'config.addressType.legend': { es: 'Tipo de dirección', en: 'Address type' },
  'config.addressType.tip': {
    es: 'Legacy (1...): el formato original, compatible con cualquier billetera pero con comisiones más altas. SegWit compatible (3...): comisiones más bajas, compatible con billeteras antiguas. Native SegWit (bc1...): el más eficiente y recomendado hoy. Taproot (bc1p...): el más moderno, mejor privacidad y eficiencia, requiere billeteras recientes.',
    en: 'Legacy (1...): the original format, compatible with any wallet but with higher fees. SegWit-compatible (3...): lower fees, compatible with older wallets. Native SegWit (bc1...): the most efficient and recommended today. Taproot (bc1p...): the most modern, better privacy and efficiency, requires recent wallets.',
  },
  'config.wordCount.legend': { es: 'Longitud de la semilla', en: 'Seed length' },
  'config.wordCount.tip': {
    es: 'Más palabras = más entropía = más seguridad, a costa de ser más larga de transcribir y guardar. 24 palabras (256 bits) es el estándar recomendado; 12 palabras (128 bits) ya es criptográficamente muy seguro y es una opción válida si prefieres una copia más corta.',
    en: 'More words = more entropy = more security, at the cost of being longer to write down and store. 24 words (256 bits) is the recommended standard; 12 words (128 bits) is already cryptographically very secure and a valid choice if you’d rather have a shorter copy.',
  },
  'config.wordCount.24.label': { es: '24 palabras', en: '24 words' },
  'config.wordCount.24.badge': { es: 'Recomendado', en: 'Recommended' },
  'config.wordCount.24.meta': {
    es: '256 bits de entropía — máxima seguridad',
    en: '256 bits of entropy — maximum security',
  },
  'config.wordCount.12.label': { es: '12 palabras', en: '12 words' },
  'config.wordCount.12.badge': { es: 'Avanzado', en: 'Advanced' },
  'config.wordCount.12.meta': {
    es: '128 bits de entropía — más corta de transcribir',
    en: '128 bits of entropy — shorter to write down',
  },
  'config.passphrase.legend': {
    es: 'Frase de protección extra (BIP39 Passphrase) — opcional',
    en: 'Extra protection phrase (BIP39 Passphrase) — optional',
  },
  'config.passphrase.tip': {
    es: 'También llamada “palabra 25”. Combina con la semilla para derivar una cartera completamente distinta. Nunca se imprime en el PDF: debes recordarla o guardarla por separado. Sirve además como contraseña para el cifrado BIP38, si lo activas.',
    en: 'Also called the “25th word”. It combines with the seed to derive a completely different wallet. It’s never printed on the PDF: you must remember it or store it separately. It also doubles as the BIP38 encryption password if you enable it.',
  },
  'config.passphrase.label': { es: 'Clave extra (1–100 caracteres)', en: 'Extra passphrase (1–100 characters)' },
  'config.passphrase.placeholder': {
    es: 'Déjalo vacío para no usar passphrase',
    en: 'Leave empty to not use a passphrase',
  },
  'config.passphrase.eyeAria': { es: 'Mostrar/ocultar', en: 'Show/hide' },
  'config.passphrase.note': {
    es: 'Esta clave crea una identidad de cartera <strong>completamente distinta</strong> a partir de la misma semilla (BIP39 passphrase, a veces llamada “palabra 25”). <strong>No se imprime en el PDF</strong>: debes memorizarla o guardarla por separado. Si la pierdes, los fondos son irrecuperables.',
    en: 'This key creates a <strong>completely different</strong> wallet identity from the same seed (BIP39 passphrase, sometimes called the “25th word”). <strong>It is not printed on the PDF</strong>: you must memorize it or store it separately. If you lose it, the funds are unrecoverable.',
  },
  'config.bip38.legend': { es: 'Cifrado BIP38 de la clave privada', en: 'BIP38 encryption of the private key' },
  'config.bip38.tip': {
    es: 'Cifra solo la clave privada (WIF) impresa, usando la passphrase de arriba como contraseña. Muy recomendado para cualquier cantidad significativa: aunque alguien encuentre el papel, no podrá gastar los fondos sin la passphrase.',
    en: 'Encrypts only the printed private key (WIF), using the passphrase above as the password. Highly recommended for any significant amount: even if someone finds the paper, they won’t be able to spend the funds without the passphrase.',
  },
  'config.bip38.checkboxLabel': {
    es: 'Cifrar la clave privada (WIF) impresa en el PDF con BIP38, usando la frase de protección extra como contraseña.',
    en: 'Encrypt the private key (WIF) printed on the PDF with BIP38, using the extra protection phrase as the password.',
  },
  'config.bip38.hint.disabled': {
    es: 'Introduce una frase de protección extra arriba para habilitar esta opción.',
    en: 'Enter an extra protection phrase above to enable this option.',
  },
  'config.bip38.hint.enabled': {
    es: 'Se usará tu frase de protección extra como contraseña BIP38.',
    en: 'Your extra protection phrase will be used as the BIP38 password.',
  },
  'config.extraAddresses.legend': { es: 'Direcciones adicionales', en: 'Additional addresses' },
  'config.extraAddresses.tip': {
    es: 'Muestra e incluye en el PDF, como referencia, las otras direcciones (Legacy, SegWit-compatible, Native SegWit y Taproot) derivadas de la misma semilla. Sus claves privadas no se imprimen: siempre puedes re-derivarlas desde la semilla en cualquier billetera compatible usando la ruta indicada.',
    en: 'Shows and includes on the PDF, as reference, the other addresses (Legacy, SegWit-compatible, Native SegWit, and Taproot) derived from the same seed. Their private keys are not printed: you can always re-derive them from the seed in any compatible wallet using the path shown.',
  },
  'config.extraAddresses.checkboxLabel': {
    es: 'Mostrar e incluir en el PDF (página 2, solo direcciones públicas) las 4 direcciones que se pueden derivar de esta semilla.',
    en: 'Show and include on the PDF (page 2, public addresses only) the 4 addresses that can be derived from this seed.',
  },
  'config.seedAes.legend': { es: 'Cifrado AES de la semilla impresa', en: 'AES encryption of the printed seed' },
  'config.seedAes.tip': {
    es: 'Cifra la frase semilla completa (las 24/12 palabras) con una contraseña independiente antes de imprimirla, usando AES-256-GCM. En el PDF aparece un bloque cifrado ilegible en vez de las palabras en claro: sin esta contraseña, nadie puede leer la semilla desde el papel, ni siquiera tú si la olvidas.',
    en: 'Encrypts the full seed phrase (the 24/12 words) with an independent password before printing it, using AES-256-GCM. The PDF shows an unreadable encrypted block instead of the plain words: without this password, nobody can read the seed from the paper — not even you if you forget it.',
  },
  'config.seedAes.checkboxLabel': {
    es: 'Cifrar también la semilla impresa con AES-256 (contraseña independiente de la passphrase BIP39).',
    en: 'Also encrypt the printed seed with AES-256 (password independent of the BIP39 passphrase).',
  },
  'config.seedAes.passwordLabel': { es: 'Contraseña de cifrado del PDF', en: 'PDF encryption password' },
  'config.seedAes.placeholder': {
    es: 'Contraseña distinta a la passphrase (recomendado)',
    en: 'A password different from the passphrase (recommended)',
  },
  'config.seedAes.note': {
    es: 'Guarda esta contraseña por separado del PDF. Si la pierdes, la semilla impresa queda ilegible para siempre, aunque conserves la hoja.',
    en: 'Keep this password separate from the PDF. If you lose it, the printed seed becomes unreadable forever, even if you keep the sheet.',
  },
  'config.back': { es: 'Atrás', en: 'Back' },
  'config.generate': { es: 'Generar Cartera', en: 'Generate Wallet' },
  'config.generating': { es: 'Generando…', en: 'Generating…' },
  'config.error.needSeedAesPassword': {
    es: 'Activaste el cifrado AES de la semilla: introduce una contraseña para él.',
    en: 'You enabled AES seed encryption: enter a password for it.',
  },
  'config.error.generic': { es: 'Error al generar la cartera: ', en: 'Error generating the wallet: ' },

  'strength.emptyPassphrase': { es: 'Sin frase de protección', en: 'No protection phrase' },
  'strength.emptySeedAes': { es: 'Sin contraseña', en: 'No password' },
  'strength.weak': { es: 'Débil', en: 'Weak' },
  'strength.fair': { es: 'Aceptable', en: 'Fair' },
  'strength.good': { es: 'Buena', en: 'Good' },
  'strength.strong': { es: 'Fuerte', en: 'Strong' },

  'dashboard.title': { es: 'Paso 3 — Tu cartera', en: 'Step 3 — Your wallet' },
  'dashboard.mnemonic.label': { es: 'Frase semilla (mnemonic)', en: 'Seed phrase (mnemonic)' },
  'dashboard.mnemonic.show': { es: 'Mostrar', en: 'Show' },
  'dashboard.mnemonic.hide': { es: 'Ocultar', en: 'Hide' },
  'dashboard.seedAesGate.button': { es: 'Descifrar semilla', en: 'Decrypt seed' },
  'dashboard.seedAesGate.hint': {
    es: 'Semilla cifrada con AES-256 — pide su propia contraseña.',
    en: 'Seed encrypted with AES-256 — asks for its own password.',
  },
  'dashboard.address.label': { es: 'Dirección pública', en: 'Public address' },
  'dashboard.copy': { es: 'Copiar', en: 'Copy' },
  'dashboard.copy.success': { es: 'Copiado ✓', en: 'Copied ✓' },
  'dashboard.copy.fail': { es: 'No se pudo copiar', en: 'Could not copy' },
  'dashboard.extraAddresses.label': { es: 'Direcciones adicionales (misma semilla)', en: 'Additional addresses (same seed)' },
  'dashboard.extraAddresses.tip': {
    es: 'Formatos de recepción alternativos. Sus claves privadas no se imprimen ni se muestran aquí por defecto: se re-derivan desde la semilla con la ruta indicada.',
    en: 'Alternative receiving formats. Their private keys are not printed or shown here by default: they’re re-derived from the seed using the path shown.',
  },
  'dashboard.wif.label': { es: 'Clave privada (WIF', en: 'Private key (WIF' },
  'dashboard.wif.bip38Tag': { es: ' — cifrada BIP38 🔒', en: ' — BIP38 encrypted 🔒' },
  'dashboard.wif.reveal': { es: 'Mostrar clave privada', en: 'Show private key' },
  'dashboard.wif.revealHint': {
    es: 'Se te pedirá tu frase de protección para confirmar.',
    en: 'You’ll be asked for your protection phrase to confirm.',
  },
  'dashboard.wif.revealPassPlaceholder': { es: 'Frase de protección extra', en: 'Extra protection phrase' },
  'dashboard.wif.confirm': { es: 'Confirmar', en: 'Confirm' },
  'dashboard.wif.wrongPass': { es: 'Frase incorrecta.', en: 'Incorrect phrase.' },
  'dashboard.wif.visibleBadge': { es: 'Clave visible', en: 'Key visible' },
  'dashboard.seedAes.passwordPlaceholder': { es: 'Contraseña de cifrado del PDF', en: 'PDF encryption password' },
  'dashboard.seedAes.decryptButton': { es: 'Descifrar', en: 'Decrypt' },
  'dashboard.seedAes.wrongPass': { es: 'Contraseña incorrecta.', en: 'Incorrect password.' },
  'dashboard.seedAes.decryptedBadge': { es: 'Semilla descifrada y visible', en: 'Seed decrypted and visible' },

  'dashboard.decoy.legend': { es: 'Cartera oculta / señuelo (negación plausible)', en: 'Hidden / decoy wallet (plausible deniability)' },
  'dashboard.decoy.tip': {
    es: 'La semilla (24 palabras) es la misma para cualquier passphrase: solo cambia la contraseña. Por eso NUNCA se debe imprimir el mismo mnemonic dos veces como “dos carteras” — eso delataría el truco. El patrón correcto: financia ligeramente la dirección sin passphrase (o con una passphrase trivial) como señuelo, y guarda tu passphrase real solo en tu memoria, jamás por escrito junto al PDF. Aquí abajo puedes ver la dirección señuelo (dato público, sin riesgo de mostrarla) y, si quieres, descargar una tarjeta separada solo con esa dirección — nunca con el mnemonic.',
    en: 'The seed (24 words) is the same regardless of the passphrase: only the password changes. That’s why the same mnemonic must NEVER be printed twice as “two wallets” — that would give the trick away. The correct pattern: lightly fund the address with no passphrase (or a trivial one) as a decoy, and keep your real passphrase only in your memory, never written down next to the PDF. Below you can see the decoy address (public data, safe to show) and, if you want, download a separate card with just that address — never with the mnemonic.',
  },
  'dashboard.decoy.intro': {
    es: 'Esta sección no genera una semilla nueva: usa <strong>la misma semilla</strong> con una passphrase distinta (o vacía) para calcular la dirección de una cartera “señuelo”. Nunca imprimas el mnemonic dos veces — solo la passphrase cambia entre tu cartera real y la señuelo, y esa passphrase real debe quedar únicamente en tu memoria.',
    en: 'This section doesn’t generate a new seed: it uses <strong>the same seed</strong> with a different (or empty) passphrase to compute the address of a “decoy” wallet. Never print the mnemonic twice — only the passphrase differs between your real wallet and the decoy, and that real passphrase must stay only in your memory.',
  },
  'dashboard.decoy.passphraseLabel': {
    es: 'Passphrase de la cartera señuelo (vacío = sin passphrase)',
    en: 'Decoy wallet passphrase (empty = no passphrase)',
  },
  'dashboard.decoy.placeholder': {
    es: 'Déjalo vacío o usa una passphrase distinta a la real',
    en: 'Leave it empty or use a passphrase different from the real one',
  },
  'dashboard.decoy.previewButton': { es: 'Calcular dirección señuelo', en: 'Compute decoy address' },
  'dashboard.decoy.addressLabel': { es: 'Dirección señuelo (dato público)', en: 'Decoy address (public data)' },
  'dashboard.decoy.downloadButton': {
    es: 'Descargar tarjeta señuelo (solo dirección, sin mnemonic)',
    en: 'Download decoy card (address only, no mnemonic)',
  },
  'dashboard.decoy.samePassphraseError': {
    es: 'Esa es tu passphrase real: usa una distinta (o vacía) para la señuelo.',
    en: 'That’s your real passphrase: use a different one (or none) for the decoy.',
  },
  'dashboard.decoy.calculating': { es: 'Calculando…', en: 'Computing…' },
  'dashboard.decoy.error': { es: 'Error: ', en: 'Error: ' },
  'dashboard.decoy.cardDownloaded': {
    es: 'Tarjeta señuelo descargada (sin mnemonic). Guárdala separada de la cartera real.',
    en: 'Decoy card downloaded (no mnemonic). Keep it separate from the real wallet.',
  },
  'dashboard.decoy.cardError': { es: 'Error al generar la tarjeta: ', en: 'Error generating the card: ' },

  'dashboard.consent': {
    es: '<strong>Entiendo</strong> que si pierdo la semilla o la clave extra, mis BTC serán irrecuperables. Entiendo que esta herramienta funciona offline y debo guardar este PDF en un lugar físico seguro.',
    en: '<strong>I understand</strong> that if I lose the seed or the extra passphrase, my BTC will be unrecoverable. I understand that this tool works offline and I must keep this PDF in a physically secure place.',
  },
  'dashboard.back': { es: 'Atrás', en: 'Back' },
  'dashboard.generatePdf': { es: 'Generar PDF Seguro', en: 'Generate Secure PDF' },
  'dashboard.wipe': { es: 'Borrar todo (nueva cartera)', en: 'Wipe everything (new wallet)' },
  'dashboard.generatingPdf': { es: 'Generando PDF…', en: 'Generating PDF…' },
  'dashboard.pdfSuccess': {
    es: 'PDF generado. Guárdalo en un lugar físico seguro y elimina la copia de tu carpeta de descargas si no la necesitas ahí.',
    en: 'PDF generated. Keep it in a physically secure place and delete the copy in your downloads folder if you don’t need it there.',
  },
  'dashboard.pdfError': { es: 'Error al generar el PDF: ', en: 'Error generating the PDF: ' },

  'footer.note': {
    es: 'Código 100% cliente · sin cookies · sin almacenamiento persistente · sin llamadas de red (bloqueadas por CSP). Revisa el código fuente antes de confiar en él.',
    en: '100% client-side code · no cookies · no persistent storage · no network calls (blocked by CSP). Review the source code before trusting it.',
  },

  // ---- PDF content (plain text only — jsPDF renders text, not markup) ----
  'pdf.publicHeader': { es: 'BTC PAPER WALLET — SECCION PUBLICA', en: 'BTC PAPER WALLET — PUBLIC SECTION' },
  'pdf.cardHeader': { es: 'BTC PAPER WALLET', en: 'BTC PAPER WALLET' },
  'pdf.walletNameLabel': {
    es: 'Nombre de la cartera: ___________________________',
    en: 'Wallet name: _______________________________',
  },
  'pdf.addressTypeLabel': { es: 'Tipo de direccion: ', en: 'Address type: ' },
  'pdf.pathLabel': { es: 'Ruta de derivacion: ', en: 'Derivation path: ' },
  'pdf.addressSectionLabel': { es: 'Direccion publica (recibir fondos):', en: 'Public address (receive funds):' },
  'pdf.shareNote': {
    es: 'Puedes compartir esta direccion y su QR libremente para recibir Bitcoin.',
    en: 'You can freely share this address and its QR code to receive Bitcoin.',
  },
  'pdf.foldLine': { es: '- - - doblar / cortar aqui - - -', en: '- - - fold / cut here - - -' },
  'pdf.privateHeader': { es: 'SECCION PRIVADA — NO COMPARTIR', en: 'PRIVATE SECTION — DO NOT SHARE' },
  'pdf.privateNote': {
    es: 'Mantener en lugar seguro. Esta es la unica copia de tus fondos.',
    en: 'Keep in a safe place. This is the only copy of your funds.',
  },
  'pdf.bip38Note': {
    es: ' Clave privada cifrada con BIP38: necesitas tu frase de proteccion extra para gastar los fondos.',
    en: ' Private key encrypted with BIP38: you need your extra protection phrase to spend the funds.',
  },
  'pdf.mnemonicLabel': { es: 'Frase semilla ({n} palabras, BIP39):', en: 'Seed phrase ({n} words, BIP39):' },
  'pdf.seedEncryptedLabel': {
    es: 'Semilla cifrada (AES-256-GCM) — requiere contrasena de cifrado propia:',
    en: 'Encrypted seed (AES-256-GCM) — requires its own encryption password:',
  },
  'pdf.seedRecoveryNote': {
    es: 'Para recuperarla: abri index.html (guarda una copia junto a tus respaldos, funciona offline) y usa "Recuperar semilla cifrada" con este bloque (o el QR) y tu contrasena.',
    en: 'To recover it: open index.html (keep a copy with your backups, it works offline) and use "Recover encrypted seed" with this block (or the QR) and your password.',
  },
  'pdf.wifLabel': { es: 'Clave privada (WIF):', en: 'Private key (WIF):' },
  'pdf.wifBip38Label': { es: 'Clave privada (WIF, cifrada BIP38):', en: 'Private key (WIF, BIP38 encrypted):' },
  'pdf.passphraseNote': {
    es: 'La frase de proteccion extra (BIP39 passphrase) NO esta impresa aqui. Debes recordarla o guardarla por separado: sin ella no podras recuperar los fondos.',
    en: 'The extra protection phrase (BIP39 passphrase) is NOT printed here. You must remember it or store it separately: without it you will not be able to recover the funds.',
  },
  'pdf.extraAddressesHeader': { es: 'DIRECCIONES ADICIONALES (misma semilla)', en: 'ADDITIONAL ADDRESSES (same seed)' },
  'pdf.extraAddressesNote': {
    es: 'Formatos de recepcion alternativos derivados de la misma semilla BIP32. Sus claves privadas no se imprimen aqui: si las necesitas, puedes re-derivarlas en cualquier billetera compatible (Electrum, Sparrow, etc.) usando la ruta indicada junto a cada una.',
    en: 'Alternative receiving formats derived from the same BIP32 seed. Their private keys are not printed here: if you need them, you can re-derive them in any compatible wallet (Electrum, Sparrow, etc.) using the path shown next to each one.',
  },
  'pdf.pathPrefix': { es: 'Ruta: ', en: 'Path: ' },
};

/**
 * Translate a key for a given language, with optional {placeholder}
 * substitution. Falls back to the default language, then to the raw key,
 * so a missing translation degrades to visible-but-not-crashing rather
 * than silently rendering blank.
 */
export function t(key, lang, vars) {
  const entry = dict[key];
  let str = entry ? (entry[lang] ?? entry[DEFAULT_LANG]) : key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) str = str.replaceAll(`{${k}}`, String(v));
  }
  return str;
}
