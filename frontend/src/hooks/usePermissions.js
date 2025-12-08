import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

export const usePermissions = () => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadPermissions();
    } else {
      setPermissions([]);
      setLoading(false);
    }
  }, [user]);

  const loadPermissions = async () => {
    try {
      if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
        setPermissions(['*']);
        setLoading(false);
        return;
      }

      const response = await api.get(`/permissions/user/${user.id}`);
      const userPermissions = response.data.permissions.map(
        p => `${p.module}.${p.action}`
      );
      setPermissions(userPermissions);
    } catch (error) {
      console.error('Erro ao carregar permissões:', error);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (module, action) => {
    if (!user) return false;
    if (permissions.includes('*')) return true;
    return permissions.includes(`${module}.${action}`);
  };

  const hasAnyPermission = (permissionsList) => {
    if (!user) return false;
    if (permissions.includes('*')) return true;
    
    return permissionsList.some(perm => {
      const [module, action] = perm.split('.');
      return permissions.includes(`${module}.${action}`);
    });
  };

  const hasModule = (module) => {
    if (!user) return false;
    if (permissions.includes('*')) return true;
    return permissions.some(perm => perm.startsWith(`${module}.`));
  };

  return {
    permissions,
    loading,
    hasPermission,
    hasAnyPermission,
    hasModule,
    isAdmin: user?.role === 'ADMIN',
    isSuperAdmin: user?.role === 'SUPER_ADMIN',
    isEmployee: user?.role === 'SEMI_ADMIN'
  };
};

export default usePermissions;