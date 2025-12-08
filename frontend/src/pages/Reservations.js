import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import MaskedInput from '../components/MaskedInput';
import { reservationService, courtService, clientService, tabService } from '../services/api';
import { 
  Trash2, 
  PlusCircle, 
  X, 
  Calendar, 
  Clock, 
  User, 
  MapPin, 
  RefreshCw,
  Filter,
  CheckCircle,
  XCircle,
  CheckSquare,
  Square,
  UserPlus,
  Phone,
  Mail,
  FileText,
  DollarSign,
  Users
} from 'lucide-react';
import { format, addHours, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Reservations = () => {
  const [reservations, setReservations] = useState([]);
  const [courts, setCourts] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedCourt, setSelectedCourt] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('CONFIRMED');
  const [useCustomTime, setUseCustomTime] = useState(false);
  const [selectedReservations, setSelectedReservations] = useState([]);
  
  const [showClientModal, setShowClientModal] = useState(false);
  const [clientFormData, setClientFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    cpf: ''
  });
  const [clientError, setClientError] = useState('');
  const [clientSuccess, setClientSuccess] = useState('');
  const [savingClient, setSavingClient] = useState(false);
  
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentFormData, setPaymentFormData] = useState({
    reservationId: '',
    reservationData: null,
    totalValue: '',
    splitBetween: 1
  });
  
  const [formData, setFormData] = useState({
    courtId: '',
    clientId: '',
    date: '',
    time: '',
    customTime: '',
    durationInHours: 1,
    isRecurring: false,
    frequency: 'WEEKLY',
    endDate: ''
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const generateRoundTimeSlots = () => {
    const slots = [];
    for (let hour = 6; hour <= 23; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    return slots;
  };

  const roundTimeSlots = generateRoundTimeSlots();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [reservationsRes, courtsRes, clientsRes] = await Promise.all([
        reservationService.getAll(),
        courtService.getAll(),
        clientService.getAll()
      ]);

      setReservations(reservationsRes.data);
      setCourts(courtsRes.data);
      setClients(clientsRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setError('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const openModal = () => {
    setShowModal(true);
    setError('');
    setUseCustomTime(false);
    resetForm();
  };

  const closeModal = () => {
    setShowModal(false);
    setError('');
    setUseCustomTime(false);
    resetForm();
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleClientInputChange = (e) => {
    const { name, value } = e.target;
    setClientFormData({
      ...clientFormData,
      [name]: value
    });
    if (clientError) setClientError('');
  };

  const openClientModal = () => {
    setShowClientModal(true);
    setClientFormData({
      fullName: '',
      phone: '',
      email: '',
      cpf: ''
    });
    setClientError('');
    setClientSuccess('');
  };

  const closeClientModal = () => {
    if (savingClient) return;
    setShowClientModal(false);
    setClientFormData({
      fullName: '',
      phone: '',
      email: '',
      cpf: ''
    });
    setClientError('');
    setClientSuccess('');
  };

  const handleSaveClient = async (e) => {
    e.preventDefault();
    setClientError('');
    
    if (!clientFormData.fullName || !clientFormData.phone) {
      setClientError('Nome completo e telefone são obrigatórios');
      return;
    }

    setSavingClient(true);

    try {
      const response = await clientService.create(clientFormData);
      const newClient = response.data;
      
      setClients(prev => [...prev, newClient]);
      setFormData(prev => ({
        ...prev,
        clientId: newClient.id
      }));
      
      setClientSuccess('Cliente cadastrado com sucesso!');
      
      setTimeout(() => {
        closeClientModal();
      }, 1500);
      
    } catch (error) {
      console.error('Erro ao cadastrar cliente:', error);
      setClientError(error.response?.data?.error || 'Erro ao cadastrar cliente. Tente novamente.');
    } finally {
      setSavingClient(false);
    }
  };

  const openPaymentModal = async (reservation) => {
    try {
      const tabsResponse = await tabService.getAll();
      const tabs = tabsResponse.data;
      const openTab = tabs.find(t => t.reservationId === reservation.id && t.status === 'OPEN');
      
      if (openTab) {
        setError('Esta reserva possui uma comanda aberta. Feche a comanda antes de finalizar a reserva.');
        setTimeout(() => setError(''), 5000);
        return;
      }

      const court = courts.find(c => c.id === reservation.courtId);
      const courtPrice = court?.pricePerHour || 60;
      const duration = reservation.durationInHours || 1;
      const total = courtPrice * duration;
      
      setPaymentFormData({
        reservationId: reservation.id,
        reservationData: reservation,
        totalValue: total.toFixed(2),
        splitBetween: 1
      });
      setShowPaymentModal(true);
    } catch (error) {
      console.error('Erro ao verificar comandas:', error);
      setError('Erro ao verificar comandas da reserva');
      setTimeout(() => setError(''), 5000);
    }
  };

  const closePaymentModal = () => {
    setShowPaymentModal(false);
    setPaymentFormData({
      reservationId: '',
      reservationData: null,
      totalValue: '',
      splitBetween: 1
    });
  };

  const handlePaymentInputChange = (e) => {
    const { name, value } = e.target;
    setPaymentFormData({
      ...paymentFormData,
      [name]: value
    });
  };

  const handleConfirmPayment = async () => {
    try {
      await reservationService.cancel(paymentFormData.reservationId);
      setSuccess('Pagamento confirmado! Reserva finalizada.');
      closePaymentModal();
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Erro ao confirmar pagamento:', error);
      
      if (error.response?.data?.error?.includes('comanda aberta')) {
        setError('Esta reserva possui uma comanda aberta. Feche a comanda antes de finalizar.');
      } else {
        setError(error.response?.data?.error || 'Erro ao finalizar reserva');
      }
      
      setTimeout(() => setError(''), 5000);
    }
  };

  const calculatePerPerson = () => {
    const total = parseFloat(paymentFormData.totalValue) || 0;
    const split = parseInt(paymentFormData.splitBetween) || 1;
    return (total / split).toFixed(2);
  };

  const validateTime = (time) => {
    if (!time) return false;
    
    const [hours, minutes] = time.split(':').map(Number);
    
    if (hours < 6 || hours > 23) {
      return false;
    }
    
    if (hours === 23 && minutes > 30) {
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.courtId) {
      setError('Selecione uma quadra');
      return;
    }

    if (!formData.clientId) {
      setError('Selecione um cliente');
      return;
    }

    if (!formData.date) {
      setError('Selecione a data');
      return;
    }

    const finalTime = useCustomTime ? formData.customTime : formData.time;

    if (!finalTime) {
      setError('Selecione o horário');
      return;
    }

    if (!validateTime(finalTime)) {
      setError('O horário deve estar entre 06:00 e 23:30');
      return;
    }

    const dateTimeString = `${formData.date}T${finalTime}`;
    const reservationDateTime = new Date(dateTimeString);
    const now = new Date();

    if (reservationDateTime <= now) {
      setError('Não é possível criar reserva para um horário que já passou');
      return;
    }

    if (!formData.durationInHours || formData.durationInHours < 1) {
      setError('A duração deve ser de pelo menos 1 hora');
      return;
    }

    try {
      const startDateTime = new Date(dateTimeString);
      const duration = parseFloat(formData.durationInHours);
      const endDateTime = addHours(startDateTime, duration);

      const reservationData = {
        courtId: formData.courtId,
        clientId: formData.clientId,
        startTime: startDateTime.toISOString(),
        durationInHours: duration, // O backend calcula o endTime
        isRecurring: formData.isRecurring
      };

      if (formData.isRecurring) {
        reservationData.frequency = formData.frequency;
        
        if (formData.endDate) {
          reservationData.endDate = new Date(formData.endDate).toISOString();
        }
      }

      // O backend agora lida com a criação e sincronização com o Google Calendar
      await reservationService.create(reservationData);
      setSuccess('Reserva criada com sucesso!');
      closeModal();
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Erro ao criar reserva:', error);
      setError(error.response?.data?.error || 'Erro ao criar reserva. Verifique os dados e tente novamente.');
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Deseja cancelar esta reserva?')) {
      return;
    }

    try {
      await reservationService.cancel(id);
      setSuccess('Reserva cancelada com sucesso!');
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      if (error.response?.data?.error?.includes('comanda aberta')) {
        setError('Esta reserva possui uma comanda aberta. Feche a comanda antes de cancelar.');
      } else {
        setError(error.response?.data?.error || 'Erro ao cancelar reserva');
      }
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleCancelRecurringGroup = async (groupId) => {
    if (!window.confirm('Deseja cancelar todas as reservas futuras deste grupo?')) {
      return;
    }

    try {
      await reservationService.cancelRecurringGroup(groupId);
      setSuccess('Grupo de reservas cancelado com sucesso!');
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.response?.data?.error || 'Erro ao cancelar grupo de reservas');
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleCancelMultiple = async () => {
    if (selectedReservations.length === 0) {
      setError('Selecione ao menos uma reserva');
      setTimeout(() => setError(''), 3000);
      return;
    }

    if (!window.confirm(`Deseja cancelar ${selectedReservations.length} reserva(s) selecionada(s)?`)) {
      return;
    }

    try {
      await reservationService.cancelMultiple(selectedReservations);
      setSuccess(`${selectedReservations.length} reserva(s) cancelada(s) com sucesso!`);
      setSelectedReservations([]);
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.response?.data?.error || 'Erro ao cancelar reservas');
      setTimeout(() => setError(''), 5000);
    }
  };

  const toggleSelectReservation = (id) => {
    setSelectedReservations(prev => 
      prev.includes(id) 
        ? prev.filter(resId => resId !== id)
        : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const activeReservations = filteredReservations
      .filter(r => r.status !== 'CANCELLED')
      .map(r => r.id);
    
    if (selectedReservations.length === activeReservations.length) {
      setSelectedReservations([]);
    } else {
      setSelectedReservations(activeReservations);
    }
  };

  const resetForm = () => {
    setFormData({
      courtId: '',
      clientId: '',
      date: '',
      time: '',
      customTime: '',
      durationInHours: 1,
      isRecurring: false,
      frequency: 'WEEKLY',
      endDate: ''
    });
  };

  const getFilteredReservations = () => {
    let filtered = reservations;

    if (selectedCourt) {
      filtered = filtered.filter(r => r.courtId === selectedCourt);
    }

    if (selectedDate) {
      filtered = filtered.filter(r => {
        const reservationDate = format(parseISO(r.startTime), 'yyyy-MM-dd');
        return reservationDate === selectedDate;
      });
    }

    if (selectedStatus) {
      filtered = filtered.filter(r => r.status === selectedStatus);
    }

    return filtered.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
  };

  const getCourtName = (courtId) => {
    const court = courts.find(c => c.id === courtId);
    return court ? court.name : 'Quadra não encontrada';
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.fullName : 'Cliente não encontrado';
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      CONFIRMED: { label: 'Confirmada', color: '#34a853' },
      PENDING: { label: 'Pendente', color: '#fbbc04' },
      CANCELLED: { label: 'Cancelada', color: '#ea4335' }
    };

    const config = statusConfig[status] || statusConfig.PENDING;

    return (
      <span style={{
        padding: '0.25rem 0.75rem',
        borderRadius: '12px',
        fontSize: '0.75rem',
        fontWeight: '600',
        backgroundColor: `${config.color}15`,
        color: config.color,
        display: 'inline-block'
      }}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="container">
          <div style={{ 
            textAlign: 'center', 
            padding: '4rem 1rem',
            color: '#5f6368' 
          }}>
            Carregando reservas...
          </div>
        </div>
      </>
    );
  }

  const filteredReservations = getFilteredReservations();
  const activeReservationsCount = filteredReservations.filter(r => r.status !== 'CANCELLED').length;

  return (
    <>
      <Header />
      <div className="container" style={{ padding: '2rem 1rem' }}>
        
        <div style={{ 
          background: 'linear-gradient(135deg, #f8fafb 0%, #ffffff 100%)',
          padding: '2rem',
          borderRadius: '16px',
          marginBottom: '2rem',
          border: '1px solid var(--border-color)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
        }}>
          <div className="flex-between" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: 'linear-gradient(135deg, #34a853, #2d8e47)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white'
                }}>
                  <Calendar size={26} />
                </div>
                <div>
                  <h1 style={{ 
                    fontSize: '1.75rem', 
                    fontWeight: '700',
                    color: 'var(--text-primary)',
                    marginBottom: '0.25rem'
                  }}>
                    Gestão de Reservas
                  </h1>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    {filteredReservations.length} {filteredReservations.length === 1 ? 'reserva encontrada' : 'reservas encontradas'}
                  </p>
                </div>
              </div>
            </div>

            <button 
              className="btn btn-primary"
              onClick={openModal}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.875rem 1.5rem',
                fontSize: '0.95rem',
                borderRadius: '10px'
              }}
            >
              <PlusCircle size={20} />
              Nova Reserva
            </button>
          </div>
        </div>

        {success && (
          <div style={{
            background: '#d4edda',
            border: '1px solid #c3e6cb',
            borderRadius: '12px',
            padding: '1rem 1.5rem',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            color: '#155724'
          }}>
            <CheckCircle size={20} />
            <span>{success}</span>
          </div>
        )}

        {error && !showModal && (
          <div style={{
            background: '#f8d7da',
            border: '1px solid #f5c6cb',
            borderRadius: '12px',
            padding: '1rem 1.5rem',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            color: '#721c24'
          }}>
            <X size={20} />
            <span>{error}</span>
          </div>
        )}

        <div style={{ 
          background: 'white',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '2rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          border: '1px solid var(--border-color)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '1.5rem'
          }}>
            <Filter size={20} style={{ color: '#34a853' }} />
            <h3 style={{
              margin: 0,
              fontSize: '1.125rem',
              fontWeight: '600',
              color: 'var(--text-primary)'
            }}>
              Filtrar Reservas
            </h3>
          </div>

          <div style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1.25rem'
          }}>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label htmlFor="filterCourt" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.75rem',
                fontWeight: '600',
                color: 'var(--text-primary)'
              }}>
                <MapPin size={16} style={{ color: '#34a853' }} />
                Quadra
              </label>
              <select
                id="filterCourt"
                value={selectedCourt}
                onChange={(e) => setSelectedCourt(e.target.value)}
                style={{
                  padding: '0.875rem',
                  borderRadius: '10px',
                  border: '2px solid var(--border-color)',
                  fontSize: '0.95rem',
                  transition: 'all 0.2s',
                  background: 'white',
                  width: '100%'
                }}
              >
                <option value="">Todas as quadras</option>
                {courts.map((court) => (
                  <option key={court.id} value={court.id}>
                    {court.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="input-group" style={{ marginBottom: 0 }}>
              <label htmlFor="filterDate" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.75rem',
                fontWeight: '600',
                color: 'var(--text-primary)'
              }}>
                <Calendar size={16} style={{ color: '#34a853' }} />
                Data
              </label>
              <input
                type="date"
                id="filterDate"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{
                  padding: '0.875rem',
                  borderRadius: '10px',
                  border: '2px solid var(--border-color)',
                  fontSize: '0.95rem',
                  transition: 'all 0.2s',
                  width: '100%'
                }}
              />
            </div>

            <div className="input-group" style={{ marginBottom: 0 }}>
              <label htmlFor="filterStatus" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.75rem',
                fontWeight: '600',
                color: 'var(--text-primary)'
              }}>
                <CheckCircle size={16} style={{ color: '#34a853' }} />
                Status
              </label>
              <select
                id="filterStatus"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                style={{
                  padding: '0.875rem',
                  borderRadius: '10px',
                  border: '2px solid var(--border-color)',
                  fontSize: '0.95rem',
                  transition: 'all 0.2s',
                  background: 'white',
                  width: '100%'
                }}
              >
                <option value="">Todos os status</option>
                <option value="CONFIRMED">Confirmadas</option>
                <option value="PENDING">Pendentes</option>
                <option value="CANCELLED">Canceladas</option>
              </select>
            </div>
          </div>

          {(selectedCourt || selectedDate || selectedStatus) && (
            <button
              onClick={() => {
                setSelectedCourt('');
                setSelectedDate('');
                setSelectedStatus('CONFIRMED');
              }}
              style={{
                marginTop: '1rem',
                padding: '0.625rem 1.25rem',
                background: 'transparent',
                border: '2px solid #34a853',
                color: '#34a853',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.9rem',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.target.style.background = '#34a853';
                e.target.style.color = 'white';
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'transparent';
                e.target.style.color = '#34a853';
              }}
            >
              Limpar Filtros
            </button>
          )}
        </div>

        {activeReservationsCount > 0 && (
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '1rem 1.5rem',
            marginBottom: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <button
              onClick={toggleSelectAll}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.625rem 1.25rem',
                background: 'transparent',
                border: '2px solid #34a853',
                color: '#34a853',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.9rem',
                transition: 'all 0.2s'
              }}
            >
              {selectedReservations.length === activeReservationsCount ? (
                <>
                  <CheckSquare size={18} />
                  Desmarcar Todas
                </>
              ) : (
                <>
                  <Square size={18} />
                  Selecionar Todas
                </>
              )}
            </button>

            {selectedReservations.length > 0 && (
              <button
                onClick={handleCancelMultiple}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.625rem 1.25rem',
                  background: '#ea4335',
                  border: 'none',
                  color: 'white',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.target.style.background = '#d33426'}
                onMouseOut={(e) => e.target.style.background = '#ea4335'}
              >
                <Trash2 size={18} />
                Cancelar Selecionadas ({selectedReservations.length})
              </button>
            )}
          </div>
        )}

        <div style={{
          display: 'grid',
          gap: '1rem'
        }}>
          {filteredReservations.length === 0 ? (
            <div style={{
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              padding: '3rem',
              textAlign: 'center',
              color: '#5f6368'
            }}>
              <Calendar size={48} style={{ 
                color: '#dadce0',
                marginBottom: '1rem'
              }} />
              <p>Nenhuma reserva encontrada</p>
            </div>
          ) : (
            filteredReservations.map(reservation => (
              <div
                key={reservation.id}
                style={{
                  background: 'white',
                  borderRadius: '12px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  padding: '1.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '1rem',
                  flexWrap: 'wrap',
                  transition: 'all 0.2s ease',
                  border: selectedReservations.includes(reservation.id) 
                    ? '2px solid #34a853' 
                    : '1px solid #f1f3f4',
                  opacity: reservation.status === 'CANCELLED' ? 0.6 : 1
                }}
              >
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  gap: '1.5rem',
                  flex: 1,
                  minWidth: '250px'
                }}>
                  {reservation.status !== 'CANCELLED' && (
                    <button
                      onClick={() => toggleSelectReservation(reservation.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '0.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: selectedReservations.includes(reservation.id) ? '#34a853' : '#5f6368',
                        transition: 'color 0.2s'
                      }}
                    >
                      {selectedReservations.includes(reservation.id) ? (
                        <CheckSquare size={24} />
                      ) : (
                        <Square size={24} />
                      )}
                    </button>
                  )}

                  <div style={{ flex: 1 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      marginBottom: '1rem'
                    }}>
                      <MapPin size={20} style={{ color: '#34a853' }} />
                      <h3 style={{
                        margin: 0,
                        fontSize: '1.125rem',
                        fontWeight: '600',
                        color: '#202124'
                      }}>
                        {getCourtName(reservation.courtId)}
                      </h3>
                      {reservation.googleCalendarEventId ? (
                        <span title="Sincronizado com Google Calendar" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginLeft: '0.5rem' }}>
                          <CheckCircle size={16} className="text-green-500" />
                          <span style={{ fontSize: '0.75rem', color: '#10b981' }}>Sync</span>
                        </span>
                      ) : (
                        <span title="Não sincronizado com Google Calendar" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginLeft: '0.5rem' }}>
                          <XCircle size={16} className="text-red-500" />
                          <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>No Sync</span>
                        </span>
                      )}
                      {reservation.isRecurring && (
                        <RefreshCw size={16} style={{ color: '#fbbc04' }} />
                      )}
                    </div>

                    <div style={{
                      display: 'grid',
                      gap: '0.5rem'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.875rem',
                        color: '#5f6368'
                      }}>
                        <User size={16} />
                        <span>{getClientName(reservation.clientId)}</span>
                      </div>

                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.875rem',
                        color: '#5f6368'
                      }}>
                        <Calendar size={16} />
                        <span>
                          {format(parseISO(reservation.startTime), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </span>
                      </div>

                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.875rem',
                        color: '#5f6368'
                      }}>
                        <Clock size={16} />
                        <span>
                          {format(parseISO(reservation.startTime), 'HH:mm')} - {format(parseISO(reservation.endTime), 'HH:mm')}
                        </span>
                      </div>

                      <div style={{ marginTop: '0.5rem' }}>
                        {getStatusBadge(reservation.status)}
                      </div>
                    </div>
                  </div>
                </div>

                {reservation.status !== 'CANCELLED' && (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    minWidth: '180px'
                  }}>
                    {reservation.isRecurring && reservation.recurringGroupId && (
                      <button
                        onClick={() => handleCancelRecurringGroup(reservation.recurringGroupId)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem',
                          padding: '0.625rem 1rem',
                          background: 'white',
                          border: '2px solid #fbbc04',
                          color: '#fbbc04',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: '0.875rem',
                          transition: 'all 0.2s',
                          width: '100%'
                        }}
                        onMouseOver={(e) => {
                          e.target.style.background = '#fbbc04';
                          e.target.style.color = 'white';
                        }}
                        onMouseOut={(e) => {
                          e.target.style.background = 'white';
                          e.target.style.color = '#fbbc04';
                        }}
                      >
                        <RefreshCw size={16} />
                        Cancelar Grupo
                      </button>
                    )}
                    <button
                      onClick={() => openPaymentModal(reservation)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        padding: '0.625rem 1rem',
                        background: 'white',
                        border: '2px solid #34a853',
                        color: '#34a853',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '0.875rem',
                        transition: 'all 0.2s',
                        width: '100%'
                      }}
                      onMouseOver={(e) => {
                        e.target.style.background = '#34a853';
                        e.target.style.color = 'white';
                      }}
                      onMouseOut={(e) => {
                        e.target.style.background = 'white';
                        e.target.style.color = '#34a853';
                      }}
                    >
                      <DollarSign size={16} />
                      Finalizar Reserva
                    </button>
                    <button
                      onClick={() => handleCancel(reservation.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        padding: '0.625rem 1rem',
                        background: 'white',
                        border: '2px solid #ea4335',
                        color: '#ea4335',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '0.875rem',
                        transition: 'all 0.2s',
                        width: '100%'
                      }}
                      onMouseOver={(e) => {
                        e.target.style.background = '#ea4335';
                        e.target.style.color = 'white';
                      }}
                      onMouseOut={(e) => {
                        e.target.style.background = 'white';
                        e.target.style.color = '#ea4335';
                      }}
                    >
                      <Trash2 size={16} />
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {showModal && (
        <div 
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
          onClick={closeModal}
        >
          <div 
            style={{
              background: 'white',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '600px',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              padding: '2rem',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h2 style={{
                margin: 0,
                fontSize: '1.5rem',
                fontWeight: '700',
                color: 'var(--text-primary)'
              }}>
                Nova Reserva
              </h2>
              <button
                onClick={closeModal}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#5f6368',
                  borderRadius: '8px',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.target.style.background = '#f1f3f4'}
                onMouseOut={(e) => e.target.style.background = 'none'}
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '2rem' }}>
              {error && (
                <div style={{
                  background: '#f8d7da',
                  border: '1px solid #f5c6cb',
                  borderRadius: '12px',
                  padding: '1rem',
                  marginBottom: '1.5rem',
                  color: '#721c24',
                  fontSize: '0.9rem'
                }}>
                  {error}
                </div>
              )}

              <div className="input-group">
                <label htmlFor="courtId">
                  <MapPin size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                  Quadra
                </label>
                <select
                  id="courtId"
                  name="courtId"
                  value={formData.courtId}
                  onChange={handleInputChange}
                  required
                  style={{
                    padding: '0.875rem',
                    borderRadius: '10px',
                    border: '2px solid var(--border-color)',
                    fontSize: '0.95rem',
                    width: '100%'
                  }}
                >
                  <option value="">Selecione uma quadra</option>
                  {courts.map((court) => (
                    <option key={court.id} value={court.id}>
                      {court.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label htmlFor="clientId">
                  <User size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                  Cliente
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select
                    id="clientId"
                    name="clientId"
                    value={formData.clientId}
                    onChange={handleInputChange}
                    required
                    style={{
                      flex: 1,
                      padding: '0.875rem',
                      borderRadius: '10px',
                      border: '2px solid var(--border-color)',
                      fontSize: '0.95rem'
                    }}
                  >
                    <option value="">Selecione um cliente</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.fullName}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={openClientModal}
                    style={{
                      padding: '0 1rem',
                      borderRadius: '10px',
                      border: '2px solid #34a853',
                      background: 'white',
                      color: '#34a853',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = '#34a853';
                      e.target.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = 'white';
                      e.target.style.color = '#34a853';
                    }}
                  >
                    <UserPlus size={18} />
                    Novo
                  </button>
                </div>
              </div>

              <div className="grid grid-2" style={{ gap: '1rem' }}>
                <div className="input-group">
                  <label htmlFor="date">
                    <Calendar size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                    Data
                  </label>
                  <input
                    type="date"
                    id="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    required
                    style={{
                      padding: '0.875rem',
                      borderRadius: '10px',
                      border: '2px solid var(--border-color)',
                      fontSize: '0.95rem',
                      width: '100%'
                    }}
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="durationInHours">
                    <Clock size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                    Duração (horas)
                  </label>
                  <input
                    type="number"
                    id="durationInHours"
                    name="durationInHours"
                    value={formData.durationInHours}
                    onChange={handleInputChange}
                    min="0.5"
                    max="12"
                    step="0.5"
                    required
                    style={{
                      padding: '0.875rem',
                      borderRadius: '10px',
                      border: '2px solid var(--border-color)',
                      fontSize: '0.95rem',
                      width: '100%'
                    }}
                  />
                </div>
              </div>

              <div className="input-group">
                <label style={{ marginBottom: '0.75rem', display: 'block' }}>
                  <Clock size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                  Horário
                </label>
                
                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setUseCustomTime(false)}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      border: '2px solid',
                      borderColor: !useCustomTime ? '#34a853' : 'var(--border-color)',
                      background: !useCustomTime ? '#34a85310' : 'white',
                      color: !useCustomTime ? '#34a853' : '#5f6368',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '0.875rem',
                      transition: 'all 0.2s'
                    }}
                  >
                    Horário Redondo
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseCustomTime(true)}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      border: '2px solid',
                      borderColor: useCustomTime ? '#34a853' : 'var(--border-color)',
                      background: useCustomTime ? '#34a85310' : 'white',
                      color: useCustomTime ? '#34a853' : '#5f6368',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '0.875rem',
                      transition: 'all 0.2s'
                    }}
                  >
                    Horário Personalizado
                  </button>
                </div>

                {!useCustomTime ? (
                  <select
                    id="time"
                    name="time"
                    value={formData.time}
                    onChange={handleInputChange}
                    required={!useCustomTime}
                    style={{
                      padding: '0.875rem',
                      borderRadius: '10px',
                      border: '2px solid var(--border-color)',
                      fontSize: '0.95rem',
                      width: '100%'
                    }}
                  >
                    <option value="">Selecione o horário</option>
                    {roundTimeSlots.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="time"
                    id="customTime"
                    name="customTime"
                    value={formData.customTime}
                    onChange={handleInputChange}
                    required={useCustomTime}
                    style={{
                      padding: '0.875rem',
                      borderRadius: '10px',
                      border: '2px solid var(--border-color)',
                      fontSize: '0.95rem',
                      width: '100%'
                    }}
                  />
                )}
              </div>

              <div className="input-group">
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}>
                  <input
                    type="checkbox"
                    name="isRecurring"
                    checked={formData.isRecurring}
                    onChange={handleInputChange}
                    style={{
                      width: '18px',
                      height: '18px',
                      cursor: 'pointer'
                    }}
                  />
                  <RefreshCw size={16} />
                  Reserva Recorrente
                </label>
              </div>

              {formData.isRecurring && (
                <div className="grid grid-2" style={{ gap: '1rem' }}>
                  <div className="input-group">
                    <label htmlFor="frequency">Frequência</label>
                    <select
                      id="frequency"
                      name="frequency"
                      value={formData.frequency}
                      onChange={handleInputChange}
                      style={{
                        padding: '0.875rem',
                        borderRadius: '10px',
                        border: '2px solid var(--border-color)',
                        fontSize: '0.95rem',
                        width: '100%'
                      }}
                    >
                      <option value="WEEKLY">Semanal</option>
                      <option value="MONTHLY">Mensal</option>
                    </select>
                  </div>

                  <div className="input-group">
                    <label htmlFor="endDate">Data Final</label>
                    <input
                      type="date"
                      id="endDate"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleInputChange}
                      required={formData.isRecurring}
                      style={{
                        padding: '0.875rem',
                        borderRadius: '10px',
                        border: '2px solid var(--border-color)',
                        fontSize: '0.95rem',
                        width: '100%'
                      }}
                    />
                  </div>
                </div>
              )}

              <div style={{
                display: 'flex',
                gap: '1rem',
                marginTop: '2rem'
              }}>
                <button
                  type="button"
                  onClick={closeModal}
                  style={{
                    flex: 1,
                    padding: '0.875rem',
                    borderRadius: '10px',
                    border: '2px solid var(--border-color)',
                    background: 'white',
                    color: '#5f6368',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '0.95rem',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.background = '#f1f3f4'}
                  onMouseOut={(e) => e.target.style.background = 'white'}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '0.875rem',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#34a853',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '0.95rem',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.background = '#2d8e47'}
                  onMouseOut={(e) => e.target.style.background = '#34a853'}
                >
                  Criar Reserva
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showClientModal && (
        <div 
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
            zIndex: 1100,
            padding: '1rem'
          }}
          onClick={closeClientModal}
        >
          <div 
            style={{
              background: 'white',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '500px',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              color: 'white',
              padding: '2rem',
              borderRadius: '16px 16px 0 0',
              position: 'relative'
            }}>
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
                  <UserPlus size={26} />
                </div>
                <div>
                  <h2 style={{ marginBottom: '0.25rem', fontSize: '1.5rem', fontWeight: '700' }}>Cadastro Rápido</h2>
                  <p style={{ opacity: 0.9, fontSize: '0.875rem', margin: 0 }}>Adicione um novo cliente</p>
                </div>
              </div>
              <button 
                onClick={closeClientModal}
                disabled={savingClient}
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
                  cursor: savingClient ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  color: 'white',
                  opacity: savingClient ? 0.5 : 1
                }}
                onMouseEnter={(e) => !savingClient && (e.target.style.background = 'rgba(255, 255, 255, 0.3)')}
                onMouseLeave={(e) => !savingClient && (e.target.style.background = 'rgba(255, 255, 255, 0.2)')}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '2rem', background: 'white' }}>
              {clientError && (
                <div style={{
                  background: '#f8d7da',
                  border: '1px solid #f5c6cb',
                  borderRadius: '12px',
                  padding: '1rem',
                  marginBottom: '1.5rem',
                  color: '#721c24',
                  fontSize: '0.9rem'
                }}>
                  {clientError}
                </div>
              )}

              {clientSuccess && (
                <div style={{
                  background: '#d4edda',
                  border: '1px solid #c3e6cb',
                  borderRadius: '12px',
                  padding: '1rem',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: '#155724',
                  fontSize: '0.9rem'
                }}>
                  <CheckCircle size={20} />
                  {clientSuccess}
                </div>
              )}

              <form onSubmit={handleSaveClient}>
                <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                  <label htmlFor="fullName" style={{ fontWeight: '600', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <User size={16} style={{ color: '#3b82f6' }} />
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    value={clientFormData.fullName}
                    onChange={handleClientInputChange}
                    placeholder="Ex: João da Silva"
                    required
                    disabled={savingClient}
                    style={{
                      padding: '1rem',
                      borderRadius: '12px',
                      border: '2px solid var(--border-color)',
                      fontSize: '1rem',
                      width: '100%',
                      transition: 'all 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                  />
                </div>

                <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                  <label htmlFor="phone" style={{ fontWeight: '600', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Phone size={16} style={{ color: '#3b82f6' }} />
                    Telefone *
                  </label>
                  <MaskedInput
                    type="phone"
                    id="phone"
                    name="phone"
                    value={clientFormData.phone}
                    onChange={handleClientInputChange}
                    placeholder="(XX) XXXXX-XXXX"
                    required
                    disabled={savingClient}
                    style={{
                      padding: '1rem',
                      borderRadius: '12px',
                      border: '2px solid var(--border-color)',
                      fontSize: '1rem',
                      width: '100%',
                      transition: 'all 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                  />
                </div>

                <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                  <label htmlFor="email" style={{ fontWeight: '600', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Mail size={16} style={{ color: '#3b82f6' }} />
                    Email (opcional)
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={clientFormData.email}
                    onChange={handleClientInputChange}
                    placeholder="email@exemplo.com"
                    disabled={savingClient}
                    style={{
                      padding: '1rem',
                      borderRadius: '12px',
                      border: '2px solid var(--border-color)',
                      fontSize: '1rem',
                      width: '100%',
                      transition: 'all 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                  />
                </div>

                <div className="input-group" style={{ marginBottom: '2rem' }}>
                  <label htmlFor="cpf" style={{ fontWeight: '600', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileText size={16} style={{ color: '#3b82f6' }} />
                    CPF (opcional)
                  </label>
                  <MaskedInput
                    type="cpf"
                    id="cpf"
                    name="cpf"
                    value={clientFormData.cpf}
                    onChange={handleClientInputChange}
                    placeholder="XXX.XXX.XXX-XX"
                    disabled={savingClient}
                    style={{
                      padding: '1rem',
                      borderRadius: '12px',
                      border: '2px solid var(--border-color)',
                      fontSize: '1rem',
                      width: '100%',
                      transition: 'all 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button 
                    type="button" 
                    onClick={closeClientModal}
                    disabled={savingClient}
                    style={{
                      flex: 1,
                      padding: '1rem',
                      borderRadius: '12px',
                      border: '2px solid var(--border-color)',
                      background: 'white',
                      color: '#5f6368',
                      cursor: savingClient ? 'not-allowed' : 'pointer',
                      fontWeight: '600',
                      fontSize: '1rem',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => !savingClient && (e.target.style.background = '#f1f3f4')}
                    onMouseOut={(e) => !savingClient && (e.target.style.background = 'white')}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    disabled={savingClient}
                    style={{
                      flex: 1,
                      padding: '1rem',
                      borderRadius: '12px',
                      border: 'none',
                      background: '#3b82f6',
                      color: 'white',
                      cursor: savingClient ? 'not-allowed' : 'pointer',
                      fontWeight: '600',
                      fontSize: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.2s',
                      opacity: savingClient ? 0.7 : 1
                    }}
                    onMouseOver={(e) => !savingClient && (e.target.style.background = '#2563eb')}
                    onMouseOut={(e) => !savingClient && (e.target.style.background = '#3b82f6')}
                  >
                    {savingClient ? (
                      <>
                        <div className="loading" style={{ width: '18px', height: '18px', borderWidth: '2px' }}></div>
                        Salvando...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={20} />
                        Salvar Cliente
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showPaymentModal && (
        <div 
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
            zIndex: 1100,
            padding: '1rem'
          }}
          onClick={closePaymentModal}
        >
          <div 
            style={{
              background: 'white',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '500px',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              background: 'linear-gradient(135deg, #34a853, #2d8e47)',
              color: 'white',
              padding: '2rem',
              borderRadius: '16px 16px 0 0',
              position: 'relative'
            }}>
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
                  <DollarSign size={26} />
                </div>
                <div>
                  <h2 style={{ marginBottom: '0.25rem', fontSize: '1.5rem', fontWeight: '700' }}>Finalizar Reserva</h2>
                  <p style={{ opacity: 0.9, fontSize: '0.875rem', margin: 0 }}>Confirme o pagamento</p>
                </div>
              </div>
              <button 
                onClick={closePaymentModal}
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

            <div style={{ padding: '2rem' }}>
              {paymentFormData.reservationData && (
                <div style={{
                  background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
                  padding: '1.5rem',
                  borderRadius: '12px',
                  marginBottom: '1.5rem',
                  border: '1px solid #bbf7d0'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#166534', fontWeight: '600' }}>
                    <MapPin size={16} />
                    Quadra: {courts.find(c => c.id === paymentFormData.reservationData.courtId)?.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#166534', fontSize: '0.875rem' }}>
                    <Clock size={16} />
                    {format(parseISO(paymentFormData.reservationData.startTime), 'HH:mm')} - {format(parseISO(paymentFormData.reservationData.endTime), 'HH:mm')}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#166534', fontSize: '0.875rem' }}>
                    <Calendar size={16} />
                    Duração: {paymentFormData.reservationData.durationInHours}h
                  </div>
                </div>
              )}

              <div style={{
                background: 'linear-gradient(135deg, #34a853, #2d8e47)',
                padding: '2rem',
                borderRadius: '16px',
                textAlign: 'center',
                marginBottom: '2rem',
                color: 'white'
              }}>
                <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.5rem' }}>
                  Valor Total
                </div>
                <div style={{ fontSize: '2.5rem', fontWeight: '700' }}>
                  R$ {paymentFormData.totalValue}
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontWeight: '600', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <DollarSign size={16} style={{ color: '#34a853' }} />
                  Valor da Reserva (editar se necessário)
                </label>
                <input
                  type="number"
                  name="totalValue"
                  value={paymentFormData.totalValue}
                  onChange={handlePaymentInputChange}
                  onKeyPress={(e) => {
                    if (e.key === ',') {
                      e.preventDefault();
                    }
                  }}
                  step="0.01"
                  min="0"
                  style={{
                    padding: '1rem',
                    borderRadius: '12px',
                    border: '2px solid var(--border-color)',
                    fontSize: '1.125rem',
                    width: '100%',
                    fontWeight: '600',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#34a853'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                />
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <label style={{ fontWeight: '600', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Users size={16} style={{ color: '#34a853' }} />
                  Dividir entre quantos jogadores?
                </label>
                <input
                  type="number"
                  name="splitBetween"
                  value={paymentFormData.splitBetween}
                  onChange={handlePaymentInputChange}
                  onKeyPress={(e) => {
                    if (e.key === ',' || e.key === '.') {
                      e.preventDefault();
                    }
                  }}
                  min="1"
                  max="20"
                  style={{
                    padding: '1rem',
                    borderRadius: '12px',
                    border: '2px solid var(--border-color)',
                    fontSize: '1.125rem',
                    width: '100%',
                    fontWeight: '600',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#34a853'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                />
              </div>

              {paymentFormData.splitBetween > 1 && (
                <div style={{
                  background: '#f0f9ff',
                  padding: '1.5rem',
                  borderRadius: '12px',
                  marginBottom: '2rem',
                  textAlign: 'center',
                  border: '1px solid #bae6fd'
                }}>
                  <div style={{ fontSize: '0.875rem', color: '#0369a1', marginBottom: '0.5rem' }}>
                    Valor por pessoa
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#0369a1' }}>
                    R$ {calculatePerPerson()}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#0369a1', marginTop: '0.5rem' }}>
                    ({paymentFormData.splitBetween} jogadores)
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  type="button" 
                  onClick={closePaymentModal}
                  style={{
                    flex: 1,
                    padding: '1rem',
                    borderRadius: '12px',
                    border: '2px solid var(--border-color)',
                    background: 'white',
                    color: '#5f6368',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '1rem',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.background = '#f1f3f4'}
                  onMouseOut={(e) => e.target.style.background = 'white'}
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleConfirmPayment}
                  style={{
                    flex: 1,
                    padding: '1rem',
                    borderRadius: '12px',
                    border: 'none',
                    background: '#34a853',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.background = '#2d8e47'}
                  onMouseOut={(e) => e.target.style.background = '#34a853'}
                >
                  <CheckCircle size={20} />
                  Confirmar Pagamento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Reservations;