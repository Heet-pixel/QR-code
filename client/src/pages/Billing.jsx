import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import api, { openPdf } from '../api';

function rupees(n) {
  return `\u20B9${Number(n || 0).toFixed(2)}`;
}

export default function Billing() {
  const location = useLocation();
  const navigate = useNavigate();
  const scannerRef = useRef(null);
  const [cart, setCart] = useState([]); // { product, quantity }
  const [manualCode, setManualCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    scannerRef.current = new Html5Qrcode('billing-qr-reader');
    return () => {
      if (scannerRef.current?.isScanning) scannerRef.current.stop().catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (location.state?.addProductId) {
      addByCode(location.state.addProductId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addByCode(code) {
    setError('');
    try {
      const res = await api.get(`/products/by-code/${encodeURIComponent(code)}`);
      addToCart(res.data.product);
    } catch (err) {
      setError(err.response?.data?.message || 'Product not found');
    }
  }

  function addToCart(product) {
    setCart((prev) => {
      const existing = prev.find((l) => l.product.productId === product.productId);
      if (existing) {
        return prev.map((l) =>
          l.product.productId === product.productId ? { ...l, quantity: Math.min(l.quantity + 1, product.stock) } : l
        );
      }
      if (product.stock < 1) {
        setError(`${product.name} is out of stock`);
        return prev;
      }
      return [...prev, { product, quantity: 1 }];
    });
  }

  function changeQty(productId, delta) {
    setCart((prev) =>
      prev
        .map((l) =>
          l.product.productId === productId
            ? { ...l, quantity: Math.max(1, Math.min(l.quantity + delta, l.product.stock)) }
            : l
        )
        .filter(Boolean)
    );
  }

  function removeLine(productId) {
    setCart((prev) => prev.filter((l) => l.product.productId !== productId));
  }

  async function startScan() {
    setError('');
    try {
      await scannerRef.current.start({ facingMode: 'environment' }, { fps: 10, qrbox: 220 }, (text) => {
        addByCode(text.trim());
      });
      setScanning(true);
    } catch {
      setError('Camera unavailable - use manual entry below.');
    }
  }

  async function stopScan() {
    if (scannerRef.current?.isScanning) await scannerRef.current.stop();
    setScanning(false);
  }

  const subtotal = cart.reduce((s, l) => s + l.product.price * l.quantity, 0);
  const gstTotal = cart.reduce((s, l) => s + (l.product.price * l.quantity * (l.product.gst || 0)) / 100, 0);
  const total = subtotal + gstTotal;

  async function completeBill() {
    if (cart.length === 0) return;
    setCompleting(true);
    setError('');
    try {
      const res = await api.post('/sales', {
        items: cart.map((l) => ({ productId: l.product.productId, quantity: l.quantity })),
        customerName,
      });
      // fetches the PDF with the auth header attached, then opens it in a new tab
      await openPdf(`/sales/${res.data.sale._id}/invoice-pdf`);
      setCart([]);
      setCustomerName('');
      navigate('/sales');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not complete the bill');
    } finally {
      setCompleting(false);
    }
  }

  return (
    <div>
      <h1 style={{ marginBottom: 18 }}>Billing</h1>
      {error && <div className="error-banner">{error}</div>}

      <div className="pos-layout">
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Add products</h3>
          <div id="billing-qr-reader" style={{ maxWidth: 320 }} />
          {!scanning ? (
            <button className="btn btn-ghost" style={{ marginTop: 10 }} onClick={startScan}>
              Scan QR code
            </button>
          ) : (
            <button className="btn btn-ghost" style={{ marginTop: 10 }} onClick={stopScan}>
              Stop scanning
            </button>
          )}

          <div className="field" style={{ marginTop: 16, maxWidth: 320 }}>
            <label htmlFor="manual">Add by product ID</label>
            <input
              id="manual"
              placeholder="PRD-8F92K31A"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && manualCode.trim()) {
                  addByCode(manualCode.trim());
                  setManualCode('');
                }
              }}
            />
          </div>
        </div>

        <div className="card cart">
          <h3 style={{ marginBottom: 4 }}>Current bill</h3>
          {cart.length === 0 && <p style={{ color: 'var(--slate)', fontSize: 14 }}>Scan or add a product to start a bill.</p>}

          {cart.map((line) => (
            <div className="cart-line" key={line.product.productId}>
              <div className="info">
                <div className="name">{line.product.name}</div>
                <div className="pid">{line.product.productId}</div>
              </div>
              <div className="qty-stepper">
                <button onClick={() => changeQty(line.product.productId, -1)}>&minus;</button>
                <span>{line.quantity}</span>
                <button onClick={() => changeQty(line.product.productId, 1)}>+</button>
              </div>
              <div style={{ width: 70, textAlign: 'right', fontSize: 14 }}>{rupees(line.product.price * line.quantity)}</div>
              <button className="btn btn-danger" style={{ padding: '4px 8px' }} onClick={() => removeLine(line.product.productId)}>
                &times;
              </button>
            </div>
          ))}

          {cart.length > 0 && (
            <>
              <div className="field" style={{ marginTop: 14 }}>
                <label htmlFor="customer">Customer name (optional)</label>
                <input id="customer" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              </div>

              <div className="cart-total-row">
                <span>Subtotal</span>
                <span>{rupees(subtotal)}</span>
              </div>
              {gstTotal > 0 && (
                <div className="cart-total-row">
                  <span>GST</span>
                  <span>{rupees(gstTotal)}</span>
                </div>
              )}
              <div className="cart-total-row grand">
                <span>Total</span>
                <span>{rupees(total)}</span>
              </div>

              <button className="btn btn-primary btn-block" onClick={completeBill} disabled={completing} style={{ marginTop: 10 }}>
                {completing ? 'Completing...' : 'Complete bill'}
              </button>
              <button className="btn btn-ghost btn-block" style={{ marginTop: 8 }} onClick={() => setCart([])}>
                Clear cart
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
