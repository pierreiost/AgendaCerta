/**
 * VenueContext - Contexto para gerenciamento de estabelecimentos (multi-tenant)
 * Garante que o complexId no localStorage seja sempre validado contra o banco
 */

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import api from '../services/api';

const VenueContext = createContext({});

/**
 * Códigos de erro específicos para violações de RLS/IDOR
 */
export const ERROR_CODES = {
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  RLS_VIOLATION: 'RLS_VIOLATION',
  IDOR_ACCESS_DENIED: 'IDOR_ACCESS_DENIED',
  VENUE_NOT_FOUND: 'VENUE_NOT_FOUND',
  VENUE_ACCESS_REVOKED: 'VENUE_ACCESS_REVOKED',
};

/**
 * Provider do contexto de Venue
 */
export const VenueProvider = ({ children }) => {
  const { user, logout } = useAuth();
  const [currentVenue, setCurrentVenue] = useState(null);
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Carrega o estabelecimento atual do usuário
   */
  const loadCurrentVenue = useCallback(async () => {
    if (!user?.complexId) {
      setCurrentVenue(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Buscar dados do complexo atual do usuário
      const response = await api.get('/auth/me');
      const userData = response.data;

      if (userData.complex) {
        setCurrentVenue(userData.complex);
        // Armazenar no localStorage para persistência
        localStorage.setItem('currentVenueId', userData.complex.id);
      } else {
        setCurrentVenue(null);
        localStorage.removeItem('currentVenueId');
      }
    } catch (err) {
      console.error('Erro ao carregar estabelecimento:', err);
      setError(err.response?.data?.error || 'Erro ao carregar estabelecimento');
      setCurrentVenue(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Valida se o venueId armazenado ainda é válido
   * Previne acesso a estabelecimentos que o usuário perdeu acesso
   */
  const validateStoredVenue = useCallback(async () => {
    const storedVenueId = localStorage.getItem('currentVenueId');

    if (!storedVenueId || !user) {
      return true; // Nada a validar
    }

    // Verifica se o venueId armazenado corresponde ao complexId do usuário
    if (storedVenueId !== user.complexId) {
      console.warn('[VenueContext] Venue armazenado não corresponde ao complexo do usuário');

      // Limpar venue inválido
      localStorage.removeItem('currentVenueId');
      setCurrentVenue(null);

      return false;
    }

    return true;
  }, [user]);

  /**
   * Trata erros de autenticação/autorização
   * Distingue entre sessão expirada e violação de RLS
   */
  const handleAuthError = useCallback((error) => {
    const status = error.response?.status;
    const errorCode = error.response?.data?.code;
    const errorMessage = error.response?.data?.error || error.message;

    // Sessão expirada (401 Unauthorized)
    if (status === 401) {
      console.warn('[VenueContext] Sessão expirada - redirecionando para login');
      return {
        type: ERROR_CODES.SESSION_EXPIRED,
        message: 'Sua sessão expirou. Por favor, faça login novamente.',
        action: 'logout',
      };
    }

    // Violação de RLS ou IDOR (403 Forbidden)
    if (status === 403) {
      // Verificar se é especificamente IDOR
      if (errorCode === 'IDOR_ACCESS_DENIED' || errorCode === 'IDOR_BATCH_ACCESS_DENIED') {
        console.warn('[VenueContext] Tentativa de acesso IDOR detectada');
        return {
          type: ERROR_CODES.IDOR_ACCESS_DENIED,
          message: 'Você não tem permissão para acessar este recurso.',
          action: 'refreshVenue',
        };
      }

      // Verificar se é violação de RLS
      if (errorMessage.includes('RLS') || errorMessage.includes('policy') ||
          errorMessage.includes('não pertence') || errorMessage.includes('access denied')) {
        console.warn('[VenueContext] Violação de RLS detectada');
        return {
          type: ERROR_CODES.RLS_VIOLATION,
          message: 'Acesso negado. Você pode ter perdido acesso a este estabelecimento.',
          action: 'refreshVenue',
        };
      }

      // Outro erro de permissão
      return {
        type: ERROR_CODES.VENUE_ACCESS_REVOKED,
        message: 'Você não tem mais acesso a este estabelecimento.',
        action: 'refreshVenue',
      };
    }

    // Recurso não encontrado (pode ser porque não tem acesso)
    if (status === 404 && errorMessage.includes('não encontrad')) {
      return {
        type: ERROR_CODES.VENUE_NOT_FOUND,
        message: 'O recurso solicitado não foi encontrado ou você não tem acesso.',
        action: 'none',
      };
    }

    // Erro genérico
    return {
      type: 'UNKNOWN_ERROR',
      message: errorMessage || 'Ocorreu um erro inesperado.',
      action: 'none',
    };
  }, []);

  /**
   * Executa a ação recomendada baseada no tipo de erro
   */
  const executeErrorAction = useCallback(async (errorInfo) => {
    switch (errorInfo.action) {
      case 'logout':
        logout();
        break;

      case 'refreshVenue':
        // Recarregar dados do venue para verificar se ainda tem acesso
        await loadCurrentVenue();
        break;

      case 'none':
      default:
        // Não fazer nada
        break;
    }
  }, [logout, loadCurrentVenue]);

  /**
   * Força a revalidação do contexto de venue
   * Útil após operações que podem afetar permissões
   */
  const refreshVenueContext = useCallback(async () => {
    await validateStoredVenue();
    await loadCurrentVenue();
  }, [validateStoredVenue, loadCurrentVenue]);

  // Carregar venue quando o usuário mudar
  useEffect(() => {
    if (user) {
      validateStoredVenue().then(() => {
        loadCurrentVenue();
      });
    } else {
      setCurrentVenue(null);
      setVenues([]);
      setLoading(false);
    }
  }, [user, validateStoredVenue, loadCurrentVenue]);

  const value = {
    // Estado
    currentVenue,
    currentVenueId: currentVenue?.id || user?.complexId,
    venues,
    loading,
    error,

    // Ações
    refreshVenueContext,
    handleAuthError,
    executeErrorAction,

    // Constantes
    ERROR_CODES,
  };

  return (
    <VenueContext.Provider value={value}>
      {children}
    </VenueContext.Provider>
  );
};

/**
 * Hook para usar o contexto de Venue
 */
export const useVenue = () => {
  const context = useContext(VenueContext);

  if (!context) {
    throw new Error('useVenue deve ser usado dentro de um VenueProvider');
  }

  return context;
};

export default VenueContext;
