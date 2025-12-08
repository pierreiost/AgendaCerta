import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import MaskedInput from '../components/MaskedInput';
import { dashboardService, courtService, clientService, reservationService } from '../services/api';
import { 
  MapPin, 
  Users, 
  CalendarIcon, 
  Receipt, 
  PlusCircle, 
  Package,
  X,
  Clock,
  Calendar,
  RefreshCw,
  Info,
  Edit3,
  Eye,
  EyeOff,
  User,
  UserPlus,
  Phone,
  Mail,
  FileText,
  CheckCircle
} from 'lucide-react';
import { format, addHours, parseISO, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [courts, setCourts] = useState([]);
  const [clients, setClients] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [useCustomTime, setUseCustomTime] = useState(false);
  const [showPastReservations, setShowPastReservations] = useState(true);

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

  // Estados para cadastro rápido de cliente
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

  const generateRoundTimeSlots = () => {
    const slots = [];
    for (let hour = 6; hour <= 23; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    return slots;
  };

  const roundTimeSlots = generateRoundTimeSlots();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [statsRes, courtsRes, reservationsRes, clientsRes] = await Promise.all([
        dashboardService.getOverview(),
        courtService.getAll(),
        reservationService.getAll(),
        clientService.getAll()
      ]);

      setStats(statsRes.data);
      setCourts(courtsRes.data);
      setReservations(reservationsRes.data);
      setClients(clientsRes.data);

    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
      setError('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  };

  const calendarEvents = useMemo(() => {
    const today = startOfDay(new Date());
    
    return reservations
      .filter(res => {
        if (res.status === 'CANCELLED') return false;
        
        if (!showPastReservations) {
          const eventDate = startOfDay(new Date(res.startTime));
          return !isBefore(eventDate, today);
        }
        
        return true;
      })
      .map(res => ({
        id: res.id,
        title: `${res.client.fullName} (${res.court.name})`,
        start: res.startTime,
        end: res.endTime,
        className: res.status === 'PENDING' ? 'event-pending' : 'event-confirmed'
      }));
  }, [reservations, showPastReservations]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'isRecurring') {
      setFormData({
        ...formData,
        [name]: checked,
        frequency: checked ? 'WEEKLY' : 'WEEKLY',
        endDate: checked ? formData.endDate : ''
      });
    } else {
      setFormData({
        ...formData,
        [name]: type === 'checkbox' ? checked : value
      });
    }
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

  const closeModal = () => {
    setShowModal(false);
    setUseCustomTime(false);
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
    setError('');
  };

  const handleDateClick = (arg) => {
    const clickedDate = new Date(arg.date);
    
    const formatDateForInput = (date) => {
      const yyyy = date.getFullYear();
      const MM = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      return `${yyyy}-${MM}-${dd}`;
    };

    // Extrair horário do clique
    const hours = clickedDate.getHours();
    const minutes = clickedDate.getMinutes();
    const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

    setFormData({
      ...formData,
      date: formatDateForInput(clickedDate),
      time: timeString,
      customTime: '',
      durationInHours: 1
    });
    setUseCustomTime(false);
    setShowModal(true);
    setError('');
  };

  const handleEventClick = (info) => {
    navigate('/reservations');
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

    // Validar se o horário já passou PRIMEIRO
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
        endTime: endDateTime.toISOString(),
        durationInHours: duration,
        isRecurring: formData.isRecurring
      };

      if (formData.isRecurring) {
        reservationData.frequency = formData.frequency;
        
        if (formData.endDate) {
          reservationData.endDate = new Date(formData.endDate).toISOString();
        }
      }

      await reservationService.create(reservationData);
      setSuccess('Reserva criada com sucesso!');
      closeModal();
      loadDashboardData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Erro ao criar reserva:', error);
      setError(error.response?.data?.error || 'Erro ao criar reserva. Verifique os dados e tente novamente.');
    }
  };

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
        
        {success && (
          <div className="alert alert-success">{success}</div>
        )}
        {error && !showModal && (
          <div className="alert alert-danger">{error}</div>
        )}

        <div className="grid grid-4" style={{ marginBottom: '2rem' }}>
          <div className="card" style={{ cursor: 'pointer' }} onClick={() => navigate('/courts')}>
            <div className="flex-between">
              <div>
                <p className="text-muted text-sm">Total de Quadras</p>
                <h3 className="text-2xl font-bold">{stats?.courts.total || 0}</h3>
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
                <MapPin size={30} />
              </div>
            </div>
          </div>

          <div className="card" style={{ cursor: 'pointer' }} onClick={() => navigate('/clients')}>
            <div className="flex-between">
              <div>
                <p className="text-muted text-sm">Clientes</p>
                <h3 className="text-2xl font-bold">{stats?.clients || 0}</h3>
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
                <Users size={30} />
              </div>
            </div>
          </div>

          <div className="card" style={{ cursor: 'pointer' }} onClick={() => navigate('/reservations')}>
            <div className="flex-between">
              <div>
                <p className="text-muted text-sm">Reservas Ativas (Próx 7 dias.)</p>
                <h3 className="text-2xl font-bold">{stats?.reservations || 0}</h3>
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
                <CalendarIcon size={30} />
              </div>
            </div>
          </div>

          <div className="card" style={{ cursor: 'pointer' }} onClick={() => navigate('/tabs')}>
            <div className="flex-between">
              <div>
                <p className="text-muted text-sm">Comandas Abertas</p>
                <h3 className="text-2xl font-bold">{stats?.tabs || 0}</h3>
              </div>
              <div style={{ 
                width: '60px', 
                height: '60px', 
                background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
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
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
          gap: '1rem',
          marginBottom: '2rem' 
        }}>
          <button 
            className="btn btn-primary"
            onClick={() => setShowModal(true)}
            style={{ 
              width: '100%',
              padding: '0.75rem 1rem',
              fontSize: '0.875rem'
            }}
          >
            <PlusCircle size={16} />
            Nova Reserva
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => navigate('/courts')}
            style={{ 
              width: '100%',
              padding: '0.75rem 1rem',
              fontSize: '0.875rem'
            }}
          >
            <MapPin size={16} />
            Nova Quadra
          </button>
          <button 
            className="btn btn-secondary"
            onClick={() => navigate('/tabs')}
            style={{ 
              width: '100%',
              padding: '0.75rem 1rem',
              fontSize: '0.875rem'
            }}
          >
            <Receipt size={16} />
            Nova Comanda
          </button>
          <button 
            className="btn btn-outline"
            onClick={() => navigate('/products')}
            style={{ 
              width: '100%',
              padding: '0.75rem 1rem',
              fontSize: '0.875rem'
            }}
          >
            <Package size={16} />
            Produtos
          </button>
          <button 
            className="btn btn-outline"
            onClick={() => navigate('/clients')}
            style={{ 
              width: '100%',
              padding: '0.75rem 1rem',
              fontSize: '0.875rem'
            }}
          >
            <Users size={16} />
            Clientes
          </button>
        </div>

        <div className="card">
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>
              Calendário de Reservas
            </h2>
            <button
              onClick={() => setShowPastReservations(!showPastReservations)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.625rem 1rem',
                background: showPastReservations ? '#34a853' : '#e8eaed',
                color: showPastReservations ? 'white' : '#5f6368',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '600',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
              }}
            >
              {showPastReservations ? <Eye size={16} /> : <EyeOff size={16} />}
              {showPastReservations ? 'Ocultar Passadas' : 'Mostrar Passadas'}
            </button>
          </div>
          
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay'
            }}
            events={calendarEvents}
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            locale="pt-br"
            height="auto"
            slotMinTime="06:00:00"
            slotMaxTime="23:30:00"
            slotDuration="01:00:00"
            slotLabelInterval="01:00:00"
            allDaySlot={false}
            nowIndicator={true}
            weekends={true}
            editable={false}
            selectable={true}
          />
        </div>
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
              maxWidth: '700px',
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
                  <Calendar size={26} />
                </div>
                <div>
                  <h2 className="text-xl font-bold" style={{ marginBottom: '0.25rem' }}>Nova Reserva</h2>
                  <p style={{ opacity: 0.9, fontSize: '0.875rem' }}>Agende um horário para a quadra</p>
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
                <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="grid grid-2" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label 
                      htmlFor="courtId"
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.5rem',
                        marginBottom: '0.75rem',
                        fontWeight: '600',
                        color: 'var(--text-primary)'
                      }}
                    >
                      <MapPin size={18} style={{ color: '#34a853' }} />
                      Selecione a Quadra
                    </label>
                    <select
                      id="courtId"
                      name="courtId"
                      value={formData.courtId}
                      onChange={handleInputChange}
                      required
                      style={{
                        padding: '1rem',
                        borderRadius: '12px',
                        border: '2px solid var(--border-color)',
                        fontSize: '1rem',
                        transition: 'all 0.2s',
                        background: 'var(--bg-light)',
                        width: '100%'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#34a853'}
                      onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                    >
                      <option value="">Escolha a quadra</option>
                      {courts
                        .filter(court => court.status === 'AVAILABLE')
                        .map(court => (
                          <option key={court.id} value={court.id}>
                            {court.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="input-group" style={{ marginBottom: 0 }}>
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
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <select
                        id="clientId"
                        name="clientId"
                        value={formData.clientId}
                        onChange={handleInputChange}
                        required
                        style={{
                          flex: 1,
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
                            {client.fullName}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={openClientModal}
                        style={{
                          padding: '0 1rem',
                          borderRadius: '12px',
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
                </div>

                <div className="grid grid-2" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label 
                      htmlFor="date"
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
                      Data da Reserva
                    </label>
                    <input
                      type="date"
                      id="date"
                      name="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      required
                      min={format(new Date(), 'yyyy-MM-dd')}
                      style={{
                        padding: '1rem',
                        borderRadius: '12px',
                        border: '2px solid var(--border-color)',
                        fontSize: '1rem',
                        transition: 'all 0.2s',
                        background: 'var(--bg-light)',
                        width: '100%'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#34a853'}
                      onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                    />
                  </div>

                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label 
                      htmlFor="time"
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.5rem',
                        marginBottom: '0.75rem',
                        fontWeight: '600',
                        color: 'var(--text-primary)'
                      }}
                    >
                      <Clock size={18} style={{ color: '#34a853' }} />
                      Horário de Início
                    </label>
                    
                    {!useCustomTime ? (
                      <>
                        <select
                          id="time"
                          name="time"
                          value={formData.time}
                          onChange={handleInputChange}
                          required={!useCustomTime}
                          style={{
                            padding: '1rem',
                            borderRadius: '12px',
                            border: '2px solid var(--border-color)',
                            fontSize: '1rem',
                            transition: 'all 0.2s',
                            background: 'var(--bg-light)',
                            width: '100%'
                          }}
                          onFocus={(e) => e.target.style.borderColor = '#34a853'}
                          onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                        >
                          <option value="">Horários disponíveis</option>
                          {roundTimeSlots.map(time => (
                            <option key={time} value={time}>
                              {time}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setUseCustomTime(true)}
                          style={{
                            marginTop: '0.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            background: 'none',
                            border: 'none',
                            color: '#34a853',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            padding: '0.25rem 0',
                            fontWeight: '500'
                          }}
                        >
                          <Edit3 size={14} />
                          Personalizar horário
                        </button>
                      </>
                    ) : (
                      <>
                        <input
                          type="time"
                          id="customTime"
                          name="customTime"
                          value={formData.customTime}
                          onChange={handleInputChange}
                          required={useCustomTime}
                          min="06:00"
                          max="23:30"
                          style={{
                            padding: '1rem',
                            borderRadius: '12px',
                            border: '2px solid var(--border-color)',
                            fontSize: '1rem',
                            transition: 'all 0.2s',
                            background: 'var(--bg-light)',
                            width: '100%'
                          }}
                          onFocus={(e) => e.target.style.borderColor = '#34a853'}
                          onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setUseCustomTime(false);
                            setFormData({ ...formData, customTime: '' });
                          }}
                          style={{
                            marginTop: '0.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            background: 'none',
                            border: 'none',
                            color: '#5f6368',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            padding: '0.25rem 0',
                            fontWeight: '500'
                          }}
                        >
                          <Clock size={14} />
                          Voltar para horários sugeridos
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                  <label 
                    htmlFor="durationInHours"
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.5rem',
                      marginBottom: '0.75rem',
                      fontWeight: '600',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <Clock size={18} style={{ color: '#34a853' }} />
                    Duração (em horas)
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
                      padding: '1rem',
                      borderRadius: '12px',
                      border: '2px solid var(--border-color)',
                      fontSize: '1rem',
                      transition: 'all 0.2s',
                      background: 'var(--bg-light)'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#34a853'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                  />
                </div>

                <div style={{ 
                  marginBottom: '1.5rem',
                  padding: '1rem',
                  background: 'var(--bg-light)',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)'
                }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    cursor: 'pointer',
                    fontWeight: '600',
                    color: 'var(--text-primary)'
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
                    <RefreshCw size={18} style={{ color: '#34a853' }} />
                    <span>Criar Reserva Recorrente</span>
                  </label>
                  <small className="text-muted" style={{ marginLeft: '2.5rem', display: 'block', marginTop: '0.5rem' }}>
                    Repetir esta reserva semanalmente ou mensalmente
                  </small>
                </div>

                {formData.isRecurring && (
                  <div style={{
                    background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
                    padding: '1.5rem',
                    borderRadius: '12px',
                    marginBottom: '1.5rem',
                    border: '1px solid #bbf7d0'
                  }}>
                    <h4 style={{ 
                      marginBottom: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      color: 'var(--text-primary)'
                    }}>
                      <Info size={18} style={{ color: '#34a853' }} />
                      Configurações de Recorrência
                    </h4>

                    <div className="grid grid-2" style={{ gap: '1rem', marginBottom: '1rem' }}>
                      <div className="input-group" style={{ marginBottom: 0 }}>
                        <label htmlFor="frequency" style={{ fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>
                          Frequência
                        </label>
                        <select
                          id="frequency"
                          name="frequency"
                          value={formData.frequency}
                          onChange={handleInputChange}
                          required
                          style={{
                            padding: '0.75rem',
                            borderRadius: '8px',
                            border: '2px solid var(--border-color)',
                            fontSize: '0.95rem',
                            width: '100%'
                          }}
                        >
                          <option value="WEEKLY">Semanal</option>
                          <option value="MONTHLY">Mensal</option>
                        </select>
                      </div>

                      <div className="input-group" style={{ marginBottom: 0 }}>
                        <label htmlFor="endDate" style={{ fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>
                          Data Final (opcional)
                        </label>
                        <input
                          type="date"
                          id="endDate"
                          name="endDate"
                          value={formData.endDate}
                          onChange={handleInputChange}
                          min={formData.date}
                          style={{
                            padding: '0.75rem',
                            borderRadius: '8px',
                            border: '2px solid var(--border-color)',
                            fontSize: '0.95rem',
                            width: '100%'
                          }}
                        />
                      </div>
                    </div>

                    <div style={{
                      marginTop: '0.75rem',
                      padding: '0.75rem',
                      background: 'rgba(52, 168, 83, 0.1)',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      color: 'var(--text-muted)'
                    }}>
                      <strong>Nota:</strong> A reserva será repetida no mesmo dia da semana e horário até a data final especificada.
                    </div>
                  </div>
                )}

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
                    <Calendar size={20} />
                    Criar Reserva
                  </button>
                </div>
              </form>
            </div>
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

        input[type="time"]::-webkit-calendar-picker-indicator {
          cursor: pointer;
          filter: invert(53%) sepia(94%) saturate(396%) hue-rotate(92deg) brightness(92%) contrast(91%);
        }

        input[type="time"]:hover::-webkit-calendar-picker-indicator {
          filter: invert(40%) sepia(94%) saturate(396%) hue-rotate(92deg) brightness(92%) contrast(91%);
        }
      `}</style>
    </>
  );
};

export default Dashboard;