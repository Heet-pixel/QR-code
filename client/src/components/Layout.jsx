import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: '\u2302', end: true },
  { to: '/products', label: 'Products', icon: '\u25A6' },
  { to: '/create', label: 'Create QR', icon: '\u2318' },
  { to: '/scan', label: 'Scan', icon: '\u2318\uFE0E' },
  { to: '/billing', label: 'Billing', icon: '\u20B9' },
  { to: '/sales', label: 'Sales', icon: '\u2211' },
];

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          Smart<span>QR</span>
        </div>
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => (isActive ? 'active' : '')}>
            <span aria-hidden>{item.icon}</span> {item.label}
          </NavLink>
        ))}
        <button className="signout" onClick={logout}>
          Log out
        </button>
      </aside>

      <main className="main">
        <div className="topbar">
          <div>
            <div className="shop">{user?.shopName || user?.name}</div>
          </div>
        </div>
        <Outlet />
      </main>

      <nav className="tabbar">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => (isActive ? 'active' : '')}>
            <span aria-hidden style={{ fontSize: 16 }}>
              {item.icon}
            </span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
