/**
 * VenueContext - Contexto para gerenciamento de estabelecimentos (multi-tenant)
 * Garante que o complexId no localStorage seja sempre validado contra o banco
 * Inclui suporte para Identidade Visual dinâmica (cores e logo)
 */

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import api from '../services/api';

const VenueContext = createContext({});

/**
 * Cores padrão do sistema
 */
const DEFAULT_COLORS = {
  primary: '#10b981',
  accent: '#3b82f6',
};

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
/**
 * Converte cor hexadecimal para HSL
 * @param {string} hex - Cor em formato hex (#RRGGBB)
 * @returns {object} - Objeto com h, s, l
 */
const hexToHSL = (hex) => {
  // Remove o # se presente
  hex = hex.replace(/^#/, '');

  // Converte para RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
      default: h = 0;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
};

/**
 * Aplica as cores da venue nas variáveis CSS globais
 * @param {string} primaryColor - Cor primária em hex
 * @param {string} accentColor - Cor de destaque em hex
 */
const applyThemeColors = (primaryColor, accentColor) => {
  const root = document.documentElement;

  // Aplicar cor primária
  if (primaryColor) {
    const primaryHSL = hexToHSL(primaryColor);
    root.style.setProperty('--primary-color', primaryColor);
    root.style.setProperty('--primary-h', primaryHSL.h);
    root.style.setProperty('--primary-s', `${primaryHSL.s}%`);
    root.style.setProperty('--primary-l', `${primaryHSL.l}%`);
    root.style.setProperty('--ring', primaryColor);
    root.style.setProperty('--success-color', primaryColor);
  }

  // Aplicar cor de destaque (secondary)
  if (accentColor) {
    const accentHSL = hexToHSL(accentColor);
    root.style.setProperty('--secondary-color', accentColor);
    root.style.setProperty('--accent-h', accentHSL.h);
    root.style.setProperty('--accent-s', `${accentHSL.s}%`);
    root.style.setProperty('--accent-l', `${accentHSL.l}%`);
  }
};

/**
 * Reseta as cores para os valores padrão
 */
const resetThemeColors = () => {
  applyThemeColors(DEFAULT_COLORS.primary, DEFAULT_COLORS.accent);
};

export const VenueProvider = ({ children }) => {
  const { user, logout } = useAuth();
  const [currentVenue, setCurrentVenue] = useState(null);
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estado para identidade visual
  const [visualIdentity, setVisualIdentity] = useState({
    primaryColor: DEFAULT_COLORS.primary,
    accentColor: DEFAULT_COLORS.accent,
    logoUrl: null,
  });

  /**
   * Carrega o estabelecimento atual do usuário
   */
  const loadCurrentVenue = useCallback(async () => {
    if (!user?.complexId) {
      setCurrentVenue(null);
      resetThemeColors();
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

        // Atualizar identidade visual
        const newVisualIdentity = {
          primaryColor: userData.complex.primaryColor || DEFAULT_COLORS.primary,
          accentColor: userData.complex.accentColor || DEFAULT_COLORS.accent,
          logoUrl: userData.complex.logoUrl || null,
        };
        setVisualIdentity(newVisualIdentity);

        // Aplicar cores no CSS
        applyThemeColors(newVisualIdentity.primaryColor, newVisualIdentity.accentColor);
      } else {
        setCurrentVenue(null);
        localStorage.removeItem('currentVenueId');
        resetThemeColors();
      }
    } catch (err) {
      console.error('Erro ao carregar estabelecimento:', err);
      setError(err.response?.data?.error || 'Erro ao carregar estabelecimento');
      setCurrentVenue(null);
      resetThemeColors();
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Atualiza a identidade visual do venue atual
   * @param {object} newIdentity - { primaryColor, accentColor, logoUrl }
   */
  const updateVisualIdentity = useCallback(async (newIdentity) => {
    try {
      const response = await api.put('/complex/visual-identity', newIdentity);

      if (response.data) {
        const updatedIdentity = {
          primaryColor: response.data.primaryColor || DEFAULT_COLORS.primary,
          accentColor: response.data.accentColor || DEFAULT_COLORS.accent,
          logoUrl: response.data.logoUrl || null,
        };

        setVisualIdentity(updatedIdentity);
        applyThemeColors(updatedIdentity.primaryColor, updatedIdentity.accentColor);

        // Atualizar também o currentVenue
        setCurrentVenue(prev => prev ? { ...prev, ...updatedIdentity } : null);

        return { success: true, data: updatedIdentity };
      }
    } catch (err) {
      console.error('Erro ao atualizar identidade visual:', err);
      return {
        success: false,
        error: err.response?.data?.error || 'Erro ao atualizar identidade visual'
      };
    }
  }, []);

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

    // Identidade Visual
    visualIdentity,
    updateVisualIdentity,
    DEFAULT_COLORS,

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
