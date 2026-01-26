import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

export const usePermissions = () => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadPermissions = async () => {
      try {
        if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
          if (isMounted) {
            setPermissions(['*']);
            setLoading(false);
          }
          return;
        }

        const response = await api.get(`/permissions/user/${user.id}`);
        if (isMounted) {
          const userPermissions = response.data.permissions.map(
            p => `${p.module}.${p.action}`
          );
          setPermissions(userPermissions);
        }
      } catch (error) {
        console.error('Erro ao carregar permissões:', error);
        if (isMounted) {
          setPermissions([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (user) {
      loadPermissions();
    } else {
      setPermissions([]);
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [user]);

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