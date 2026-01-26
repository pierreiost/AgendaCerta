// frontend/src/pages/OrdensServico.js
// P\u00e1gina de Ordens de Servi\u00e7o com valida\u00e7\u00f5es e loading states

import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import MaskedInput from '../components/MaskedInput';
import { serviceOrderService } from '../services/api';
import {
  FileText,
  PlusCircle,
  Edit2,
  Trash2,
  X,
  CheckCircle,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  User,
  Phone,
  Mail,
  DollarSign,
  Loader2,
  Package,
  Hash
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Valida\u00e7\u00f5es
const validateCPF = (cpf) => {
  if (!cpf) return { valid: true };
  const cleanCPF = cpf.replace(/\D/g, '');
  if (cleanCPF.length !== 11) {
    return { valid: false, message: 'CPF deve ter 11 d\u00edgitos' };
  }
  if (/^(\d)\1+$/.test(cleanCPF)) {
    return { valid: false, message: 'CPF inv\u00e1lido' };
  }
  return { valid: true };
};

const validateCNPJ = (cnpj) => {
  if (!cnpj) return { valid: true };
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  if (cleanCNPJ.length !== 14) {
    return { valid: false, message: 'CNPJ deve ter 14 d\u00edgitos' };
  }
  return { valid: true };
};

const validateDocument = (document) => {
  if (!document) return { valid: true };
  const cleanDoc = document.replace(/\D/g, '');
  if (cleanDoc.length === 11) return validateCPF(document);
  if (cleanDoc.length === 14) return validateCNPJ(document);
  return { valid: false, message: `CPF deve ter 11 d\u00edgitos ou CNPJ deve ter 14 d\u00edgitos. Informado: ${cleanDoc.length} d\u00edgitos` };
};

const validateEmail = (email) => {
  if (!email) return { valid: true };
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailRegex.test(email)) {
    return { valid: false, message: 'Email inv\u00e1lido. Use o formato: exemplo@dominio.com' };
  }
  return { valid: true };
};

const OrdensServico = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    customerDocument: '',
    description: '',
    orderType: 'simple',
    statusSimple: 'open',
    statusComplete: 'draft',
    subtotal: '',
    discount: '',
    notes: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await serviceOrderService.getAll({ limit: 100 });
      setOrders(response.data || []);
    } catch (error) {
      console.error('Erro ao carregar ordens de servi\u00e7o:', error);
      setError('Erro ao carregar ordens de servi\u00e7o');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError('');
  };

  const resetForm = () => {
    setFormData({
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      customerDocument: '',
      description: '',
      orderType: 'simple',
      statusSimple: 'open',
      statusComplete: 'draft',
      subtotal: '',
      discount: '',
      notes: ''
    });
    setEditingOrder(null);
  };

  const openModal = (order = null) => {
    if (order) {
      setEditingOrder(order);
      setFormData({
        customerName: order.customerName || '',
        customerEmail: order.customerEmail || '',
        customerPhone: order.customerPhone || '',
        customerDocument: order.customerDocument || '',
        description: order.description || '',
        orderType: order.orderType || 'simple',
        statusSimple: order.statusSimple || 'open',
        statusComplete: order.statusComplete || 'draft',
        subtotal: order.subtotal?.toString() || '',
        discount: order.discount?.toString() || '',
        notes: order.notes || ''
      });
    } else {
      resetForm();
    }
    setShowModal(true);
    setError('');
  };

  const closeModal = () => {
    if (isSaving) return; // Prevenir fechamento durante salvamento
    setShowModal(false);
    resetForm();
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSaving) return; // Prevenir double submit

    setError('');

    // ========================================
    // VALIDA\u00c7\u00d5ES COMPLETAS
    // ========================================

    // 1. Nome obrigat\u00f3rio
    if (!formData.customerName?.trim()) {
      setError('Nome do cliente \u00e9 obrigat\u00f3rio');
      return;
    }

    // 2. Descri\u00e7\u00e3o obrigat\u00f3ria
    if (!formData.description?.trim()) {
      setError('Descri\u00e7\u00e3o do servi\u00e7o \u00e9 obrigat\u00f3ria');
      return;
    }

    // 3. Validar documento se fornecido
    if (formData.customerDocument) {
      const docValidation = validateDocument(formData.customerDocument);
      if (!docValidation.valid) {
        setError(docValidation.message);
        return;
      }
    }

    // 4. Validar email se fornecido
    if (formData.customerEmail) {
      const emailValidation = validateEmail(formData.customerEmail);
      if (!emailValidation.valid) {
        setError(emailValidation.message);
        return;
      }
    }

    // 5. Validar valores num\u00e9ricos
    if (formData.subtotal && parseFloat(formData.subtotal) < 0) {
      setError('Subtotal n\u00e3o pode ser negativo');
      return;
    }

    if (formData.discount && parseFloat(formData.discount) < 0) {
      setError('Desconto n\u00e3o pode ser negativo');
      return;
    }

    setIsSaving(true);

    try {
      const orderData = {
        customerName: formData.customerName.trim(),
        customerEmail: formData.customerEmail?.trim() || null,
        customerPhone: formData.customerPhone?.trim() || null,
        customerDocument: formData.customerDocument?.trim() || null,
        description: formData.description.trim(),
        orderType: formData.orderType,
        statusSimple: formData.orderType === 'simple' ? formData.statusSimple : null,
        statusComplete: formData.orderType === 'complete' ? formData.statusComplete : null,
        subtotal: formData.subtotal ? parseFloat(formData.subtotal) : 0,
        discount: formData.discount ? parseFloat(formData.discount) : 0,
        notes: formData.notes?.trim() || null
      };

      if (editingOrder) {
        await serviceOrderService.update(editingOrder.id, orderData);
        setSuccess('Ordem de servi\u00e7o atualizada com sucesso!');
      } else {
        await serviceOrderService.create(orderData);
        setSuccess('Ordem de servi\u00e7o criada com sucesso!');
      }

      closeModal();
      loadOrders();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Erro ao salvar OS:', error);
      setError(error.response?.data?.error || 'Erro ao salvar ordem de servi\u00e7o. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (isDeleting) return;

    if (!window.confirm('Tem certeza que deseja excluir esta ordem de servi\u00e7o?')) {
      return;
    }

    setIsDeleting(true);
    setDeletingId(id);

    try {
      await serviceOrderService.delete(id);
      setSuccess('Ordem de servi\u00e7o exclu\u00edda com sucesso!');
      loadOrders();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Erro ao excluir OS:', error);
      setError(error.response?.data?.error || 'Erro ao excluir ordem de servi\u00e7o');
      setTimeout(() => setError(''), 5000);
    } finally {
      setIsDeleting(false);
      setDeletingId(null);
    }
  };

  const getStatusBadge = (order) => {
    const status = order.orderType === 'simple' ? order.statusSimple : order.statusComplete;

    const statusConfig = {
      // Status simples
      open: { label: 'Aberta', color: '#3b82f6', bg: '#eff6ff' },
      in_progress: { label: 'Em Andamento', color: '#f59e0b', bg: '#fffbeb' },
      completed: { label: 'Conclu\u00edda', color: '#10b981', bg: '#ecfdf5' },
      cancelled: { label: 'Cancelada', color: '#ef4444', bg: '#fef2f2' },
      // Status completo
      draft: { label: 'Rascunho', color: '#6b7280', bg: '#f3f4f6' },
      pending: { label: 'Pendente', color: '#f59e0b', bg: '#fffbeb' },
      approved: { label: 'Aprovada', color: '#3b82f6', bg: '#eff6ff' },
      executing: { label: 'Em Execu\u00e7\u00e3o', color: '#8b5cf6', bg: '#f5f3ff' },
      finished: { label: 'Finalizada', color: '#10b981', bg: '#ecfdf5' },
      billed: { label: 'Faturada', color: '#059669', bg: '#d1fae5' }
    };

    const config = statusConfig[status] || statusConfig.open;

    return (
      <span style={{
        padding: '0.25rem 0.75rem',
        borderRadius: '12px',
        fontSize: '0.75rem',
        fontWeight: '600',
        backgroundColor: config.bg,
        color: config.color,
        display: 'inline-block'
      }}>
        {config.label}
      </span>
    );
  };

  const getFilteredOrders = () => {
    let filtered = orders;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(order =>
        order.customerName?.toLowerCase().includes(term) ||
        order.description?.toLowerCase().includes(term) ||
        order.orderNumber?.toString().includes(term)
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(order => {
        const status = order.orderType === 'simple' ? order.statusSimple : order.statusComplete;
        return status === statusFilter;
      });
    }

    return filtered;
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

  const filteredOrders = getFilteredOrders();

  return (
    <>
      <Header />

      <div className="container" style={{ padding: '2rem 1rem' }}>
        {/* Header */}
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
                  background: 'linear-gradient(135deg, #1A73E8, #0d5bbc)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white'
                }}>
                  <FileText size={26} />
                </div>
                <div>
                  <h1 style={{
                    fontSize: '1.75rem',
                    fontWeight: '700',
                    color: 'var(--text-primary)',
                    marginBottom: '0.25rem'
                  }}>
                    Ordens de Servi\u00e7o
                  </h1>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    {filteredOrders.length} {filteredOrders.length === 1 ? 'ordem encontrada' : 'ordens encontradas'}
                  </p>
                </div>
              </div>
            </div>

            <button
              className="btn btn-primary"
              onClick={() => openModal()}
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
              Nova OS
            </button>
          </div>
        </div>

        {/* Alertas */}
        {success && (
          <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>
            <CheckCircle size={20} />
            {success}
          </div>
        )}

        {error && !showModal && (
          <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>
            <AlertTriangle size={20} />
            {error}
          </div>
        )}

        {/* Filtros */}
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
            <Filter size={20} style={{ color: '#1A73E8' }} />
            <h3 style={{
              margin: 0,
              fontSize: '1.125rem',
              fontWeight: '600',
              color: 'var(--text-primary)'
            }}>
              Filtrar Ordens
            </h3>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1.25rem'
          }}>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.75rem',
                fontWeight: '600'
              }}>
                <Search size={16} style={{ color: '#1A73E8' }} />
                Buscar
              </label>
              <input
                type="text"
                placeholder="Nome, descri\u00e7\u00e3o ou n\u00famero..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  padding: '0.875rem',
                  borderRadius: '10px',
                  border: '2px solid var(--border-color)',
                  width: '100%'
                }}
              />
            </div>

            <div className="input-group" style={{ marginBottom: 0 }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.75rem',
                fontWeight: '600'
              }}>
                <Clock size={16} style={{ color: '#1A73E8' }} />
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  padding: '0.875rem',
                  borderRadius: '10px',
                  border: '2px solid var(--border-color)',
                  width: '100%',
                  background: 'white'
                }}
              >
                <option value="">Todos os status</option>
                <optgroup label="Status Simples">
                  <option value="open">Aberta</option>
                  <option value="in_progress">Em Andamento</option>
                  <option value="completed">Conclu\u00edda</option>
                  <option value="cancelled">Cancelada</option>
                </optgroup>
                <optgroup label="Status Completo">
                  <option value="draft">Rascunho</option>
                  <option value="pending">Pendente</option>
                  <option value="approved">Aprovada</option>
                  <option value="executing">Em Execu\u00e7\u00e3o</option>
                  <option value="finished">Finalizada</option>
                  <option value="billed">Faturada</option>
                </optgroup>
              </select>
            </div>
          </div>

          {(searchTerm || statusFilter) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('');
              }}
              style={{
                marginTop: '1rem',
                padding: '0.625rem 1.25rem',
                background: 'transparent',
                border: '2px solid #1A73E8',
                color: '#1A73E8',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.9rem'
              }}
            >
              Limpar Filtros
            </button>
          )}
        </div>

        {/* Lista de Ordens */}
        {filteredOrders.length === 0 ? (
          <div className="card text-center" style={{ padding: '3rem' }}>
            <FileText size={64} style={{ margin: '0 auto 1rem', color: 'var(--text-light)' }} />
            <h3 className="font-bold" style={{ marginBottom: '0.5rem' }}>
              {orders.length === 0 ? 'Nenhuma ordem de servi\u00e7o cadastrada' : 'Nenhuma ordem encontrada'}
            </h3>
            <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
              {orders.length === 0
                ? 'Comece criando sua primeira ordem de servi\u00e7o'
                : 'Tente ajustar os filtros de busca'}
            </p>
            {orders.length === 0 && (
              <button className="btn btn-primary" onClick={() => openModal()}>
                <PlusCircle size={18} />
                Criar Primeira OS
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {filteredOrders.map(order => (
              <div
                key={order.id}
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
                  border: '1px solid #f1f3f4'
                }}
              >
                <div style={{ flex: 1, minWidth: '250px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    marginBottom: '0.75rem'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      color: '#1A73E8',
                      fontWeight: '700',
                      fontSize: '1.125rem'
                    }}>
                      <Hash size={18} />
                      OS #{order.orderNumber || '---'}
                    </div>
                    {getStatusBadge(order)}
                    <span style={{
                      padding: '0.2rem 0.5rem',
                      borderRadius: '6px',
                      fontSize: '0.7rem',
                      fontWeight: '600',
                      backgroundColor: order.orderType === 'simple' ? '#e0f2fe' : '#fef3c7',
                      color: order.orderType === 'simple' ? '#0369a1' : '#92400e'
                    }}>
                      {order.orderType === 'simple' ? 'Simples' : 'Completa'}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#374151' }}>
                      <User size={16} style={{ color: '#6b7280' }} />
                      <span style={{ fontWeight: '600' }}>{order.customerName}</span>
                    </div>

                    {order.customerPhone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.875rem' }}>
                        <Phone size={14} />
                        {order.customerPhone}
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.875rem' }}>
                      <Package size={14} />
                      {order.description?.substring(0, 50)}{order.description?.length > 50 ? '...' : ''}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.875rem' }}>
                      <Clock size={14} />
                      {order.createdAt && format(parseISO(order.createdAt), "dd/MM/yyyy '\u00e0s' HH:mm", { locale: ptBR })}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.75rem' }}>
                  {order.total !== undefined && order.total !== null && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '1.25rem',
                      fontWeight: '700',
                      color: '#059669'
                    }}>
                      <DollarSign size={20} />
                      R$ {order.total?.toFixed(2) || '0.00'}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => openModal(order)}
                      className="btn btn-outline"
                      style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                    >
                      <Edit2 size={16} />
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(order.id)}
                      disabled={isDeleting && deletingId === order.id}
                      className="btn btn-danger"
                      style={{
                        padding: '0.5rem 1rem',
                        fontSize: '0.875rem',
                        opacity: (isDeleting && deletingId === order.id) ? 0.7 : 1,
                        cursor: (isDeleting && deletingId === order.id) ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {(isDeleting && deletingId === order.id) ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Excluindo...
                        </>
                      ) : (
                        <>
                          <Trash2 size={16} />
                          Excluir
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Formul\u00e1rio */}
      {showModal && (
        <div
          className="modal-overlay"
          onClick={closeModal}
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
              borderRadius: '16px',
              width: '100%',
              maxWidth: '600px',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
            }}
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
                color: '#1A73E8'
              }}>
                {editingOrder ? 'Editar Ordem de Servi\u00e7o' : 'Nova Ordem de Servi\u00e7o'}
              </h2>
              <button
                onClick={closeModal}
                disabled={isSaving}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  padding: '0.5rem',
                  opacity: isSaving ? 0.5 : 1
                }}
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '2rem' }}>
              {error && (
                <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>
                  <AlertTriangle size={18} />
                  {error}
                </div>
              )}

              {/* Tipo de OS */}
              <div className="input-group">
                <label>Tipo de Ordem</label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="orderType"
                      value="simple"
                      checked={formData.orderType === 'simple'}
                      onChange={handleInputChange}
                    />
                    Simples
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="orderType"
                      value="complete"
                      checked={formData.orderType === 'complete'}
                      onChange={handleInputChange}
                    />
                    Completa
                  </label>
                </div>
              </div>

              {/* Dados do Cliente */}
              <div className="input-group">
                <label htmlFor="customerName">
                  <User size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                  Nome do Cliente *
                </label>
                <input
                  type="text"
                  id="customerName"
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleInputChange}
                  required
                  placeholder="Nome completo do cliente"
                />
              </div>

              <div className="grid grid-2" style={{ gap: '1rem' }}>
                <div className="input-group">
                  <label htmlFor="customerPhone">
                    <Phone size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                    Telefone
                  </label>
                  <MaskedInput
                    type="phone"
                    id="customerPhone"
                    name="customerPhone"
                    value={formData.customerPhone}
                    onChange={handleInputChange}
                    placeholder="(XX) XXXXX-XXXX"
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="customerEmail">
                    <Mail size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                    Email
                  </label>
                  <input
                    type="email"
                    id="customerEmail"
                    name="customerEmail"
                    value={formData.customerEmail}
                    onChange={handleInputChange}
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="customerDocument">CPF/CNPJ</label>
                <MaskedInput
                  type="cpf"
                  id="customerDocument"
                  name="customerDocument"
                  value={formData.customerDocument}
                  onChange={handleInputChange}
                  placeholder="CPF ou CNPJ"
                />
              </div>

              {/* Descri\u00e7\u00e3o do Servi\u00e7o */}
              <div className="input-group">
                <label htmlFor="description">
                  <FileText size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                  Descri\u00e7\u00e3o do Servi\u00e7o *
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  rows="3"
                  placeholder="Descreva o servi\u00e7o a ser realizado"
                />
              </div>

              {/* Status */}
              <div className="input-group">
                <label htmlFor="status">Status</label>
                {formData.orderType === 'simple' ? (
                  <select
                    id="statusSimple"
                    name="statusSimple"
                    value={formData.statusSimple}
                    onChange={handleInputChange}
                  >
                    <option value="open">Aberta</option>
                    <option value="in_progress">Em Andamento</option>
                    <option value="completed">Conclu\u00edda</option>
                    <option value="cancelled">Cancelada</option>
                  </select>
                ) : (
                  <select
                    id="statusComplete"
                    name="statusComplete"
                    value={formData.statusComplete}
                    onChange={handleInputChange}
                  >
                    <option value="draft">Rascunho</option>
                    <option value="pending">Pendente</option>
                    <option value="approved">Aprovada</option>
                    <option value="executing">Em Execu\u00e7\u00e3o</option>
                    <option value="finished">Finalizada</option>
                    <option value="billed">Faturada</option>
                  </select>
                )}
              </div>

              {/* Valores */}
              <div className="grid grid-2" style={{ gap: '1rem' }}>
                <div className="input-group">
                  <label htmlFor="subtotal">
                    <DollarSign size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                    Subtotal (R$)
                  </label>
                  <input
                    type="number"
                    id="subtotal"
                    name="subtotal"
                    value={formData.subtotal}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="discount">Desconto (R$)</label>
                  <input
                    type="number"
                    id="discount"
                    name="discount"
                    value={formData.discount}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Observa\u00e7\u00f5es */}
              <div className="input-group">
                <label htmlFor="notes">Observa\u00e7\u00f5es</label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows="2"
                  placeholder="Observa\u00e7\u00f5es adicionais (opcional)"
                />
              </div>

              {/* Bot\u00f5es */}
              <div style={{
                display: 'flex',
                gap: '1rem',
                marginTop: '2rem'
              }}>
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSaving}
                  className="btn btn-outline"
                  style={{ flex: 1, opacity: isSaving ? 0.5 : 1 }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn btn-primary"
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={18} />
                      {editingOrder ? 'Atualizar' : 'Criar OS'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default OrdensServico;
