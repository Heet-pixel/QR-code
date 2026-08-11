import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

function stockBadge(product) {
  if (product.stock <= 0) return <span className="badge out">Out of stock</span>;
  if (product.stock <= product.lowStockThreshold) return <span className="badge low">{product.stock} left</span>;
  return <span className="badge ok">{product.stock} in stock</span>;
}

export default function Products() {
  const [products, setProducts] = useState(null);
  const [search, setSearch] = useState('');

  function load(q = '') {
    api.get('/products', { params: q ? { search: q } : {} }).then((res) => setProducts(res.data.products));
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(search), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div>
      <div className="topbar">
        <h1>Products</h1>
        <Link to="/create" className="btn btn-primary">
          + New product
        </Link>
      </div>

      <div className="field" style={{ maxWidth: 320 }}>
        <input placeholder="Search by name, SKU or product ID" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {products && products.length === 0 && (
        <div className="empty-state">
          <h3>No products yet</h3>
          <p>Create your first product to generate its QR code.</p>
          <Link to="/create" className="btn btn-primary" style={{ marginTop: 12, display: 'inline-block' }}>
            + New product
          </Link>
        </div>
      )}

      <div className="grid product-grid">
        {products?.map((p) => (
          <Link key={p._id} to={`/products/${p._id}`} className="product-card" style={{ textDecoration: 'none', color: 'inherit' }}>
            <img src={p.qrDataUrl} alt="" width={56} height={56} style={{ alignSelf: 'flex-start' }} />
            <div className="name">{p.name}</div>
            <div className="meta mono">{p.productId}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="price">&#8377;{p.price}</span>
              {stockBadge(p)}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
