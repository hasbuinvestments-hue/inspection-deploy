import React from 'react';
import { useAuth } from '../../contexts/useAuth';
import { useNavigate } from 'react-router-dom';

export default function DashboardLayout({ title, tabs, activeTab, onTabChange, headerAction, children }) {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="dashboard-shell">
      <button type="button" className="dashboard-menu-button" onClick={() => setMenuOpen(true)}>
        Menu
      </button>

      <aside className={`dashboard-sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="dashboard-logo-area">
          <img src="/nairobi_logo.png" alt="Logo" className="dashboard-logo" />
          <h2 className="dashboard-brand">Audit System</h2>
          <p className="dashboard-zone">{profile?.zone || 'Nairobi City County'}</p>
        </div>

        <ul className="dashboard-nav-list">
          {tabs.map(tab => (
            <li
              key={tab.id}
              className={`dashboard-nav-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => {
                onTabChange(tab.id);
                setMenuOpen(false);
              }}
            >
              {tab.label}
            </li>
          ))}
        </ul>

        <div className="dashboard-profile-area">
          <div className="dashboard-profile-text">
            <span className="dashboard-profile-name">{profile?.full_name || 'Loading...'}</span>
            <small className="dashboard-profile-role">{profile?.role?.replace('_', ' ') || ''}</small>
          </div>
          <button onClick={handleLogout} className="dashboard-logout-btn">
            Logout
          </button>
        </div>
      </aside>

      {menuOpen && <button className="dashboard-overlay" type="button" onClick={() => setMenuOpen(false)} />}

      <main className="dashboard-main">
        <div className="dashboard-header">
          <h1 className="dashboard-title">{title}</h1>
          {headerAction && <div>{headerAction}</div>}
        </div>

        {children}
      </main>
    </div>
  );
}
