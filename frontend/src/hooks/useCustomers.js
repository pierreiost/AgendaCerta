// frontend/src/hooks/useCustomers.js
// Hook para gerenciamento de Clientes com valida\u00e7\u00f5es completas

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

// Tempo de cache em milissegundos (5 minutos)
const CACHE_STALE_TIME = 5 * 60 * 1000;

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
 * Valida telefone
 * @param {string} phone - Telefone a ser validado
 * @returns {{ valid: boolean, message?: string }}
 */
const validatePhone = (phone) => {
  if (!phone) return { valid: false, message: 'Telefone \u00e9 obrigat\u00f3rio' };

  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length < 10 || cleanPhone.length > 11) {
    return {
      valid: false,
      message: 'Telefone deve ter 10 ou 11 d\u00edgitos (com DDD)'
    };
  }

  return { valid: true };
};

/**
 * Hook personalizado para gerenciar Clientes
 */
export const useCustomers = () => {
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Cache control
  const lastFetchTime = useRef(null);
  const isFetching = useRef(false);

  /**
   * Carrega clientes do backend com cache
   */
  const loadCustomers = useCallback(async (forceRefresh = false) => {
    // Evitar requisi\u00e7\u00f5es duplicadas
    if (isFetching.current) return;

    // Verificar cache
    const now = Date.now();
    if (!forceRefresh && lastFetchTime.current && (now - lastFetchTime.current) < CACHE_STALE_TIME) {
      return; // Usar dados em cache
    }

    try {
      isFetching.current = true;
      setLoading(true);
      setError(null);

      const response = await api.get('/clients');

      setCustomers(response.data || []);
      lastFetchTime.current = now;
    } catch (err) {
      console.error('Erro ao carregar clientes:', err);
      setError(err.response?.data?.error || 'Erro ao carregar clientes');
      setCustomers([]);
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadCustomers();
    }
  }, [user, loadCustomers]);

  /**
   * Cria um novo cliente
   * @param {Object} customerData - Dados do cliente
   * @returns {Promise<Object>} - Cliente criado
   */
  const createCustomer = async (customerData) => {
    // Prevenir double submit
    if (isCreating) {
      throw new Error('Aguarde, j\u00e1 existe uma cria\u00e7\u00e3o em andamento.');
    }

    // ========================================
    // VALIDA\u00c7\u00d5ES COMPLETAS
    // ========================================

    // 1. Nome obrigat\u00f3rio
    if (!customerData.fullName?.trim()) {
      throw new Error('Nome completo \u00e9 obrigat\u00f3rio');
    }

    // 2. Telefone obrigat\u00f3rio e v\u00e1lido
    const phoneValidation = validatePhone(customerData.phone);
    if (!phoneValidation.valid) {
      throw new Error(phoneValidation.message);
    }

    // 3. Email v\u00e1lido (se fornecido)
    if (customerData.email) {
      const emailValidation = validateEmail(customerData.email);
      if (!emailValidation.valid) {
        throw new Error(emailValidation.message);
      }
    }

    // 4. CPF v\u00e1lido (se fornecido)
    if (customerData.cpf) {
      const cleanCPF = customerData.cpf.replace(/\D/g, '');
      if (!validateCPF(cleanCPF)) {
        throw new Error('CPF inv\u00e1lido. Verifique os d\u00edgitos informados.');
      }

      // Verificar CPF duplicado
      const existingCPF = customers.find(
        c => c.cpf && c.cpf.replace(/\D/g, '') === cleanCPF
      );
      if (existingCPF) {
        throw new Error(`J\u00e1 existe um cliente cadastrado com este CPF: ${existingCPF.fullName}`);
      }
    }

    // 5. Verificar telefone duplicado
    const cleanPhone = customerData.phone.replace(/\D/g, '');
    const existingPhone = customers.find(
      c => c.phone && c.phone.replace(/\D/g, '') === cleanPhone
    );
    if (existingPhone) {
      throw new Error(`J\u00e1 existe um cliente cadastrado com este telefone: ${existingPhone.fullName}`);
    }

    // 6. Verificar email duplicado (se fornecido)
    if (customerData.email) {
      const existingEmail = customers.find(
        c => c.email && c.email.toLowerCase().trim() === customerData.email.toLowerCase().trim()
      );
      if (existingEmail) {
        throw new Error(`J\u00e1 existe um cliente cadastrado com este email: ${existingEmail.fullName}`);
      }
    }

    setIsCreating(true);

    try {
      const response = await api.post('/clients', customerData);

      // Atualizar lista local
      setCustomers(prev => [...prev, response.data]);

      return response.data;
    } catch (err) {
      console.error('Erro ao criar cliente:', err);
      throw new Error(err.response?.data?.error || 'N\u00e3o foi poss\u00edvel criar o cliente. Verifique os dados e tente novamente.');
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * Atualiza um cliente existente
   * @param {string} id - ID do cliente
   * @param {Object} updates - Dados a serem atualizados
   * @returns {Promise<Object>} - Cliente atualizado
   */
  const updateCustomer = async (id, updates) => {
    // Prevenir double submit
    if (isUpdating) {
      throw new Error('Aguarde, j\u00e1 existe uma atualiza\u00e7\u00e3o em andamento.');
    }

    if (!id) {
      throw new Error('ID do cliente \u00e9 obrigat\u00f3rio para atualiza\u00e7\u00e3o');
    }

    // ========================================
    // VALIDA\u00c7\u00d5ES DE CAMPOS
    // ========================================

    if (updates.phone) {
      const phoneValidation = validatePhone(updates.phone);
      if (!phoneValidation.valid) {
        throw new Error(phoneValidation.message);
      }

      // Verificar telefone duplicado (excluindo o pr\u00f3prio cliente)
      const cleanPhone = updates.phone.replace(/\D/g, '');
      const existingPhone = customers.find(
        c => c.id !== id && c.phone && c.phone.replace(/\D/g, '') === cleanPhone
      );
      if (existingPhone) {
        throw new Error(`J\u00e1 existe um cliente com este telefone: ${existingPhone.fullName}`);
      }
    }

    if (updates.email) {
      const emailValidation = validateEmail(updates.email);
      if (!emailValidation.valid) {
        throw new Error(emailValidation.message);
      }

      // Verificar email duplicado (excluindo o pr\u00f3prio cliente)
      const existingEmail = customers.find(
        c => c.id !== id && c.email && c.email.toLowerCase().trim() === updates.email.toLowerCase().trim()
      );
      if (existingEmail) {
        throw new Error(`J\u00e1 existe um cliente com este email: ${existingEmail.fullName}`);
      }
    }

    if (updates.cpf) {
      const cleanCPF = updates.cpf.replace(/\D/g, '');
      if (!validateCPF(cleanCPF)) {
        throw new Error('CPF inv\u00e1lido');
      }

      // Verificar CPF duplicado (excluindo o pr\u00f3prio cliente)
      const existingCPF = customers.find(
        c => c.id !== id && c.cpf && c.cpf.replace(/\D/g, '') === cleanCPF
      );
      if (existingCPF) {
        throw new Error(`J\u00e1 existe um cliente com este CPF: ${existingCPF.fullName}`);
      }
    }

    setIsUpdating(true);

    try {
      const response = await api.put(`/clients/${id}`, updates);

      // Atualizar lista local
      setCustomers(prev => prev.map(customer =>
        customer.id === id ? response.data : customer
      ));

      return response.data;
    } catch (err) {
      console.error('Erro ao atualizar cliente:', err);
      throw new Error(err.response?.data?.error || 'N\u00e3o foi poss\u00edvel atualizar o cliente. Tente novamente.');
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Exclui um cliente
   * @param {string} id - ID do cliente
   */
  const deleteCustomer = async (id) => {
    // Prevenir double submit
    if (isDeleting) {
      throw new Error('Aguarde, j\u00e1 existe uma exclus\u00e3o em andamento.');
    }

    if (!id) {
      throw new Error('ID do cliente \u00e9 obrigat\u00f3rio para exclus\u00e3o');
    }

    setIsDeleting(true);

    try {
      await api.delete(`/clients/${id}`);

      // Remover da lista local
      setCustomers(prev => prev.filter(customer => customer.id !== id));
    } catch (err) {
      console.error('Erro ao excluir cliente:', err);
      throw new Error(err.response?.data?.error || 'N\u00e3o foi poss\u00edvel excluir o cliente. Tente novamente.');
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Busca hist\u00f3rico de um cliente
   * @param {string} id - ID do cliente
   * @param {Object} params - Par\u00e2metros de filtro (startDate, endDate, etc.)
   * @returns {Promise<Object>} - Hist\u00f3rico do cliente
   */
  const getCustomerHistory = async (id, params = {}) => {
    if (!id) {
      throw new Error('ID do cliente \u00e9 obrigat\u00f3rio');
    }

    try {
      const response = await api.get(`/clients/${id}/history`, { params });
      return response.data;
    } catch (err) {
      console.error('Erro ao buscar hist\u00f3rico do cliente:', err);
      throw new Error(err.response?.data?.error || 'N\u00e3o foi poss\u00edvel carregar o hist\u00f3rico.');
    }
  };

  /**
   * Busca cliente por ID
   * @param {string} id - ID do cliente
   * @returns {Object|null} - Cliente encontrado ou null
   */
  const getCustomerById = (id) => {
    return customers.find(c => c.id === id) || null;
  };

  /**
   * Busca clientes por nome/telefone/email (pesquisa parcial)
   * @param {string} searchTerm - Termo de busca
   * @returns {Array} - Lista de clientes encontrados
   */
  const searchCustomers = (searchTerm) => {
    if (!searchTerm?.trim()) return customers;

    const term = searchTerm.toLowerCase().trim();
    return customers.filter(c =>
      c.fullName.toLowerCase().includes(term) ||
      (c.phone && c.phone.includes(term)) ||
      (c.email && c.email.toLowerCase().includes(term)) ||
      (c.cpf && c.cpf.includes(term))
    );
  };

  /**
   * Busca cliente por CPF
   * @param {string} cpf - CPF do cliente
   * @returns {Object|null} - Cliente encontrado ou null
   */
  const getCustomerByCPF = (cpf) => {
    if (!cpf) return null;
    const cleanCPF = cpf.replace(/\D/g, '');
    return customers.find(c => c.cpf && c.cpf.replace(/\D/g, '') === cleanCPF) || null;
  };

  /**
   * Busca cliente por telefone
   * @param {string} phone - Telefone do cliente
   * @returns {Object|null} - Cliente encontrado ou null
   */
  const getCustomerByPhone = (phone) => {
    if (!phone) return null;
    const cleanPhone = phone.replace(/\D/g, '');
    return customers.find(c => c.phone && c.phone.replace(/\D/g, '') === cleanPhone) || null;
  };

  return {
    // Dados
    customers,
    clients: customers, // Alias para compatibilidade
    isLoading: loading,
    error,

    // A\u00e7\u00f5es CRUD
    createCustomer,
    createClient: createCustomer, // Alias
    isCreating,
    updateCustomer,
    updateClient: updateCustomer, // Alias
    isUpdating,
    deleteCustomer,
    deleteClient: deleteCustomer, // Alias
    isDeleting,

    // Utilit\u00e1rios
    refetch: () => loadCustomers(true),
    getCustomerById,
    getClientById: getCustomerById, // Alias
    searchCustomers,
    searchClients: searchCustomers, // Alias
    getCustomerByCPF,
    getCustomerByPhone,
    getCustomerHistory,

    // Valida\u00e7\u00f5es exportadas
    validateCPF,
    validateEmail,
    validatePhone,
  };
};

export default useCustomers;
