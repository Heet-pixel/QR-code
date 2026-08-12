const router = require('express').Router();
const requireAuth = require('../middleware/auth');
const Product = require('../models/Product');
const { newProductId } = require('../utils/ids');
const { makeQrDataUrl, buildQrPdf } = require('../utils/qrSheet');

router.use(requireAuth);

// Create a product and its QR code (QR only ever encodes the product id)
router.post('/', async (req, res, next) => {
  try {
    const { name, price, stock, category, gst, description, sku, brand, unit, lowStockThreshold } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Product name is required' });
    }

    let productId;
    let attempts = 0;
    do {
      productId = newProductId();
      attempts++;
      // eslint-disable-next-line no-await-in-loop
      var clash = await Product.findOne({ userId: req.userId, productId });
    } while (clash && attempts < 5);

    const qrDataUrl = await makeQrDataUrl(productId);
    const initialStock = stock || 0;

    const product = await Product.create({
      userId: req.userId,
      productId,
      name: name.trim(),
      price: price || 0,
      stock: initialStock,
      category,
      gst: gst || 0,
      description,
      sku,
      brand,
      unit,
      lowStockThreshold,
      qrDataUrl,
      // whatever stock the product launches with is Batch 1
      batches: initialStock > 0 ? [{ batchNumber: 1, quantity: initialStock, addedAt: new Date() }] : [],
    });

    res.status(201).json({ product });
  } catch (err) {
    next(err);
  }
});

// List all of this user's products, newest first, with optional search
router.get('/', async (req, res, next) => {
  try {
    const { search } = req.query;
    const query = { userId: req.userId };
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { sku: new RegExp(search, 'i') },
        { productId: new RegExp(search, 'i') },
      ];
    }
    const products = await Product.find(query).sort({ createdAt: -1 });
    res.json({ products });
  } catch (err) {
    next(err);
  }
});

// Look a product up by its scanned/typed product id - this is what powers
// both the scanner page and manual entry in billing.
router.get('/by-code/:productId', async (req, res, next) => {
  try {
    const product = await Product.findOne({ userId: req.userId, productId: req.params.productId.trim() });
    if (!product) return res.status(404).json({ message: 'No product matches that code' });
    res.json({ product });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, userId: req.userId });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ product });
  } catch (err) {
    next(err);
  }
});

// Edit product details. Price/stock/etc can change freely - the QR code
// (and productId it encodes) is never touched here.
router.put('/:id', async (req, res, next) => {
  try {
    const editable = ['name', 'price', 'stock', 'category', 'gst', 'description', 'sku', 'brand', 'unit', 'lowStockThreshold'];
    const updates = {};
    editable.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      updates,
      { new: true, runValidators: true }
    );
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ product });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const product = await Product.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    next(err);
  }
});

// Adds new stock as a new numbered batch (Batch 1 is set at creation time
// above; this covers every restock after that - Batch 2, Batch 3, ...).
// Selling stock through a sale never touches batches, only this does.
router.post('/:id/restock', async (req, res, next) => {
  try {
    const quantity = Number(req.body.quantity);
    if (!quantity || quantity < 1 || !Number.isFinite(quantity)) {
      return res.status(400).json({ message: 'Enter a quantity of at least 1' });
    }

    const existing = await Product.findOne({ _id: req.params.id, userId: req.userId });
    if (!existing) return res.status(404).json({ message: 'Product not found' });

    const nextBatchNumber = existing.batches.length > 0 ? Math.max(...existing.batches.map((b) => b.batchNumber)) + 1 : 1;

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      {
        $inc: { stock: quantity },
        $push: { batches: { batchNumber: nextBatchNumber, quantity, addedAt: new Date() } },
      },
      { new: true }
    );

    res.json({ product });
  } catch (err) {
    next(err);
  }
});

// Streams back a printable PDF sheet with N copies of this product's QR label
router.get('/:id/qr-pdf', async (req, res, next) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, userId: req.userId });
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const copies = Math.min(Math.max(parseInt(req.query.copies, 10) || 1, 1), 200);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${product.productId}-labels.pdf"`);

    await buildQrPdf({ productId: product.productId, productName: product.name, copies }, res);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
