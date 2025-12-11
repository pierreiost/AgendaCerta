import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import MaskedInput from '../components/MaskedInput';
import { clientService } from '../services/api';
import api from '../services/api';
import { 
  Users, 
  Edit2, 
  Trash2, 
  PlusCircle, 
  X, 
  User, 
  Phone, 
  Mail, 
  FileText,
  ChevronDown,
  ChevronUp,
  Calendar,
  DollarSign,
  Clock,
  TrendingUp,
  History
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    cpf: ''
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Estados para o histórico
  const [expandedClient, setExpandedClient] = useState(null);
  const [clientHistory, setClientHistory] = useState({});
  const [loadingHistory, setLoadingHistory] = useState({});
  const [historyPages, setHistoryPages] = useState({});

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showModal]);

  const loadClients = async () => {
    try {
      const response = await clientService.getAll();
      setClients(response.data);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      setError('Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  };

  const loadClientHistory = async (clientId, page = 1) => {
    setLoadingHistory(prev => ({ ...prev, [clientId]: true }));
    try {
      const response = await api.get(`/clients/${clientId}/history`, {
        params: { page, limit: 10 }
      });
      setClientHistory(prev => ({ ...prev, [clientId]: response.data }));
      setHistoryPages(prev => ({ ...prev, [clientId]: page }));
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    } finally {
      setLoadingHistory(prev => ({ ...prev, [clientId]: false }));
    }
  };

  const toggleClientHistory = async (clientId) => {
    if (expandedClient === clientId) {
      setExpandedClient(null);
    } else {
      setExpandedClient(clientId);
      if (!clientHistory[clientId]) {
        await loadClientHistory(clientId);
      }
    }
  };

  const handlePageChange = async (clientId, newPage) => {
    await loadClientHistory(clientId, newPage);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    if (fieldErrors[name]) {
      setFieldErrors({
        ...fieldErrors,
        [name]: ''
      });
    }
    
    if (error) setError('');
  };

  const openModal = (client = null) => {
    if (client) {
      setEditingClient(client);
      setFormData({
        fullName: client.fullName,
        phone: client.phone,
        email: client.email || '',
        cpf: client.cpf || ''
      });
    } else {
      setEditingClient(null);
      setFormData({
        fullName: '',
        phone: '',
        email: '',
        cpf: ''
      });
    }
    setShowModal(true);
    setError('');
    setFieldErrors({});
  };

  const closeModal = (skipConfirmation = false) => {
    if (isSaving) return;
    
    if (!skipConfirmation) {
      const hasData = formData.fullName || formData.phone || formData.email || formData.cpf;
      
      if (hasData) {
        const confirmClose = window.confirm('Tem certeza? Dados não salvos serão perdidos.');
        if (!confirmClose) return;
      }
    }
    
    setShowModal(false);
    setEditingClient(null);
    setFormData({
      fullName: '',
      phone: '',
      email: '',
      cpf: ''
    });
    setError('');
    setFieldErrors({});
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.fullName || formData.fullName.trim().length < 3) {
      errors.fullName = 'Nome completo deve ter pelo menos 3 caracteres';
    }

    if (!formData.phone) {
      errors.phone = 'Telefone é obrigatório';
    } else {
      const phoneNumbers = formData.phone.replace(/\D/g, '');
      if (phoneNumbers.length < 10 || phoneNumbers.length > 11) {
        errors.phone = 'Telefone inválido';
      }
    }

    if (formData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        errors.email = 'Email inválido';
      }
    }

    if (formData.cpf) {
      const cpfNumbers = formData.cpf.replace(/\D/g, '');
      if (cpfNumbers.length !== 11) {
        errors.cpf = 'CPF deve ter 11 dígitos';
      }
    }

    setFieldErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      setError('Por favor, corrija os erros antes de continuar');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setIsSaving(true);

    try {
      if (editingClient) {
        await clientService.update(editingClient.id, formData);
        setSuccess('Cliente atualizado com sucesso!');
      } else {
        await clientService.create(formData);
        setSuccess('Cliente cadastrado com sucesso!');
      }
      
      closeModal(true);
      loadClients();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.response?.data?.error || 'Erro ao salvar cliente');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja deletar este cliente?')) {
      return;
    }

    try {
      await clientService.delete(id);
      setSuccess('Cliente deletado com sucesso!');
      loadClients();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.response?.data?.error || 'Erro ao deletar cliente');
      setTimeout(() => setError(''), 5000);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="container" style={{ marginTop: '2rem' }}>
          <div className="flex-center" style={{ minHeight: '50vh' }}>
            <div className="loading" style={{ width: '50px', height: '50px', borderWidth: '5px' }}></div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="container" style={{ marginTop: '2rem' }}>
        
        <div className="flex-between" style={{ marginBottom: '2rem', alignItems: 'flex-start' }}>
          <div>
            <h1 className="font-bold text-2xl">Clientes</h1>
            <p className="text-muted" style={{ marginTop: '0.5rem' }}>
              Gerencie seus clientes cadastrados
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => openModal()}>
            <PlusCircle size={18} />
            Novo Cliente
          </button>
        </div>

        {error && !showModal && (
          <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>
            {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>
            {success}
          </div>
        )}

        {clients.length === 0 ? (
          <div className="card text-center" style={{ padding: '3rem' }}>
            <Users size={48} style={{ color: 'var(--text-light)', margin: '0 auto 1rem' }} />
            <h3 className="font-bold text-lg" style={{ marginBottom: '0.5rem' }}>
              Nenhum cliente cadastrado
            </h3>
            <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
              Comece cadastrando seu primeiro cliente
            </p>
            <button className="btn btn-primary" onClick={() => openModal()}>
              <PlusCircle size={18} />
              Cadastrar Primeiro Cliente
            </button>
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1.5rem'
          }}>
            {clients.map((client) => {
              const isExpanded = expandedClient === client.id;
              const history = clientHistory[client.id];
              const isLoadingHistory = loadingHistory[client.id];
              const currentPage = historyPages[client.id] || 1;

              return (
                <div 
                  key={client.id}
                  className="card"
                  style={{
                    padding: '0',
                    transition: 'all 0.2s',
                    border: '1px solid var(--border-color)',
                    overflow: 'hidden'
                  }}
                >
                  <div style={{ padding: '1.5rem' }}>
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #1A73E8, #0050B3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '1rem'
                      }}>
                        <User size={24} style={{ color: 'white' }} />
                      </div>
                      
                      <h3 className="font-bold" style={{ 
                        fontSize: '1.125rem',
                        marginBottom: '0.5rem',
                        color: 'var(--text-primary)'
                      }}>
                        {client.fullName}
                      </h3>
                    </div>

                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '0.75rem',
                      marginBottom: '1rem'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.5rem',
                        fontSize: '0.875rem',
                        color: 'var(--text-secondary)'
                      }}>
                        <Phone size={16} />
                        <span>{client.phone}</span>
                      </div>

                      {client.email && (
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.5rem',
                          fontSize: '0.875rem',
                          color: 'var(--text-secondary)'
                        }}>
                          <Mail size={16} />
                          <span style={{ 
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {client.email}
                          </span>
                        </div>
                      )}

                      {client.cpf && (
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.5rem',
                          fontSize: '0.875rem',
                          color: 'var(--text-secondary)'
                        }}>
                          <FileText size={16} />
                          <span>{client.cpf}</span>
                        </div>
                      )}
                    </div>

                    <div style={{ 
                      display: 'flex', 
                      gap: '0.5rem',
                      paddingTop: '1rem',
                      borderTop: '1px solid var(--border-color)'
                    }}>
                      <button
                        className="btn btn-outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          openModal(client);
                        }}
                        style={{ 
                          flex: 1,
                          padding: '0.5rem',
                          fontSize: '0.875rem'
                        }}
                      >
                        <Edit2 size={16} />
                        Editar
                      </button>
                      <button
                        className="btn btn-outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(client.id);
                        }}
                        style={{ 
                          flex: 1,
                          padding: '0.5rem',
                          fontSize: '0.875rem',
                          color: '#ef4444',
                          borderColor: '#ef4444'
                        }}
                      >
                        <Trash2 size={16} />
                        Deletar
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleClientHistory(client.id)}
                    style={{
                      width: '100%',
                      padding: '1rem',
                      border: 'none',
                      borderTop: '1px solid var(--border-color)',
                      background: isExpanded ? '#f9fafb' : 'white',
                      color: '#1A73E8',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                    onMouseLeave={(e) => e.currentTarget.style.background = isExpanded ? '#f9fafb' : 'white'}
                  >
                    <History size={16} />
                    Ver Histórico
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>

                  {isExpanded && (
                    <div style={{
                      padding: '1.5rem',
                      background: '#f9fafb',
                      borderTop: '1px solid var(--border-color)',
                      animation: 'slideDown 0.3s ease'
                    }}>
                      {isLoadingHistory ? (
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'center',
                          padding: '2rem'
                        }}>
                          <div className="loading" style={{ 
                            width: '30px', 
                            height: '30px', 
                            borderWidth: '3px' 
                          }}></div>
                        </div>
                      ) : history ? (
                        <div>
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: '1rem',
                            marginBottom: '1.5rem'
                          }}>
                            <div style={{
                              padding: '1rem',
                              background: 'white',
                              borderRadius: '8px',
                              border: '1px solid #e5e7eb'
                            }}>
                              <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '0.5rem',
                                marginBottom: '0.5rem'
                              }}>
                                <Calendar size={18} color="#1A73E8" />
                                <span style={{ 
                                  fontSize: '0.75rem', 
                                  color: '#6b7280',
                                  fontWeight: '600',
                                  textTransform: 'uppercase'
                                }}>
                                  Total Reservas
                                </span>
                              </div>
                              <p style={{ 
                                fontSize: '1.5rem', 
                                fontWeight: '700',
                                color: '#111827',
                                margin: 0
                              }}>
                                {history.statistics.totalReservations}
                              </p>
                            </div>

                            <div style={{
                              padding: '1rem',
                              background: 'white',
                              borderRadius: '8px',
                              border: '1px solid #e5e7eb'
                            }}>
                              <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '0.5rem',
                                marginBottom: '0.5rem'
                              }}>
                                <DollarSign size={18} color="#1A73E8" />
                                <span style={{ 
                                  fontSize: '0.75rem', 
                                  color: '#6b7280',
                                  fontWeight: '600',
                                  textTransform: 'uppercase'
                                }}>
                                  Gasto em Comandas
                                </span>
                              </div>
                              <p style={{ 
                                fontSize: '1.5rem', 
                                fontWeight: '700',
                                color: '#111827',
                                margin: 0
                              }}>
                                {formatCurrency(history.statistics.totalSpent)}
                              </p>
                            </div>
                          </div>

                          {history.upcomingReservations.length > 0 && (
                            <div style={{ marginBottom: '1.5rem' }}>
                              <h4 style={{
                                fontSize: '0.875rem',
                                fontWeight: '700',
                                color: '#111827',
                                marginBottom: '0.75rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                              }}>
                                <TrendingUp size={16} color="#1A73E8" />
                                Próximas Reservas
                              </h4>
                              <div style={{ 
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.5rem'
                              }}>
                                {history.upcomingReservations.map((reservation) => (
                                  <div
                                    key={reservation.id}
                                    style={{
                                      padding: '0.75rem',
                                      background: 'white',
                                      borderRadius: '8px',
                                      border: '1px solid #e5e7eb',
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center'
                                    }}
                                  >
                                    <div>
                                      <p style={{ 
                                        fontWeight: '600',
                                        fontSize: '0.875rem',
                                        color: '#111827',
                                        margin: 0
                                      }}>
                                        {reservation.court.name}
                                      </p>
                                      <p style={{ 
                                        fontSize: '0.75rem',
                                        color: '#6b7280',
                                        margin: 0,
                                        marginTop: '0.25rem'
                                      }}>
                                        {format(new Date(reservation.startTime), "dd 'de' MMMM", { locale: ptBR })}
                                      </p>
                                    </div>
                                    <div style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.25rem',
                                      color: '#1A73E8',
                                      fontSize: '0.75rem',
                                      fontWeight: '600'
                                    }}>
                                      <Clock size={14} />
                                      {format(new Date(reservation.startTime), 'HH:mm')} - {format(new Date(reservation.endTime), 'HH:mm')}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div style={{ marginBottom: '1rem' }}>
                            <h4 style={{
                              fontSize: '0.875rem',
                              fontWeight: '700',
                              color: '#111827',
                              marginBottom: '0.75rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem'
                            }}>
                              <History size={16} color="#1A73E8" />
                              Histórico de Reservas
                            </h4>
                            
                            {history.history.reservations.length === 0 ? (
                              <p style={{
                                textAlign: 'center',
                                color: '#6b7280',
                                fontSize: '0.875rem',
                                padding: '1rem'
                              }}>
                                Nenhuma reserva encontrada
                              </p>
                            ) : (
                              <>
                                <div style={{ 
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '0.5rem',
                                  marginBottom: '1rem'
                                }}>
                                  {history.history.reservations.map((reservation) => (
                                    <div
                                      key={reservation.id}
                                      style={{
                                        padding: '0.75rem',
                                        background: 'white',
                                        borderRadius: '8px',
                                        border: '1px solid #e5e7eb',
                                        opacity: reservation.status === 'CANCELLED' ? 0.6 : 1
                                      }}
                                    >
                                      <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: '0.5rem'
                                      }}>
                                        <p style={{ 
                                          fontWeight: '600',
                                          fontSize: '0.875rem',
                                          color: '#111827',
                                          margin: 0
                                        }}>
                                          {reservation.court.name}
                                        </p>
                                        {reservation.status === 'CANCELLED' && (
                                          <span style={{
                                            padding: '0.25rem 0.5rem',
                                            background: '#fee2e2',
                                            color: '#991b1b',
                                            fontSize: '0.625rem',
                                            fontWeight: '600',
                                            borderRadius: '4px',
                                            textTransform: 'uppercase'
                                          }}>
                                            Finalizada
                                          </span>
                                        )}
                                      </div>
                                      <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                      }}>
                                        <p style={{ 
                                          fontSize: '0.75rem',
                                          color: '#6b7280',
                                          margin: 0
                                        }}>
                                          {format(new Date(reservation.startTime), "dd/MM/yyyy", { locale: ptBR })}
                                        </p>
                                        <p style={{
                                          fontSize: '0.75rem',
                                          color: '#6b7280',
                                          margin: 0
                                        }}>
                                          {format(new Date(reservation.startTime), 'HH:mm')} - {format(new Date(reservation.endTime), 'HH:mm')}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                {history.history.pagination.totalPages > 1 && (
                                  <div style={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    paddingTop: '1rem',
                                    borderTop: '1px solid #e5e7eb'
                                  }}>
                                    <button
                                      onClick={() => handlePageChange(client.id, currentPage - 1)}
                                      disabled={currentPage === 1}
                                      style={{
                                        padding: '0.5rem 1rem',
                                        borderRadius: '6px',
                                        border: '1px solid #e5e7eb',
                                        background: currentPage === 1 ? '#f3f4f6' : 'white',
                                        color: currentPage === 1 ? '#9ca3af' : '#111827',
                                        fontSize: '0.75rem',
                                        fontWeight: '600',
                                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                                      }}
                                    >
                                      Anterior
                                    </button>
                                    <span style={{
                                      fontSize: '0.75rem',
                                      color: '#6b7280'
                                    }}>
                                      Página {currentPage} de {history.history.pagination.totalPages}
                                    </span>
                                    <button
                                      onClick={() => handlePageChange(client.id, currentPage + 1)}
                                      disabled={currentPage === history.history.pagination.totalPages}
                                      style={{
                                        padding: '0.5rem 1rem',
                                        borderRadius: '6px',
                                        border: '1px solid #e5e7eb',
                                        background: currentPage === history.history.pagination.totalPages ? '#f3f4f6' : 'white',
                                        color: currentPage === history.history.pagination.totalPages ? '#9ca3af' : '#111827',
                                        fontSize: '0.75rem',
                                        fontWeight: '600',
                                        cursor: currentPage === history.history.pagination.totalPages ? 'not-allowed' : 'pointer'
                                      }}
                                    >
                                      Próxima
                                    </button>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {showModal && (
          <div 
            className="modal-overlay" 
            onClick={() => closeModal(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '1rem'
            }}
          >
            <div 
              className="modal" 
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'white',
                borderRadius: '12px',
                width: '100%',
                maxWidth: '540px',
                maxHeight: '90vh',
                overflow: 'auto',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
              }}
            >
              <div 
                className="modal-header"
                style={{
                  padding: '1.5rem',
                  borderBottom: '1px solid #E5E7EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <h2 className="font-bold text-xl" style={{ margin: 0 }}>
                  {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
                </h2>
                <button 
                  onClick={() => closeModal(false)} 
                  className="btn-icon"
                  style={{
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="modal-body" style={{ padding: '1.5rem' }}>
                {error && (
                  <div 
                    className="alert alert-danger" 
                    style={{ marginBottom: '1.5rem' }}
                  >
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                    <label htmlFor="fullName">Nome Completo *</label>
                    <input
                      type="text"
                      id="fullName"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      required
                      placeholder="João Silva Santos"
                      style={{
                        border: fieldErrors.fullName ? '2px solid #ef4444' : undefined
                      }}
                    />
                    {fieldErrors.fullName && (
                      <span style={{ color: '#ef4444', fontSize: '0.875rem' }}>
                        {fieldErrors.fullName}
                      </span>
                    )}
                  </div>

                  <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                    <label htmlFor="phone">Telefone *</label>
                    <MaskedInput
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      mask="(99) 99999-9999"
                      placeholder="(00) 00000-0000"
                      required
                      style={{
                        border: fieldErrors.phone ? '2px solid #ef4444' : undefined
                      }}
                    />
                    {fieldErrors.phone && (
                      <span style={{ color: '#ef4444', fontSize: '0.875rem' }}>
                        {fieldErrors.phone}
                      </span>
                    )}
                  </div>

                  <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                    <label htmlFor="email">Email</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="joao.silva@email.com"
                      style={{
                        border: fieldErrors.email ? '2px solid #ef4444' : undefined
                      }}
                    />
                    {fieldErrors.email && (
                      <span style={{ color: '#ef4444', fontSize: '0.875rem' }}>
                        {fieldErrors.email}
                      </span>
                    )}
                  </div>

                  <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                    <label htmlFor="cpf">CPF</label>
                    <MaskedInput
                      id="cpf"
                      name="cpf"
                      value={formData.cpf}
                      onChange={handleInputChange}
                      mask="999.999.999-99"
                      placeholder="000.000.000-00"
                      style={{
                        border: fieldErrors.cpf ? '2px solid #ef4444' : undefined
                      }}
                    />
                    {fieldErrors.cpf && (
                      <span style={{ color: '#ef4444', fontSize: '0.875rem' }}>
                        {fieldErrors.cpf}
                      </span>
                    )}
                  </div>

                  <div className="flex" style={{ gap: '1rem', justifyContent: 'flex-end' }}>
                    <button 
                      type="button" 
                      onClick={() => closeModal(false)} 
                      className="btn btn-outline"
                      disabled={isSaving}
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit" 
                      className="btn btn-primary"
                      disabled={isSaving}
                    >
                      {isSaving ? 'Salvando...' : (editingClient ? 'Atualizar' : 'Cadastrar')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        <style>{`
          @keyframes slideDown {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </div>
    </>
  );
};

export default Clients;