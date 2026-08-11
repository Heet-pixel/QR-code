const router = require('express').Router();
const requireAuth = require('../middleware/auth');
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const User = require('../models/User');
const { newInvoiceNumber } = require('../utils/ids');
const { buildInvoicePdf } = require('../utils/invoicePdf');

router.use(requireAuth);

// Completes a bill: validates stock, decrements it atomically per line item,
// and snapshots the price/gst charged so later price edits never rewrite history.
router.post('/', async (req, res, next) => {
  const { items, customerName, customerPhone } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Cart is empty' });
  }

  const decremented = []; // for rollback if a later item fails

  try {
    const lineItems = [];

    for (const line of items) {
      const qty = Number(line.quantity);
      if (!line.productId || !qty || qty < 1) {
        throw Object.assign(new Error('Each cart line needs a productId and quantity'), { status: 400 });
      }

      // Only decrement stock if enough is available - this is the guard against overselling
      const product = await Product.findOneAndUpdate(
        { userId: req.userId, productId: line.productId, stock: { $gte: qty } },
        { $inc: { stock: -qty } },
        { new: true }
      );

      if (!product) {
        const existing = await Product.findOne({ userId: req.userId, productId: line.productId });
        if (!existing) {
          throw Object.assign(new Error(`Product ${line.productId} not found`), { status: 404 });
        }
        throw Object.assign(
          new Error(`Only ${existing.stock} unit(s) of "${existing.name}" are available`),
          { status: 409 }
        );
      }

      decremented.push({ productId: line.productId, qty });

      // subtotal is price x qty only - GST is broken out separately at the
      // sale level below, so line subtotals always add up to sale.subtotal
      lineItems.push({
        productId: product.productId,
        productName: product.name,
        quantity: qty,
        priceAtSale: product.price,
        gstAtSale: product.gst || 0,
        subtotal: Number((product.price * qty).toFixed(2)),
      });
    }

    const subtotal = lineItems.reduce((sum, i) => sum + i.priceAtSale * i.quantity, 0);
    const gstTotal = lineItems.reduce((sum, i) => sum + (i.priceAtSale * i.quantity * i.gstAtSale) / 100, 0);
    const total = Number((subtotal + gstTotal).toFixed(2));

    const sale = await Sale.create({
      userId: req.userId,
      invoiceNumber: newInvoiceNumber(),
      items: lineItems,
      subtotal: Number(subtotal.toFixed(2)),
      gstTotal: Number(gstTotal.toFixed(2)),
      total,
      customerName: customerName || '',
      customerPhone: customerPhone || '',
    });

    res.status(201).json({ sale });
  } catch (err) {
    // undo any stock we already took before the failure
    for (const d of decremented) {
      // eslint-disable-next-line no-await-in-loop
      await Product.updateOne({ userId: req.userId, productId: d.productId }, { $inc: { stock: d.qty } });
    }
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const { from, to, limit } = req.query;
    const query = { userId: req.userId };
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to);
    }
    const sales = await Sale.find(query)
      .sort({ createdAt: -1 })
      .limit(Math.min(parseInt(limit, 10) || 200, 500));
    res.json({ sales });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const sale = await Sale.findOne({ _id: req.params.id, userId: req.userId });
    if (!sale) return res.status(404).json({ message: 'Sale not found' });
    res.json({ sale });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/invoice-pdf', async (req, res, next) => {
  try {
    const sale = await Sale.findOne({ _id: req.params.id, userId: req.userId });
    if (!sale) return res.status(404).json({ message: 'Sale not found' });
    const shop = await User.findById(req.userId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${sale.invoiceNumber}.pdf"`);
    buildInvoicePdf(sale, shop, res);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
