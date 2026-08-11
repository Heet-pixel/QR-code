import { useEffect, useState } from 'react';
import api, { openPdf } from '../api';

function rupees(n) {
  return `\u20B9${Number(n || 0).toFixed(2)}`;
}

export default function Sales() {
  const [sales, setSales] = useState(null);

  useEffect(() => {
    api.get('/sales').then((res) => setSales(res.data.sales));
  }, []);

  if (!sales) return <p>Loading sales...</p>;

  return (
    <div>
      <h1 style={{ marginBottom: 18 }}>Sales</h1>

      {sales.length === 0 ? (
        <div className="empty-state">
          <h3>No sales yet</h3>
          <p>Completed bills will show up here with a downloadable invoice.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s._id}>
                  <td className="mono">{s.invoiceNumber}</td>
                  <td>{new Date(s.createdAt).toLocaleString()}</td>
                  <td>{s.customerName || '-'}</td>
                  <td>{s.items.reduce((n, i) => n + i.quantity, 0)}</td>
                  <td>{rupees(s.total)}</td>
                  <td>
                    <button className="btn btn-ghost" style={{ padding: '4px 10px' }} onClick={() => openPdf(`/sales/${s._id}/invoice-pdf`)}>
                      Invoice &rarr;
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
