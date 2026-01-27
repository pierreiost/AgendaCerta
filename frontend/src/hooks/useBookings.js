// frontend/src/hooks/useBookings.js
// Hook para gerenciamento de Reservas com validação de conflitos automática
// Inclui tratamento melhorado de erros RLS/IDOR e integração com VenueContext

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

/**
 * Códigos de erro específicos para violações de segurança
 */
export const ERROR_CODES = {
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  RLS_VIOLATION: 'RLS_VIOLATION',
  IDOR_ACCESS_DENIED: 'IDOR_ACCESS_DENIED',
  VENUE_NOT_FOUND: 'VENUE_NOT_FOUND',
  CONFLICT: 'CONFLICT',
  VALIDATION: 'VALIDATION',
  NETWORK: 'NETWORK',
  UNKNOWN: 'UNKNOWN',
};

/**
 * Analisa um erro e retorna informações estruturadas
 * Distingue entre "Sessão Expirada" e "Violação de RLS"
 * @param {Error} error - Erro a ser analisado
 * @returns {Object} Informações estruturadas do erro
 */
const analyzeError = (error) => {
  const status = error.response?.status;
  const errorCode = error.response?.data?.code;
  const errorMessage = error.response?.data?.error || error.message;

  // Erro de rede
  if (!error.response) {
    return {
      code: ERROR_CODES.NETWORK,
      message: 'Erro de conexão. Verifique sua internet e tente novamente.',
      action: 'retry',
      shouldRefreshVenue: false,
      originalError: error,
    };
  }

  // Sessão expirada (401 Unauthorized)
  if (status === 401) {
    return {
      code: ERROR_CODES.SESSION_EXPIRED,
      message: 'Sua sessão expirou. Por favor, faça login novamente.',
      action: 'logout',
      shouldRefreshVenue: false,
      originalError: error,
    };
  }

  // Violação de RLS ou IDOR (403 Forbidden)
  if (status === 403) {
    // Verificar se é especificamente IDOR
    if (errorCode === 'IDOR_ACCESS_DENIED' || errorCode === 'IDOR_BATCH_ACCESS_DENIED' ||
        errorCode === 'IDOR_NO_COMPLEX') {
      return {
        code: ERROR_CODES.IDOR_ACCESS_DENIED,
        message: 'Acesso negado: este recurso não pertence ao seu estabelecimento.',
        action: 'refreshVenue',
        shouldRefreshVenue: true,
        originalError: error,
      };
    }

    // Verificar se é violação de RLS
    if (errorMessage.toLowerCase().includes('rls') ||
        errorMessage.toLowerCase().includes('policy') ||
        errorMessage.toLowerCase().includes('não pertence') ||
        errorMessage.toLowerCase().includes('access denied') ||
        errorMessage.toLowerCase().includes('acesso negado')) {
      return {
        code: ERROR_CODES.RLS_VIOLATION,
        message: 'Você pode ter perdido acesso a este estabelecimento. Atualizando contexto...',
        action: 'refreshVenue',
        shouldRefreshVenue: true,
        originalError: error,
      };
    }

    // Outro erro de permissão
    return {
      code: ERROR_CODES.RLS_VIOLATION,
      message: errorMessage || 'Você não tem permissão para realizar esta ação.',
      action: 'refreshVenue',
      shouldRefreshVenue: true,
      originalError: error,
    };
  }

  // Recurso não encontrado (404)
  if (status === 404) {
    return {
      code: ERROR_CODES.VENUE_NOT_FOUND,
      message: errorMessage || 'Recurso não encontrado.',
      action: 'none',
      shouldRefreshVenue: false,
      originalError: error,
    };
  }

  // Conflito (409)
  if (status === 409) {
    return {
      code: ERROR_CODES.CONFLICT,
      message: errorMessage || 'Conflito de horário detectado.',
      action: 'none',
      shouldRefreshVenue: false,
      originalError: error,
    };
  }

  // Erro de validação (400)
  if (status === 400) {
    return {
      code: ERROR_CODES.VALIDATION,
      message: errorMessage || 'Dados inválidos. Verifique os campos e tente novamente.',
      action: 'none',
      shouldRefreshVenue: false,
      originalError: error,
    };
  }

  // Erro genérico
  return {
    code: ERROR_CODES.UNKNOWN,
    message: errorMessage || 'Ocorreu um erro inesperado. Tente novamente.',
    action: 'none',
    shouldRefreshVenue: false,
    originalError: error,
  };
};

/**
 * Valida email
 * @param {string} email - Email a ser validado
 * @returns {{ valid: boolean, message?: string }}
 */
const validateEmail = (email) => {
  if (!email) return { valid: true }; // Opcional

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailRegex.test(email)) {
    return {
      valid: false,
      message: 'Email inválido. Use o formato: exemplo@dominio.com'
    };
  }

  return { valid: true };
};

/**
 * Calcula horas entre duas datas (arredonda para cima)
 * @param {Date} start - Data de início
 * @param {Date} end - Data de fim
 * @returns {number} - Número de horas (arredondado para cima)
 */
const calculateHours = (start, end) => {
  const milliseconds = end.getTime() - start.getTime();
  return Math.ceil(milliseconds / (1000 * 60 * 60));
};

/**
 * Hook personalizado para gerenciar Reservas
 * Inclui tratamento melhorado de erros RLS/IDOR
 */
export const useBookings = () => {
  const { user, logout } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errorInfo, setErrorInfo] = useState(null); // Informações detalhadas do erro
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Ref para evitar recargas desnecessárias durante refresh de venue
  const isRefreshingVenue = useRef(false);

  /**
   * Trata erros de autenticação/autorização
   * Executa ação apropriada baseada no tipo de erro
   */
  const handleAuthError = useCallback(async (error) => {
    const analyzed = analyzeError(error);

    // Atualizar estado de erro com informações detalhadas
    setErrorInfo(analyzed);
    setError(analyzed.message);

    // Executar ação baseada no tipo de erro
    switch (analyzed.action) {
      case 'logout':
        console.warn('[useBookings] Sessão expirada - redirecionando para login');
        // Pequeno delay para mostrar mensagem antes de redirecionar
        setTimeout(() => {
          logout();
        }, 1500);
        break;

      case 'refreshVenue':
        console.warn('[useBookings] Violação de RLS/IDOR detectada - atualizando contexto');
        if (!isRefreshingVenue.current) {
          isRefreshingVenue.current = true;
          try {
            // Limpar localStorage do venue potencialmente inválido
            localStorage.removeItem('currentVenueId');

            // Recarregar dados para verificar acesso
            await loadBookings();
          } finally {
            isRefreshingVenue.current = false;
          }
        }
        break;

      case 'retry':
        console.warn('[useBookings] Erro de rede - sugerindo retry');
        break;

      default:
        // Nenhuma ação especial necessária
        break;
    }

    return analyzed;
  }, [logout]);

  /**
   * Carrega reservas do backend
   */
  const loadBookings = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      setError(null);
      setErrorInfo(null);

      const response = await api.get('/reservations', { params });
      setBookings(response.data?.data || response.data || []);
    } catch (err) {
      console.error('Erro ao buscar reservas:', err);

      // Usar o handler de erro aprimorado
      const analyzed = await handleAuthError(err);

      // Se for erro de sessão ou RLS, não definir bookings vazio
      // pois pode ser temporário
      if (analyzed.code !== ERROR_CODES.SESSION_EXPIRED &&
          analyzed.code !== ERROR_CODES.RLS_VIOLATION) {
        setBookings([]);
      }
    } finally {
      setLoading(false);
    }
  }, [handleAuthError]);

  useEffect(() => {
    if (user) {
      loadBookings();
    }
  }, [user, loadBookings]);

  /**
   * Verifica conflitos de horário para um recurso
   * @param {string} resourceId - ID do recurso
   * @param {Date} startTime - Horário de início
   * @param {Date} endTime - Horário de fim
   * @param {string} excludeBookingId - ID da reserva a excluir da verificação (para updates)
   * @returns {Promise<{ hasConflict: boolean, conflictingBooking?: Object }>}
   */
  const checkConflict = async (resourceId, startTime, endTime, excludeBookingId = null) => {
    try {
      const response = await api.get('/reservations/check-conflict', {
        params: {
          resourceId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          excludeId: excludeBookingId
        }
      });

      return {
        hasConflict: response.data.hasConflict,
        conflictingBooking: response.data.conflictingBooking
      };
    } catch (err) {
      console.error('Erro ao verificar conflitos de reserva:', err);

      // Fallback: verificar localmente se a API falhar
      const localConflicts = bookings.filter(booking => {
        if (excludeBookingId && booking.id === excludeBookingId) return false;
        if (booking.resourceId !== resourceId) return false;
        if (booking.status === 'CANCELLED') return false;

        const bookingStart = new Date(booking.startTime);
        const bookingEnd = new Date(booking.endTime);

        // Verifica sobreposição de horários
        return (startTime < bookingEnd && endTime > bookingStart);
      });

      if (localConflicts.length > 0) {
        console.warn('Conflito detectado (local):', localConflicts[0]);
        return {
          hasConflict: true,
          conflictingBooking: localConflicts[0]
        };
      }

      return { hasConflict: false };
    }
  };

  /**
   * Cria uma nova reserva com validação de conflitos
   * @param {Object} bookingData - Dados da reserva
   * @returns {Promise<Object>} - Reserva criada
   */
  const createBooking = async (bookingData) => {
    // Prevenir double submit
    if (isCreating) {
      throw new Error('Aguarde, já existe uma criação em andamento.');
    }

    // ========================================
    // VALIDAÇÕES COMPLETAS
    // ========================================

    // 1. Validação de campos obrigatórios
    if (!bookingData.resourceId) {
      throw new Error('Recurso é obrigatório');
    }

    if (!bookingData.startTime) {
      throw new Error('Horário de início é obrigatório');
    }

    if (!bookingData.clientId && !bookingData.customerName?.trim()) {
      throw new Error('Cliente ou nome do cliente é obrigatório');
    }

    // 2. Validar email se fornecido
    if (bookingData.customerEmail) {
      const emailValidation = validateEmail(bookingData.customerEmail);
      if (!emailValidation.valid) {
        throw new Error(emailValidation.message);
      }
    }

    // 3. Validar e converter datas
    const startDate = new Date(bookingData.startTime);
    const duration = bookingData.durationInHours || 1;
    const endDate = new Date(startDate.getTime() + (duration * 60 * 60 * 1000));

    if (isNaN(startDate.getTime())) {
      throw new Error('Data de início inválida. Verifique o horário informado.');
    }

    // 4. Validar que end > start
    if (endDate <= startDate) {
      throw new Error('O horário de término deve ser posterior ao horário de início');
    }

    // 5. Validar que não é no passado
    const now = new Date();
    if (startDate < now) {
      throw new Error('Não é possível criar reserva com horário no passado');
    }

    // 6. Verificar conflitos (AUTOMÁTICO)
    const { hasConflict, conflictingBooking } = await checkConflict(
      bookingData.resourceId,
      startDate,
      endDate
    );

    if (hasConflict) {
      const conflictInfo = conflictingBooking
        ? ` (conflito com reserva de ${conflictingBooking.client?.fullName || 'outro cliente'})`
        : '';
      throw new Error(`Já existe uma reserva para este recurso neste horário${conflictInfo}. Por favor, escolha outro horário ou recurso.`);
    }

    // 7. Calcular valores
    const hours = calculateHours(startDate, endDate);
    const pricePerHour = bookingData.pricePerHour || 0;
    const spaceTotal = hours * pricePerHour;
    const itemsTotal = bookingData.itemsTotal || 0;
    const grandTotal = spaceTotal + itemsTotal;

    console.log(`📊 Cálculo de reserva: ${hours}h × R$ ${pricePerHour} = R$ ${spaceTotal}`);

    setIsCreating(true);
    setError(null);
    setErrorInfo(null);

    try {
      const preparedData = {
        ...bookingData,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        durationInHours: duration,
        spaceTotal,
        itemsTotal,
        grandTotal,
        status: bookingData.status || 'CONFIRMED'
      };

      const response = await api.post('/reservations', preparedData);

      // Atualizar lista local
      setBookings(prev => [response.data, ...prev]);

      return response.data;
    } catch (err) {
      console.error('Erro ao criar reserva:', err);

      // Usar handler de erro aprimorado
      const analyzed = await handleAuthError(err);

      // Se não for erro de segurança, lançar erro normal
      if (analyzed.code === ERROR_CODES.SESSION_EXPIRED ||
          analyzed.code === ERROR_CODES.RLS_VIOLATION ||
          analyzed.code === ERROR_CODES.IDOR_ACCESS_DENIED) {
        throw new Error(analyzed.message);
      }

      throw new Error(err.response?.data?.error || 'Ocorreu um erro ao criar a reserva. Por favor, tente novamente.');
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * Atualiza uma reserva existente
   * @param {string} id - ID da reserva
   * @param {Object} updates - Dados a serem atualizados
   * @returns {Promise<Object>} - Reserva atualizada
   */
  const updateBooking = async (id, updates) => {
    // Prevenir double submit
    if (isUpdating) {
      throw new Error('Aguarde, já existe uma atualização em andamento.');
    }

    if (!id) {
      throw new Error('ID da reserva é obrigatório para atualização');
    }

    // ========================================
    // VALIDAÇÕES DE CAMPOS (se estiverem sendo atualizados)
    // ========================================

    if (updates.customerEmail) {
      const emailValidation = validateEmail(updates.customerEmail);
      if (!emailValidation.valid) {
        throw new Error(emailValidation.message);
      }
    }

    // Verificar conflitos se horários ou recurso mudaram
    if (updates.resourceId || updates.startTime || updates.durationInHours) {
      // Buscar reserva atual
      const currentBooking = bookings.find(b => b.id === id);
      if (!currentBooking) {
        throw new Error('Reserva não encontrada');
      }

      const resourceId = updates.resourceId || currentBooking.resourceId;
      const startTime = updates.startTime ? new Date(updates.startTime) : new Date(currentBooking.startTime);
      const duration = updates.durationInHours || currentBooking.durationInHours || 1;
      const endTime = new Date(startTime.getTime() + (duration * 60 * 60 * 1000));

      // Validar que end > start
      if (endTime <= startTime) {
        throw new Error('O horário de término deve ser posterior ao horário de início');
      }

      // Verificar conflitos (excluindo a própria reserva)
      const { hasConflict } = await checkConflict(
        resourceId,
        startTime,
        endTime,
        id // Excluir a própria reserva da verificação
      );

      if (hasConflict) {
        throw new Error('Já existe outra reserva neste horário');
      }

      // Recalcular valores
      const hours = calculateHours(startTime, endTime);
      const pricePerHour = updates.pricePerHour || currentBooking.resource?.pricePerHour || 0;
      updates.spaceTotal = hours * pricePerHour;
      updates.grandTotal = (updates.spaceTotal || 0) + (updates.itemsTotal || currentBooking.itemsTotal || 0);
      updates.endTime = endTime.toISOString();
    }

    setIsUpdating(true);
    setError(null);
    setErrorInfo(null);

    try {
      const response = await api.put(`/reservations/${id}`, updates);

      // Atualizar lista local
      setBookings(prev => prev.map(booking =>
        booking.id === id ? response.data : booking
      ));

      return response.data;
    } catch (err) {
      console.error('Erro ao atualizar reserva:', err);

      // Usar handler de erro aprimorado
      const analyzed = await handleAuthError(err);

      throw new Error(analyzed.message || 'Não foi possível atualizar a reserva. Tente novamente.');
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Cancela uma reserva
   * @param {string} id - ID da reserva
   */
  const cancelBooking = async (id) => {
    // Prevenir double submit
    if (isDeleting) {
      throw new Error('Aguarde, já existe um cancelamento em andamento.');
    }

    if (!id) {
      throw new Error('ID da reserva é obrigatório para cancelamento');
    }

    setIsDeleting(true);
    setError(null);
    setErrorInfo(null);

    try {
      await api.delete(`/reservations/${id}`);

      // Atualizar lista local (marcar como cancelada ou remover)
      setBookings(prev => prev.map(booking =>
        booking.id === id ? { ...booking, status: 'CANCELLED' } : booking
      ));
    } catch (err) {
      console.error('Erro ao cancelar reserva:', err);

      // Tratar erro específico de comanda aberta
      if (err.response?.data?.error?.includes('comanda aberta')) {
        throw new Error('Esta reserva possui uma comanda aberta. Feche a comanda antes de cancelar.');
      }

      // Usar handler de erro aprimorado
      const analyzed = await handleAuthError(err);

      throw new Error(analyzed.message || 'Não foi possível cancelar a reserva. Tente novamente.');
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Cancela múltiplas reservas
   * @param {Array<string>} ids - IDs das reservas
   */
  const cancelMultipleBookings = async (ids) => {
    if (!ids || ids.length === 0) {
      throw new Error('Selecione ao menos uma reserva para cancelar');
    }

    setIsDeleting(true);
    setError(null);
    setErrorInfo(null);

    try {
      await api.post('/reservations/cancel-multiple', { reservationIds: ids });

      // Atualizar lista local
      setBookings(prev => prev.map(booking =>
        ids.includes(booking.id) ? { ...booking, status: 'CANCELLED' } : booking
      ));
    } catch (err) {
      console.error('Erro ao cancelar reservas:', err);

      // Usar handler de erro aprimorado
      const analyzed = await handleAuthError(err);

      throw new Error(analyzed.message || 'Não foi possível cancelar as reservas. Tente novamente.');
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Cancela grupo de reservas recorrentes
   * @param {string} groupId - ID do grupo recorrente
   */
  const cancelRecurringGroup = async (groupId) => {
    if (!groupId) {
      throw new Error('ID do grupo é obrigatório');
    }

    setIsDeleting(true);
    setError(null);
    setErrorInfo(null);

    try {
      await api.delete(`/reservations/recurring-group/${groupId}`);

      // Recarregar lista
      await loadBookings();
    } catch (err) {
      console.error('Erro ao cancelar grupo de reservas:', err);

      // Usar handler de erro aprimorado
      const analyzed = await handleAuthError(err);

      throw new Error(analyzed.message || 'Não foi possível cancelar o grupo de reservas.');
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Busca reservas de um recurso específico em uma data
   * @param {string} resourceId - ID do recurso
   * @param {string} date - Data no formato YYYY-MM-DD
   * @returns {Array} - Lista de reservas
   */
  const getBookingsByResourceAndDate = (resourceId, date) => {
    return bookings.filter(booking => {
      if (booking.resourceId !== resourceId) return false;
      if (booking.status === 'CANCELLED') return false;

      const bookingDate = new Date(booking.startTime).toISOString().split('T')[0];
      return bookingDate === date;
    });
  };

  /**
   * Verifica disponibilidade de um horário
   * @param {string} resourceId - ID do recurso
   * @param {Date} startTime - Horário de início
   * @param {number} durationInHours - Duração em horas
   * @returns {boolean} - true se disponível
   */
  const isSlotAvailable = async (resourceId, startTime, durationInHours) => {
    const endTime = new Date(startTime.getTime() + (durationInHours * 60 * 60 * 1000));
    const { hasConflict } = await checkConflict(resourceId, startTime, endTime);
    return !hasConflict;
  };

  /**
   * Limpa o estado de erro
   */
  const clearError = () => {
    setError(null);
    setErrorInfo(null);
  };

  return {
    // Dados
    bookings,
    isLoading: loading,
    error,
    errorInfo, // Informações detalhadas do erro para UI mais inteligente

    // Ações
    createBooking,
    isCreating,
    updateBooking,
    isUpdating,
    cancelBooking,
    isDeleting,
    cancelMultipleBookings,
    cancelRecurringGroup,

    // Utilitários
    refetch: loadBookings,
    checkConflict,
    getBookingsByResourceAndDate,
    isSlotAvailable,
    calculateHours,
    clearError,
    handleAuthError, // Expor para uso externo se necessário

    // Constantes
    ERROR_CODES,
  };
};

export default useBookings;
