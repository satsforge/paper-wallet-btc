import QRCode from 'qrcode';
import { EntropyCollector } from './lib/entropy.js';
import { STRENGTH_12, STRENGTH_24, generateMnemonicFromEntropy, seedFromMnemonic } from './lib/mnemonic.js';
import { ADDRESS_TYPES, deriveWallet, deriveAllWallets } from './lib/wallet.js';
import { bip38Encrypt } from './lib/bip38.js';
import { encryptMnemonic, decryptMnemonic } from './lib/seedCipher.js';
import { parseRolls, rollsNeededForBits, bitsFromRollCount, diceEntropyBytes } from './lib/diceware.js';
import { buildPaperWalletPdf, buildDecoyCardPdf } from './lib/pdf.js';
import { t, LANGS, DEFAULT_LANG } from './lib/i18n.js';

const $ = (id) => document.getElementById(id);

const SCREENS = ['welcome', 'entropy', 'config', 'dashboard'];
const DICE_TARGET_BITS = 256; // enough headroom for either 12 or 24 words

const state = {
  screenIndex: 0,
  mode: 'basic',
  lang: DEFAULT_LANG,
  addressType: 'bech32',
  wordCount: 24,
  passphrase: '',
  useBip38: false,
  showAllAddresses: false,
  useSeedAes: false,
  seedAesPassword: '',
  diceRolls: [],
  collector: new EntropyCollector(),
  // wallet: { mnemonicWords, mnemonic, address, addressTypeLabel, path, wifOrEncrypted, isBip38,
  //           seedEncrypted, encryptedSeedBlob, extraAddresses }
  wallet: null,
  // In-memory-only record of wallets generated this session: public data
  // (address, type, path, label) never touches localStorage/IndexedDB/disk
  // and is gone on reload or close. See inventory.notice for the exact
  // wording shown to the user. Never store mnemonic/WIF/encrypted blobs here.
  sessionInventory: [],
};
let currentInventoryEntry = null;
let screenIndexBeforeInventory = null;

/** Shorthand bound to the current UI language. */
function tr(key, vars) {
  return t(key, state.lang, vars);
}

function showScreen(index) {
  state.screenIndex = index;
  SCREENS.forEach((name, i) => {
    $(`screen-${name}`).classList.toggle('visible', i === index);
  });
  document.querySelectorAll('#steps .dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === index);
    dot.classList.toggle('done', i < index);
  });
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
}

// ---------- Theme, language & mode ----------
function updateThemeButtonLabel() {
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  $('themeToggle').textContent = tr(isLight ? 'topbar.theme.toDark' : 'topbar.theme.toLight');
}

$('themeToggle').addEventListener('click', () => {
  const html = document.documentElement;
  const next = html.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
  html.setAttribute('data-theme', next);
  updateThemeButtonLabel();
});

function updateLangButtonLabel() {
  $('langToggle').textContent = tr(state.lang === 'es' ? 'topbar.lang.toEnglish' : 'topbar.lang.toSpanish');
}

$('langToggle').addEventListener('click', () => {
  const idx = LANGS.indexOf(state.lang);
  state.lang = LANGS[(idx + 1) % LANGS.length];
  applyTranslations();
});

function updateModeButtonLabel() {
  $('modeLabel').textContent = tr(state.mode === 'advanced' ? 'topbar.mode.advanced' : 'topbar.mode.basic');
}

$('modeToggle').addEventListener('click', () => {
  state.mode = state.mode === 'basic' ? 'advanced' : 'basic';
  document.documentElement.setAttribute('data-mode', state.mode);
  $('modeToggle').setAttribute('aria-pressed', String(state.mode === 'advanced'));
  updateModeButtonLabel();
  if (state.mode === 'basic') {
    // Basic mode never uses advanced-only features, even if they were set before switching.
    state.showAllAddresses = false;
    state.useSeedAes = false;
    $('showAllAddresses').checked = false;
    $('useSeedAes').checked = false;
    $('seedAesFields').classList.add('hidden');
  }
});

/**
 * Applies the current language to every static [data-i18n*] element, then
 * refreshes the handful of dynamically-generated bits that the generic
 * walker can't reach (button labels that depend on other state, strength
 * meters, the address-type list, and — if a wallet is already on screen —
 * the dashboard). Re-rendering the dashboard re-masks any revealed secret;
 * that's an intentional side effect of switching language, not a bug.
 */
function applyTranslations() {
  document.documentElement.lang = state.lang;
  document.title = tr('meta.title');

  document.querySelectorAll('[data-i18n]').forEach((el) => { el.innerHTML = tr(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-tip]').forEach((el) => { el.setAttribute('data-tip', tr(el.dataset.i18nTip)); });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => { el.setAttribute('placeholder', tr(el.dataset.i18nPlaceholder)); });
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', tr(el.dataset.i18nAria)); });

  updateThemeButtonLabel();
  updateLangButtonLabel();
  updateModeButtonLabel();
  renderAddressTypeOptions();
  updateDiceCounterLabel();
  paintStrengthMeter('strengthMeter', 'strengthLabel', estimatePassphraseBits(state.passphrase), tr('strength.emptyPassphrase'));
  paintStrengthMeter('seedAesStrengthMeter', 'seedAesStrengthLabel', estimatePassphraseBits(state.seedAesPassword), tr('strength.emptySeedAes'));
  $('bip38Hint').textContent = tr(state.passphrase.length > 0 ? 'config.bip38.hint.enabled' : 'config.bip38.hint.disabled');
  if (state.wallet) renderDashboard();
  if ($('screen-inventory').classList.contains('visible')) renderInventory();
}

// ---------- Session inventory (in-memory only, never persisted) ----------
function updateInventoryBadge() {
  $('inventoryCount').textContent = String(state.sessionInventory.length);
}

function renderInventory() {
  const list = $('inventoryList');
  if (state.sessionInventory.length === 0) {
    list.innerHTML = `<p class="inventory-empty">${tr('inventory.empty')}</p>`;
    return;
  }
  list.innerHTML = state.sessionInventory
    .slice()
    .reverse()
    .map((entry) => `
      <div class="inventory-item">
        <div class="inventory-item-head">
          <input type="text" class="inventory-label-input" data-id="${entry.id}" placeholder="${tr('inventory.labelPlaceholder')}" value="${escapeHtml(entry.label)}" />
          <span class="badge">${escapeHtml(entry.addressTypeLabel)}</span>
          ${entry.isBip38 ? '<span class="badge on">BIP38</span>' : ''}
          ${entry.seedEncrypted ? '<span class="badge on">AES</span>' : ''}
          ${entry.pdfGenerated ? `<span class="badge on">${tr('inventory.pdfBadge')}</span>` : ''}
        </div>
        <div class="address-box" style="margin-top:8px;">${escapeHtml(entry.address)}</div>
        <div style="font-size:11px; color:var(--text-dim); margin-top:4px;">${escapeHtml(entry.path)} · ${entry.createdAt.toLocaleTimeString()}</div>
        <div class="btn-row" style="margin-top:8px;">
          <button class="copy-btn" data-copy-id="${entry.id}">${tr('dashboard.copy')}</button>
          <button class="copy-btn" data-remove-id="${entry.id}" style="color:var(--danger); border-color:var(--danger);">${tr('inventory.remove')}</button>
        </div>
      </div>`)
    .join('');
}

$('inventoryList').addEventListener('input', (e) => {
  if (!e.target.classList.contains('inventory-label-input')) return;
  const entry = state.sessionInventory.find((x) => x.id === e.target.dataset.id);
  if (entry) entry.label = e.target.value;
});

$('inventoryList').addEventListener('click', async (e) => {
  const copyId = e.target.dataset.copyId;
  const removeId = e.target.dataset.removeId;
  if (copyId) {
    const entry = state.sessionInventory.find((x) => x.id === copyId);
    if (entry) flashCopyResult(e.target, await copyToClipboard(entry.address));
  } else if (removeId) {
    state.sessionInventory = state.sessionInventory.filter((x) => x.id !== removeId);
    updateInventoryBadge();
    renderInventory();
  }
});

$('btnClearInventory').addEventListener('click', () => {
  state.sessionInventory = [];
  updateInventoryBadge();
  renderInventory();
});

function openInventory() {
  screenIndexBeforeInventory = state.screenIndex;
  $(`screen-${SCREENS[state.screenIndex]}`).classList.remove('visible');
  $('steps').classList.add('hidden');
  $('screen-inventory').classList.add('visible');
  renderInventory();
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
}

function closeInventory() {
  $('screen-inventory').classList.remove('visible');
  $('steps').classList.remove('hidden');
  if (screenIndexBeforeInventory !== null) {
    $(`screen-${SCREENS[screenIndexBeforeInventory]}`).classList.add('visible');
  }
}

$('inventoryToggle').addEventListener('click', () => {
  if ($('screen-inventory').classList.contains('visible')) closeInventory();
  else openInventory();
});
$('btnCloseInventory').addEventListener('click', closeInventory);

// ---------- Screen 0: welcome ----------
$('btnStart').addEventListener('click', () => {
  showScreen(1);
  startEntropyCapture();
});

// ---------- Screen 1: entropy ----------
let entropyRAF = null;
let particles = [];

function startEntropyCapture() {
  const wrap = $('entropyWrap');
  const canvas = $('entropyCanvas');
  const ctx = canvas.getContext('2d');
  const hint = $('entropyHint');
  particles = [];
  $('btnEntropyContinue').disabled = true;

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = wrap.clientWidth * dpr;
    canvas.height = wrap.clientHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  function updateProgressUI() {
    $('entropyProgress').style.width = `${Math.round(state.collector.progress() * 100)}%`;
    if (state.collector.isReady()) {
      $('btnEntropyContinue').disabled = false;
      hint.textContent = tr('entropy.hint.ready');
    }
  }

  state.collector = new EntropyCollector();
  state.collector.start(updateProgressUI);

  function spawn(x, y) {
    for (let i = 0; i < 3; i++) {
      particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 2.2,
        vy: (Math.random() - 0.5) * 2.2,
        life: 1,
        r: 2 + Math.random() * 2.5,
      });
    }
  }

  function onMove(clientX, clientY) {
    const rect = wrap.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    hint.style.opacity = '0';
    spawn(x, y);
    state.collector.feed(x, y);
  }

  const moveHandler = (e) => onMove(e.clientX, e.clientY);
  const touchHandler = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    if (touch) onMove(touch.clientX, touch.clientY);
  };
  const keyHandler = () => {
    hint.style.opacity = '0';
    const rect = wrap.getBoundingClientRect();
    const x = Math.random() * rect.width;
    const y = Math.random() * rect.height;
    spawn(x, y);
    state.collector.feed(x, y, performance.now());
  };

  wrap.addEventListener('pointermove', moveHandler);
  wrap.addEventListener('touchmove', touchHandler, { passive: false });
  window.addEventListener('keydown', keyHandler);

  function accent() {
    return getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#f7931a';
  }

  function tick() {
    const w = wrap.clientWidth, h = wrap.clientHeight;
    ctx.clearRect(0, 0, w, h);
    const color = accent();
    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.02;
      ctx.globalAlpha = Math.max(p.life, 0);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    particles = particles.filter((p) => p.life > 0);
    // Re-evaluate progress every frame, not just on pointer/touch/key
    // events: the time-based half of progress() must keep advancing even
    // while the user is momentarily still, or the bar can appear stuck.
    updateProgressUI();
    entropyRAF = requestAnimationFrame(tick);
  }
  cancelAnimationFrame(entropyRAF);
  tick();

  state._cleanupEntropy = () => {
    wrap.removeEventListener('pointermove', moveHandler);
    wrap.removeEventListener('touchmove', touchHandler);
    window.removeEventListener('keydown', keyHandler);
    window.removeEventListener('resize', resize);
    cancelAnimationFrame(entropyRAF);
  };
}

$('btnBackToWelcome').addEventListener('click', () => {
  if (state._cleanupEntropy) state._cleanupEntropy();
  showScreen(0);
});

$('btnEntropyContinue').addEventListener('click', () => {
  if (state._cleanupEntropy) state._cleanupEntropy();
  showScreen(2);
});

// ---------- Dice entropy (advanced) ----------
const diceRollsTarget = rollsNeededForBits(DICE_TARGET_BITS);

function updateDiceCounterLabel() {
  const count = state.diceRolls.length;
  const bits = Math.round(bitsFromRollCount(count));
  const pct = Math.min(100, Math.round((count / diceRollsTarget) * 100));
  $('diceProgress').style.width = `${pct}%`;
  $('diceLabel').textContent = count === 0
    ? tr('dice.counter', { count })
    : tr('dice.counter.bits', { count, bits }) + (count >= diceRollsTarget ? tr('dice.counter.enough') : '');
}

$('diceInput').addEventListener('input', (e) => {
  state.diceRolls = parseRolls(e.target.value);
  updateDiceCounterLabel();
});

// ---------- Screen 2: config ----------
function renderAddressTypeOptions() {
  const row = $('addressTypeRow');
  row.innerHTML = '';
  Object.entries(ADDRESS_TYPES).forEach(([key, meta]) => {
    const label = document.createElement('label');
    label.className = 'radio-opt' + (key === state.addressType ? ' selected' : '');
    label.dataset.key = key;
    label.innerHTML = `
      <input type="radio" name="addrtype" value="${key}" ${key === state.addressType ? 'checked' : ''} />
      <div><div><strong>${meta.label}</strong> <span class="badge">${meta.prefix}</span></div>
      <div class="meta">${meta.path}</div></div>`;
    label.addEventListener('click', () => {
      state.addressType = key;
      row.querySelectorAll('.radio-opt').forEach((el) => el.classList.toggle('selected', el.dataset.key === key));
    });
    row.appendChild(label);
  });
}
renderAddressTypeOptions();

document.querySelectorAll('[data-wc]').forEach((label) => {
  label.addEventListener('click', () => {
    state.wordCount = Number(label.dataset.wc);
    document.querySelectorAll('[data-wc]').forEach((el) => el.classList.toggle('selected', el === label));
  });
});

$('togglePassphrase').addEventListener('click', () => {
  const input = $('passphrase');
  input.type = input.type === 'password' ? 'text' : 'password';
});

const COMMON_WEAK_WORDS = [
  'password', 'qwerty', 'letmein', 'admin', 'welcome', 'monkey', 'dragon',
  'master', 'login', 'princess', 'football', 'iloveyou', 'sunshine',
  'bitcoin', 'satoshi', 'wallet', 'crypto', 'trustno1', 'freedom', 'whatever',
  'passphrase', 'mnemonic', 'changeme', 'secret',
];

/** Smallest period p such that pass is exactly p-periodic (e.g. "abab" -> 2, "aaaa" -> 1). */
function findRepeatingPeriod(pass) {
  const len = pass.length;
  for (let p = 1; p <= Math.floor(len / 2); p++) {
    let periodic = true;
    for (let i = p; i < len; i++) {
      if (pass[i] !== pass[i - p]) { periodic = false; break; }
    }
    if (periodic) return p;
  }
  return len;
}

/** Detects runs of consecutive ascending/descending char codes ("abcd", "4321"). */
function hasSequentialRun(pass, minRun = 4) {
  const lower = pass.toLowerCase();
  let ascRun = 1, descRun = 1;
  for (let i = 1; i < lower.length; i++) {
    const diff = lower.charCodeAt(i) - lower.charCodeAt(i - 1);
    ascRun = diff === 1 ? ascRun + 1 : 1;
    descRun = diff === -1 ? descRun + 1 : 1;
    if (ascRun >= minRun || descRun >= minRun) return true;
  }
  return false;
}

/**
 * Rough entropy estimate. Plain length*log2(charset) rates "aaaaaaaaaaaaaaaa"
 * as "Fuerte" and misses dictionary words entirely, so this also collapses
 * repeating patterns down to their repeating unit and flags well-known weak
 * words/keyboard runs before falling back to the charset formula.
 */
function estimatePassphraseBits(pass) {
  if (!pass) return 0;
  const lower = pass.toLowerCase();
  if (COMMON_WEAK_WORDS.some((w) => lower.includes(w))) return 8;

  let charset = 0;
  if (/[a-z]/.test(pass)) charset += 26;
  if (/[A-Z]/.test(pass)) charset += 26;
  if (/[0-9]/.test(pass)) charset += 10;
  if (/[^a-zA-Z0-9]/.test(pass)) charset += 33;
  charset = Math.max(charset, 1);

  let effectiveLength = findRepeatingPeriod(pass);
  if (hasSequentialRun(pass)) effectiveLength = Math.min(effectiveLength, 3);

  return effectiveLength * Math.log2(charset);
}

function paintStrengthMeter(containerId, labelId, bits, emptyLabel) {
  const bars = $(containerId).children;
  let level = 0, label = emptyLabel, color = 'var(--border)';
  if (bits > 0) {
    if (bits < 28) { level = 1; label = tr('strength.weak'); color = 'var(--danger)'; }
    else if (bits < 40) { level = 2; label = tr('strength.fair'); color = '#e0a53e'; }
    else if (bits < 65) { level = 3; label = tr('strength.good'); color = 'var(--accent)'; }
    else { level = 4; label = tr('strength.strong'); color = 'var(--ok)'; }
  }
  Array.from(bars).forEach((bar, i) => { bar.style.background = i < level ? color : 'var(--border)'; });
  $(labelId).textContent = label;
}

$('passphrase').addEventListener('input', (e) => {
  state.passphrase = e.target.value;
  paintStrengthMeter('strengthMeter', 'strengthLabel', estimatePassphraseBits(state.passphrase), tr('strength.emptyPassphrase'));

  const bip38 = $('useBip38');
  const hint = $('bip38Hint');
  if (state.passphrase.length > 0) {
    if (bip38.disabled) { bip38.checked = true; state.useBip38 = true; }
    bip38.disabled = false;
    hint.textContent = tr('config.bip38.hint.enabled');
  } else {
    bip38.disabled = true;
    bip38.checked = false;
    state.useBip38 = false;
    hint.textContent = tr('config.bip38.hint.disabled');
  }
});

$('useBip38').addEventListener('change', (e) => { state.useBip38 = e.target.checked; });

$('showAllAddresses').addEventListener('change', (e) => { state.showAllAddresses = e.target.checked; });

$('useSeedAes').addEventListener('change', (e) => {
  state.useSeedAes = e.target.checked;
  $('seedAesFields').classList.toggle('hidden', !state.useSeedAes);
});
$('seedAesPassword').addEventListener('input', (e) => {
  state.seedAesPassword = e.target.value;
  paintStrengthMeter('seedAesStrengthMeter', 'seedAesStrengthLabel', estimatePassphraseBits(state.seedAesPassword), tr('strength.emptySeedAes'));
});
$('toggleSeedAesPassword').addEventListener('click', () => {
  const input = $('seedAesPassword');
  input.type = input.type === 'password' ? 'text' : 'password';
});

$('btnBackToEntropy').addEventListener('click', () => {
  showScreen(1);
  startEntropyCapture();
});

$('btnGenerate').addEventListener('click', async () => {
  const btn = $('btnGenerate');
  if (state.useSeedAes && state.seedAesPassword.length === 0) {
    $('configError').textContent = tr('config.error.needSeedAesPassword');
    return;
  }
  btn.disabled = true;
  const originalText = btn.textContent;
  btn.textContent = tr('config.generating');
  try {
    await generateWallet();
    $('configError').textContent = '';
    showScreen(3);
  } catch (err) {
    $('configError').textContent = tr('config.error.generic') + err.message;
    console.error(err);
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
});

async function generateWallet() {
  const strengthBits = state.wordCount === 12 ? STRENGTH_12 : STRENGTH_24;
  if (state.diceRolls.length > 0) {
    state.collector.mixExternalBytes(diceEntropyBytes(state.diceRolls));
  }
  const entropyBytes = state.collector.getMixedBytes(strengthBits / 8);
  const mnemonic = generateMnemonicFromEntropy(entropyBytes);
  const mnemonicWords = mnemonic.split(' ');

  const seed = await seedFromMnemonic(mnemonic, state.passphrase);

  let derived, extraAddresses = [];
  if (state.showAllAddresses) {
    const all = deriveAllWallets(seed);
    derived = all[state.addressType];
    extraAddresses = Object.values(all)
      .filter((w) => w.type !== state.addressType)
      .map((w) => ({ label: ADDRESS_TYPES[w.type].label, address: w.address, path: w.path }));
    Object.values(all).forEach((w) => { if (w !== derived) w.privateKey.fill(0); });
  } else {
    derived = deriveWallet(seed, state.addressType);
  }
  seed.fill(0);

  let wifOrEncrypted = derived.wif;
  let isBip38 = false;
  if (state.useBip38 && state.passphrase.length > 0) {
    wifOrEncrypted = await bip38Encrypt(derived.privateKey, derived.publicKey, state.passphrase);
    isBip38 = true;
  }
  derived.privateKey.fill(0);

  let seedEncrypted = false;
  let encryptedSeedBlob = null;
  if (state.useSeedAes) {
    encryptedSeedBlob = await encryptMnemonic(mnemonic, state.seedAesPassword);
    seedEncrypted = true;
  }

  state.wallet = {
    mnemonic,
    mnemonicWords,
    address: derived.address,
    addressTypeLabel: ADDRESS_TYPES[state.addressType].label,
    path: derived.path,
    wifOrEncrypted,
    isBip38,
    extraAddresses,
    seedEncrypted,
    encryptedSeedBlob,
  };

  // Session-only inventory entry: public data alone (address, type, path),
  // never the mnemonic/WIF/encrypted blob. See the `sessionInventory`
  // comment on `state` for why this never touches persistent storage.
  currentInventoryEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    address: derived.address,
    addressTypeLabel: ADDRESS_TYPES[state.addressType].label,
    path: derived.path,
    isBip38,
    seedEncrypted,
    createdAt: new Date(),
    label: '',
    pdfGenerated: false,
  };
  state.sessionInventory.push(currentInventoryEntry);
  updateInventoryBadge();

  renderDashboard();
}

// ---------- Screen 3: dashboard ----------
function renderDashboard() {
  const w = state.wallet;

  if (w.seedEncrypted) {
    $('mnemonicGrid').classList.add('hidden');
    $('btnToggleMnemonic').classList.add('hidden');
    $('seedAesGate').classList.remove('hidden');
    $('seedAesGate').innerHTML = `
      <button class="btn btn-secondary" id="btnRevealSeed" type="button">${tr('dashboard.seedAesGate.button')}</button>
      <span style="font-size:12px; color:var(--text-dim)">${tr('dashboard.seedAesGate.hint')}</span>`;
    $('btnRevealSeed').addEventListener('click', onRevealSeedClick);
  } else {
    $('mnemonicGrid').classList.remove('hidden');
    $('btnToggleMnemonic').classList.remove('hidden');
    $('seedAesGate').classList.add('hidden');
    const grid = $('mnemonicGrid');
    grid.classList.add('masked');
    grid.innerHTML = w.mnemonicWords
      .map((word, i) => `<div class="w"><span class="i">${i + 1}.</span><span class="word">${escapeHtml(word)}</span></div>`)
      .join('');
    $('btnToggleMnemonic').textContent = tr('dashboard.mnemonic.show');
  }

  $('addressBox').textContent = w.address;
  QRCode.toCanvas($('qrAddress'), w.address, { width: 220, margin: 1 }).catch(() => {});

  const extraBlock = $('extraAddressesBlock');
  if (w.extraAddresses.length > 0) {
    extraBlock.classList.remove('hidden');
    $('extraAddressesList').innerHTML = w.extraAddresses
      .map((ex) => `
        <div class="address-box" style="margin-bottom:8px; display:flex; justify-content:space-between; align-items:center; gap:10px;">
          <div><strong>${escapeHtml(ex.label)}</strong><br/><span style="word-break:break-all;">${escapeHtml(ex.address)}</span></div>
        </div>`)
      .join('');
  } else {
    extraBlock.classList.add('hidden');
    $('extraAddressesList').innerHTML = '';
  }

  $('wifBip38Tag').textContent = w.isBip38 ? tr('dashboard.wif.bip38Tag') : '';
  const wifBox = $('wifBox');
  wifBox.textContent = maskWif(w.wifOrEncrypted);
  wifBox.dataset.revealed = 'false';
  $('btnCopyWif').disabled = true;
  $('revealGate').innerHTML = `
    <button class="btn btn-secondary" id="btnRevealWif" type="button">${tr('dashboard.wif.reveal')}</button>
    <span style="font-size:12px; color:var(--text-dim)">${w.isBip38 || state.passphrase ? tr('dashboard.wif.revealHint') : ''}</span>`;
  $('revealGate').querySelector('#btnRevealWif').addEventListener('click', onRevealWifClick);

  $('decoyPassphrase').value = '';
  $('decoyResult').classList.add('hidden');
  $('decoyStatus').textContent = '';
  state._decoyWallet = null;

  $('confirmUnderstand').checked = false;
  $('btnGeneratePdf').disabled = true;
  $('pdfStatus').textContent = '';
}

function maskWif(wif) {
  if (wif.length <= 10) return wif;
  return `${wif.slice(0, 4)}${'•'.repeat(Math.max(wif.length - 8, 6))}${wif.slice(-4)}`;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function onRevealWifClick() {
  const gate = $('revealGate');
  if (state.passphrase.length > 0) {
    gate.innerHTML = `
      <input type="password" id="revealPass" placeholder="${tr('dashboard.wif.revealPassPlaceholder')}" autocomplete="off" spellcheck="false" style="flex:1; min-width:180px; background:var(--bg-panel-2); border:1px solid var(--border); color:var(--text); border-radius:6px; padding:8px 10px; font-family:var(--mono);" />
      <button class="btn btn-secondary" id="btnConfirmReveal" type="button">${tr('dashboard.wif.confirm')}</button>
      <span id="revealError" style="font-size:12px; color:var(--danger)"></span>`;
    $('btnConfirmReveal').addEventListener('click', () => {
      const val = $('revealPass').value;
      if (val === state.passphrase) {
        revealWif();
      } else {
        $('revealError').textContent = tr('dashboard.wif.wrongPass');
      }
    });
  } else {
    revealWif();
  }
}

function revealWif() {
  const wifBox = $('wifBox');
  wifBox.textContent = state.wallet.wifOrEncrypted;
  wifBox.dataset.revealed = 'true';
  $('btnCopyWif').disabled = false;
  $('revealGate').innerHTML = `<span class="badge on">${tr('dashboard.wif.visibleBadge')}</span>`;
}

async function onRevealSeedClick() {
  const gate = $('seedAesGate');
  gate.innerHTML = `
    <input type="password" id="seedAesRevealPass" placeholder="${tr('dashboard.seedAes.passwordPlaceholder')}" autocomplete="off" spellcheck="false" style="flex:1; min-width:180px; background:var(--bg-panel-2); border:1px solid var(--border); color:var(--text); border-radius:6px; padding:8px 10px; font-family:var(--mono);" />
    <button class="btn btn-secondary" id="btnConfirmSeedReveal" type="button">${tr('dashboard.seedAes.decryptButton')}</button>
    <span id="seedRevealError" style="font-size:12px; color:var(--danger)"></span>`;
  $('btnConfirmSeedReveal').addEventListener('click', async () => {
    const pass = $('seedAesRevealPass').value;
    try {
      const plain = await decryptMnemonic(state.wallet.encryptedSeedBlob, pass);
      const words = plain.split(' ');
      $('mnemonicGrid').classList.remove('hidden');
      $('mnemonicGrid').classList.remove('masked');
      $('mnemonicGrid').innerHTML = words
        .map((word, i) => `<div class="w"><span class="i">${i + 1}.</span><span class="word">${escapeHtml(word)}</span></div>`)
        .join('');
      $('btnToggleMnemonic').classList.remove('hidden');
      $('btnToggleMnemonic').textContent = tr('dashboard.mnemonic.hide');
      gate.innerHTML = `<span class="badge on">${tr('dashboard.seedAes.decryptedBadge')}</span>`;
    } catch {
      $('seedRevealError').textContent = tr('dashboard.seedAes.wrongPass');
    }
  });
}

$('btnToggleMnemonic').addEventListener('click', () => {
  const grid = $('mnemonicGrid');
  const nowMasked = grid.classList.toggle('masked');
  $('btnToggleMnemonic').textContent = tr(nowMasked ? 'dashboard.mnemonic.show' : 'dashboard.mnemonic.hide');
});

/**
 * document.execCommand('copy') returns a boolean and never throws on
 * failure, so a try/catch around it alone can never reach the
 * navigator.clipboard fallback. Check the return value explicitly instead.
 */
async function copyToClipboard(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch (e) {
    ok = false;
  }
  document.body.removeChild(ta);
  if (ok) return true;
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      return false;
    }
  }
  return false;
}

function flashCopyResult(btn, ok) {
  const original = btn.dataset.originalLabel || btn.textContent;
  btn.dataset.originalLabel = original;
  btn.textContent = tr(ok ? 'dashboard.copy.success' : 'dashboard.copy.fail');
  setTimeout(() => { btn.textContent = btn.dataset.originalLabel; }, 1600);
}

$('btnCopyAddress').addEventListener('click', async () => {
  const btn = $('btnCopyAddress');
  flashCopyResult(btn, await copyToClipboard(state.wallet.address));
});
$('btnCopyWif').addEventListener('click', async () => {
  if ($('wifBox').dataset.revealed !== 'true') return;
  const btn = $('btnCopyWif');
  flashCopyResult(btn, await copyToClipboard(state.wallet.wifOrEncrypted));
});

// ---------- Decoy / hidden wallet (advanced) ----------
$('toggleDecoyPassphrase').addEventListener('click', () => {
  const input = $('decoyPassphrase');
  input.type = input.type === 'password' ? 'text' : 'password';
});

$('btnPreviewDecoy').addEventListener('click', async () => {
  const decoyPass = $('decoyPassphrase').value;
  if (decoyPass.length > 0 && decoyPass === state.passphrase) {
    $('decoyStatus').textContent = tr('dashboard.decoy.samePassphraseError');
    return;
  }
  $('decoyStatus').textContent = tr('dashboard.decoy.calculating');
  try {
    const seed = await seedFromMnemonic(state.wallet.mnemonic, decoyPass);
    const derived = deriveWallet(seed, state.addressType);
    seed.fill(0);
    let wifOrEncrypted = derived.wif;
    let isBip38 = false;
    if (state.useBip38 && decoyPass.length > 0) {
      wifOrEncrypted = await bip38Encrypt(derived.privateKey, derived.publicKey, decoyPass);
      isBip38 = true;
    }
    derived.privateKey.fill(0);
    state._decoyWallet = {
      address: derived.address,
      addressTypeLabel: ADDRESS_TYPES[state.addressType].label,
      path: derived.path,
      wifOrEncrypted,
      isBip38,
    };
    $('decoyAddressBox').textContent = derived.address;
    $('decoyResult').classList.remove('hidden');
    $('decoyStatus').textContent = '';
  } catch (err) {
    $('decoyStatus').textContent = tr('dashboard.decoy.error') + err.message;
  }
});

$('btnCopyDecoyAddress').addEventListener('click', async () => {
  if (!state._decoyWallet) return;
  const btn = $('btnCopyDecoyAddress');
  flashCopyResult(btn, await copyToClipboard(state._decoyWallet.address));
});

$('btnDownloadDecoyCard').addEventListener('click', async () => {
  if (!state._decoyWallet) return;
  try {
    const blob = await buildDecoyCardPdf({ ...state._decoyWallet, lang: state.lang });
    downloadBlob(blob, 'btc-paper-wallet.pdf');
    $('decoyStatus').textContent = tr('dashboard.decoy.cardDownloaded');
  } catch (err) {
    $('decoyStatus').textContent = tr('dashboard.decoy.cardError') + err.message;
  }
});

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

$('confirmUnderstand').addEventListener('change', (e) => {
  $('btnGeneratePdf').disabled = !e.target.checked;
});

$('btnBackToConfig').addEventListener('click', () => showScreen(2));

$('btnGeneratePdf').addEventListener('click', async () => {
  const btn = $('btnGeneratePdf');
  btn.disabled = true;
  $('pdfStatus').textContent = tr('dashboard.generatingPdf');
  try {
    const w = state.wallet;
    const blob = await buildPaperWalletPdf({
      address: w.address,
      addressTypeLabel: w.addressTypeLabel,
      path: w.path,
      mnemonicWords: w.seedEncrypted ? null : w.mnemonicWords,
      encryptedSeedBlob: w.seedEncrypted ? w.encryptedSeedBlob : null,
      wifOrEncrypted: w.wifOrEncrypted,
      isBip38: w.isBip38,
      extraAddresses: w.extraAddresses,
      lang: state.lang,
    });
    downloadBlob(blob, 'btc-paper-wallet.pdf');
    $('pdfStatus').textContent = tr('dashboard.pdfSuccess');
    if (currentInventoryEntry) currentInventoryEntry.pdfGenerated = true;
  } catch (err) {
    $('pdfStatus').textContent = tr('dashboard.pdfError') + err.message;
    console.error(err);
  } finally {
    btn.disabled = !$('confirmUnderstand').checked;
  }
});

$('btnWipe').addEventListener('click', () => {
  if (state.wallet) {
    state.wallet.mnemonicWords = state.wallet.mnemonicWords.map(() => '');
    state.wallet.mnemonic = '';
    state.wallet.wifOrEncrypted = '';
    state.wallet.address = '';
    state.wallet.encryptedSeedBlob = '';
    state.wallet.extraAddresses = [];
  }
  state.wallet = null;
  state._decoyWallet = null;
  currentInventoryEntry = null;
  state.passphrase = '';
  state.useBip38 = false;
  state.showAllAddresses = false;
  state.useSeedAes = false;
  state.seedAesPassword = '';
  state.diceRolls = [];
  state.addressType = 'bech32';
  state.wordCount = 24;

  // Config screen fields
  $('passphrase').value = '';
  $('passphrase').type = 'password';
  $('confirmUnderstand').checked = false;
  $('showAllAddresses').checked = false;
  $('useSeedAes').checked = false;
  $('seedAesFields').classList.add('hidden');
  $('seedAesPassword').value = '';
  $('seedAesPassword').type = 'password';
  $('diceInput').value = '';
  updateDiceCounterLabel();
  paintStrengthMeter('strengthMeter', 'strengthLabel', 0, tr('strength.emptyPassphrase'));
  paintStrengthMeter('seedAesStrengthMeter', 'seedAesStrengthLabel', 0, tr('strength.emptySeedAes'));
  document.querySelectorAll('[data-wc]').forEach((el) => el.classList.toggle('selected', el.dataset.wc === '24'));
  renderAddressTypeOptions();
  $('configError').textContent = '';

  // Dashboard: wipe every place secret material was rendered, copied, or
  // gated behind a reveal — not just the top-level mnemonic/address/WIF
  // fields. A previous version left the address QR canvas painted, the
  // "clave visible"/"semilla descifrada" badges standing, the extra
  // addresses list populated, and any typed decoy passphrase in the DOM.
  $('mnemonicGrid').innerHTML = '';
  $('mnemonicGrid').classList.remove('hidden');
  $('mnemonicGrid').classList.add('masked');
  $('btnToggleMnemonic').classList.remove('hidden');
  $('btnToggleMnemonic').textContent = tr('dashboard.mnemonic.show');
  $('seedAesGate').classList.add('hidden');
  $('seedAesGate').innerHTML = '';
  $('addressBox').textContent = '';
  const qrCanvas = $('qrAddress');
  qrCanvas.getContext('2d').clearRect(0, 0, qrCanvas.width, qrCanvas.height);
  $('extraAddressesBlock').classList.add('hidden');
  $('extraAddressesList').innerHTML = '';
  $('wifBip38Tag').textContent = '';
  $('wifBox').textContent = '';
  $('wifBox').dataset.revealed = 'false';
  $('btnCopyWif').disabled = true;
  $('revealGate').innerHTML = '';
  $('decoyPassphrase').value = '';
  $('decoyPassphrase').type = 'password';
  $('decoyResult').classList.add('hidden');
  $('decoyAddressBox').textContent = '';
  $('decoyStatus').textContent = '';
  $('btnGeneratePdf').disabled = true;
  $('pdfStatus').textContent = '';

  showScreen(0);
});

applyTranslations();
showScreen(0);
