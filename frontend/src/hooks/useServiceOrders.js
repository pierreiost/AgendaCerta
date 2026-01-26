// frontend/src/hooks/useServiceOrders.js
// Hook para gerenciamento de Ordens de Servi\u00e7o com valida\u00e7\u00f5es completas

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

/**
 * Valida CPF (11 d\u00edgitos)
 * @param {string} cpf - CPF a ser validado
 * @returns {boolean} - true se v\u00e1lido
 */
const validateCPF = (cpf) => {
  if (!cpf) return true; // Opcional

  const cleanCPF = cpf.replace(/\D/g, '');

  if (cleanCPF.length !== 11) {
    return false;
  }

  // Verifica se todos os d\u00edgitos s\u00e3o iguais
  if (/^(\d)\1+$/.test(cleanCPF)) {
    return false;
  }

  // Valida d\u00edgitos verificadores
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.charAt(9))) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.charAt(10))) return false;

  return true;
};

/**
 * Valida CNPJ (14 d\u00edgitos)
 * @param {string} cnpj - CNPJ a ser validado
 * @returns {boolean} - true se v\u00e1lido
 */
const validateCNPJ = (cnpj) => {
  if (!cnpj) return true; // Opcional

  const cleanCNPJ = cnpj.replace(/\D/g, '');

  if (cleanCNPJ.length !== 14) {
    return false;
  }

  // Verifica se todos os d\u00edgitos s\u00e3o iguais
  if (/^(\d)\1+$/.test(cleanCNPJ)) {
    return false;
  }

  return true;
};

/**
 * Valida CPF ou CNPJ
 * @param {string} document - Documento a ser validado
 * @returns {{ valid: boolean, message?: string }}
 */
const validateDocument = (document) => {
  if (!document) return { valid: true };

  const cleanDoc = document.replace(/\D/g, '');

  if (cleanDoc.length === 11) {
    if (!validateCPF(cleanDoc)) {
      return { valid: false, message: 'CPF inv\u00e1lido. Verifique os d\u00edgitos informados.' };
    }
  } else if (cleanDoc.length === 14) {
    if (!validateCNPJ(cleanDoc)) {
      return { valid: false, message: 'CNPJ inv\u00e1lido. Verifique os d\u00edgitos informados.' };
    }
  } else {
    return {
      valid: false,
      message: `CPF deve ter 11 d\u00edgitos ou CNPJ deve ter 14 d\u00edgitos. Documento informado: ${cleanDoc.length} d\u00edgitos.`
    };
  }

  return { valid: true };
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
      message: 'Email inv\u00e1lido. Por favor, insira um email no formato correto (exemplo@dominio.com).'
    };
  }

  return { valid: true };
};

/**
 * Hook personalizado para gerenciar Ordens de Servi\u00e7o
 */
export const useServiceOrders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  /**
   * Carrega ordens de servi\u00e7o do backend
   */
  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get('/service-orders', {
        params: {
          limit: 100 // Limitar para performance
        }
      });

      setOrders(response.data || []);
    } catch (err) {
      console.error('Erro ao buscar ordens de servi\u00e7o:', err);
      setError(err.response?.data?.error || 'Erro ao carregar ordens de servi\u00e7o');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [user, loadOrders]);

  /**
   * Cria uma nova ordem de servi\u00e7o
   * @param {Object} orderData - Dados da ordem de servi\u00e7o
   * @returns {Promise<Object>} - Ordem criada
   */
  const createOrder = async (orderData) => {
    // Prevenir double submit
    if (isCreating) {
      throw new Error('Aguarde, j\u00e1 existe uma cria\u00e7\u00e3o em andamento.');
    }

    // ========================================
    // VALIDA\u00c7\u00d5ES COMPLETAS
    // ========================================

    // 1. Valida\u00e7\u00e3o de campos obrigat\u00f3rios
    if (!orderData.customerName?.trim()) {
      throw new Error('Nome do cliente \u00e9 obrigat\u00f3rio');
    }

    if (!orderData.description?.trim()) {
      throw new Error('Descri\u00e7\u00e3o do servi\u00e7o \u00e9 obrigat\u00f3ria');
    }

    // 2. Validar CPF/CNPJ se fornecido
    if (orderData.customerDocument) {
      const docValidation = validateDocument(orderData.customerDocument);
      if (!docValidation.valid) {
        throw new Error(docValidation.message);
      }
    }

    // 3. Validar email se fornecido
    if (orderData.customerEmail) {
      const emailValidation = validateEmail(orderData.customerEmail);
      if (!emailValidation.valid) {
        throw new Error(emailValidation.message);
      }
    }

    // 4. Validar telefone se fornecido
    if (orderData.customerPhone) {
      const cleanPhone = orderData.customerPhone.replace(/\D/g, '');
      if (cleanPhone.length < 10 || cleanPhone.length > 11) {
        throw new Error('Telefone inv\u00e1lido. Deve ter 10 ou 11 d\u00edgitos.');
      }
    }

    // 5. Garantir consist\u00eancia de status baseado no tipo de OS
    const preparedData = { ...orderData };
    if (preparedData.orderType === 'simple' || !preparedData.orderType) {
      preparedData.orderType = 'simple';
      preparedData.statusComplete = null;
      preparedData.statusSimple = preparedData.statusSimple || 'open';
    } else {
      preparedData.statusSimple = null;
      preparedData.statusComplete = preparedData.statusComplete || 'draft';
    }

    // 6. Valores num\u00e9ricos
    preparedData.subtotal = preparedData.subtotal || 0;
    preparedData.discount = preparedData.discount || 0;
    preparedData.taxRate = preparedData.taxRate || (preparedData.orderType === 'complete' ? 0.05 : 0);

    setIsCreating(true);

    try {
      const response = await api.post('/service-orders', preparedData);

      // Atualizar lista local
      setOrders(prev => [response.data, ...prev]);

      return response.data;
    } catch (err) {
      console.error('Erro ao criar OS:', err);
      throw new Error(err.response?.data?.error || 'Ocorreu um erro ao criar a Ordem de Servi\u00e7o. Por favor, tente novamente.');
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * Atualiza uma ordem de servi\u00e7o existente
   * @param {string} id - ID da ordem
   * @param {Object} updates - Dados a serem atualizados
   * @returns {Promise<Object>} - Ordem atualizada
   */
  const updateOrder = async (id, updates) => {
    // Prevenir double submit
    if (isUpdating) {
      throw new Error('Aguarde, j\u00e1 existe uma atualiza\u00e7\u00e3o em andamento.');
    }

    if (!id) {
      throw new Error('ID da ordem \u00e9 obrigat\u00f3rio para atualiza\u00e7\u00e3o');
    }

    // ========================================
    // VALIDA\u00c7\u00d5ES DE CAMPOS (se estiverem sendo atualizados)
    // ========================================

    if (updates.customerDocument) {
      const docValidation = validateDocument(updates.customerDocument);
      if (!docValidation.valid) {
        throw new Error(docValidation.message);
      }
    }

    if (updates.customerEmail) {
      const emailValidation = validateEmail(updates.customerEmail);
      if (!emailValidation.valid) {
        throw new Error(emailValidation.message);
      }
    }

    // Garantir consist\u00eancia de status
    const updateData = { ...updates };
    if (updateData.orderType === 'simple') {
      updateData.statusComplete = null;
      if (!updateData.statusSimple) {
        updateData.statusSimple = 'open';
      }
    } else if (updateData.orderType === 'complete') {
      updateData.statusSimple = null;
      if (!updateData.statusComplete) {
        updateData.statusComplete = 'draft';
      }
    }

    setIsUpdating(true);

    try {
      const response = await api.put(`/service-orders/${id}`, updateData);

      // Atualizar lista local
      setOrders(prev => prev.map(order =>
        order.id === id ? response.data : order
      ));

      return response.data;
    } catch (err) {
      console.error('Erro ao atualizar OS:', err);
      throw new Error(err.response?.data?.error || 'N\u00e3o foi poss\u00edvel atualizar a OS. Tente novamente.');
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Exclui uma ordem de servi\u00e7o
   * @param {string} id - ID da ordem
   */
  const deleteOrder = async (id) => {
    // Prevenir double submit
    if (isDeleting) {
      throw new Error('Aguarde, j\u00e1 existe uma exclus\u00e3o em andamento.');
    }

    if (!id) {
      throw new Error('ID da ordem \u00e9 obrigat\u00f3rio para exclus\u00e3o');
    }

    setIsDeleting(true);

    try {
      await api.delete(`/service-orders/${id}`);

      // Remover da lista local
      setOrders(prev => prev.filter(order => order.id !== id));
    } catch (err) {
      console.error('Erro ao excluir OS:', err);
      throw new Error(err.response?.data?.error || 'N\u00e3o foi poss\u00edvel excluir a OS. Tente novamente.');
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Adiciona um item \u00e0 ordem de servi\u00e7o
   * @param {string} orderId - ID da ordem
   * @param {Object} item - Dados do item
   * @returns {Promise<Object>} - Item adicionado
   */
  const addItem = async (orderId, item) => {
    // Valida\u00e7\u00f5es
    if (!item.description?.trim()) {
      throw new Error('Descri\u00e7\u00e3o do item \u00e9 obrigat\u00f3ria');
    }

    if (!item.quantity || item.quantity < 1) {
      throw new Error('Quantidade deve ser no m\u00ednimo 1');
    }

    if (item.unitPrice === undefined || item.unitPrice === null || item.unitPrice < 0) {
      throw new Error('Pre\u00e7o unit\u00e1rio n\u00e3o pode ser negativo');
    }

    // Calcular subtotal automaticamente
    const subtotal = item.quantity * item.unitPrice;

    const itemData = {
      ...item,
      subtotal,
      serviceOrderId: orderId
    };

    try {
      const response = await api.post(`/service-orders/${orderId}/items`, itemData);

      // Recarregar ordens para atualizar totais
      await loadOrders();

      return response.data;
    } catch (err) {
      console.error('Erro ao adicionar item:', err);
      throw new Error(err.response?.data?.error || 'N\u00e3o foi poss\u00edvel adicionar o item. Tente novamente.');
    }
  };

  /**
   * Atualiza um item da ordem de servi\u00e7o
   * @param {string} orderId - ID da ordem
   * @param {string} itemId - ID do item
   * @param {Object} updates - Dados a serem atualizados
   * @returns {Promise<Object>} - Item atualizado
   */
  const updateItem = async (orderId, itemId, updates) => {
    // Valida\u00e7\u00f5es
    if (updates.quantity !== undefined && updates.quantity < 1) {
      throw new Error('Quantidade deve ser no m\u00ednimo 1');
    }

    if (updates.unitPrice !== undefined && updates.unitPrice < 0) {
      throw new Error('Pre\u00e7o unit\u00e1rio n\u00e3o pode ser negativo');
    }

    // Recalcular subtotal se necess\u00e1rio
    const updateData = { ...updates };
    if (updates.quantity !== undefined || updates.unitPrice !== undefined) {
      // Buscar item atual para calcular
      const currentOrder = orders.find(o => o.id === orderId);
      const currentItem = currentOrder?.items?.find(i => i.id === itemId);

      if (currentItem) {
        const newQuantity = updates.quantity ?? currentItem.quantity;
        const newPrice = updates.unitPrice ?? currentItem.unitPrice;
        updateData.subtotal = newQuantity * newPrice;
      }
    }

    try {
      const response = await api.put(`/service-orders/${orderId}/items/${itemId}`, updateData);

      // Recarregar ordens para atualizar totais
      await loadOrders();

      return response.data;
    } catch (err) {
      console.error('Erro ao atualizar item:', err);
      throw new Error(err.response?.data?.error || 'N\u00e3o foi poss\u00edvel atualizar o item. Tente novamente.');
    }
  };

  /**
   * Remove um item da ordem de servi\u00e7o
   * @param {string} orderId - ID da ordem
   * @param {string} itemId - ID do item
   */
  const removeItem = async (orderId, itemId) => {
    try {
      await api.delete(`/service-orders/${orderId}/items/${itemId}`);

      // Recarregar ordens para atualizar totais
      await loadOrders();
    } catch (err) {
      console.error('Erro ao remover item:', err);
      throw new Error(err.response?.data?.error || 'N\u00e3o foi poss\u00edvel remover o item. Tente novamente.');
    }
  };

  /**
   * Busca itens de uma ordem espec\u00edfica
   * @param {string} orderId - ID da ordem
   * @returns {Array} - Lista de itens
   */
  const getOrderItems = (orderId) => {
    const order = orders.find(o => o.id === orderId);
    return order?.items || [];
  };

  return {
    // Dados
    orders,
    isLoading: loading,
    error,

    // A\u00e7\u00f5es de ordem
    createOrder,
    isCreating,
    updateOrder,
    isUpdating,
    deleteOrder,
    isDeleting,

    // A\u00e7\u00f5es de itens
    addItem,
    updateItem,
    removeItem,
    getOrderItems,

    // Utilit\u00e1rios
    refetch: loadOrders,

    // Valida\u00e7\u00f5es exportadas para uso externo
    validateDocument,
    validateEmail,
    validateCPF,
    validateCNPJ,
  };
};

export default useServiceOrders;
