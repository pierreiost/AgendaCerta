import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Shield, LogOut, User, Menu, X, Bell } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import NotificationBadge from './NotificationBadge';
import { notificationService } from '../services/api';

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    loadNotificationCount();
    const interval = setInterval(loadNotificationCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadNotificationCount = async () => {
    try {
      const response = await notificationService.getSummary();
      setNotificationCount(response.data.count);
    } catch (error) {
      console.error('Erro ao carregar contador de notificações:', error);
    }
  };

  return (
    <header style={{
      background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid rgba(0, 0, 0, 0.05)'
    }}>
      <div className="container">
        <div className="flex-between" style={{
          padding: '1rem 0',
          position: 'relative'
        }}>
          {/* LOGO - sempre visível, redireciona baseado no role */}
          <Link
            to={user?.role === 'SUPER_ADMIN' ? '/super-admin' : '/dashboard'}
            style={{
              textDecoration: 'none',
              color: 'inherit',
              transition: 'transform 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <div style={{
              background: 'white',
              padding: '0.5rem',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '50px',
              height: '50px'
            }}>
              <img
                src="/logo.png"
                alt="QuadraCerta Logo"
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain'
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = '<span style="font-size: 1.5rem; font-weight: 700; color: var(--primary-color)">QC</span>';
                }}
              />
            </div>
          </Link>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              display: 'none',
              background: 'none',
              border: 'none',
              padding: '0.5rem',
              cursor: 'pointer',
              color: 'var(--primary-color)'
            }}
            className="mobile-menu-toggle"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          {/* AÇÕES DO HEADER */}
          <div
            className="header-actions"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1.5rem'
            }}
          >
            {/* Notificações - só mostra se NÃO for SUPER_ADMIN */}
            {user?.role !== 'SUPER_ADMIN' && (
              <button
                onClick={() => navigate('/notifications')}
                style={{
                  position: 'relative',
                  background: 'white',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '0.75rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f9fafb';
                  e.currentTarget.style.borderColor = 'var(--primary-color)';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'white';
                  e.currentTarget.style.borderColor = '#e5e7eb';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <Bell size={20} color="#6b7280" />
                <NotificationBadge count={notificationCount} />
              </button>
            )}

            {/* Botão Super Admin - só mostra para SUPER_ADMIN */}
            {user?.role === 'SUPER_ADMIN' && (
              <Link
                to="/super-admin"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.25rem',
                  background: 'white',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  color: '#374151',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#fef2f2';
                  e.currentTarget.style.borderColor = '#dc2626';
                  e.currentTarget.style.color = '#dc2626';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'white';
                  e.currentTarget.style.borderColor = '#e5e7eb';
                  e.currentTarget.style.color = '#374151';
                }}
              >
                <Shield size={18} />
                Super Admin
              </Link>
            )}

            {/* Link do perfil - redireciona baseado no role */}
            <Link
              to={user?.role === 'SUPER_ADMIN' ? '/super-admin' : '/profile'}
              style={{
                textDecoration: 'none',
                color: 'inherit',
                transition: 'all 0.3s ease'
              }}
              className="profile-link-enhanced"
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '0.5rem 1rem',
                borderRadius: '12px',
                transition: 'all 0.3s ease'
              }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 0, 0, 0.03)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <div style={{ textAlign: 'right' }}>
                  <p style={{
                    fontWeight: '600',
                    fontSize: '0.875rem',
                    color: '#1f2937',
                    marginBottom: '2px'
                  }}>
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p style={{
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    textTransform: 'capitalize'
                  }}>
                    {user?.role === 'SUPER_ADMIN' ? 'Super Admin' : user?.role}
                  </p>
                </div>

                <div
                  className="user-avatar"
                  style={{
                    width: '45px',
                    height: '45px',
                    background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: '600',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <User size={20} />
                </div>
              </div>
            </Link>

            {/* Botão Sair */}
            <button
              onClick={logout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.25rem',
                background: 'white',
                border: '2px solid #e5e7eb',
                borderRadius: '12px',
                color: '#374151',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#fee2e2';
                e.currentTarget.style.borderColor = '#fecaca';
                e.currentTarget.style.color = '#dc2626';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.color = '#374151';
              }}
            >
              <LogOut size={18} />
              Sair
            </button>
          </div>
        </div>

        {/* MENU MOBILE */}
        {mobileMenuOpen && (
          <div
            className="mobile-menu"
            style={{
              display: 'none',
              flexDirection: 'column',
              gap: '1rem',
              paddingBottom: '1rem',
              borderTop: '1px solid #e5e7eb',
              paddingTop: '1rem'
            }}
          >
            {/* Notificações mobile - só mostra se NÃO for SUPER_ADMIN */}
            {user?.role !== 'SUPER_ADMIN' && (
              <button
                onClick={() => {
                  navigate('/notifications');
                  setMobileMenuOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem',
                  background: 'white',
                  border: '2px solid #e5e7eb',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  width: '100%',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Bell size={20} color="#6b7280" />
                  <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                    Notificações
                  </span>
                </div>
                {notificationCount > 0 && (
                  <span style={{
                    background: '#ef4444',
                    color: 'white',
                    borderRadius: '12px',
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.75rem',
                    fontWeight: '700'
                  }}>
                    {notificationCount}
                  </span>
                )}
              </button>
            )}

            {/* Botão Super Admin mobile - só mostra para SUPER_ADMIN */}
            {user?.role === 'SUPER_ADMIN' && (
              <Link
                to="/super-admin"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem',
                  background: 'white',
                  border: '2px solid #e5e7eb',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  color: '#374151',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
              >
                <Shield size={18} />
                Super Admin
              </Link>
            )}

            {/* Perfil mobile - redireciona baseado no role */}
            <Link
              to={user?.role === 'SUPER_ADMIN' ? '/super-admin' : '/profile'}
              onClick={() => setMobileMenuOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem',
                background: 'white',
                border: '2px solid #e5e7eb',
                borderRadius: '10px',
                textDecoration: 'none',
                color: 'inherit'
              }}
            >
              <div style={{
                width: '40px',
                height: '40px',
                background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}>
                <User size={20} />
              </div>
              <div>
                <p style={{ fontWeight: '600', fontSize: '0.875rem' }}>
                  {user?.firstName} {user?.lastName}
                </p>
                <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  {user?.role === 'SUPER_ADMIN' ? 'Super Admin' : user?.role}
                </p>
              </div>
            </Link>

            <button
              onClick={() => {
                logout();
                setMobileMenuOpen(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.75rem',
                background: 'white',
                border: '2px solid #e5e7eb',
                borderRadius: '10px',
                color: '#374151',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer',
                width: '100%'
              }}
            >
              <LogOut size={18} />
              Sair
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
            transform: scale(1.05);
          }
        }

        @media (max-width: 768px) {
          .mobile-menu-toggle {
            display: block !important;
          }
          
          .header-actions {
            display: none !important;
          }
          
          .mobile-menu {
            display: flex !important;
          }
        }

        .profile-link-enhanced:hover .user-avatar {
          transform: scale(1.05);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </header>
  );
};

export default Header;