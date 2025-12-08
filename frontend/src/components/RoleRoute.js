import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Rota protegida por role
export const RoleRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh'
      }}>
        <div className="loading"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Se não tiver roles permitidas, qualquer usuário logado pode acessar
  if (!allowedRoles || allowedRoles.length === 0) {
    return children;
  }

  // Verifica se o role do usuário está na lista de permitidos
  if (!allowedRoles.includes(user.role)) {
    // Redireciona para a página correta baseado no role
    if (user.role === 'SUPER_ADMIN') {
      return <Navigate to="/super-admin" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Rota apenas para SUPER_ADMIN
export const SuperAdminRoute = ({ children }) => {
  return (
    <RoleRoute allowedRoles={['SUPER_ADMIN']}>
      {children}
    </RoleRoute>
  );
};

// Rota para ADMIN e SEMI_ADMIN (bloqueia SUPER_ADMIN)
export const SystemRoute = ({ children }) => {
  return (
    <RoleRoute allowedRoles={['ADMIN', 'SEMI_ADMIN']}>
      {children}
    </RoleRoute>
  );
};
