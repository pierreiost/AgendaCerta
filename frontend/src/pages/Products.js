// frontend/src/pages/Products.js

import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { productService } from '../services/api';
import { Package, Edit2, Trash2, PlusCircle, X, Plus, Minus, AlertTriangle } from 'lucide-react';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [stockProduct, setStockProduct] = useState(null);
  const [stockAction, setStockAction] = useState('add'); // 'add' ou 'remove'
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    unit: 'UNIDADE',
    expiryDate: ''
  });
  const [stockData, setStockData] = useState({
    quantity: '',
    reason: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await productService.getAll();
      setProducts(response.data);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      setError('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleStockInputChange = (e) => {
    setStockData({
      ...stockData,
      [e.target.name]: e.target.value
    });
  };

  const openModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        description: product.description || '',
        price: product.price.toString(),
        stock: product.stock.toString(),
        unit: product.unit,
        expiryDate: product.expiryDate ? product.expiryDate.split('T')[0] : ''
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        description: '',
        price: '',
        stock: '',
        unit: 'UNIDADE',
        expiryDate: ''
      });
    }
    setShowModal(true);
    setError('');
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setError('');
  };

  const openStockModal = (product, action) => {
    setStockProduct(product);
    setStockAction(action);
    setStockData({ quantity: '', reason: '' });
    setShowStockModal(true);
    setError('');
  };

  const closeStockModal = () => {
    setShowStockModal(false);
    setStockProduct(null);
    setStockData({ quantity: '', reason: '' });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (editingProduct) {
        await productService.update(editingProduct.id, formData);
        setSuccess('Produto atualizado com sucesso!');
      } else {
        await productService.create(formData);
        setSuccess('Produto cadastrado com sucesso!');
      }
      closeModal();
      loadProducts();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.response?.data?.error || 'Erro ao salvar produto');
    }
  };

  const handleStockSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (stockAction === 'add') {
        await productService.addStock(stockProduct.id, parseInt(stockData.quantity), stockData.reason);
        setSuccess('Estoque adicionado com sucesso!');
      } else {
        await productService.removeStock(stockProduct.id, parseInt(stockData.quantity), stockData.reason);
        setSuccess('Estoque removido com sucesso!');
      }
      closeStockModal();
      loadProducts();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.response?.data?.error || 'Erro ao atualizar estoque');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este produto?')) {
      return;
    }

    try {
      await productService.delete(id);
      setSuccess('Produto excluído com sucesso!');
      loadProducts();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.response?.data?.error || 'Erro ao excluir produto');
      setTimeout(() => setError(''), 3000);
    }
  };

  const getStockBadge = (stock) => {
    if (stock === 0) return { class: 'badge-danger', text: 'Sem estoque' };
    if (stock < 10) return { class: 'badge-warning', text: 'Estoque baixo' };
    return { class: 'badge-success', text: 'Em estoque' };
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="flex-center" style={{ minHeight: '80vh' }}>
          <div className="loading" style={{ width: '50px', height: '50px', borderWidth: '5px' }}></div>
        </div>
      </>
    );
  }

  const lowStockProducts = products.filter(p => p.stock < 10);

  return (
    <>
      <Header />
      
      <div className="container" style={{ padding: '2rem 1rem' }}>
        <div className="flex-between" style={{ marginBottom: '2rem' }}>
          <div>
            <h1 className="text-2xl font-bold">Gerenciar Produtos</h1>
            <p className="text-muted">Controle seu estoque e produtos</p>
          </div>
          <button className="btn btn-primary" onClick={() => openModal()}>
            <PlusCircle size={18} />
            Novo Produto
          </button>
        </div>

        {success && (
          <div className="alert alert-success">{success}</div>
        )}

        {error && !showModal && !showStockModal && (
          <div className="alert alert-danger">{error}</div>
        )}

        {/* Alerta de Estoque Baixo */}
        {lowStockProducts.length > 0 && (
          <div className="alert alert-warning" style={{ marginBottom: '2rem' }}>
            <div className="flex" style={{ alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={20} />
              <strong>Atenção!</strong> {lowStockProducts.length} produto(s) com estoque baixo
            </div>
          </div>
        )}

        {products.length === 0 ? (
          <div className="card text-center" style={{ padding: '3rem' }}>
            <Package size={64} style={{ margin: '0 auto 1rem', color: 'var(--text-light)' }} />
            <h3 className="font-bold" style={{ marginBottom: '0.5rem' }}>Nenhum produto cadastrado</h3>
            <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
              Comece cadastrando seus produtos para venda
            </p>
            <button className="btn btn-primary" onClick={() => openModal()}>
              <PlusCircle size={18} />
              Cadastrar Primeiro Produto
            </button>
          </div>
        ) : (
          <div className="card">
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Descrição</th>
                    <th>Preço</th>
                    <th>Estoque</th>
                    <th>Unidade</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => {
                    const stockBadge = getStockBadge(product.stock);
                    return (
                      <tr key={product.id}>
                        <td className="font-bold">{product.name}</td>
                        <td className="text-muted">{product.description || '-'}</td>
                        <td className="font-bold text-primary">
                          R$ {product.price.toFixed(2)}
                        </td>
                        <td>
                          <div className="flex" style={{ alignItems: 'center', gap: '0.5rem' }}>
                            <span className="font-bold">{product.stock}</span>
                            <div className="flex" style={{ gap: '0.25rem' }}>
                              <button
                                onClick={() => openStockModal(product, 'add')}
                                className="btn btn-outline"
                                style={{ padding: '0.25rem 0.5rem' }}
                                title="Adicionar estoque"
                              >
                                <Plus size={14} />
                              </button>
                              <button
                                onClick={() => openStockModal(product, 'remove')}
                                className="btn btn-outline"
                                style={{ padding: '0.25rem 0.5rem' }}
                                title="Remover estoque"
                              >
                                <Minus size={14} />
                              </button>
                            </div>
                          </div>
                        </td>
                        <td>{product.unit}</td>
                        <td>
                          <span className={`badge ${stockBadge.class}`}>
                            {stockBadge.text}
                          </span>
                        </td>
                        <td>
                          <div className="flex" style={{ gap: '0.5rem' }}>
                            <button 
                              className="btn btn-outline"
                              style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}
                              onClick={() => openModal(product)}
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              className="btn btn-danger"
                              style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}
                              onClick={() => handleDelete(product.id)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Produto */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="card" style={{ margin: 0 }}>
              <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
                <h2 className="text-xl font-bold">
                  {editingProduct ? 'Editar Produto' : 'Novo Produto'}
                </h2>
                <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem' }}>
                  <X size={24} />
                </button>
              </div>

              {error && <div className="alert alert-danger">{error}</div>}

              <form onSubmit={handleSubmit}>
                <div className="input-group">
                  <label htmlFor="name">Nome do Produto *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="Ex: Água Mineral 500ml"
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="description">Descrição</label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows="2"
                    placeholder="Informações adicionais"
                  />
                </div>

                <div className="grid grid-2">
                  <div className="input-group">
                    <label htmlFor="price">Preço (R$) *</label>
                    <input
                      type="number"
                      id="price"
                      name="price"
                      value={formData.price}
                      onChange={handleInputChange}
                      required
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                    />
                  </div>

                  <div className="input-group">
                    <label htmlFor="stock">Estoque Inicial *</label>
                    <input
                      type="number"
                      id="stock"
                      name="stock"
                      value={formData.stock}
                      onChange={handleInputChange}
                      required
                      min="0"
                      disabled={!!editingProduct}
                    />
                  </div>
                </div>

                <div className="grid grid-2">
                  <div className="input-group">
                    <label htmlFor="unit">Unidade *</label>
                    <select
                      id="unit"
                      name="unit"
                      value={formData.unit}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="UNIDADE">Unidade</option>
                      <option value="LITRO">Litro</option>
                      <option value="KG">Quilograma</option>
                      <option value="CAIXA">Caixa</option>
                    </select>
                  </div>

                  <div className="input-group">
                    <label htmlFor="expiryDate">Data de Validade</label>
                    <input
                      type="date"
                      id="expiryDate"
                      name="expiryDate"
                      value={formData.expiryDate}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="flex" style={{ gap: '1rem', marginTop: '1.5rem' }}>
                  <button type="button" className="btn btn-outline" onClick={closeModal} style={{ flex: 1 }}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                    {editingProduct ? 'Atualizar' : 'Cadastrar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Estoque */}
      {showStockModal && (
        <div className="modal-overlay" onClick={closeStockModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="card" style={{ margin: 0 }}>
              <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
                <h2 className="text-xl font-bold">
                  {stockAction === 'add' ? 'Adicionar Estoque' : 'Remover Estoque'}
                </h2>
                <button onClick={closeStockModal} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem' }}>
                  <X size={24} />
                </button>
              </div>

              {error && <div className="alert alert-danger">{error}</div>}

              <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-dark)', borderRadius: '0.5rem' }}>
                <p className="font-bold">{stockProduct?.name}</p>
                <p className="text-sm text-muted">Estoque atual: {stockProduct?.stock} {stockProduct?.unit}</p>
              </div>

              <form onSubmit={handleStockSubmit}>
                <div className="input-group">
                  <label htmlFor="quantity">Quantidade *</label>
                  <input
                    type="number"
                    id="quantity"
                    name="quantity"
                    value={stockData.quantity}
                    onChange={handleStockInputChange}
                    required
                    min="1"
                    placeholder="Digite a quantidade"
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="reason">Motivo</label>
                  <input
                    type="text"
                    id="reason"
                    name="reason"
                    value={stockData.reason}
                    onChange={handleStockInputChange}
                    placeholder={stockAction === 'add' ? 'Ex: Compra de mercadoria' : 'Ex: Ajuste de inventário'}
                  />
                </div>

                <div className="flex" style={{ gap: '1rem', marginTop: '1.5rem' }}>
                  <button type="button" className="btn btn-outline" onClick={closeStockModal} style={{ flex: 1 }}>
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className={`btn ${stockAction === 'add' ? 'btn-primary' : 'btn-danger'}`}
                    style={{ flex: 1 }}
                  >
                    {stockAction === 'add' ? 'Adicionar' : 'Remover'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Products;