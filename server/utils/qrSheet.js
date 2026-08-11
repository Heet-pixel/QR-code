const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');

async function makeQrDataUrl(productId) {
  // The QR only ever encodes the product id - never price/stock, see prompt section 16
  return QRCode.toDataURL(productId, { margin: 1, width: 300 });
}

// Lays out `copies` labels of the same QR code on a printable A4 sheet,
// 3 columns x 6 rows per page, so a shop owner can cut and stick them on products.
function buildQrPdf({ productId, productName, copies }, res) {
  const doc = new PDFDocument({ size: 'A4', margin: 24 });
  doc.pipe(res);

  const cols = 3;
  const rows = 6;
  const perPage = cols * rows;
  const cellW = (doc.page.width - 48) / cols;
  const cellH = (doc.page.height - 48) / rows;
  const qrSize = Math.min(cellW, cellH) - 40;

  const qrPngPromise = QRCode.toBuffer(productId, { margin: 1, width: 400 });

  return qrPngPromise.then((qrBuffer) => {
    for (let i = 0; i < copies; i++) {
      const posInPage = i % perPage;
      if (i > 0 && posInPage === 0) doc.addPage();

      const col = posInPage % cols;
      const row = Math.floor(posInPage / cols);
      const x = 24 + col * cellW;
      const y = 24 + row * cellH;

      doc.rect(x + 4, y + 4, cellW - 8, cellH - 8).stroke('#dddddd');
      doc.image(qrBuffer, x + (cellW - qrSize) / 2, y + 8, { width: qrSize, height: qrSize });

      doc
        .fontSize(9)
        .fillColor('#111111')
        .text(productName, x + 6, y + qrSize + 12, { width: cellW - 12, align: 'center' });
      doc
        .fontSize(8)
        .fillColor('#666666')
        .text(productId, x + 6, y + qrSize + 24, { width: cellW - 12, align: 'center' });
    }
    doc.end();
  });
}

module.exports = { makeQrDataUrl, buildQrPdf };
