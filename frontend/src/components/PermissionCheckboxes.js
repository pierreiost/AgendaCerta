import React, { useState, useEffect } from 'react';
import { Shield, ChevronDown, ChevronUp, AlertCircle, RefreshCw } from 'lucide-react';
import api from '../services/api';

const PermissionCheckboxes = ({ userId, selectedPermissions: initialPermissions, onPermissionsChange }) => {
  const [allPermissions, setAllPermissions] = useState({});
  const [selectedPermissions, setSelectedPermissions] = useState(initialPermissions || []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [initializing, setInitializing] = useState(false);
  const [expandedModules, setExpandedModules] = useState({});

  useEffect(() => {
    if (initialPermissions) {
      setSelectedPermissions(initialPermissions);
    }
  }, [initialPermissions]);

  useEffect(() => {
    loadPermissions();
    if (userId) {
      loadUserPermissions();
    }
  }, [userId]);

  const loadPermissions = async () => {
    try {
      setError('');
      const response = await api.get('/permissions');
      
      if (!response.data.grouped || Object.keys(response.data.grouped).length === 0) {
        setError('no_permissions');
        setLoading(false);
        return;
      }

      setAllPermissions(response.data.grouped);
      
      const expanded = {};
      Object.keys(response.data.grouped).forEach(module => {
        expanded[module] = true;
      });
      setExpandedModules(expanded);
    } catch (error) {
      console.error('Erro ao carregar permissões:', error);
      setError(error.response?.data?.error || 'Erro ao carregar permissões');
    } finally {
      setLoading(false);
    }
  };

  const loadUserPermissions = async () => {
    try {
      const response = await api.get(`/permissions/user/${userId}`);
      const permIds = response.data.permissionIds || [];
      setSelectedPermissions(permIds);
      if (onPermissionsChange) {
        onPermissionsChange(permIds);
      }
    } catch (error) {
      console.error('Erro ao carregar permissões do usuário:', error);
    }
  };

  const initializePermissions = async () => {
    try {
      setInitializing(true);
      setError('');
      await api.post('/permissions/seed');
      await loadPermissions();
    } catch (error) {
      console.error('Erro ao inicializar permissões:', error);
      setError(error.response?.data?.error || 'Erro ao inicializar permissões');
    } finally {
      setInitializing(false);
    }
  };

  const handlePermissionToggle = (permissionId) => {
    const newSelected = selectedPermissions.includes(permissionId)
      ? selectedPermissions.filter(id => id !== permissionId)
      : [...selectedPermissions, permissionId];
    
    setSelectedPermissions(newSelected);
    if (onPermissionsChange) {
      onPermissionsChange(newSelected);
    }
  };

  const handleModuleToggle = (module) => {
    const modulePermissions = allPermissions[module] || [];
    const modulePermIds = modulePermissions.map(p => p.id);
    
    const allSelected = modulePermIds.every(id => selectedPermissions.includes(id));
    
    let newSelected;
    if (allSelected) {
      newSelected = selectedPermissions.filter(id => !modulePermIds.includes(id));
    } else {
      newSelected = [...new Set([...selectedPermissions, ...modulePermIds])];
    }
    
    setSelectedPermissions(newSelected);
    if (onPermissionsChange) {
      onPermissionsChange(newSelected);
    }
  };

  const toggleModuleExpansion = (module) => {
    setExpandedModules(prev => ({
      ...prev,
      [module]: !prev[module]
    }));
  };

  const getModuleIcon = (module) => {
    const icons = {
      products: '📦',
      clients: '👥',
      tabs: '💰',
      courts: '🏟️',
      reservations: '📅',
      users: '👤',
      dashboard: '📊',
      notifications: '🔔'
    };
    return icons[module] || '📋';
  };

  const getModuleName = (module) => {
    const names = {
      products: 'Produtos',
      clients: 'Clientes',
      tabs: 'Comandas',
      courts: 'Quadras',
      reservations: 'Reservas',
      users: 'Usuários',
      dashboard: 'Dashboard',
      notifications: 'Notificações'
    };
    return names[module] || module;
  };

  const getActionName = (action) => {
    const names = {
      view: 'Visualizar',
      create: 'Criar',
      edit: 'Editar',
      delete: 'Excluir',
      stock: 'Gerenciar Estoque',
      close: 'Fechar',
      cancel: 'Cancelar'
    };
    return names[action] || action;
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div className="spinner"></div>
        <p style={{ marginTop: '1rem', color: '#6b7280' }}>
          Carregando permissões...
        </p>
      </div>
    );
  }

  if (error === 'no_permissions') {
    return (
      <div style={{
        background: '#fef2f2',
        borderRadius: '12px',
        padding: '2rem',
        border: '2px solid #fecaca',
        textAlign: 'center'
      }}>
        <AlertCircle size={48} color="#dc2626" style={{ marginBottom: '1rem' }} />
        <h3 style={{ margin: '0 0 0.5rem 0', color: '#991b1b' }}>
          Permissões não inicializadas
        </h3>
        <p style={{ color: '#7f1d1d', marginBottom: '1.5rem' }}>
          O sistema de permissões precisa ser inicializado. Clique no botão abaixo para criar as permissões básicas.
        </p>
        <button
          onClick={initializePermissions}
          disabled={initializing}
          className="btn btn-primary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          {initializing ? (
            <>
              <RefreshCw size={18} className="spinning" />
              Inicializando...
            </>
          ) : (
            <>
              <Shield size={18} />
              Inicializar Permissões
            </>
          )}
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        background: '#fef2f2',
        borderRadius: '12px',
        padding: '1.5rem',
        border: '2px solid #fecaca'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#991b1b' }}>
          <AlertCircle size={20} />
          <strong>Erro ao carregar permissões</strong>
        </div>
        <p style={{ color: '#7f1d1d', margin: '0.5rem 0 0 0' }}>{error}</p>
      </div>
    );
  }

  if (Object.keys(allPermissions).length === 0) {
    return (
      <div style={{
        background: '#f3f4f6',
        borderRadius: '12px',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <p style={{ color: '#6b7280' }}>Nenhuma permissão disponível</p>
      </div>
    );
  }

  return (
    <div style={{
      background: '#f9fafb',
      borderRadius: '12px',
      padding: '1.5rem',
      border: '2px solid #e5e7eb'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        marginBottom: '1.5rem'
      }}>
        <Shield size={24} color="#3b82f6" />
        <div>
          <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '600' }}>
            Permissões do Funcionário
          </h3>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#6b7280' }}>
            Selecione as permissões que este usuário terá no sistema
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {Object.keys(allPermissions).map(module => {
          const modulePermissions = allPermissions[module] || [];
          const modulePermIds = modulePermissions.map(p => p.id);
          const allSelected = modulePermIds.length > 0 && 
            modulePermIds.every(id => selectedPermissions.includes(id));
          const someSelected = modulePermIds.some(id => selectedPermissions.includes(id));
          const isExpanded = expandedModules[module];

          return (
            <div
              key={module}
              style={{
                background: 'white',
                borderRadius: '12px',
                border: '2px solid #e5e7eb',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem',
                  background: someSelected ? '#eff6ff' : 'white',
                  borderBottom: isExpanded ? '2px solid #e5e7eb' : 'none',
                  cursor: 'pointer'
                }}
                onClick={() => toggleModuleExpansion(module)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>{getModuleIcon(module)}</span>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>
                      {getModuleName(module)}
                    </h4>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#6b7280' }}>
                      {modulePermissions.length} permissão(ões) disponível(is)
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <label
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      cursor: 'pointer',
                      padding: '0.5rem',
                      borderRadius: '8px',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={() => handleModuleToggle(module)}
                      style={{
                        width: '18px',
                        height: '18px',
                        cursor: 'pointer'
                      }}
                    />
                    <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>
                      {allSelected ? 'Desmarcar todas' : 'Marcar todas'}
                    </span>
                  </label>
                  
                  {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </div>

              {isExpanded && (
                <div style={{
                  padding: '1rem',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '0.75rem'
                }}>
                  {modulePermissions.map(permission => (
                    <label
                      key={permission.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.75rem',
                        background: selectedPermissions.includes(permission.id) 
                          ? '#eff6ff' 
                          : '#f9fafb',
                        border: '2px solid',
                        borderColor: selectedPermissions.includes(permission.id)
                          ? '#3b82f6'
                          : '#e5e7eb',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (!selectedPermissions.includes(permission.id)) {
                          e.currentTarget.style.borderColor = '#9ca3af';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!selectedPermissions.includes(permission.id)) {
                          e.currentTarget.style.borderColor = '#e5e7eb';
                        }
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedPermissions.includes(permission.id)}
                        onChange={() => handlePermissionToggle(permission.id)}
                        style={{
                          width: '16px',
                          height: '16px',
                          cursor: 'pointer'
                        }}
                      />
                      <div>
                        <p style={{
                          margin: 0,
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          color: '#374151'
                        }}>
                          {getActionName(permission.action)}
                        </p>
                        {permission.description && (
                          <p style={{
                            margin: '0.25rem 0 0 0',
                            fontSize: '0.75rem',
                            color: '#6b7280'
                          }}>
                            {permission.description}
                          </p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{
        marginTop: '1rem',
        padding: '1rem',
        background: '#eff6ff',
        borderRadius: '8px',
        border: '1px solid #bfdbfe'
      }}>
        <p style={{
          margin: 0,
          fontSize: '0.875rem',
          color: '#1e40af',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <Shield size={16} />
          <strong>{selectedPermissions.length}</strong> permissão(ões) selecionada(s)
        </p>
      </div>
    </div>
  );
};

export default PermissionCheckboxes;