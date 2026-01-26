// frontend/src/hooks/useBookings.js
// Hook para gerenciamento de Reservas com valida\u00e7\u00e3o de conflitos autom\u00e1tica

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

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
      message: 'Email inv\u00e1lido. Use o formato: exemplo@dominio.com'
    };
  }

  return { valid: true };
};

/**
 * Calcula horas entre duas datas (arredonda para cima)
 * @param {Date} start - Data de in\u00edcio
 * @param {Date} end - Data de fim
 * @returns {number} - N\u00famero de horas (arredondado para cima)
 */
const calculateHours = (start, end) => {
  const milliseconds = end.getTime() - start.getTime();
  return Math.ceil(milliseconds / (1000 * 60 * 60));
};

/**
 * Hook personalizado para gerenciar Reservas
 */
export const useBookings = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  /**
   * Carrega reservas do backend
   */
  const loadBookings = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get('/reservations', { params });
      setBookings(response.data || []);
    } catch (err) {
      console.error('Erro ao buscar reservas:', err);
      setError(err.response?.data?.error || 'Erro ao carregar reservas');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadBookings();
    }
  }, [user, loadBookings]);

  /**
   * Verifica conflitos de hor\u00e1rio para um recurso
   * @param {string} resourceId - ID do recurso
   * @param {Date} startTime - Hor\u00e1rio de in\u00edcio
   * @param {Date} endTime - Hor\u00e1rio de fim
   * @param {string} excludeBookingId - ID da reserva a excluir da verifica\u00e7\u00e3o (para updates)
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

        // Verifica sobreposi\u00e7\u00e3o de hor\u00e1rios
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
   * Cria uma nova reserva com valida\u00e7\u00e3o de conflitos
   * @param {Object} bookingData - Dados da reserva
   * @returns {Promise<Object>} - Reserva criada
   */
  const createBooking = async (bookingData) => {
    // Prevenir double submit
    if (isCreating) {
      throw new Error('Aguarde, j\u00e1 existe uma cria\u00e7\u00e3o em andamento.');
    }

    // ========================================
    // VALIDA\u00c7\u00d5ES COMPLETAS
    // ========================================

    // 1. Valida\u00e7\u00e3o de campos obrigat\u00f3rios
    if (!bookingData.resourceId) {
      throw new Error('Recurso \u00e9 obrigat\u00f3rio');
    }

    if (!bookingData.startTime) {
      throw new Error('Hor\u00e1rio de in\u00edcio \u00e9 obrigat\u00f3rio');
    }

    if (!bookingData.clientId && !bookingData.customerName?.trim()) {
      throw new Error('Cliente ou nome do cliente \u00e9 obrigat\u00f3rio');
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
      throw new Error('Data de in\u00edcio inv\u00e1lida. Verifique o hor\u00e1rio informado.');
    }

    // 4. Validar que end > start
    if (endDate <= startDate) {
      throw new Error('O hor\u00e1rio de t\u00e9rmino deve ser posterior ao hor\u00e1rio de in\u00edcio');
    }

    // 5. Validar que n\u00e3o \u00e9 no passado
    const now = new Date();
    if (startDate < now) {
      throw new Error('N\u00e3o \u00e9 poss\u00edvel criar reserva com hor\u00e1rio no passado');
    }

    // 6. Verificar conflitos (AUTOM\u00c1TICO)
    const { hasConflict, conflictingBooking } = await checkConflict(
      bookingData.resourceId,
      startDate,
      endDate
    );

    if (hasConflict) {
      const conflictInfo = conflictingBooking
        ? ` (conflito com reserva de ${conflictingBooking.client?.fullName || 'outro cliente'})`
        : '';
      throw new Error(`J\u00e1 existe uma reserva para este recurso neste hor\u00e1rio${conflictInfo}. Por favor, escolha outro hor\u00e1rio ou recurso.`);
    }

    // 7. Calcular valores
    const hours = calculateHours(startDate, endDate);
    const pricePerHour = bookingData.pricePerHour || 0;
    const spaceTotal = hours * pricePerHour;
    const itemsTotal = bookingData.itemsTotal || 0;
    const grandTotal = spaceTotal + itemsTotal;

    console.log(`\uD83D\uDCCA C\u00e1lculo de reserva: ${hours}h \u00d7 R$ ${pricePerHour} = R$ ${spaceTotal}`);

    setIsCreating(true);

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
      throw new Error('Aguarde, j\u00e1 existe uma atualiza\u00e7\u00e3o em andamento.');
    }

    if (!id) {
      throw new Error('ID da reserva \u00e9 obrigat\u00f3rio para atualiza\u00e7\u00e3o');
    }

    // ========================================
    // VALIDA\u00c7\u00d5ES DE CAMPOS (se estiverem sendo atualizados)
    // ========================================

    if (updates.customerEmail) {
      const emailValidation = validateEmail(updates.customerEmail);
      if (!emailValidation.valid) {
        throw new Error(emailValidation.message);
      }
    }

    // Verificar conflitos se hor\u00e1rios ou recurso mudaram
    if (updates.resourceId || updates.startTime || updates.durationInHours) {
      // Buscar reserva atual
      const currentBooking = bookings.find(b => b.id === id);
      if (!currentBooking) {
        throw new Error('Reserva n\u00e3o encontrada');
      }

      const resourceId = updates.resourceId || currentBooking.resourceId;
      const startTime = updates.startTime ? new Date(updates.startTime) : new Date(currentBooking.startTime);
      const duration = updates.durationInHours || currentBooking.durationInHours || 1;
      const endTime = new Date(startTime.getTime() + (duration * 60 * 60 * 1000));

      // Validar que end > start
      if (endTime <= startTime) {
        throw new Error('O hor\u00e1rio de t\u00e9rmino deve ser posterior ao hor\u00e1rio de in\u00edcio');
      }

      // Verificar conflitos (excluindo a pr\u00f3pria reserva)
      const { hasConflict } = await checkConflict(
        resourceId,
        startTime,
        endTime,
        id // Excluir a pr\u00f3pria reserva da verifica\u00e7\u00e3o
      );

      if (hasConflict) {
        throw new Error('J\u00e1 existe outra reserva neste hor\u00e1rio');
      }

      // Recalcular valores
      const hours = calculateHours(startTime, endTime);
      const pricePerHour = updates.pricePerHour || currentBooking.resource?.pricePerHour || 0;
      updates.spaceTotal = hours * pricePerHour;
      updates.grandTotal = (updates.spaceTotal || 0) + (updates.itemsTotal || currentBooking.itemsTotal || 0);
      updates.endTime = endTime.toISOString();
    }

    setIsUpdating(true);

    try {
      const response = await api.put(`/reservations/${id}`, updates);

      // Atualizar lista local
      setBookings(prev => prev.map(booking =>
        booking.id === id ? response.data : booking
      ));

      return response.data;
    } catch (err) {
      console.error('Erro ao atualizar reserva:', err);
      throw new Error(err.response?.data?.error || 'N\u00e3o foi poss\u00edvel atualizar a reserva. Tente novamente.');
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
      throw new Error('Aguarde, j\u00e1 existe um cancelamento em andamento.');
    }

    if (!id) {
      throw new Error('ID da reserva \u00e9 obrigat\u00f3rio para cancelamento');
    }

    setIsDeleting(true);

    try {
      await api.delete(`/reservations/${id}`);

      // Atualizar lista local (marcar como cancelada ou remover)
      setBookings(prev => prev.map(booking =>
        booking.id === id ? { ...booking, status: 'CANCELLED' } : booking
      ));
    } catch (err) {
      console.error('Erro ao cancelar reserva:', err);

      // Tratar erro espec\u00edfico de comanda aberta
      if (err.response?.data?.error?.includes('comanda aberta')) {
        throw new Error('Esta reserva possui uma comanda aberta. Feche a comanda antes de cancelar.');
      }

      throw new Error(err.response?.data?.error || 'N\u00e3o foi poss\u00edvel cancelar a reserva. Tente novamente.');
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Cancela m\u00faltiplas reservas
   * @param {Array<string>} ids - IDs das reservas
   */
  const cancelMultipleBookings = async (ids) => {
    if (!ids || ids.length === 0) {
      throw new Error('Selecione ao menos uma reserva para cancelar');
    }

    setIsDeleting(true);

    try {
      await api.post('/reservations/cancel-multiple', { reservationIds: ids });

      // Atualizar lista local
      setBookings(prev => prev.map(booking =>
        ids.includes(booking.id) ? { ...booking, status: 'CANCELLED' } : booking
      ));
    } catch (err) {
      console.error('Erro ao cancelar reservas:', err);
      throw new Error(err.response?.data?.error || 'N\u00e3o foi poss\u00edvel cancelar as reservas. Tente novamente.');
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
      throw new Error('ID do grupo \u00e9 obrigat\u00f3rio');
    }

    setIsDeleting(true);

    try {
      await api.delete(`/reservations/recurring-group/${groupId}`);

      // Recarregar lista
      await loadBookings();
    } catch (err) {
      console.error('Erro ao cancelar grupo de reservas:', err);
      throw new Error(err.response?.data?.error || 'N\u00e3o foi poss\u00edvel cancelar o grupo de reservas.');
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Busca reservas de um recurso espec\u00edfico em uma data
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
   * Verifica disponibilidade de um hor\u00e1rio
   * @param {string} resourceId - ID do recurso
   * @param {Date} startTime - Hor\u00e1rio de in\u00edcio
   * @param {number} durationInHours - Dura\u00e7\u00e3o em horas
   * @returns {boolean} - true se dispon\u00edvel
   */
  const isSlotAvailable = async (resourceId, startTime, durationInHours) => {
    const endTime = new Date(startTime.getTime() + (durationInHours * 60 * 60 * 1000));
    const { hasConflict } = await checkConflict(resourceId, startTime, endTime);
    return !hasConflict;
  };

  return {
    // Dados
    bookings,
    isLoading: loading,
    error,

    // A\u00e7\u00f5es
    createBooking,
    isCreating,
    updateBooking,
    isUpdating,
    cancelBooking,
    isDeleting,
    cancelMultipleBookings,
    cancelRecurringGroup,

    // Utilit\u00e1rios
    refetch: loadBookings,
    checkConflict,
    getBookingsByResourceAndDate,
    isSlotAvailable,
    calculateHours,
  };
};

export default useBookings;
