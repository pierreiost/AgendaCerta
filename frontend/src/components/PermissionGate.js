import React from 'react';
import { usePermissions } from '../hooks/usePermissions';

const PermissionGate = ({ 
  module, 
  action, 
  children, 
  fallback = null,
  showMessage = false 
}) => {
  const { hasPermission, loading } = usePermissions();

  if (loading) {
    return fallback;
  }

  if (!hasPermission(module, action)) {
    if (showMessage) {
      return (
        <div style={{
          padding: '1rem',
          background: '#fef2f2',
          border: '2px solid #fecaca',
          borderRadius: '12px',
          color: '#dc2626',
          textAlign: 'center',
          margin: '1rem 0'
        }}>
          <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: '500' }}>
            Você não tem permissão para acessar este recurso
          </p>
        </div>
      );
    }
    return fallback;
  }

  return <>{children}</>;
};

export default PermissionGate;
