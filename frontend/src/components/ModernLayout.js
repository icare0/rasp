import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Server,
  Zap,
  Bell,
  Settings,
  Terminal,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Search
} from 'lucide-react';
import '../styles/ModernDashboard.css';

const ModernLayout = ({ children, user }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });
  const [alertsCount, setAlertsCount] = useState(0);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = (newTheme) => {
    setTheme(newTheme);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const navItems = [
    {
      section: 'Principal',
      items: [
        { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/automation', icon: Zap, label: 'Automatisation' },
        { path: '/alerts', icon: Bell, label: 'Alertes', badge: alertsCount },
      ]
    },
    {
      section: 'Gestion',
      items: [
        { path: '/settings', icon: Settings, label: 'Paramètres' },
      ]
    }
  ];

  return (
    <div className="modern-dashboard">
      {/* Sidebar */}
      <aside className={`modern-sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            π
          </div>
          <span className="sidebar-brand">RaspManager</span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((section, idx) => (
            <div key={idx} className="nav-section">
              <div className="nav-section-title">{section.section}</div>
              <div className="nav-items">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.path}
                      className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
                      onClick={() => {
                        navigate(item.path);
                        setMobileOpen(false);
                      }}
                    >
                      <Icon className="nav-item-icon" size={20} />
                      <span className="nav-item-text">{item.label}</span>
                      {item.badge > 0 && (
                        <span className="nav-badge">{item.badge}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="modern-main">
        {/* Header */}
        <header className="modern-header">
          <div className="header-left">
            <button
              className="header-action mobile-menu-btn"
              onClick={() => setMobileOpen(!mobileOpen)}
              style={{ display: 'none' }}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            <h1 className="header-title">
              {location.pathname === '/dashboard' && 'Dashboard'}
              {location.pathname === '/automation' && 'Automatisation'}
              {location.pathname === '/alerts' && 'Alertes'}
              {location.pathname === '/settings' && 'Paramètres'}
              {location.pathname.startsWith('/devices/') && !location.pathname.includes('/terminal') && 'Détails du Device'}
              {location.pathname.includes('/terminal') && 'Terminal'}
            </h1>

            <div className="header-search">
              <Search className="header-search-icon" size={16} />
              <input type="text" placeholder="Rechercher..." />
            </div>
          </div>

          <div className="header-right">
            <button className="header-action" onClick={() => navigate('/alerts')}>
              <Bell size={20} />
              {alertsCount > 0 && <span className="header-action-badge"></span>}
            </button>

            <div className="theme-switcher">
              <button
                className={`theme-option ${theme === 'light' ? 'active' : ''}`}
                onClick={() => toggleTheme('light')}
                title="Mode clair"
              >
                <Sun size={16} />
              </button>
              <button
                className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => toggleTheme('dark')}
                title="Mode sombre"
              >
                <Moon size={16} />
              </button>
            </div>

            <div className="user-menu">
              <div className="user-avatar">
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="user-info">
                <div className="user-name">{user?.username || 'Utilisateur'}</div>
                <div className="user-role">{user?.role || 'user'}</div>
              </div>
            </div>

            <button className="header-action" onClick={handleLogout} title="Déconnexion">
              <LogOut size={20} />
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="modern-content">
          {children}
        </div>
      </main>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="mobile-overlay"
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 99,
            display: 'none'
          }}
        />
      )}

      <style>{`
        @media (max-width: 768px) {
          .mobile-menu-btn {
            display: flex !important;
          }
          .mobile-overlay {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ModernLayout;
