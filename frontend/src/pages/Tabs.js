import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  PlusCircle, 
  Receipt, 
  DollarSign, 
  Clock, 
  User,
  RefreshCw,
  Users,
  Calendar,
  Info,
  X
} from 'lucide-react';
import Header from '../components/Header';
import api from '../services/api';

const Tabs = () => {
  const [tabs, setTabs] = useState([]);
  const [clients, setClients] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filterStatus, setFilterStatus] = useState('OPEN');
  const [formData, setFormData] = useState({
    clientId: '',
    reservationId: ''
  });

  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [tabsRes, clientsRes, reservationsRes] = await Promise.all([
        api.get('/tabs'),
        api.get('/clients'),
        api.get('/reservations')
      ]);

      setTabs(tabsRes.data);
      setClients(clientsRes.data);
      setReservations(reservationsRes.data);
    } catch (err) {
      setError('Erro ao carregar dados');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openModal = () => {
    setShowModal(true);
    setError('');
    setFormData({ clientId: '', reservationId: '' });
  };

  const closeModal = () => {
    setShowModal(false);
    setError('');
    setFormData({ clientId: '', reservationId: '' });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.clientId) {
      setError('Selecione um cliente');
      return;
    }

    try {
      const response = await api.post('/tabs', {
        clientId: formData.clientId,
        reservationId: formData.reservationId || null
      });

      setSuccess('Comanda criada com sucesso!');
      closeModal();
      loadData();
      setTimeout(() => setSuccess(''), 3000);
      navigate(`/tabs/${response.data.id}`);
    } catch (error) {
      setError(error.response?.data?.error || 'Erro ao criar comanda');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      OPEN: { class: 'badge-info', text: 'Aberta' },
      PAID: { class: 'badge-success', text: 'Paga' },
      CANCELLED: { class: 'badge-danger', text: 'Cancelada' }
    };
    return badges[status] || badges.OPEN;
  };

  const filteredTabs = tabs.filter(tab => {
    if (filterStatus && filterStatus !== 'ALL' && tab.status !== filterStatus) {
      return false;
    }
    return true;
  });

  const getReservationsForToday = () => {
    const today = startOfDay(new Date());
    
    return reservations.filter(r => {
      if (r.status !== 'CONFIRMED') return false;
      
      const reservationDate = startOfDay(new Date(r.startTime));
      return reservationDate.getTime() === today.getTime();
    });
  };

  const todayReservations = getReservationsForToday();
  const openTabs = tabs.filter(t => t.status === 'OPEN');
  const totalOpen = openTabs.reduce((sum, tab) => sum + tab.total, 0);

  if (loading) {
    return (
      <>
        <Header />
        <div className="flex-center" style={{ minHeight: '80vh' }}>
          <div className="loading" style={{ width: '50px', height: '50px', borderWidth: '5px' }}></div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      
      <div className="container" style={{ padding: '2rem 1rem' }}>
        <div className="flex-between" style={{ marginBottom: '2rem' }}>
          <div>
            <h1 className="text-2xl font-bold">Gerenciar Comandas</h1>
            <p className="text-muted">Controle de vendas e comandas</p>
          </div>
          <button className="btn btn-primary" onClick={openModal}>
            <PlusCircle size={18} />
            Nova Comanda
          </button>
        </div>

        {success && (
          <div className="alert alert-success">{success}</div>
        )}

        {error && !showModal && (
          <div className="alert alert-danger">{error}</div>
        )}

        <div className="grid grid-3" style={{ marginBottom: '2rem' }}>
          <div className="card">
            <div className="flex-between">
              <div>
                <p className="text-muted text-sm">Comandas Abertas</p>
                <h3 className="text-2xl font-bold">{openTabs.length}</h3>
              </div>
              <div style={{ 
                width: '60px', 
                height: '60px', 
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}>
                <Receipt size={30} />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex-between">
              <div>
                <p className="text-muted text-sm">Total em Aberto</p>
                <h3 className="text-2xl font-bold">R$ {totalOpen.toFixed(2)}</h3>
              </div>
              <div style={{ 
                width: '60px', 
                height: '60px', 
                background: 'linear-gradient(135deg, #10b981, #059669)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}>
                <DollarSign size={30} />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex-between">
              <div>
                <p className="text-muted text-sm">Total de Comandas</p>
                <h3 className="text-2xl font-bold">{tabs.length}</h3>
              </div>
              <div style={{ 
                width: '60px', 
                height: '60px', 
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}>
                <Clock size={30} />
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '2rem' }}>
          <div className="grid grid-2">
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label htmlFor="filterStatus">Filtrar por Status</label>
              <select
                id="filterStatus"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="OPEN">Apenas Abertas</option>
                <option value="PAID">Apenas Pagas</option>
                <option value="CANCELLED">Apenas Canceladas</option>
                <option value="ALL">Todos os status</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                className="btn btn-outline"
                onClick={() => setFilterStatus('OPEN')}
                style={{ width: '100%' }}
              >
                <RefreshCw size={18} />
                Limpar Filtro
              </button>
            </div>
          </div>
        </div>

        {filteredTabs.length === 0 ? (
          <div className="card text-center" style={{ padding: '3rem' }}>
            <Receipt size={64} style={{ margin: '0 auto 1rem', color: 'var(--text-light)' }} />
            <h3 className="font-bold" style={{ marginBottom: '0.5rem' }}>
              {filterStatus && filterStatus !== 'ALL' 
                ? 'Nenhuma comanda encontrada' 
                : 'Nenhuma comanda cadastrada'}
            </h3>
            <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
              {filterStatus && filterStatus !== 'ALL'
                ? 'Tente ajustar os filtros' 
                : 'Comece criando sua primeira comanda'}
            </p>
            {(!filterStatus || filterStatus === 'ALL') && (
              <button className="btn btn-primary" onClick={openModal}>
                <PlusCircle size={18} />
                Criar Primeira Comanda
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-3">
            {filteredTabs.map((tab) => {
              const statusBadge = getStatusBadge(tab.status);
              return (
                <div key={tab.id} className="card" style={{ cursor: 'pointer' }} onClick={() => navigate(`/tabs/${tab.id}`)}>
                  <div className="flex-between" style={{ marginBottom: '1rem' }}>
                    <div className="flex" style={{ alignItems: 'center', gap: '0.5rem' }}>
                      <Receipt size={20} style={{ color: 'var(--primary-color)' }} />
                      <span className="font-bold">
                        #{tab.id.substring(0, 8)}
                      </span>
                    </div>
                    <span className={`badge ${statusBadge.class}`}>
                      {statusBadge.text}
                    </span>
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <div className="flex" style={{ alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <User size={14} style={{ color: 'var(--text-light)' }} />
                      <span className="text-sm text-muted">{tab.client.fullName}</span>
                    </div>
                    {tab.reservation && (
                      <div className="flex" style={{ alignItems: 'center', gap: '0.5rem' }}>
                        <Clock size={14} style={{ color: 'var(--text-light)' }} />
                        <span className="text-sm text-muted">
                          {tab.reservation.court.name} - {format(new Date(tab.reservation.startTime), "dd/MM HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex-between" style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                    <span className="text-sm text-muted">{tab.items.length} {tab.items.length === 1 ? 'item' : 'itens'}</span>
                    <span className="font-bold" style={{ color: 'var(--primary-color)' }}>
                      R$ {tab.total.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <div 
          className="modal-overlay" 
          onClick={closeModal}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem'
          }}
        >
          <div 
            className="modal" 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              margin: '0',
              animation: 'slideUp 0.3s ease-out'
            }}
          >
            <div 
              style={{ 
                background: 'linear-gradient(135deg, #34a853, #2d8e47)',
                color: 'white',
                padding: '2rem',
                borderRadius: '16px 16px 0 0',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Receipt size={26} />
                </div>
                <div>
                  <h2 className="text-xl font-bold" style={{ marginBottom: '0.25rem' }}>Nova Comanda</h2>
                  <p style={{ opacity: 0.9, fontSize: '0.875rem' }}>Crie uma nova comanda para seu cliente</p>
                </div>
              </div>
              <button 
                onClick={closeModal}
                style={{
                  position: 'absolute',
                  top: '1.5rem',
                  right: '1.5rem',
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  color: 'white'
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.3)'}
                onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '2rem', background: 'white' }}>
              {error && (
                <div 
                  className="alert alert-danger" 
                  style={{ 
                    marginBottom: '1.5rem',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}
                >
                  <Info size={20} />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                  <label 
                    htmlFor="clientId" 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.5rem',
                      marginBottom: '0.75rem',
                      fontWeight: '600',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <Users size={18} style={{ color: '#34a853' }} />
                    Selecione o Cliente
                  </label>
                  <select
                    id="clientId"
                    name="clientId"
                    value={formData.clientId}
                    onChange={handleInputChange}
                    required
                    style={{
                      padding: '1rem',
                      borderRadius: '12px',
                      border: '2px solid var(--border-color)',
                      fontSize: '1rem',
                      transition: 'all 0.2s',
                      background: 'var(--bg-light)'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#34a853'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                  >
                    <option value="">Escolha um cliente da lista</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.fullName} • {client.phone}
                      </option>
                    ))}
                  </select>
                  {clients.length === 0 && (
                    <small className="text-muted" style={{ marginTop: '0.5rem', display: 'block' }}>
                      ⚠️ Nenhum cliente cadastrado ainda
                    </small>
                  )}
                </div>

                <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                  <label 
                    htmlFor="reservationId"
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.5rem',
                      marginBottom: '0.75rem',
                      fontWeight: '600',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <Calendar size={18} style={{ color: '#34a853' }} />
                    Vincular a uma Reserva
                    <span 
                      style={{ 
                        fontSize: '0.75rem', 
                        background: 'var(--bg-dark)', 
                        padding: '0.25rem 0.5rem', 
                        borderRadius: '6px',
                        color: 'var(--text-light)'
                      }}
                    >
                      opcional
                    </span>
                  </label>
                  <select
                    id="reservationId"
                    name="reservationId"
                    value={formData.reservationId}
                    onChange={handleInputChange}
                    style={{
                      padding: '1rem',
                      borderRadius: '12px',
                      border: '2px solid var(--border-color)',
                      fontSize: '1rem',
                      transition: 'all 0.2s',
                      background: 'var(--bg-light)'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#34a853'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                  >
                    <option value="">Sem reserva vinculada</option>
                    {todayReservations.map(reservation => (
                      <option key={reservation.id} value={reservation.id}>
                        {reservation.court.name} • {format(new Date(reservation.startTime), "dd/MM 'às' HH:mm", { locale: ptBR })}
                      </option>
                    ))}
                  </select>
                  <div 
                    style={{ 
                      marginTop: '0.75rem', 
                      padding: '0.875rem',
                      background: 'var(--bg-light)',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      border: '1px solid var(--border-color)'
                    }}
                  >
                    <div style={{
                      width: '32px',
                      height: '32px',
                      background: '#34a853',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Calendar size={16} style={{ color: 'white' }} />
                    </div>
                    <small className="text-muted" style={{ lineHeight: '1.5' }}>
                      {todayReservations.length > 0 ? (
                        <>Exibindo <strong>{todayReservations.length}</strong> {todayReservations.length === 1 ? 'reserva confirmada' : 'reservas confirmadas'} de hoje</>
                      ) : (
                        <>Não há reservas confirmadas para hoje</>
                      )}
                    </small>
                  </div>
                </div>

                <div className="flex" style={{ gap: '1rem' }}>
                  <button 
                    type="button" 
                    className="btn btn-outline" 
                    onClick={closeModal} 
                    style={{ 
                      flex: 1,
                      padding: '1rem',
                      borderRadius: '12px',
                      fontWeight: '600',
                      fontSize: '1rem'
                    }}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    style={{ 
                      flex: 1,
                      padding: '1rem',
                      borderRadius: '12px',
                      fontWeight: '600',
                      fontSize: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <PlusCircle size={20} />
                    Criar Comanda
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
};

export default Tabs;