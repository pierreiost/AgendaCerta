import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import MaskedInput from '../components/MaskedInput';
import PermissionCheckboxes from '../components/PermissionCheckboxes';
import { userService, permissionService } from '../services/api';
import { Users as UsersIcon, PlusCircle, Edit2, Trash2, X, Check, Key, Shield, UserCheck, UserX } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [activeTab, setActiveTab] = useState('info');
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [defaultPermissions, setDefaultPermissions] = useState([]);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    cpf: '',
    role: 'SEMI_ADMIN'
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState(null);
  const [resetPasswordData, setResetPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    loadUsers();
    loadDefaultPermissions();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await userService.getAll();
      setUsers(response.data);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      setError(error.response?.data?.error || 'Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const loadDefaultPermissions = async () => {
    try {
      const response = await permissionService.getAll();
      const allPermissions = response.data.permissions;
      
      const basicPermissions = allPermissions.filter(p => 
        (p.module === 'dashboard' && p.action === 'view') ||
        (p.module === 'products' && p.action === 'view') ||
        (p.module === 'clients' && p.action === 'view') ||
        (p.module === 'courts' && p.action === 'view') ||
        (p.module === 'reservations' && p.action === 'view') ||
        (p.module === 'tabs' && p.action === 'view') ||
        (p.module === 'notifications' && p.action === 'view')
      );
      
      const basicPermissionIds = basicPermissions.map(p => p.id);
      setDefaultPermissions(basicPermissionIds);
      
    } catch (error) {
      console.error('Erro ao carregar permissões padrão:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    
    if (error) setError('');
  };

  const openModal = async (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        password: '',
        phone: user.phone,
        cpf: user.cpf || '',
        role: user.role
      });
      
      if (user.role === 'SEMI_ADMIN') {
        try {
          const response = await permissionService.getUserPermissions(user.id);
          setSelectedPermissions(response.data.permissionIds || []);
        } catch (error) {
          console.error('Erro ao carregar permissões:', error);
          setSelectedPermissions([]);
        }
      } else {
        setSelectedPermissions([]);
      }
    } else {
      setEditingUser(null);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        phone: '',
        cpf: '',
        role: 'SEMI_ADMIN'
      });
      setSelectedPermissions([...defaultPermissions]);
    }
    
    setActiveTab('info');
    setShowModal(true);
    setError('');
    setFieldErrors({});
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      phone: '',
      cpf: '',
      role: 'SEMI_ADMIN'
    });
    setSelectedPermissions([]);
    setActiveTab('info');
    setError('');
    setFieldErrors({});
  };

  const handleModalClose = () => {
    const hasData = formData.firstName || formData.lastName || formData.email || formData.phone;
    
    if (hasData && !editingUser) {
      const confirmClose = window.confirm('Tem certeza? Dados não salvos serão perdidos.');
      if (!confirmClose) return;
    }
    
    closeModal();
  };

  const openResetPasswordModal = (user) => {
    setResetPasswordUser(user);
    setResetPasswordData({
      newPassword: '',
      confirmPassword: ''
    });
    setShowResetPasswordModal(true);
    setError('');
  };

  const closeResetPasswordModal = () => {
    setShowResetPasswordModal(false);
    setResetPasswordUser(null);
    setResetPasswordData({
      newPassword: '',
      confirmPassword: ''
    });
    setError('');
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.firstName || formData.firstName.trim().length < 2) {
      errors.firstName = 'Nome deve ter pelo menos 2 caracteres';
    }

    if (!formData.lastName || formData.lastName.trim().length < 2) {
      errors.lastName = 'Sobrenome deve ter pelo menos 2 caracteres';
    }

    if (!formData.email) {
      errors.email = 'Email é obrigatório';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        errors.email = 'Email inválido';
      }
    }

    if (!editingUser && !formData.password) {
      errors.password = 'Senha é obrigatória';
    }

    if (formData.password) {
      if (formData.password.length < 8) {
        errors.password = 'Senha deve ter no mínimo 8 caracteres';
      } else if (!/[a-z]/.test(formData.password)) {
        errors.password = 'Senha deve conter letras minúsculas';
      } else if (!/[A-Z]/.test(formData.password)) {
        errors.password = 'Senha deve conter letras maiúsculas';
      } else if (!/[0-9]/.test(formData.password)) {
        errors.password = 'Senha deve conter números';
      } else if (!/[@$!%*?&#]/.test(formData.password)) {
        errors.password = 'Senha deve conter caracteres especiais (@$!%*?&#)';
      }
    }

    if (!formData.phone) {
      errors.phone = 'Telefone é obrigatório';
    } else {
      const phoneRegex = /^\(\d{2}\)\s?\d{4,5}-\d{4}$/;
      if (!phoneRegex.test(formData.phone)) {
        errors.phone = 'Telefone inválido. Use (XX) XXXXX-XXXX';
      }
    }

    if (formData.cpf) {
      const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
      if (!cpfRegex.test(formData.cpf)) {
        errors.cpf = 'CPF inválido. Use XXX.XXX.XXX-XX';
      }
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    try {
      const dataToSend = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.toLowerCase().trim(),
        phone: formData.phone,
        cpf: formData.cpf || null,
        role: formData.role
      };

      if (!editingUser) {
        dataToSend.password = formData.password;
        
        if (formData.role === 'SEMI_ADMIN' && selectedPermissions.length > 0) {
          dataToSend.permissionIds = selectedPermissions;
        }
      }

      if (editingUser) {
        await userService.update(editingUser.id, dataToSend);
      } else {
        await userService.create(dataToSend);
      }

      setSuccess(editingUser ? 'Usuário atualizado com sucesso!' : 'Usuário cadastrado com sucesso!');
      setTimeout(() => setSuccess(''), 3000);
      
      await loadUsers();
      closeModal();
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
      const errorMsg = error.response?.data?.error || 
                      error.response?.data?.details?.join(', ') || 
                      'Erro ao salvar usuário';
      setError(errorMsg);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja deletar este usuário?')) {
      return;
    }

    try {
      await userService.delete(id);
      setSuccess('Usuário deletado com sucesso!');
      setTimeout(() => setSuccess(''), 3000);
      loadUsers();
    } catch (error) {
      console.error('Erro ao deletar usuário:', error);
      setError(error.response?.data?.error || 'Erro ao deletar usuário');
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleResetPasswordInputChange = (e) => {
    const { name, value } = e.target;
    setResetPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError('');
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (resetPasswordData.newPassword !== resetPasswordData.confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    if (resetPasswordData.newPassword.length < 8) {
      setError('Senha deve ter no mínimo 8 caracteres');
      return;
    }

    try {
      await userService.resetPassword(resetPasswordUser.id, resetPasswordData.newPassword);
      setSuccess('Senha resetada com sucesso!');
      setTimeout(() => setSuccess(''), 3000);
      closeResetPasswordModal();
    } catch (error) {
      console.error('Erro ao resetar senha:', error);
      setError(error.response?.data?.error || 'Erro ao resetar senha');
    }
  };

  const handlePermissionsChange = (permissionIds) => {
    setSelectedPermissions(permissionIds);
  };

  const savePermissions = async (userId) => {
    try {
      await permissionService.updateUserPermissions(userId, selectedPermissions);
      setSuccess('Permissões atualizadas com sucesso!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Erro ao salvar permissões:', error);
      setError(error.response?.data?.error || 'Erro ao salvar permissões');
      setTimeout(() => setError(''), 5000);
    }
  };

  const getInitials = (firstName, lastName) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getAvatarColor = (name) => {
    const colors = [
      '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
      '#10b981', '#06b6d4', '#6366f1', '#14b8a6'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const totalUsers = users.length;
  const adminCount = users.filter(u => u.role === 'ADMIN').length;
  const employeeCount = users.filter(u => u.role === 'SEMI_ADMIN').length;

  return (
    <div className="page">
      <Header />
      
      <div className="container">
        <div className="flex-between" style={{ marginBottom: '2rem' }}>
          <div>
            <h1 className="font-bold text-2xl flex items-center" style={{ gap: '0.75rem', marginBottom: '0.5rem', marginTop: '2rem'
             }}>
              <UsersIcon size={32} color="#34a853" />
              Gerenciar Funcionários
            </h1>
            <p className="text-muted">Gerencie os usuários e suas permissões no sistema</p>
          </div>
          
          <button onClick={() => openModal()} className="btn btn-primary">
            <PlusCircle size={20} />
            Novo Funcionário
          </button>
        </div>

        {/* Estatísticas */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <div style={{
            background: 'white',
            padding: '1.5rem',
            borderRadius: '12px',
            border: '2px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: '#eff6ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <UsersIcon size={24} color="#3b82f6" />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>Total de Usuários</p>
              <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700', color: '#111827' }}>
                {totalUsers}
              </p>
            </div>
          </div>

          <div style={{
            background: 'white',
            padding: '1.5rem',
            borderRadius: '12px',
            border: '2px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: '#fef2f2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Shield size={24} color="#ef4444" />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>Administradores</p>
              <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700', color: '#111827' }}>
                {adminCount}
              </p>
            </div>
          </div>

          <div style={{
            background: 'white',
            padding: '1.5rem',
            borderRadius: '12px',
            border: '2px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: '#f0fdf4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <UserCheck size={24} color="#22c55e" />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>Funcionários</p>
              <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700', color: '#111827' }}>
                {employeeCount}
              </p>
            </div>
          </div>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {loading ? (
          <div className="flex-center" style={{ padding: '3rem' }}>
            <div className="loading"></div>
          </div>
        ) : users.length === 0 ? (
          <div className="card">
            <div className="flex-center flex-col" style={{ padding: '3rem', textAlign: 'center' }}>
              <UserX size={64} color="#9CA3AF" style={{ marginBottom: '1rem' }} />
              <h3 className="font-bold text-xl" style={{ marginBottom: '0.5rem' }}>
                Nenhum funcionário cadastrado
              </h3>
              <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
                Comece adicionando o primeiro funcionário ao sistema
              </p>
              <button onClick={() => openModal()} className="btn btn-primary">
                <PlusCircle size={20} />
                Cadastrar Primeiro Funcionário
              </button>
            </div>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '1.5rem'
          }}>
            {users.map((user) => {
              const createdDate = parseISO(user.createdAt);
              const avatarColor = getAvatarColor(user.firstName);
              const initials = getInitials(user.firstName, user.lastName);

              return (
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
                  <div style={{ display: 'flex', alignItems: 'start', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '14px',
                      background: avatarColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: '700',
                      fontSize: '1.25rem',
                      flexShrink: 0
                    }}>
                      {initials}
                    </div>
                    
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{
                        margin: '0 0 0.25rem 0',
                        fontSize: '1.125rem',
                        fontWeight: '600',
                        color: '#111827',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {user.firstName} {user.lastName}
                      </h3>
                      <p style={{
                        margin: '0 0 0.5rem 0',
                        fontSize: '0.875rem',
                        color: '#6b7280',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {user.email}
                      </p>
                      <span style={{
                        display: 'inline-block',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        background: user.role === 'ADMIN' ? '#fef2f2' : '#eff6ff',
                        color: user.role === 'ADMIN' ? '#dc2626' : '#2563eb'
                      }}>
                        {user.role === 'ADMIN' ? 'Administrador' : 'Funcionário'}
                      </span>
                    </div>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.875rem', color: '#9ca3af' }}>📞</span>
                      <span style={{ fontSize: '0.875rem', color: '#4b5563' }}>{user.phone}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.875rem', color: '#9ca3af' }}>📅</span>
                      <span style={{ fontSize: '0.875rem', color: '#4b5563' }}>
                        Desde {format(createdDate, "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openModal(user);
                      }}
                      title="Editar usuário"
                      style={{
                        padding: '0.5rem',
                        background: '#f3f4f6',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#e5e7eb'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#f3f4f6'}
                    >
                      <Edit2 size={18} color="#6b7280" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openResetPasswordModal(user);
                      }}
                      title="Resetar senha"
                      style={{
                        padding: '0.5rem',
                        background: '#f3f4f6',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#e5e7eb'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#f3f4f6'}
                    >
                      <Key size={18} color="#6b7280" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(user.id);
                      }}
                      title="Deletar usuário"
                      style={{
                        padding: '0.5rem',
                        background: '#fef2f2',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#fee2e2'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#fef2f2'}
                    >
                      <Trash2 size={18} color="#dc2626" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal Criar/Editar */}
        {showModal && (
          <div className="modal-overlay" onClick={handleModalClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', maxHeight: '90vh', overflow: 'auto' }}>
              <div className="card" style={{ margin: 0 }}>
                <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
                  <h2 className="font-bold text-xl">
                    {editingUser ? 'Editar Funcionário' : 'Novo Funcionário'}
                  </h2>
                  <button onClick={handleModalClose} className="btn-icon">
                    <X size={24} />
                  </button>
                </div>

                {error && <div className="alert alert-danger">{error}</div>}
                {success && <div className="alert alert-success">{success}</div>}

                {editingUser && formData.role === 'SEMI_ADMIN' && (
                  <div style={{
                    display: 'flex',
                    gap: '1rem',
                    marginBottom: '1.5rem',
                    borderBottom: '2px solid #e5e7eb'
                  }}>
                    <button
                      type="button"
                      onClick={() => setActiveTab('info')}
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: 'none',
                        border: 'none',
                        borderBottom: activeTab === 'info' ? '3px solid var(--primary-color)' : '3px solid transparent',
                        color: activeTab === 'info' ? 'var(--primary-color)' : '#6b7280',
                        fontWeight: activeTab === 'info' ? '600' : '400',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      📋 Informações
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('permissions')}
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: 'none',
                        border: 'none',
                        borderBottom: activeTab === 'permissions' ? '3px solid var(--primary-color)' : '3px solid transparent',
                        color: activeTab === 'permissions' ? 'var(--primary-color)' : '#6b7280',
                        fontWeight: activeTab === 'permissions' ? '600' : '400',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <Shield size={18} />
                      Permissões
                    </button>
                  </div>
                )}

                {activeTab === 'info' ? (
                  <form onSubmit={handleSubmit}>
                    <div className="grid grid-2">
                      <div className="input-group">
                        <label htmlFor="firstName">Nome *</label>
                        <input
                          type="text"
                          id="firstName"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleInputChange}
                          required
                          placeholder="João"
                        />
                        {fieldErrors.firstName && (
                          <span className="text-sm text-danger">{fieldErrors.firstName}</span>
                        )}
                      </div>

                      <div className="input-group">
                        <label htmlFor="lastName">Sobrenome *</label>
                        <input
                          type="text"
                          id="lastName"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleInputChange}
                          required
                          placeholder="Silva"
                        />
                        {fieldErrors.lastName && (
                          <span className="text-sm text-danger">{fieldErrors.lastName}</span>
                        )}
                      </div>
                    </div>

                    <div className="input-group">
                      <label htmlFor="email">Email *</label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        placeholder="usuario@email.com"
                      />
                      {fieldErrors.email && (
                        <span className="text-sm text-danger">{fieldErrors.email}</span>
                      )}
                    </div>

                    {!editingUser && (
                      <div className="input-group">
                        <label htmlFor="password">Senha *</label>
                        <input
                          type="password"
                          id="password"
                          name="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          required={!editingUser}
                          placeholder="••••••••"
                        />
                        <small className="text-sm text-muted">
                          Mín. 8 caracteres, maiúsculas, minúsculas, números e especiais
                        </small>
                        {fieldErrors.password && (
                          <span className="text-sm text-danger">{fieldErrors.password}</span>
                        )}
                      </div>
                    )}

                    <div className="grid grid-2">
                      <div className="input-group">
                        <label htmlFor="phone">Telefone *</label>
                        <MaskedInput
                          mask="phone"
                          id="phone"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          required
                          placeholder="(00) 00000-0000"
                        />
                        {fieldErrors.phone && (
                          <span className="text-sm text-danger">{fieldErrors.phone}</span>
                        )}
                      </div>

                      <div className="input-group">
                        <label htmlFor="cpf">CPF (Opcional)</label>
                        <MaskedInput
                          mask="cpf"
                          id="cpf"
                          name="cpf"
                          value={formData.cpf}
                          onChange={handleInputChange}
                          placeholder="000.000.000-00"
                        />
                        {fieldErrors.cpf && (
                          <span className="text-sm text-danger">{fieldErrors.cpf}</span>
                        )}
                      </div>
                    </div>

                    <div className="input-group">
                      <label htmlFor="role">Função *</label>
                      <select
                        id="role"
                        name="role"
                        value={formData.role}
                        onChange={handleInputChange}
                        required
                        disabled={editingUser}
                      >
                        <option value="SEMI_ADMIN">Funcionário</option>
                        <option value="ADMIN">Administrador</option>
                      </select>
                      <small className="text-sm text-muted">
                        Administradores têm acesso total ao sistema
                      </small>
                    </div>

                    {!editingUser && formData.role === 'SEMI_ADMIN' && (
                      <div style={{ marginTop: '1.5rem' }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          marginBottom: '1rem',
                          padding: '0.75rem',
                          background: '#eff6ff',
                          borderRadius: '8px',
                          border: '1px solid #bfdbfe'
                        }}>
                          <Shield size={18} color="#2563eb" />
                          <span style={{ fontSize: '0.875rem', color: '#1e40af', fontWeight: '500' }}>
                            Selecione as permissões deste funcionário
                          </span>
                        </div>
                        
                        <PermissionCheckboxes
                          selectedPermissions={selectedPermissions}
                          onPermissionsChange={handlePermissionsChange}
                        />
                      </div>
                    )}

                    <div className="flex" style={{ gap: '1rem', marginTop: '1.5rem' }}>
                      <button
                        type="button"
                        onClick={closeModal}
                        className="btn btn-outline"
                        style={{ flex: 1 }}
                      >
                        <X size={18} />
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ flex: 1 }}
                      >
                        <Check size={18} />
                        {editingUser ? 'Atualizar' : 'Cadastrar'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div>
                    <PermissionCheckboxes
                      userId={editingUser?.id}
                      selectedPermissions={selectedPermissions}
                      onPermissionsChange={handlePermissionsChange}
                    />
                    
                    <div className="flex" style={{ gap: '1rem', marginTop: '1.5rem' }}>
                      <button
                        type="button"
                        onClick={closeModal}
                        className="btn btn-outline"
                        style={{ flex: 1 }}
                      >
                        <X size={18} />
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => savePermissions(editingUser.id)}
                        className="btn btn-primary"
                        style={{ flex: 1 }}
                      >
                        <Shield size={18} />
                        Salvar Permissões
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal Resetar Senha */}
        {showResetPasswordModal && (
          <div className="modal-overlay" onClick={closeResetPasswordModal}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
              <div className="card" style={{ margin: 0 }}>
                <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
                  <h2 className="font-bold text-xl">Resetar Senha</h2>
                  <button onClick={closeResetPasswordModal} className="btn-icon">
                    <X size={24} />
                  </button>
                </div>

                {error && <div className="alert alert-danger">{error}</div>}

                <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-dark)', borderRadius: '8px' }}>
                  <p className="font-bold">
                    {resetPasswordUser?.firstName} {resetPasswordUser?.lastName}
                  </p>
                  <p className="text-sm text-muted">{resetPasswordUser?.email}</p>
                </div>

                <form onSubmit={handleResetPassword}>
                  <div className="input-group">
                    <label htmlFor="newPassword">Nova Senha *</label>
                    <input
                      type="password"
                      id="newPassword"
                      name="newPassword"
                      value={resetPasswordData.newPassword}
                      onChange={handleResetPasswordInputChange}
                      required
                      placeholder="••••••••"
                    />
                    <small className="text-sm text-muted">
                      Mínimo 8 caracteres
                    </small>
                  </div>

                  <div className="input-group">
                    <label htmlFor="confirmPassword">Confirmar Senha *</label>
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={resetPasswordData.confirmPassword}
                      onChange={handleResetPasswordInputChange}
                      required
                      placeholder="••••••••"
                    />
                  </div>

                  <div className="flex" style={{ gap: '1rem', marginTop: '1.5rem' }}>
                    <button
                      type="button"
                      onClick={closeResetPasswordModal}
                      className="btn btn-outline"
                      style={{ flex: 1 }}
                    >
                      <X size={18} />
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ flex: 1 }}
                    >
                      <Key size={18} />
                      Resetar Senha
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Users;