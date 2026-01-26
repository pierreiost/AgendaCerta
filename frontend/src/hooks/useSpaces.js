// frontend/src/hooks/useSpaces.js
// Hook para gerenciamento de Espa\u00e7os/Recursos com valida\u00e7\u00f5es e cache otimizado

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

// Tempo de cache em milissegundos (5 minutos)
const CACHE_STALE_TIME = 5 * 60 * 1000;

/**
 * Hook personalizado para gerenciar Espa\u00e7os/Recursos
 */
export const useSpaces = () => {
  const { user } = useAuth();
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Cache control
  const lastFetchTime = useRef(null);
  const isFetching = useRef(false);

  /**
   * Carrega espa\u00e7os do backend com cache
   */
  const loadSpaces = useCallback(async (forceRefresh = false) => {
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

      const response = await api.get('/resources');

      setSpaces(response.data || []);
      lastFetchTime.current = now;
    } catch (err) {
      console.error('Erro ao carregar recursos:', err);
      setError(err.response?.data?.error || 'Erro ao carregar recursos');
      setSpaces([]);
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadSpaces();
    }
  }, [user, loadSpaces]);

  /**
   * Cria um novo espa\u00e7o/recurso
   * @param {Object} spaceData - Dados do espa\u00e7o
   * @returns {Promise<Object>} - Espa\u00e7o criado
   */
  const createSpace = async (spaceData) => {
    // Prevenir double submit
    if (isCreating) {
      throw new Error('Aguarde, j\u00e1 existe uma cria\u00e7\u00e3o em andamento.');
    }

    // ========================================
    // VALIDA\u00c7\u00d5ES COMPLETAS
    // ========================================

    // 1. Nome obrigat\u00f3rio
    if (!spaceData.name?.trim()) {
      throw new Error('Nome do recurso \u00e9 obrigat\u00f3rio');
    }

    // 2. Pre\u00e7o por hora v\u00e1lido (se fornecido)
    if (spaceData.pricePerHour !== undefined && spaceData.pricePerHour !== null) {
      const price = parseFloat(spaceData.pricePerHour);
      if (isNaN(price) || price < 0) {
        throw new Error('Pre\u00e7o por hora n\u00e3o pode ser negativo');
      }
    }

    // 3. Capacidade v\u00e1lida (se fornecida)
    if (spaceData.capacity !== undefined && spaceData.capacity !== null) {
      const capacity = parseInt(spaceData.capacity);
      if (isNaN(capacity) || capacity < 1) {
        throw new Error('Capacidade deve ser maior que zero');
      }
    }

    // 4. Verificar duplicata de nome
    const existingSpace = spaces.find(
      s => s.name.toLowerCase().trim() === spaceData.name.toLowerCase().trim()
    );
    if (existingSpace) {
      throw new Error(`J\u00e1 existe um recurso com o nome "${spaceData.name}"`);
    }

    setIsCreating(true);

    try {
      const preparedData = {
        ...spaceData,
        pricePerHour: spaceData.pricePerHour ? parseFloat(spaceData.pricePerHour) : 0,
        capacity: spaceData.capacity ? parseInt(spaceData.capacity) : null,
        isActive: spaceData.isActive !== undefined ? spaceData.isActive : true
      };

      const response = await api.post('/resources', preparedData);

      // Atualizar lista local
      setSpaces(prev => [...prev, response.data]);

      return response.data;
    } catch (err) {
      console.error('Erro ao criar recurso:', err);
      throw new Error(err.response?.data?.error || 'N\u00e3o foi poss\u00edvel criar o recurso. Verifique os dados e tente novamente.');
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * Atualiza um espa\u00e7o existente
   * @param {string} id - ID do espa\u00e7o
   * @param {Object} updates - Dados a serem atualizados
   * @returns {Promise<Object>} - Espa\u00e7o atualizado
   */
  const updateSpace = async (id, updates) => {
    // Prevenir double submit
    if (isUpdating) {
      throw new Error('Aguarde, j\u00e1 existe uma atualiza\u00e7\u00e3o em andamento.');
    }

    if (!id) {
      throw new Error('ID do recurso \u00e9 obrigat\u00f3rio para atualiza\u00e7\u00e3o');
    }

    // ========================================
    // VALIDA\u00c7\u00d5ES DE CAMPOS
    // ========================================

    if (updates.pricePerHour !== undefined) {
      const price = parseFloat(updates.pricePerHour);
      if (isNaN(price) || price < 0) {
        throw new Error('Pre\u00e7o por hora n\u00e3o pode ser negativo');
      }
    }

    if (updates.capacity !== undefined && updates.capacity !== null) {
      const capacity = parseInt(updates.capacity);
      if (isNaN(capacity) || capacity < 1) {
        throw new Error('Capacidade deve ser maior que zero');
      }
    }

    // Verificar duplicata de nome (excluindo o pr\u00f3prio espa\u00e7o)
    if (updates.name) {
      const existingSpace = spaces.find(
        s => s.id !== id && s.name.toLowerCase().trim() === updates.name.toLowerCase().trim()
      );
      if (existingSpace) {
        throw new Error(`J\u00e1 existe um recurso com o nome "${updates.name}"`);
      }
    }

    setIsUpdating(true);

    try {
      const preparedData = { ...updates };
      if (updates.pricePerHour !== undefined) {
        preparedData.pricePerHour = parseFloat(updates.pricePerHour);
      }
      if (updates.capacity !== undefined) {
        preparedData.capacity = updates.capacity ? parseInt(updates.capacity) : null;
      }

      const response = await api.put(`/resources/${id}`, preparedData);

      // Atualizar lista local
      setSpaces(prev => prev.map(space =>
        space.id === id ? response.data : space
      ));

      return response.data;
    } catch (err) {
      console.error('Erro ao atualizar recurso:', err);
      throw new Error(err.response?.data?.error || 'N\u00e3o foi poss\u00edvel atualizar o recurso. Tente novamente.');
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Exclui um espa\u00e7o
   * @param {string} id - ID do espa\u00e7o
   */
  const deleteSpace = async (id) => {
    // Prevenir double submit
    if (isDeleting) {
      throw new Error('Aguarde, j\u00e1 existe uma exclus\u00e3o em andamento.');
    }

    if (!id) {
      throw new Error('ID do recurso \u00e9 obrigat\u00f3rio para exclus\u00e3o');
    }

    setIsDeleting(true);

    try {
      await api.delete(`/resources/${id}`);

      // Remover da lista local
      setSpaces(prev => prev.filter(space => space.id !== id));
    } catch (err) {
      console.error('Erro ao excluir recurso:', err);
      throw new Error(err.response?.data?.error || 'N\u00e3o foi poss\u00edvel excluir o recurso. Tente novamente.');
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Busca espa\u00e7os ativos
   * @returns {Array} - Lista de espa\u00e7os ativos
   */
  const getActiveSpaces = () => {
    return spaces.filter(s => s.isActive !== false);
  };

  /**
   * Busca espa\u00e7o por ID
   * @param {string} id - ID do espa\u00e7o
   * @returns {Object|null} - Espa\u00e7o encontrado ou null
   */
  const getSpaceById = (id) => {
    return spaces.find(s => s.id === id) || null;
  };

  /**
   * Busca espa\u00e7os por tipo
   * @param {string} typeId - ID do tipo de recurso
   * @returns {Array} - Lista de espa\u00e7os do tipo especificado
   */
  const getSpacesByType = (typeId) => {
    return spaces.filter(s => s.resourceTypeId === typeId);
  };

  /**
   * Busca espa\u00e7os por nome (pesquisa parcial)
   * @param {string} searchTerm - Termo de busca
   * @returns {Array} - Lista de espa\u00e7os encontrados
   */
  const searchSpaces = (searchTerm) => {
    if (!searchTerm?.trim()) return spaces;

    const term = searchTerm.toLowerCase().trim();
    return spaces.filter(s =>
      s.name.toLowerCase().includes(term) ||
      (s.description && s.description.toLowerCase().includes(term))
    );
  };

  return {
    // Dados
    spaces,
    resources: spaces, // Alias para compatibilidade
    isLoading: loading,
    error,

    // A\u00e7\u00f5es CRUD
    createSpace,
    createResource: createSpace, // Alias
    isCreating,
    updateSpace,
    updateResource: updateSpace, // Alias
    isUpdating,
    deleteSpace,
    deleteResource: deleteSpace, // Alias
    isDeleting,

    // Utilit\u00e1rios
    refetch: () => loadSpaces(true),
    getActiveSpaces,
    getSpaceById,
    getResourceById: getSpaceById, // Alias
    getSpacesByType,
    searchSpaces,
  };
};

/**
 * Hook para gerenciamento de Categorias de Espa\u00e7os/Recursos
 */
export const useSpaceCategories = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Carrega categorias do backend
   */
  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get('/resource-types');
      setCategories(response.data || []);
    } catch (err) {
      console.error('Erro ao carregar tipos de recursos:', err);
      setError(err.response?.data?.error || 'Erro ao carregar tipos de recursos');
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadCategories();
    }
  }, [user, loadCategories]);

  /**
   * Cria uma nova categoria
   * @param {Object} categoryData - Dados da categoria
   * @returns {Promise<Object>} - Categoria criada
   */
  const createCategory = async (categoryData) => {
    // ========================================
    // VALIDA\u00c7\u00d5ES
    // ========================================

    if (!categoryData.name?.trim()) {
      throw new Error('Nome da categoria \u00e9 obrigat\u00f3rio');
    }

    // Verificar duplicata
    const existing = categories.find(
      c => c.name.toLowerCase().trim() === categoryData.name.toLowerCase().trim()
    );
    if (existing) {
      throw new Error(`J\u00e1 existe uma categoria com o nome "${categoryData.name}"`);
    }

    try {
      const response = await api.post('/resource-types', categoryData);

      // Atualizar lista local
      setCategories(prev => [...prev, response.data]);

      return response.data;
    } catch (err) {
      console.error('Erro ao criar tipo de recurso:', err);
      throw new Error(err.response?.data?.error || 'N\u00e3o foi poss\u00edvel criar a categoria.');
    }
  };

  /**
   * Atualiza uma categoria
   * @param {string} id - ID da categoria
   * @param {Object} updates - Dados a serem atualizados
   * @returns {Promise<Object>} - Categoria atualizada
   */
  const updateCategory = async (id, updates) => {
    if (!id) {
      throw new Error('ID da categoria \u00e9 obrigat\u00f3rio');
    }

    // Verificar duplicata (excluindo a pr\u00f3pria categoria)
    if (updates.name) {
      const existing = categories.find(
        c => c.id !== id && c.name.toLowerCase().trim() === updates.name.toLowerCase().trim()
      );
      if (existing) {
        throw new Error(`J\u00e1 existe uma categoria com o nome "${updates.name}"`);
      }
    }

    try {
      const response = await api.put(`/resource-types/${id}`, updates);

      // Atualizar lista local
      setCategories(prev => prev.map(category =>
        category.id === id ? response.data : category
      ));

      return response.data;
    } catch (err) {
      console.error('Erro ao atualizar tipo de recurso:', err);
      throw new Error(err.response?.data?.error || 'N\u00e3o foi poss\u00edvel atualizar a categoria.');
    }
  };

  /**
   * Exclui uma categoria
   * @param {string} id - ID da categoria
   */
  const deleteCategory = async (id) => {
    if (!id) {
      throw new Error('ID da categoria \u00e9 obrigat\u00f3rio');
    }

    try {
      await api.delete(`/resource-types/${id}`);

      // Remover da lista local
      setCategories(prev => prev.filter(category => category.id !== id));
    } catch (err) {
      console.error('Erro ao excluir tipo de recurso:', err);
      throw new Error(err.response?.data?.error || 'N\u00e3o foi poss\u00edvel excluir a categoria.');
    }
  };

  return {
    categories,
    resourceTypes: categories, // Alias
    isLoading: loading,
    error,
    createCategory,
    createResourceType: createCategory, // Alias
    updateCategory,
    updateResourceType: updateCategory, // Alias
    deleteCategory,
    deleteResourceType: deleteCategory, // Alias
    refetch: loadCategories,
  };
};

export default useSpaces;
