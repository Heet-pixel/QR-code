const PDFDocument = require('pdfkit');

function money(n) {
  return `Rs ${Number(n).toFixed(2)}`;
}

function buildInvoicePdf(sale, shop, res) {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  doc.pipe(res);

  doc.fontSize(18).fillColor('#111111').text(shop.shopName || shop.name, { continued: false });
  doc.fontSize(10).fillColor('#555555').text(shop.email);
  doc.moveDown(1.2);

  doc.fontSize(14).fillColor('#111111').text(`Invoice ${sale.invoiceNumber}`);
  doc
    .fontSize(9)
    .fillColor('#555555')
    .text(new Date(sale.createdAt).toLocaleString());
  if (sale.customerName) {
    doc.text(`Customer: ${sale.customerName}${sale.customerPhone ? ' - ' + sale.customerPhone : ''}`);
  }
  doc.moveDown(0.8);

  const top = doc.y;
  const colX = { name: 40, qty: 300, price: 360, sub: 450 };
  doc.fontSize(9).fillColor('#888888');
  doc.text('ITEM', colX.name, top);
  doc.text('QTY', colX.qty, top);
  doc.text('PRICE', colX.price, top);
  doc.text('SUBTOTAL', colX.sub, top);
  doc.moveTo(40, top + 14).lineTo(555, top + 14).strokeColor('#dddddd').stroke();

  let y = top + 22;
  doc.fillColor('#111111').fontSize(10);
  sale.items.forEach((item) => {
    doc.text(item.productName, colX.name, y, { width: 240 });
    doc.text(String(item.quantity), colX.qty, y);
    doc.text(money(item.priceAtSale), colX.price, y);
    doc.text(money(item.subtotal), colX.sub, y);
    y += 20;
  });

  doc.moveTo(40, y + 4).lineTo(555, y + 4).strokeColor('#dddddd').stroke();
  y += 16;

  doc.fontSize(10).text(`Subtotal: ${money(sale.subtotal)}`, 380, y, { width: 175, align: 'right' });
  y += 16;
  if (sale.gstTotal > 0) {
    doc.text(`GST: ${money(sale.gstTotal)}`, 380, y, { width: 175, align: 'right' });
    y += 16;
  }
  doc.fontSize(13).fillColor('#111111').text(`Total: ${money(sale.total)}`, 380, y, { width: 175, align: 'right' });

  doc.fontSize(8).fillColor('#999999').text('Thank you for your purchase.', 40, doc.page.height - 60, {
    width: 515,
    align: 'center',
  });

  doc.end();
}

module.exports = { buildInvoicePdf };
