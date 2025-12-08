import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { notificationService } from '../services/api';
import {
  Bell,
  AlertCircle,
  Clock,
  Package,
  Calendar,
  Wrench,
  DollarSign,
  Filter,
  X
} from 'lucide-react';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const response = await notificationService.getAll();
      setNotifications(response.data.notifications);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type) => {
    const icons = {
      LOW_STOCK: <Package size={20} />,
      UPCOMING_RESERVATION: <Clock size={20} />,
      OLD_OPEN_TAB: <DollarSign size={20} />,
      MAINTENANCE: <Wrench size={20} />,
      EXPIRING_PRODUCT: <AlertCircle size={20} />,
      PENDING_RESERVATION: <Calendar size={20} />
    };
    return icons[type] || <Bell size={20} />;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      HIGH: { bg: '#fef2f2', border: '#fecaca', text: '#dc2626' },
      MEDIUM: { bg: '#fefce8', border: '#fde047', text: '#ca8a04' },
      LOW: { bg: '#eff6ff', border: '#bfdbfe', text: '#2563eb' }
    };
    return colors[priority] || colors.LOW;
  };

  const getPriorityLabel = (priority) => {
    const labels = {
      HIGH: 'Alta',
      MEDIUM: 'Média',
      LOW: 'Baixa'
    };
    return labels[priority] || 'Média';
  };

  const getTypeLabel = (type) => {
    const labels = {
      LOW_STOCK: 'Estoque',
      UPCOMING_RESERVATION: 'Reserva Próxima',
      OLD_OPEN_TAB: 'Comanda Antiga',
      MAINTENANCE: 'Manutenção',
      EXPIRING_PRODUCT: 'Produto Vencendo',
      PENDING_RESERVATION: 'Reserva Pendente'
    };
    return labels[type] || type;
  };

  const filteredNotifications = notifications.filter(notif => {
    if (filter !== 'all' && notif.type !== filter) return false;
    if (priorityFilter !== 'all' && notif.priority !== priorityFilter) return false;
    return true;
  });

  const notificationsByPriority = {
    HIGH: filteredNotifications.filter(n => n.priority === 'HIGH'),
    MEDIUM: filteredNotifications.filter(n => n.priority === 'MEDIUM'),
    LOW: filteredNotifications.filter(n => n.priority === 'LOW')
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="container" style={{ paddingTop: '2rem' }}>
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div className="spinner"></div>
            <p style={{ marginTop: '1rem', color: '#6b7280' }}>
              Carregando notificações...
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="container" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              padding: '1rem',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
            }}>
              <Bell size={28} color="white" />
            </div>
            <div>
              <h1 style={{
                fontSize: '1.875rem',
                fontWeight: '700',
                color: '#1f2937',
                margin: 0
              }}>
                Central de Notificações
              </h1>
              <p style={{
                color: '#6b7280',
                fontSize: '0.875rem',
                margin: '0.25rem 0 0 0'
              }}>
                {filteredNotifications.length} notificação(ões) ativa(s)
              </p>
            </div>
          </div>

          <button
            onClick={loadNotifications}
            className="btn btn-primary"
            style={{ gap: '0.5rem' }}
          >
            <Bell size={18} />
            Atualizar
          </button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
            padding: '1.5rem',
            borderRadius: '16px',
            border: '2px solid #fecaca',
            transition: 'transform 0.2s ease',
            cursor: 'pointer'
          }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.5rem'
            }}>
              <span style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#991b1b',
                textTransform: 'uppercase'
              }}>
                Alta Prioridade
              </span>
              <AlertCircle size={20} color="#dc2626" />
            </div>
            <p style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: '#dc2626',
              margin: 0
            }}>
              {notificationsByPriority.HIGH.length}
            </p>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #fefce8 0%, #fef9c3 100%)',
            padding: '1.5rem',
            borderRadius: '16px',
            border: '2px solid #fde047',
            transition: 'transform 0.2s ease',
            cursor: 'pointer'
          }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.5rem'
            }}>
              <span style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#854d0e',
                textTransform: 'uppercase'
              }}>
                Média Prioridade
              </span>
              <Clock size={20} color="#ca8a04" />
            </div>
            <p style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: '#ca8a04',
              margin: 0
            }}>
              {notificationsByPriority.MEDIUM.length}
            </p>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            padding: '1.5rem',
            borderRadius: '16px',
            border: '2px solid #bfdbfe',
            transition: 'transform 0.2s ease',
            cursor: 'pointer'
          }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.5rem'
            }}>
              <span style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#1e40af',
                textTransform: 'uppercase'
              }}>
                Baixa Prioridade
              </span>
              <Bell size={20} color="#2563eb" />
            </div>
            <p style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: '#2563eb',
              margin: 0
            }}>
              {notificationsByPriority.LOW.length}
            </p>
          </div>
        </div>

        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '1.5rem',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          marginBottom: '2rem'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '1rem',
            flexWrap: 'wrap'
          }}>
            <Filter size={20} color="#6b7280" />
            <span style={{ fontWeight: '600', color: '#374151' }}>Filtros:</span>

            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: '2px solid #e5e7eb',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              <option value="all">Todos os Tipos</option>
              <option value="LOW_STOCK">Estoque</option>
              <option value="UPCOMING_RESERVATION">Reservas Próximas</option>
              <option value="OLD_OPEN_TAB">Comandas Antigas</option>
              <option value="EXPIRING_PRODUCT">Produtos Vencendo</option>
              <option value="PENDING_RESERVATION">Reservas Pendentes</option>
              <option value="MAINTENANCE">Manutenção</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: '2px solid #e5e7eb',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              <option value="all">Todas as Prioridades</option>
              <option value="HIGH">Alta</option>
              <option value="MEDIUM">Média</option>
              <option value="LOW">Baixa</option>
            </select>

            {(filter !== 'all' || priorityFilter !== 'all') && (
              <button
                onClick={() => {
                  setFilter('all');
                  setPriorityFilter('all');
                }}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#f3f4f6',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <X size={16} />
                Limpar Filtros
              </button>
            )}
          </div>
        </div>

        {filteredNotifications.length === 0 ? (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '3rem',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            textAlign: 'center'
          }}>
            <Bell size={48} color="#d1d5db" style={{ marginBottom: '1rem' }} />
            <h3 style={{ color: '#6b7280', marginBottom: '0.5rem' }}>
              Nenhuma notificação
            </h3>
            <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
              Você está em dia com tudo! 🎉
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredNotifications.map((notification) => {
              const colors = getPriorityColor(notification.priority);
              return (
                <div
                  key={notification.id}
                  onClick={() => window.location.href = notification.link}
                  style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '1.5rem',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                    borderLeft: `4px solid ${colors.text}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    gap: '1rem',
                    alignItems: 'flex-start'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateX(4px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateX(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                  }}
                >
                  <div style={{
                    background: colors.bg,
                    padding: '0.75rem',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: colors.text,
                    border: `2px solid ${colors.border}`
                  }}>
                    {getIcon(notification.type)}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginBottom: '0.5rem',
                      flexWrap: 'wrap'
                    }}>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: colors.text,
                        background: colors.bg,
                        padding: '0.25rem 0.75rem',
                        borderRadius: '6px',
                        border: `1px solid ${colors.border}`
                      }}>
                        {getPriorityLabel(notification.priority)}
                      </span>
                      <span style={{
                        fontSize: '0.75rem',
                        color: '#6b7280',
                        background: '#f3f4f6',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '6px'
                      }}>
                        {getTypeLabel(notification.type)}
                      </span>
                    </div>

                    <h3 style={{
                      fontSize: '1rem',
                      fontWeight: '600',
                      color: '#1f2937',
                      marginBottom: '0.25rem'
                    }}>
                      {notification.title}
                    </h3>
                    <p style={{
                      fontSize: '0.875rem',
                      color: '#6b7280',
                      margin: 0
                    }}>
                      {notification.message}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        .spinner {
          border: 3px solid #f3f4f6;
          border-top: 3px solid var(--primary-color);
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin: 0 auto;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .container > div:first-child {
            flex-direction: column;
            align-items: flex-start !important;
          }
        }
      `}</style>
    </>
  );
};

export default Notifications;
