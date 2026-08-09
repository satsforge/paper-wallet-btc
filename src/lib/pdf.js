import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { t, DEFAULT_LANG } from './i18n.js';

const PAGE_W = 215.9; // US Letter, mm
const PAGE_H = 279.4;
const MARGIN = 12;

async function qrDataUrl(text, scale = 6) {
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: 'M',
    margin: 1,
    scale,
    color: { dark: '#000000', light: '#ffffff' },
  });
}

function dashedLine(doc, x1, y1, x2, y2) {
  doc.setLineDashPattern([2, 2], 0);
  doc.setDrawColor(120);
  doc.setLineWidth(0.3);
  doc.line(x1, y1, x2, y2);
  doc.setLineDashPattern([], 0);
}

function cropMark(doc, x, y, horizontal) {
  doc.setDrawColor(0);
  doc.setLineWidth(0.25);
  if (horizontal) {
    doc.line(x - 3, y, x + 3, y);
  } else {
    doc.line(x, y - 3, x, y + 3);
  }
}

function outerCropMarks(doc) {
  [MARGIN, PAGE_W - MARGIN].forEach((x) => {
    cropMark(doc, x, 6, false);
    cropMark(doc, x, PAGE_H - 6, false);
  });
  [MARGIN, PAGE_H - MARGIN].forEach((y) => {
    cropMark(doc, 6, y, true);
    cropMark(doc, PAGE_W - 6, y, true);
  });
}

function chunkWords(words, perRow) {
  const rows = [];
  for (let i = 0; i < words.length; i += perRow) rows.push(words.slice(i, i + perRow));
  return rows;
}

/** Short bilingual (ES/EN) safety notes — printed in small type on page 1. */
const SAFETY_NOTES_ES =
  'Algunas impresoras guardan una copia en cache interna; la tinta de inyeccion puede desvanecerse con los anos. ' +
  'Usa papel de archivo de calidad y considera laminar este documento. Si tu semilla fue generada con software ' +
  'basado en BitcoinJS anterior a 2023, verifica el aviso de la vulnerabilidad "Randstorm" antes de confiar en ella.';
const SAFETY_NOTES_EN =
  'Some printers cache a copy internally; inkjet ink can fade over years. Use archival-quality paper and consider ' +
  'laminating this document. If your seed was generated with pre-2023 BitcoinJS-based software, check the ' +
  '"Randstorm" vulnerability advisory before trusting it.';

function footerSafetyNotes(doc, y) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(130);
  doc.text(SAFETY_NOTES_ES, PAGE_W / 2, y, { align: 'center', maxWidth: PAGE_W - MARGIN * 2 });
  doc.text(SAFETY_NOTES_EN, PAGE_W / 2, y + 7, { align: 'center', maxWidth: PAGE_W - MARGIN * 2 });
}

function setMetadata(doc) {
  doc.setProperties({ title: '', subject: '', author: '', keywords: '', creator: '' });
  if (typeof doc.setCreationDate === 'function') {
    doc.setCreationDate(new Date('2009-01-03T18:15:05Z'));
  }
}

/**
 * Builds the printable paper-wallet PDF and returns it as a Blob.
 * Nothing here touches the network; jsPDF renders entirely in-memory.
 *
 * Only the primary address's private key is printed. Extra address types
 * derived from the same seed (`extraAddresses`) are listed as reference
 * only — their keys can always be re-derived from the mnemonic in any
 * BIP32-compatible wallet using the path shown, so printing every derived
 * private key on one sheet would only multiply the sensitive surface of
 * the document without adding real recovery capability.
 */
export async function buildPaperWalletPdf({
  address,
  addressTypeLabel,
  path,
  mnemonicWords, // null when the seed is AES-encrypted instead
  encryptedSeedBlob, // base64 string, set when mnemonicWords is null
  wifOrEncrypted,
  isBip38,
  extraAddresses = [], // [{ label, address, path }]
  lang = DEFAULT_LANG,
}) {
  const tr = (key, vars) => t(key, lang, vars);
  const doc = new jsPDF({ unit: 'mm', format: 'letter', compress: true });
  setMetadata(doc);

  const midY = PAGE_H / 2;
  outerCropMarks(doc);

  // === PUBLIC (top) panel ===
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(20);
  doc.text(tr('pdf.publicHeader'), PAGE_W / 2, MARGIN + 4, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(tr('pdf.walletNameLabel'), MARGIN, MARGIN + 12);
  doc.text(`${tr('pdf.addressTypeLabel')}${addressTypeLabel}`, MARGIN, MARGIN + 18);
  doc.text(`${tr('pdf.pathLabel')}${path}`, MARGIN, MARGIN + 23);

  const qrPub = await qrDataUrl(address, 8);
  const qrPubSize = 52;
  doc.addImage(qrPub, 'PNG', MARGIN, MARGIN + 28, qrPubSize, qrPubSize);

  doc.setFont('courier', 'normal');
  doc.setFontSize(12);
  const addrX = MARGIN + qrPubSize + 8;
  const addrLines = doc.splitTextToSize(address, PAGE_W - addrX - MARGIN);
  doc.text(tr('pdf.addressSectionLabel'), addrX, MARGIN + 34);
  doc.setFontSize(14);
  doc.text(addrLines, addrX, MARGIN + 42);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(90);
  doc.text(
    tr('pdf.shareNote'),
    addrX,
    MARGIN + 42 + addrLines.length * 6 + 6
  );

  footerSafetyNotes(doc, midY - 14);

  // fold line
  dashedLine(doc, MARGIN, midY, PAGE_W - MARGIN, midY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(120);
  doc.text(tr('pdf.foldLine'), PAGE_W / 2, midY - 2, { align: 'center' });

  // === PRIVATE (bottom) panel ===
  const privTop = midY + 8;
  doc.setDrawColor(180, 30, 30);
  doc.setLineWidth(0.6);
  doc.rect(MARGIN - 2, privTop - 6, PAGE_W - (MARGIN - 2) * 2, PAGE_H - privTop - MARGIN + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(150, 20, 20);
  doc.text(tr('pdf.privateHeader'), PAGE_W / 2, privTop, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(40);
  doc.text(
    tr('pdf.privateNote') + (isBip38 ? tr('pdf.bip38Note') : ''),
    PAGE_W / 2,
    privTop + 6,
    { align: 'center', maxWidth: PAGE_W - MARGIN * 2 }
  );

  let y = privTop + 14;

  if (mnemonicWords) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(20);
    doc.text(tr('pdf.mnemonicLabel', { n: mnemonicWords.length }), MARGIN, y);
    y += 5;

    const perRow = mnemonicWords.length === 24 ? 4 : 3;
    const rows = chunkWords(mnemonicWords, perRow);
    const colW = (PAGE_W - MARGIN * 2) / perRow;
    doc.setFont('courier', 'normal');
    doc.setFontSize(10);
    rows.forEach((row, ri) => {
      row.forEach((word, ci) => {
        const idx = ri * perRow + ci + 1;
        const x = MARGIN + ci * colW;
        doc.text(`${String(idx).padStart(2, '0')}. ${word}`, x, y + ri * 6);
      });
    });
    y += rows.length * 6 + 6;
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(150, 20, 20);
    doc.text(tr('pdf.seedEncryptedLabel'), MARGIN, y);
    y += 6;

    // A QR of the encrypted block matters here specifically: AES-GCM
    // rejects the whole thing on a single mistyped character, so recovery
    // by scanning (any phone camera) is far more realistic than re-typing
    // ~170 base64 characters by hand from paper.
    const qrSeedSize = 32;
    const qrSeed = await qrDataUrl(encryptedSeedBlob, 6);
    doc.addImage(qrSeed, 'PNG', MARGIN, y, qrSeedSize, qrSeedSize);

    doc.setFont('courier', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(20);
    const blobX = MARGIN + qrSeedSize + 6;
    const blobLines = doc.splitTextToSize(encryptedSeedBlob, PAGE_W - blobX - MARGIN);
    doc.text(blobLines, blobX, y + 4);

    y += Math.max(qrSeedSize, blobLines.length * 4) + 4;

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(120);
    const recoveryNoteLines = doc.splitTextToSize(tr('pdf.seedRecoveryNote'), PAGE_W - MARGIN * 2);
    doc.text(recoveryNoteLines, MARGIN, y);
    y += recoveryNoteLines.length * 3.5 + 4;
  }

  // WIF / BIP38 + QR
  const qrPriv = await qrDataUrl(wifOrEncrypted, 8);
  const qrPrivSize = 38;
  doc.addImage(qrPriv, 'PNG', MARGIN, y, qrPrivSize, qrPrivSize);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  const wifX = MARGIN + qrPrivSize + 8;
  doc.text(tr(isBip38 ? 'pdf.wifBip38Label' : 'pdf.wifLabel'), wifX, y + 5);
  doc.setFont('courier', 'normal');
  doc.setFontSize(9);
  const wifLines = doc.splitTextToSize(wifOrEncrypted, PAGE_W - wifX - MARGIN);
  doc.text(wifLines, wifX, y + 12);

  const noteY = y + qrPrivSize + 6;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(120);
  doc.text(
    tr('pdf.passphraseNote'),
    MARGIN,
    noteY,
    { maxWidth: PAGE_W - MARGIN * 2 }
  );

  if (extraAddresses.length > 0) {
    doc.addPage('letter', 'p');
    setMetadata(doc);
    outerCropMarks(doc);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(20);
    doc.text(tr('pdf.extraAddressesHeader'), PAGE_W / 2, MARGIN + 4, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(90);
    doc.text(
      tr('pdf.extraAddressesNote'),
      PAGE_W / 2,
      MARGIN + 11,
      { align: 'center', maxWidth: PAGE_W - MARGIN * 2 }
    );

    let ey = MARGIN + 22;
    for (const extra of extraAddresses) {
      const qr = await qrDataUrl(extra.address, 6);
      const qrSize = 32;
      doc.addImage(qr, 'PNG', MARGIN, ey, qrSize, qrSize);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(20);
      doc.text(extra.label, MARGIN + qrSize + 6, ey + 8);
      doc.setFont('courier', 'normal');
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(extra.address, PAGE_W - (MARGIN + qrSize + 6) - MARGIN);
      doc.text(lines, MARGIN + qrSize + 6, ey + 15);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(`${tr('pdf.pathPrefix')}${extra.path}`, MARGIN + qrSize + 6, ey + 15 + lines.length * 5 + 5);
      ey += qrSize + 10;
      dashedLine(doc, MARGIN, ey - 5, PAGE_W - MARGIN, ey - 5);
    }
  }

  return doc.output('blob');
}

/**
 * Minimal single-panel "decoy" card: address + WIF only, no mnemonic.
 * The mnemonic is deliberately never repeated here — printing it twice
 * (once per passphrase) would immediately reveal that both documents
 * share the same seed, defeating the whole point of a decoy wallet.
 */
export async function buildDecoyCardPdf({ address, addressTypeLabel, path, wifOrEncrypted, isBip38, lang = DEFAULT_LANG }) {
  const tr = (key, vars) => t(key, lang, vars);
  const doc = new jsPDF({ unit: 'mm', format: 'letter', compress: true });
  setMetadata(doc);
  outerCropMarks(doc);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(20);
  doc.text(tr('pdf.cardHeader'), PAGE_W / 2, MARGIN + 4, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(tr('pdf.walletNameLabel'), MARGIN, MARGIN + 12);
  doc.text(`${tr('pdf.addressTypeLabel')}${addressTypeLabel}`, MARGIN, MARGIN + 18);
  doc.text(`${tr('pdf.pathLabel')}${path}`, MARGIN, MARGIN + 23);

  const qrPub = await qrDataUrl(address, 8);
  const qrPubSize = 52;
  doc.addImage(qrPub, 'PNG', MARGIN, MARGIN + 28, qrPubSize, qrPubSize);
  doc.setFont('courier', 'normal');
  doc.setFontSize(12);
  const addrX = MARGIN + qrPubSize + 8;
  const addrLines = doc.splitTextToSize(address, PAGE_W - addrX - MARGIN);
  doc.text(tr('pdf.addressSectionLabel'), addrX, MARGIN + 34);
  doc.setFontSize(14);
  doc.text(addrLines, addrX, MARGIN + 42);

  const privTop = MARGIN + 28 + qrPubSize + 16;
  doc.setDrawColor(180, 30, 30);
  doc.setLineWidth(0.6);
  doc.rect(MARGIN - 2, privTop - 6, PAGE_W - (MARGIN - 2) * 2, 90);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(150, 20, 20);
  doc.text(tr('pdf.privateHeader'), PAGE_W / 2, privTop, { align: 'center' });

  const qrPriv = await qrDataUrl(wifOrEncrypted, 8);
  const qrPrivSize = 38;
  const y = privTop + 8;
  doc.addImage(qrPriv, 'PNG', MARGIN, y, qrPrivSize, qrPrivSize);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(20);
  const wifX = MARGIN + qrPrivSize + 8;
  doc.text(tr(isBip38 ? 'pdf.wifBip38Label' : 'pdf.wifLabel'), wifX, y + 5);
  doc.setFont('courier', 'normal');
  doc.setFontSize(9);
  const wifLines = doc.splitTextToSize(wifOrEncrypted, PAGE_W - wifX - MARGIN);
  doc.text(wifLines, wifX, y + 12);

  footerSafetyNotes(doc, PAGE_H - MARGIN - 10);

  return doc.output('blob');
}
