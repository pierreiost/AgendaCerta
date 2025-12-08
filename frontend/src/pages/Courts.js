import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { courtService, courtTypeService } from '../services/api';
import { MapPin, Edit2, Trash2, PlusCircle, X, AlertCircle, Tag, Plus } from 'lucide-react';

const Courts = () => {
  const navigate = useNavigate();
  const [courts, setCourts] = useState([]);
  const [courtTypes, setCourtTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [editingCourt, setEditingCourt] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    courtTypeId: '',
    pricePerHour: '',
    description: '',
    status: 'AVAILABLE'
  });
  const [typeFormData, setTypeFormData] = useState({ name: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  const statusOptions = [
    { value: 'AVAILABLE', label: 'Disponível' },
    { value: 'OCCUPIED', label: 'Ocupada' },
    { value: 'MAINTENANCE', label: 'Manutenção' }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await Promise.all([loadCourts(), loadCourtTypes()]);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setError('Não foi possível carregar os dados');
    } finally {
      setLoading(false);
    }
  };

  const loadCourts = async () => {
    const response = await courtService.getAll();
    setCourts(response.data);
  };

  const loadCourtTypes = async () => {
    const response = await courtTypeService.getAll();
    setCourtTypes(response.data);
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = 'Nome da quadra é obrigatório';
    } else if (formData.name.trim().length < 3) {
      errors.name = 'Nome deve ter pelo menos 3 caracteres';
    } else if (formData.name.trim().length > 100) {
      errors.name = 'Nome muito longo (máximo 100 caracteres)';
    }

    if (!formData.courtTypeId) {
      errors.courtTypeId = 'Tipo de quadra é obrigatório';
    }

    if (!formData.pricePerHour) {
      errors.pricePerHour = 'Preço por hora é obrigatório';
    } else {
      const price = parseFloat(formData.pricePerHour);
      if (isNaN(price) || price < 0) {
        errors.pricePerHour = 'Preço deve ser um valor positivo';
      }
    }

    if (formData.description && formData.description.length > 500) {
      errors.description = 'Descrição muito longa (máximo 500 caracteres)';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    if (validationErrors[name]) {
      setValidationErrors({
        ...validationErrors,
        [name]: ''
      });
    }
  };

  const openModal = (court = null) => {
    if (court) {
      setEditingCourt(court);
      setFormData({
        name: court.name,
        courtTypeId: court.courtTypeId,
        pricePerHour: court.pricePerHour.toString(),
        description: court.description || '',
        status: court.status
      });
    } else {
      setEditingCourt(null);
      setFormData({
        name: '',
        courtTypeId: '',
        pricePerHour: '',
        description: '',
        status: 'AVAILABLE'
      });
    }
    setShowModal(true);
    setError('');
    setValidationErrors({});
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCourt(null);
    setFormData({
      name: '',
      courtTypeId: '',
      pricePerHour: '',
      description: '',
      status: 'AVAILABLE'
    });
    setError('');
    setValidationErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      setError('Por favor, corrija os erros no formulário');
      return;
    }

    try {
      const dataToSend = {
        name: formData.name.trim(),
        courtTypeId: formData.courtTypeId,
        pricePerHour: parseFloat(formData.pricePerHour),
        description: formData.description.trim(),
        status: formData.status
      };

      if (editingCourt) {
        await courtService.update(editingCourt.id, dataToSend);
        setSuccess('Quadra atualizada com sucesso!');
      } else {
        await courtService.create(dataToSend);
        setSuccess('Quadra criada com sucesso!');
      }

      closeModal();
      loadCourts();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Erro ao salvar quadra:', error);

      if (error.response?.data?.details) {
        const backendErrors = {};
        error.response.data.details.forEach(err => {
          backendErrors[err.field] = err.message;
        });
        setValidationErrors(backendErrors);
        setError('Verifique os campos destacados');
      } else {
        setError(error.response?.data?.error || 'Erro ao salvar quadra. Tente novamente.');
      }
    }
  };

  const handleDelete = async (id) => {
    const court = courts.find(c => c.id === id);
    const courtName = court ? court.name : 'esta quadra';

    if (!window.confirm(`Tem certeza que deseja excluir a quadra "${courtName}"?`)) {
      return;
    }

    try {
      await courtService.delete(id);
      setSuccess('Quadra excluída com sucesso!');
      loadCourts();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Erro ao excluir quadra:', error);

      if (error.response?.status === 409) {
        const activeCount = error.response?.data?.activeReservations;

        if (activeCount) {
          setError(
            `⚠️ Não é possível excluir a quadra "${courtName}".\n\n` +
            `Existem ${activeCount} reserva${activeCount > 1 ? 's' : ''} ativa${activeCount > 1 ? 's' : ''} agendada${activeCount > 1 ? 's' : ''} para esta quadra.\n\n` +
            `Por favor, cancele todas as reservas futuras antes de excluir a quadra.`
          );
        } else {
          setError(error.response?.data?.error || 'Esta quadra possui reservas ativas e não pode ser excluída.');
        }

        setTimeout(() => setError(''), 7000);
      } else {
        setError(error.response?.data?.error || 'Erro ao excluir quadra. Tente novamente.');
        setTimeout(() => setError(''), 4000);
      }
    }
  };

  const handleCreateType = async (e) => {
    e.preventDefault();

    if (!typeFormData.name.trim()) {
      setError('Nome do tipo é obrigatório');
      return;
    }

    try {
      await courtTypeService.create({ name: typeFormData.name.trim() });
      setSuccess('Tipo de quadra criado com sucesso!');
      setShowTypeModal(false);
      setTypeFormData({ name: '' });
      loadCourtTypes();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.response?.data?.error || 'Erro ao criar tipo de quadra');
    }
  };

  const handleDeleteType = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este tipo?')) {
      return;
    }

    try {
      await courtTypeService.delete(id);
      setSuccess('Tipo excluído com sucesso!');
      loadCourtTypes();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.response?.data?.error || 'Erro ao excluir tipo');
      setTimeout(() => setError(''), 3000);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      AVAILABLE: { class: 'badge-success', text: 'Disponível' },
      OCCUPIED: { class: 'badge-danger', text: 'Ocupada' },
      MAINTENANCE: { class: 'badge-warning', text: 'Manutenção' }
    };
    return badges[status] || badges.AVAILABLE;
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
        <div className="flex-between" style={{ marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className="text-2xl font-bold">Gerenciar Quadras</h1>
            <p className="text-muted">Cadastre e gerencie as quadras do seu complexo</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              className="btn btn-secondary"
              onClick={() => setShowTypeModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Tag size={18} />
              Gerenciar Tipos
            </button>
            <button className="btn btn-primary" onClick={() => openModal()}>
              <PlusCircle size={18} />
              Nova Quadra
            </button>
          </div>
        </div>

        {success && (
          <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>
            {success}
          </div>
        )}

        {error && !showModal && !showTypeModal && (
          <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>
            {error}
          </div>
        )}

        {courts.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <MapPin size={64} style={{ color: 'var(--gray-400)', margin: '0 auto 1rem' }} />
            <h3 className="text-xl font-bold" style={{ marginBottom: '0.5rem' }}>
              Nenhuma quadra cadastrada
            </h3>
            <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
              Comece cadastrando sua primeira quadra
            </p>
            <button className="btn btn-primary" onClick={() => openModal()}>
              <PlusCircle size={18} />
              Cadastrar Primeira Quadra
            </button>
          </div>
        ) : (
          <div className="grid grid-3" style={{ gap: '1.5rem' }}>
            {courts.map(court => {
              const statusBadge = getStatusBadge(court.status);
              return (
                <div key={court.id} className="card hover-card">
                  <div className="flex-between" style={{ marginBottom: '1rem' }}>
                    <h3 className="text-lg font-bold">{court.name}</h3>
                    <span className={`badge ${statusBadge.class}`}>
                      {statusBadge.text}
                    </span>
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                      <strong>Tipo:</strong> {court.courtType?.name}
                    </p>
                    <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>
                      <strong>Valor:</strong> R$ {court.pricePerHour.toFixed(2)}/hora
                    </p>
                    {court.description && (
                      <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '0.75rem' }}>
                        {court.description}
                      </p>
                    )}
                  </div>

                  <div className="flex-between" style={{ gap: '0.5rem' }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => openModal(court)}
                      style={{ flex: 1 }}
                    >
                      <Edit2 size={16} />
                      Editar
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleDelete(court.id)}
                      style={{ flex: 1 }}
                    >
                      <Trash2 size={16} />
                      Excluir
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Cadastro/Edição de Quadra */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="card" style={{ margin: 0, maxWidth: '600px', width: '100%' }}>
              <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
                <h2 className="text-xl font-bold">
                  {editingCourt ? 'Editar Quadra' : 'Nova Quadra'}
                </h2>
                <button
                  onClick={closeModal}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.5rem',
                    color: 'var(--gray-600)',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.color = 'var(--gray-900)'}
                  onMouseLeave={(e) => e.target.style.color = 'var(--gray-600)'}
                >
                  <X size={24} />
                </button>
              </div>

              {error && (
                <div className="alert alert-danger" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertCircle size={18} />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="input-group">
                  <label htmlFor="name">Nome da Quadra *</label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Ex: Quadra 1 - Central"
                    className={validationErrors.name ? 'input-error' : ''}
                  />
                  {validationErrors.name && (
                    <span className="error-message">{validationErrors.name}</span>
                  )}
                </div>

                <div className="grid grid-2" style={{ gap: '1rem' }}>
                  <div className="input-group">
                    <label htmlFor="courtTypeId">Tipo de Quadra *</label>
                    <select
                      id="courtTypeId"
                      name="courtTypeId"
                      value={formData.courtTypeId}
                      onChange={handleInputChange}
                      className={validationErrors.courtTypeId ? 'input-error' : ''}
                    >
                      <option value="">Selecione o tipo</option>
                      {courtTypes.map(type => (
                        <option key={type.id} value={type.id}>
                          {type.name} {type.isDefault && '(Padrão)'}
                        </option>
                      ))}
                    </select>
                    {validationErrors.courtTypeId && (
                      <span className="error-message">{validationErrors.courtTypeId}</span>
                    )}
                  </div>

                  <div className="input-group">
                    <label htmlFor="pricePerHour">Preço por Hora (R$) *</label>
                    <input
                      id="pricePerHour"
                      name="pricePerHour"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.pricePerHour}
                      onChange={handleInputChange}
                      placeholder="Ex: 120.00"
                      className={validationErrors.pricePerHour ? 'input-error' : ''}
                    />
                    {validationErrors.pricePerHour && (
                      <span className="error-message">{validationErrors.pricePerHour}</span>
                    )}
                  </div>
                </div>

                {editingCourt && (
                  <div className="input-group">
                    <label htmlFor="status">Status</label>
                    <select
                      id="status"
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                    >
                      {statusOptions.map(status => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="input-group">
                  <label htmlFor="description">Descrição</label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Ex: Quadra de grama sintética, com iluminação"
                    rows="3"
                    className={validationErrors.description ? 'input-error' : ''}
                  />
                  {validationErrors.description && (
                    <span className="error-message">{validationErrors.description}</span>
                  )}
                  <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                    {formData.description.length}/500 caracteres
                  </span>
                </div>

                <div className="flex-between" style={{ gap: '1rem', marginTop: '1.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={closeModal}
                    style={{ flex: 1 }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                  >
                    {editingCourt ? 'Salvar Alterações' : 'Cadastrar Quadra'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Gerenciar Tipos */}
      {showTypeModal && (
        <div className="modal-overlay" onClick={() => setShowTypeModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="card" style={{ margin: 0, maxWidth: '500px', width: '100%' }}>
              <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
                <h2 className="text-xl font-bold">Gerenciar Tipos de Quadra</h2>
                <button
                  onClick={() => setShowTypeModal(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.5rem',
                    color: 'var(--gray-600)'
                  }}
                >
                  <X size={24} />
                </button>
              </div>

              {error && (
                <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleCreateType} style={{ marginBottom: '1.5rem' }}>
                <div className="input-group">
                  <label htmlFor="typeName">Novo Tipo de Quadra</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      id="typeName"
                      type="text"
                      value={typeFormData.name}
                      onChange={(e) => setTypeFormData({ name: e.target.value })}
                      placeholder="Ex: Padel, Squash, etc"
                      style={{ flex: 1 }}
                    />
                    <button type="submit" className="btn btn-primary">
                      <Plus size={18} />
                      Adicionar
                    </button>
                  </div>
                </div>
              </form>

              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <h3 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: '600' }}>
                  Tipos Cadastrados
                </h3>
                {courtTypes.length === 0 ? (
                  <p className="text-muted">Nenhum tipo cadastrado</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {courtTypes.map(type => (
                      <div
                        key={type.id}
                        className="flex-between"
                        style={{
                          padding: '0.75rem',
                          background: 'var(--gray-50)',
                          borderRadius: 'var(--radius)',
                          border: '1px solid var(--gray-200)'
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: '500' }}>{type.name}</span>
                          {type.isDefault && (
                            <span className="badge badge-info" style={{ marginLeft: '0.5rem', fontSize: '0.75rem' }}>
                              Padrão
                            </span>
                          )}
                        </div>
                        {!type.isDefault && (
                          <button
                            onClick={() => handleDeleteType(type.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--danger)',
                              cursor: 'pointer',
                              padding: '0.25rem'
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Courts;