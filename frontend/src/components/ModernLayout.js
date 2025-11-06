import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Zap,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  ChevronDown
} from 'lucide-react';
import '../styles/ModernDashboard.css';

const ModernLayout = ({ children, user }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });
  const [alertsCount, setAlertsCount] = useState(0);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'dark' ? 'light' : 'dark');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/automation', icon: Zap, label: 'Automatisation' },
    { path: '/alerts', icon: Bell, label: 'Alertes', badge: alertsCount },
    { path: '/settings', icon: Settings, label: 'Paramètres' },
  ];

  const handleNavClick = (path) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <div className="modern-dashboard">
      {/* Top Navigation Bar */}
      <header className="top-nav">
        <div className="top-nav-container">
          {/* Logo & Brand */}
          <div className="nav-brand" onClick={() => navigate('/dashboard')}>
            <div className="brand-logo">π</div>
            <span className="brand-name">RaspManager</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="nav-links">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  className={`nav-link ${isActive(item.path) ? 'active' : ''}`}
                  onClick={() => handleNavClick(item.path)}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                  {item.badge > 0 && <span className="nav-link-badge">{item.badge}</span>}
                </button>
              );
            })}
          </nav>

          {/* Right Actions */}
          <div className="nav-actions">
            {/* Theme Switcher */}
            <button
              className="nav-action-btn theme-toggle"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Notifications */}
            <button
              className="nav-action-btn"
              onClick={() => navigate('/alerts')}
              title="Notifications"
            >
              <Bell size={18} />
              {alertsCount > 0 && <span className="action-badge">{alertsCount}</span>}
            </button>

            {/* User Menu */}
            <div className="user-dropdown">
              <button
                className="user-dropdown-btn"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <div className="user-avatar-mini">
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="user-name-display">{user?.username || 'Utilisateur'}</span>
                <ChevronDown size={16} className={`dropdown-arrow ${userMenuOpen ? 'open' : ''}`} />
              </button>

              {userMenuOpen && (
                <>
                  <div className="dropdown-overlay" onClick={() => setUserMenuOpen(false)} />
                  <div className="user-dropdown-menu">
                    <div className="dropdown-header">
                      <div className="user-avatar-large">
                        {user?.username?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div className="user-details">
                        <div className="user-name-full">{user?.username || 'Utilisateur'}</div>
                        <div className="user-role-badge">{user?.role || 'user'}</div>
                      </div>
                    </div>
                    <div className="dropdown-divider"></div>
                    <button className="dropdown-item" onClick={() => { navigate('/settings'); setUserMenuOpen(false); }}>
                      <Settings size={16} />
                      <span>Paramètres</span>
                    </button>
                    <button className="dropdown-item logout" onClick={handleLogout}>
                      <LogOut size={16} />
                      <span>Déconnexion</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <button
              className="mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <>
          <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)} />
          <nav className="mobile-nav">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  className={`mobile-nav-link ${isActive(item.path) ? 'active' : ''}`}
                  onClick={() => handleNavClick(item.path)}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                  {item.badge > 0 && <span className="mobile-nav-badge">{item.badge}</span>}
                </button>
              );
            })}
            <div className="mobile-nav-divider"></div>
            <button className="mobile-nav-link" onClick={toggleTheme}>
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              <span>{theme === 'dark' ? 'Mode clair' : 'Mode sombre'}</span>
            </button>
            <button className="mobile-nav-link logout" onClick={handleLogout}>
              <LogOut size={20} />
              <span>Déconnexion</span>
            </button>
          </nav>
        </>
      )}

      {/* Main Content */}
      <main className="main-content">
        <div className="content-wrapper">
          {children}
        </div>
      </main>
    </div>
  );
};

export default ModernLayout;
