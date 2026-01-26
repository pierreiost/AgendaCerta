// frontend/src/hooks/useProducts.js
// Hook para gerenciamento de Produtos com valida\u00e7\u00f5es e cache otimizado

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

// Tempo de cache em milissegundos (5 minutos)
const CACHE_STALE_TIME = 5 * 60 * 1000;

/**
 * Hook personalizado para gerenciar Produtos
 */
export const useProducts = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Cache control
  const lastFetchTime = useRef(null);
  const isFetching = useRef(false);

  /**
   * Carrega produtos do backend com cache
   */
  const loadProducts = useCallback(async (forceRefresh = false) => {
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

      const response = await api.get('/products');

      setProducts(response.data || []);
      lastFetchTime.current = now;
    } catch (err) {
      console.error('Erro ao carregar produtos:', err);
      setError(err.response?.data?.error || 'Erro ao carregar produtos');
      setProducts([]);
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadProducts();
    }
  }, [user, loadProducts]);

  /**
   * Cria um novo produto
   * @param {Object} productData - Dados do produto
   * @returns {Promise<Object>} - Produto criado
   */
  const createProduct = async (productData) => {
    // Prevenir double submit
    if (isCreating) {
      throw new Error('Aguarde, j\u00e1 existe uma cria\u00e7\u00e3o em andamento.');
    }

    // ========================================
    // VALIDA\u00c7\u00d5ES COMPLETAS
    // ========================================

    // 1. Nome obrigat\u00f3rio
    if (!productData.name?.trim()) {
      throw new Error('Nome do produto \u00e9 obrigat\u00f3rio');
    }

    // 2. Pre\u00e7o obrigat\u00f3rio e v\u00e1lido
    if (productData.price === undefined || productData.price === null) {
      throw new Error('Pre\u00e7o \u00e9 obrigat\u00f3rio');
    }

    const price = parseFloat(productData.price);
    if (isNaN(price) || price < 0) {
      throw new Error('Pre\u00e7o n\u00e3o pode ser negativo');
    }

    // 3. Estoque v\u00e1lido (se fornecido)
    if (productData.stock !== undefined && productData.stock !== null) {
      const stock = parseInt(productData.stock);
      if (isNaN(stock) || stock < 0) {
        throw new Error('Estoque n\u00e3o pode ser negativo');
      }
    }

    // 4. Verificar duplicata de nome
    const existingProduct = products.find(
      p => p.name.toLowerCase().trim() === productData.name.toLowerCase().trim()
    );
    if (existingProduct) {
      throw new Error(`J\u00e1 existe um produto com o nome "${productData.name}"`);
    }

    setIsCreating(true);

    try {
      const preparedData = {
        ...productData,
        price: parseFloat(productData.price),
        stock: productData.stock ? parseInt(productData.stock) : 0
      };

      const response = await api.post('/products', preparedData);

      // Atualizar lista local
      setProducts(prev => [...prev, response.data]);

      return response.data;
    } catch (err) {
      console.error('Erro ao criar produto:', err);
      throw new Error(err.response?.data?.error || 'N\u00e3o foi poss\u00edvel criar o produto. Verifique os dados e tente novamente.');
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * Atualiza um produto existente
   * @param {string} id - ID do produto
   * @param {Object} updates - Dados a serem atualizados
   * @returns {Promise<Object>} - Produto atualizado
   */
  const updateProduct = async (id, updates) => {
    // Prevenir double submit
    if (isUpdating) {
      throw new Error('Aguarde, j\u00e1 existe uma atualiza\u00e7\u00e3o em andamento.');
    }

    if (!id) {
      throw new Error('ID do produto \u00e9 obrigat\u00f3rio para atualiza\u00e7\u00e3o');
    }

    // ========================================
    // VALIDA\u00c7\u00d5ES DE CAMPOS
    // ========================================

    if (updates.price !== undefined) {
      const price = parseFloat(updates.price);
      if (isNaN(price) || price < 0) {
        throw new Error('Pre\u00e7o n\u00e3o pode ser negativo');
      }
    }

    if (updates.stock !== undefined) {
      const stock = parseInt(updates.stock);
      if (isNaN(stock) || stock < 0) {
        throw new Error('Estoque n\u00e3o pode ser negativo');
      }
    }

    // Verificar duplicata de nome (excluindo o pr\u00f3prio produto)
    if (updates.name) {
      const existingProduct = products.find(
        p => p.id !== id && p.name.toLowerCase().trim() === updates.name.toLowerCase().trim()
      );
      if (existingProduct) {
        throw new Error(`J\u00e1 existe um produto com o nome "${updates.name}"`);
      }
    }

    setIsUpdating(true);

    try {
      const preparedData = { ...updates };
      if (updates.price !== undefined) {
        preparedData.price = parseFloat(updates.price);
      }
      if (updates.stock !== undefined) {
        preparedData.stock = parseInt(updates.stock);
      }

      const response = await api.put(`/products/${id}`, preparedData);

      // Atualizar lista local
      setProducts(prev => prev.map(product =>
        product.id === id ? response.data : product
      ));

      return response.data;
    } catch (err) {
      console.error('Erro ao atualizar produto:', err);
      throw new Error(err.response?.data?.error || 'N\u00e3o foi poss\u00edvel atualizar o produto. Tente novamente.');
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Exclui um produto
   * @param {string} id - ID do produto
   */
  const deleteProduct = async (id) => {
    // Prevenir double submit
    if (isDeleting) {
      throw new Error('Aguarde, j\u00e1 existe uma exclus\u00e3o em andamento.');
    }

    if (!id) {
      throw new Error('ID do produto \u00e9 obrigat\u00f3rio para exclus\u00e3o');
    }

    setIsDeleting(true);

    try {
      await api.delete(`/products/${id}`);

      // Remover da lista local
      setProducts(prev => prev.filter(product => product.id !== id));
    } catch (err) {
      console.error('Erro ao excluir produto:', err);
      throw new Error(err.response?.data?.error || 'N\u00e3o foi poss\u00edvel excluir o produto. Tente novamente.');
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Adiciona estoque a um produto
   * @param {string} id - ID do produto
   * @param {number} quantity - Quantidade a adicionar
   * @param {string} reason - Motivo da adi\u00e7\u00e3o
   * @returns {Promise<Object>} - Produto atualizado
   */
  const addStock = async (id, quantity, reason = '') => {
    if (!id) {
      throw new Error('ID do produto \u00e9 obrigat\u00f3rio');
    }

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty < 1) {
      throw new Error('Quantidade deve ser maior que zero');
    }

    try {
      const response = await api.post(`/products/${id}/stock/add`, { quantity: qty, reason });

      // Atualizar lista local
      setProducts(prev => prev.map(product =>
        product.id === id ? response.data : product
      ));

      return response.data;
    } catch (err) {
      console.error('Erro ao adicionar estoque:', err);
      throw new Error(err.response?.data?.error || 'N\u00e3o foi poss\u00edvel adicionar estoque. Tente novamente.');
    }
  };

  /**
   * Remove estoque de um produto
   * @param {string} id - ID do produto
   * @param {number} quantity - Quantidade a remover
   * @param {string} reason - Motivo da remo\u00e7\u00e3o
   * @returns {Promise<Object>} - Produto atualizado
   */
  const removeStock = async (id, quantity, reason = '') => {
    if (!id) {
      throw new Error('ID do produto \u00e9 obrigat\u00f3rio');
    }

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty < 1) {
      throw new Error('Quantidade deve ser maior que zero');
    }

    // Verificar estoque dispon\u00edvel
    const product = products.find(p => p.id === id);
    if (product && product.stock < qty) {
      throw new Error(`Estoque insuficiente. Dispon\u00edvel: ${product.stock}`);
    }

    try {
      const response = await api.post(`/products/${id}/stock/remove`, { quantity: qty, reason });

      // Atualizar lista local
      setProducts(prev => prev.map(product =>
        product.id === id ? response.data : product
      ));

      return response.data;
    } catch (err) {
      console.error('Erro ao remover estoque:', err);
      throw new Error(err.response?.data?.error || 'N\u00e3o foi poss\u00edvel remover estoque. Tente novamente.');
    }
  };

  /**
   * Busca produtos com estoque baixo
   * @param {number} threshold - Limite de estoque baixo (padr\u00e3o: 10)
   * @returns {Array} - Lista de produtos com estoque baixo
   */
  const getLowStockProducts = (threshold = 10) => {
    return products.filter(p => p.stock < threshold);
  };

  /**
   * Busca produto por ID
   * @param {string} id - ID do produto
   * @returns {Object|null} - Produto encontrado ou null
   */
  const getProductById = (id) => {
    return products.find(p => p.id === id) || null;
  };

  /**
   * Busca produtos por nome (pesquisa parcial)
   * @param {string} searchTerm - Termo de busca
   * @returns {Array} - Lista de produtos encontrados
   */
  const searchProducts = (searchTerm) => {
    if (!searchTerm?.trim()) return products;

    const term = searchTerm.toLowerCase().trim();
    return products.filter(p =>
      p.name.toLowerCase().includes(term) ||
      (p.description && p.description.toLowerCase().includes(term))
    );
  };

  return {
    // Dados
    products,
    isLoading: loading,
    error,

    // A\u00e7\u00f5es CRUD
    createProduct,
    isCreating,
    updateProduct,
    isUpdating,
    deleteProduct,
    isDeleting,

    // A\u00e7\u00f5es de estoque
    addStock,
    removeStock,

    // Utilit\u00e1rios
    refetch: () => loadProducts(true),
    getLowStockProducts,
    getProductById,
    searchProducts,
  };
};

/**
 * Hook para gerenciamento de Categorias de Produtos
 */
export const useProductCategories = () => {
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

      // Assumindo que existe um endpoint para categorias de produtos
      const response = await api.get('/product-categories');
      setCategories(response.data || []);
    } catch (err) {
      console.error('Erro ao carregar categorias de produtos:', err);
      setError(err.response?.data?.error || 'Erro ao carregar categorias');
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
      const response = await api.post('/product-categories', categoryData);

      // Atualizar lista local
      setCategories(prev => [...prev, response.data]);

      return response.data;
    } catch (err) {
      console.error('Erro ao criar categoria:', err);
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
      const response = await api.put(`/product-categories/${id}`, updates);

      // Atualizar lista local
      setCategories(prev => prev.map(category =>
        category.id === id ? response.data : category
      ));

      return response.data;
    } catch (err) {
      console.error('Erro ao atualizar categoria:', err);
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
      await api.delete(`/product-categories/${id}`);

      // Remover da lista local
      setCategories(prev => prev.filter(category => category.id !== id));
    } catch (err) {
      console.error('Erro ao excluir categoria:', err);
      throw new Error(err.response?.data?.error || 'N\u00e3o foi poss\u00edvel excluir a categoria.');
    }
  };

  return {
    categories,
    isLoading: loading,
    error,
    createCategory,
    updateCategory,
    deleteCategory,
    refetch: loadCategories,
  };
};

export default useProducts;
