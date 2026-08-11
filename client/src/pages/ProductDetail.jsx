import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { openPdf } from '../api';

const FIELDS = [
  ['name', 'Product name', 'text'],
  ['price', 'Price', 'number'],
  ['stock', 'Stock quantity', 'number'],
  ['category', 'Category', 'text'],
  ['gst', 'GST %', 'number'],
  ['sku', 'SKU / product code', 'text'],
  ['brand', 'Brand', 'text'],
  ['unit', 'Unit', 'text'],
];

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [copies, setCopies] = useState(10);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get(`/products/${id}`).then((res) => {
      setProduct(res.data.product);
      setForm(res.data.product);
    });
  }, [id]);

  async function save() {
    setSaving(true);
    setError('');
    try {
      const res = await api.put(`/products/${id}`, form);
      setProduct(res.data.product);
      setEditing(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save changes');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm(`Delete ${product.name}? This cannot be undone.`)) return;
    await api.delete(`/products/${id}`);
    navigate('/products');
  }

  if (!product) return <p>Loading...</p>;

  return (
    <div>
      <div className="topbar">
        <h1>{product.name}</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {!editing && (
            <button className="btn btn-ghost" onClick={() => setEditing(true)}>
              Edit
            </button>
          )}
          <button className="btn btn-danger" onClick={remove}>
            Delete
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="grid" style={{ gridTemplateColumns: '1fr 300px', alignItems: 'start' }}>
        <div className="card">
          {editing ? (
            <>
              {FIELDS.map(([key, label, type]) => (
                <div className="field" key={key}>
                  <label htmlFor={key}>{label}</label>
                  <input
                    id={key}
                    type={type}
                    value={form[key] ?? ''}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  />
                </div>
              ))}
              <div className="field">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  rows={3}
                  value={form.description ?? ''}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-primary" onClick={save} disabled={saving}>
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    setForm(product);
                    setEditing(false);
                  }}
                >
                  Cancel
                </button>
              </div>
              <p className="hint" style={{ marginTop: 10 }}>
                Note: editing details never changes the QR code - it always keeps pointing at the same product.
              </p>
            </>
          ) : (
            <dl style={{ display: 'grid', gridTemplateColumns: '160px 1fr', rowGap: 10 }}>
              <dt style={{ color: 'var(--slate)' }}>Product ID</dt>
              <dd className="mono">{product.productId}</dd>
              <dt style={{ color: 'var(--slate)' }}>Price</dt>
              <dd>&#8377;{product.price}</dd>
              <dt style={{ color: 'var(--slate)' }}>Stock</dt>
              <dd>
                {product.stock} {product.unit}
              </dd>
              <dt style={{ color: 'var(--slate)' }}>Category</dt>
              <dd>{product.category || '-'}</dd>
              <dt style={{ color: 'var(--slate)' }}>GST</dt>
              <dd>{product.gst}%</dd>
              <dt style={{ color: 'var(--slate)' }}>SKU</dt>
              <dd>{product.sku || '-'}</dd>
              <dt style={{ color: 'var(--slate)' }}>Brand</dt>
              <dd>{product.brand || '-'}</dd>
              <dt style={{ color: 'var(--slate)' }}>Description</dt>
              <dd>{product.description || '-'}</dd>
            </dl>
          )}
        </div>

        <div className="card">
          <div className="qr-tag" style={{ marginBottom: 16 }}>
            <img src={product.qrDataUrl} alt="QR code" />
            <div className="pid">{product.productId}</div>
          </div>
          <div className="field">
            <label htmlFor="copies">Copies to print</label>
            <input id="copies" type="number" min={1} max={200} value={copies} onChange={(e) => setCopies(e.target.value)} />
          </div>
          <button
            className="btn btn-primary btn-block"
            onClick={() => openPdf(`/products/${id}/qr-pdf?copies=${copies}`)}
          >
            Generate QR PDF
          </button>
        </div>
      </div>
    </div>
  );
}
