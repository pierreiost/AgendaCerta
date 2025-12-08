// frontend/src/pages/TabDetails.js

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { tabService, productService } from '../services/api';
import { Receipt, Plus, Trash2, X, Check, Ban, ArrowLeft, ShoppingCart } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const TabDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [itemData, setItemData] = useState({
    productId: '',
    description: '',
    quantity: '1',
    unitPrice: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [tabRes, productsRes] = await Promise.all([
        tabService.getById(id),
        productService.getAll()
      ]);

      setTab(tabRes.data);
      setProducts(productsRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setError('Erro ao carregar comanda');
    } finally {
      setLoading(false);
    }
  };

  const handleProductChange = (e) => {
    const productId = e.target.value;
    const product = products.find(p => p.id === productId);
    
    setItemData({
      ...itemData,
      productId,
      description: product ? product.name : '',
      unitPrice: product ? product.price.toString() : ''
    });
  };

  const handleInputChange = (e) => {
    setItemData({
      ...itemData,
      [e.target.name]: e.target.value
    });
  };

  const openAddItemModal = () => {
    setItemData({
      productId: '',
      description: '',
      quantity: '1',
      unitPrice: ''
    });
    setShowAddItemModal(true);
    setError('');
  };

  const closeAddItemModal = () => {
    setShowAddItemModal(false);
    setItemData({
      productId: '',
      description: '',
      quantity: '1',
      unitPrice: ''
    });
    setError('');
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    setError('');

    try {
      await tabService.addItem(id, itemData);
      setSuccess('Item adicionado com sucesso!');
      closeAddItemModal();
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.response?.data?.error || 'Erro ao adicionar item');
    }
  };

  const handleRemoveItem = async (itemId) => {
    if (!window.confirm('Tem certeza que deseja remover este item?')) {
      return;
    }

    try {
      await tabService.removeItem(id, itemId);
      setSuccess('Item removido com sucesso!');
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.response?.data?.error || 'Erro ao remover item');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleCloseTab = async () => {
    if (!window.confirm('Tem certeza que deseja fechar esta comanda? O estoque será atualizado automaticamente.')) {
      return;
    }

    try {
      await tabService.close(id);
      setSuccess('Comanda fechada com sucesso!');
      setTimeout(() => {
        navigate('/tabs');
      }, 2000);
    } catch (error) {
      setError(error.response?.data?.error || 'Erro ao fechar comanda');
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleCancelTab = async () => {
    if (!window.confirm('Tem certeza que deseja cancelar esta comanda?')) {
      return;
    }

    try {
      await tabService.cancel(id);
      setSuccess('Comanda cancelada com sucesso!');
      setTimeout(() => {
        navigate('/tabs');
      }, 2000);
    } catch (error) {
      setError(error.response?.data?.error || 'Erro ao cancelar comanda');
      setTimeout(() => setError(''), 5000);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      OPEN: { class: 'badge-info', text: 'Aberta' },
      PAID: { class: 'badge-success', text: 'Paga' },
      CANCELLED: { class: 'badge-danger', text: 'Cancelada' }
    };
    return badges[status] || badges.OPEN;
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

  if (!tab) {
    return (
      <>
        <Header />
        <div className="container" style={{ padding: '2rem 1rem' }}>
          <div className="card text-center" style={{ padding: '3rem' }}>
            <h3 className="font-bold">Comanda não encontrada</h3>
            <button className="btn btn-primary" onClick={() => navigate('/tabs')} style={{ marginTop: '1rem' }}>
              Voltar para Comandas
            </button>
          </div>
        </div>
      </>
    );
  }

  const statusBadge = getStatusBadge(tab.status);
  const isEditable = tab.status === 'OPEN';

  return (
    <>
      <Header />
      
      <div className="container" style={{ padding: '2rem 1rem' }}>
        <button 
          className="btn btn-outline" 
          onClick={() => navigate('/tabs')}
          style={{ marginBottom: '1.5rem' }}
        >
          <ArrowLeft size={18} />
          Voltar
        </button>

        {success && (
          <div className="alert alert-success">{success}</div>
        )}

        {error && !showAddItemModal && (
          <div className="alert alert-danger">{error}</div>
        )}

        <div className="grid grid-3" style={{ marginBottom: '2rem' }}>
          {/* Informações da Comanda */}
          <div className="card" style={{ gridColumn: 'span 2' }}>
            <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
              <div>
                <div className="flex" style={{ alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <Receipt size={24} style={{ color: 'var(--primary-color)' }} />
                  <h2 className="text-xl font-bold">
                    Comanda #{tab.id.substring(0, 8)}
                  </h2>
                </div>
                <span className={`badge ${statusBadge.class}`}>
                  {statusBadge.text}
                </span>
              </div>
            </div>

            <div className="grid grid-2" style={{ marginBottom: '1.5rem' }}>
              <div>
                <p className="text-sm text-muted">Cliente</p>
                <p className="font-bold">{tab.client.fullName}</p>
                <p className="text-sm text-muted">{tab.client.phone}</p>
              </div>

              <div>
                <p className="text-sm text-muted">Criada em</p>
                <p className="font-bold">
                  {format(new Date(tab.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
                {tab.reservation && (
                  <p className="text-sm text-muted">
                    Reserva: {tab.reservation.court.name}
                  </p>
                )}
              </div>
            </div>

            {isEditable && (
              <button 
                className="btn btn-primary"
                onClick={openAddItemModal}
                style={{ width: '100%' }}
              >
                <Plus size={18} />
                Adicionar Item
              </button>
            )}
          </div>

          {/* Total */}
          <div className="card">
            <div style={{ textAlign: 'center' }}>
              <p className="text-sm text-muted" style={{ marginBottom: '0.5rem' }}>Total da Comanda</p>
              <h2 className="text-3xl font-bold text-primary">
                R$ {tab.total.toFixed(2)}
              </h2>
              <p className="text-sm text-muted" style={{ marginTop: '0.5rem' }}>
                {tab.items.length} item(ns)
              </p>
            </div>

            {isEditable && (
              <div style={{ marginTop: '2rem' }}>
                <button 
                  className="btn btn-primary"
                  onClick={handleCloseTab}
                  style={{ width: '100%', marginBottom: '0.5rem' }}
                  disabled={tab.items.length === 0}
                >
                  <Check size={18} />
                  Fechar Comanda
                </button>
                <button 
                  className="btn btn-danger"
                  onClick={handleCancelTab}
                  style={{ width: '100%' }}
                >
                  <Ban size={18} />
                  Cancelar Comanda
                </button>
              </div>
            )}

            {tab.status === 'PAID' && tab.paidAt && (
              <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-dark)', borderRadius: '0.5rem' }}>
                <p className="text-sm text-muted">Paga em</p>
                <p className="text-sm font-bold">
                  {format(new Date(tab.paidAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Itens da Comanda */}
        <div className="card">
          <h3 className="text-xl font-bold" style={{ marginBottom: '1.5rem' }}>
            Itens da Comanda
          </h3>

          {tab.items.length === 0 ? (
            <div className="text-center" style={{ padding: '3rem' }}>
              <ShoppingCart size={64} style={{ margin: '0 auto 1rem', color: 'var(--text-light)' }} />
              <p className="text-muted">Nenhum item adicionado ainda</p>
              {isEditable && (
                <button 
                  className="btn btn-primary"
                  onClick={openAddItemModal}
                  style={{ marginTop: '1rem' }}
                >
                  <Plus size={18} />
                  Adicionar Primeiro Item
                </button>
              )}
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Descrição</th>
                    <th>Quantidade</th>
                    <th>Preço Unit.</th>
                    <th>Total</th>
                    {isEditable && <th>Ações</th>}
                  </tr>
                </thead>
                <tbody>
                  {tab.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <p className="font-bold">{item.description}</p>
                        {item.product && (
                          <p className="text-sm text-muted">{item.product.unit}</p>
                        )}
                      </td>
                      <td>{item.quantity}</td>
                      <td>R$ {item.unitPrice.toFixed(2)}</td>
                      <td className="font-bold text-primary">
                        R$ {item.total.toFixed(2)}
                      </td>
                      {isEditable && (
                        <td>
                          <button 
                            className="btn btn-danger"
                            style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}
                            onClick={() => handleRemoveItem(item.id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--border-color)' }}>
                    <td colSpan={isEditable ? 3 : 3} className="font-bold">TOTAL</td>
                    <td className="font-bold text-primary text-lg">
                      R$ {tab.total.toFixed(2)}
                    </td>
                    {isEditable && <td></td>}
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal Adicionar Item */}
      {showAddItemModal && (
        <div className="modal-overlay" onClick={closeAddItemModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="card" style={{ margin: 0 }}>
              <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
                <h2 className="text-xl font-bold">Adicionar Item</h2>
                <button onClick={closeAddItemModal} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem' }}>
                  <X size={24} />
                </button>
              </div>

              {error && <div className="alert alert-danger">{error}</div>}

              <form onSubmit={handleAddItem}>
                <div className="input-group">
                  <label htmlFor="productId">Produto</label>
                  <select
                    id="productId"
                    name="productId"
                    value={itemData.productId}
                    onChange={handleProductChange}
                  >
                    <option value="">Selecione um produto ou digite manualmente</option>
                    {products
                      .filter(p => p.stock > 0)
                      .map(product => (
                        <option key={product.id} value={product.id}>
                          {product.name} - R$ {product.price.toFixed(2)} (Estoque: {product.stock})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="input-group">
                  <label htmlFor="description">Descrição</label>
                  <input
                    type="text"
                    id="description"
                    name="description"
                    value={itemData.description}
                    onChange={handleInputChange}
                    required
                    placeholder="Nome do produto ou serviço"
                    readOnly
                  />
                </div>

                <div className="grid grid-2">
                  <div className="input-group">
                    <label htmlFor="quantity">Quantidade *</label>
                    <input
                      type="number"
                      id="quantity"
                      name="quantity"
                      value={itemData.quantity}
                      onChange={handleInputChange}
                      required
                      min="1"
                    />
                  </div>

                  <div className="input-group">
                    <label htmlFor="unitPrice">Preço Unitário (R$) *</label>
                    <input
                      type="number"
                      id="unitPrice"
                      name="unitPrice"
                      value={itemData.unitPrice}
                      onChange={handleInputChange}
                      required
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                {itemData.quantity && itemData.unitPrice && (
                  <div style={{ 
                    padding: '1rem', 
                    background: 'var(--bg-dark)', 
                    borderRadius: '0.5rem',
                    marginBottom: '1rem'
                  }}>
                    <p className="text-sm text-muted">Total do item</p>
                    <p className="text-xl font-bold text-primary">
                      R$ {(parseFloat(itemData.quantity) * parseFloat(itemData.unitPrice)).toFixed(2)}
                    </p>
                  </div>
                )}

                <div className="flex" style={{ gap: '1rem' }}>
                  <button type="button" className="btn btn-outline" onClick={closeAddItemModal} style={{ flex: 1 }}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                    Adicionar
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

export default TabDetails;