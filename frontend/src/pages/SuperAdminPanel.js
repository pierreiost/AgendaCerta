import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { CheckCircle, XCircle, Clock, Ban, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const SuperAdminPanel = () => {
  const [complexes, setComplexes] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('PENDING');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadData();
  }, [filter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [complexesRes, statsRes] = await Promise.all([
        api.get(`/admin/all?status=${filter}`),
        api.get('/admin/stats')
      ]);
      
      setComplexes(complexesRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setError('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId) => {
    if (!window.confirm('Aprovar este complexo?')) return;

    try {
      await api.post(`/admin/approve/${userId}`);
      setSuccess('Complexo aprovado com sucesso!');
      setTimeout(() => setSuccess(''), 3000);
      loadData();
    } catch (error) {
      setError(error.response?.data?.error || 'Erro ao aprovar');
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleReject = async (userId) => {
    const reason = window.prompt('Motivo da rejeição (opcional):');
    if (reason === null) return;

    try {
      await api.post(`/admin/reject/${userId}`, { reason });
      setSuccess('Complexo rejeitado');
      setTimeout(() => setSuccess(''), 3000);
      loadData();
    } catch (error) {
      setError(error.response?.data?.error || 'Erro ao rejeitar');
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleSuspend = async (userId) => {
    const reason = window.prompt('Motivo da suspensão:');
    if (!reason) return;

    try {
      await api.post(`/admin/suspend/${userId}`, { reason });
      setSuccess('Complexo suspenso');
      setTimeout(() => setSuccess(''), 3000);
      loadData();
    } catch (error) {
      setError(error.response?.data?.error || 'Erro ao suspender');
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleReactivate = async (userId) => {
    if (!window.confirm('Reativar este complexo?')) return;

    try {
      await api.post(`/admin/reactivate/${userId}`);
      setSuccess('Complexo reativado!');
      setTimeout(() => setSuccess(''), 3000);
      loadData();
    } catch (error) {
      setError(error.response?.data?.error || 'Erro ao reativar');
      setTimeout(() => setError(''), 5000);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      PENDING: { color: '#f59e0b', bg: '#fef3c7', text: 'Pendente', icon: Clock },
      ACTIVE: { color: '#10b981', bg: '#d1fae5', text: 'Ativo', icon: CheckCircle },
      REJECTED: { color: '#ef4444', bg: '#fee2e2', text: 'Rejeitado', icon: XCircle },
      SUSPENDED: { color: '#dc2626', bg: '#fecaca', text: 'Suspenso', icon: Ban }
    };

    const badge = badges[status] || badges.PENDING;
    const Icon = badge.icon;

    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.5rem 1rem',
        borderRadius: '8px',
        fontSize: '0.875rem',
        fontWeight: '600',
        background: badge.bg,
        color: badge.color
      }}>
        <Icon size={16} />
        {badge.text}
      </span>
    );
  };

  return (
    <div className="page">
      <Header />
      
      <div className="container">
        <div style={{ marginBottom: '2rem' }}>
          <h1 className="font-bold text-2xl" style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '2rem' }}>
            <AlertCircle size={32} color="#dc2626" />
            Painel Super Admin
          </h1>
          <p className="text-muted">Gerencie todos os complexos cadastrados na plataforma</p>
        </div>

        {/* Estatísticas */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <div style={{
            background: 'white',
            padding: '1.5rem',
            borderRadius: '12px',
            border: '2px solid #e5e7eb'
          }}>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>Total</p>
            <p style={{ margin: 0, fontSize: '2rem', fontWeight: '700', color: '#111827' }}>
              {stats.total || 0}
            </p>
          </div>

          <div style={{
            background: 'white',
            padding: '1.5rem',
            borderRadius: '12px',
            border: '2px solid #fef3c7',
            cursor: 'pointer'
          }}
          onClick={() => setFilter('PENDING')}>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#f59e0b' }}>Pendentes</p>
            <p style={{ margin: 0, fontSize: '2rem', fontWeight: '700', color: '#f59e0b' }}>
              {stats.pending || 0}
            </p>
          </div>

          <div style={{
            background: 'white',
            padding: '1.5rem',
            borderRadius: '12px',
            border: '2px solid #d1fae5',
            cursor: 'pointer'
          }}
          onClick={() => setFilter('ACTIVE')}>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#10b981' }}>Ativos</p>
            <p style={{ margin: 0, fontSize: '2rem', fontWeight: '700', color: '#10b981' }}>
              {stats.active || 0}
            </p>
          </div>

          <div style={{
            background: 'white',
            padding: '1.5rem',
            borderRadius: '12px',
            border: '2px solid #fecaca',
            cursor: 'pointer'
          }}
          onClick={() => setFilter('SUSPENDED')}>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#dc2626' }}>Suspensos</p>
            <p style={{ margin: 0, fontSize: '2rem', fontWeight: '700', color: '#dc2626' }}>
              {stats.suspended || 0}
            </p>
          </div>

          <div style={{
            background: 'white',
            padding: '1.5rem',
            borderRadius: '12px',
            border: '2px solid #fee2e2',
            cursor: 'pointer'
          }}
          onClick={() => setFilter('REJECTED')}>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#ef4444' }}>Rejeitados</p>
            <p style={{ margin: 0, fontSize: '2rem', fontWeight: '700', color: '#ef4444' }}>
              {stats.rejected || 0}
            </p>
          </div>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {/* Lista de Complexos */}
        {loading ? (
          <div className="flex-center" style={{ padding: '3rem' }}>
            <div className="loading"></div>
          </div>
        ) : complexes.length === 0 ? (
          <div className="card">
            <div className="flex-center flex-col" style={{ padding: '3rem', textAlign: 'center' }}>
              <h3 className="font-bold text-xl">Nenhum complexo encontrado</h3>
            </div>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
            gap: '1.5rem'
          }}>
            {complexes.map((user) => (
              <div
                key={user.id}
                style={{
                  background: 'white',
                  borderRadius: '16px',
                  border: '2px solid #e5e7eb',
                  padding: '1.5rem',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.1)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: '600' }}>
                      {user.complex?.name}
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>
                      CNPJ: {user.complex?.cnpj}
                    </p>
                  </div>
                  {getStatusBadge(user.status)}
                </div>

                <div style={{
                  padding: '1rem 0',
                  borderTop: '1px solid #f3f4f6',
                  borderBottom: '1px solid #f3f4f6',
                  margin: '1rem 0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af' }}>Responsável</p>
                    <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: '500' }}>
                      {user.firstName} {user.lastName}
                    </p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af' }}>Email</p>
                    <p style={{ margin: 0, fontSize: '0.875rem' }}>{user.email}</p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af' }}>Telefone</p>
                    <p style={{ margin: 0, fontSize: '0.875rem' }}>{user.phone}</p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af' }}>Cadastrado em</p>
                    <p style={{ margin: 0, fontSize: '0.875rem' }}>
                      {format(parseISO(user.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {user.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => handleApprove(user.id)}
                        style={{
                          flex: 1,
                          padding: '0.75rem',
                          background: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem'
                        }}
                      >
                        <CheckCircle size={18} />
                        Aprovar
                      </button>
                      <button
                        onClick={() => handleReject(user.id)}
                        style={{
                          flex: 1,
                          padding: '0.75rem',
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem'
                        }}
                      >
                        <XCircle size={18} />
                        Rejeitar
                      </button>
                    </>
                  )}

                  {user.status === 'ACTIVE' && (
                    <button
                      onClick={() => handleSuspend(user.id)}
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        background: '#dc2626',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <Ban size={18} />
                      Suspender
                    </button>
                  )}

                  {user.status === 'SUSPENDED' && (
                    <button
                      onClick={() => handleReactivate(user.id)}
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <CheckCircle size={18} />
                      Reativar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperAdminPanel;
