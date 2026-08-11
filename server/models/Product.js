const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    productId: { type: String, required: true }, // e.g. PRD-8F92K31A, encoded in the QR
    name: { type: String, required: true, trim: true },
    price: { type: Number, default: 0, min: 0 },
    stock: { type: Number, default: 0, min: 0 },
    category: { type: String, trim: true, default: '' },
    gst: { type: Number, default: 0, min: 0, max: 100 }, // percent
    description: { type: String, default: '' },
    sku: { type: String, trim: true, default: '' },
    brand: { type: String, trim: true, default: '' },
    unit: { type: String, trim: true, default: 'pc' },
    lowStockThreshold: { type: Number, default: 5 },
    qrDataUrl: { type: String, default: '' }, // cached PNG data-url of the QR
  },
  { timestamps: true }
);

productSchema.index({ userId: 1, productId: 1 }, { unique: true });
productSchema.index({ userId: 1, name: 'text', sku: 'text', brand: 'text' });

module.exports = mongoose.model('Product', productSchema);
