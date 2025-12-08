const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', authMiddleware, checkPermission('products', 'view'), async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { complexId: req.user.complexId },
      orderBy: { name: 'asc' }
    });
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao listar produtos.' });
  }
});

router.get('/:id', authMiddleware, checkPermission('products', 'view'), async (req, res) => {
  try {
    const product = await prisma.product.findFirst({
      where: {
        id: req.params.id,
        complexId: req.user.complexId
      },
      include: {
        stockMovements: {
          orderBy: { createdAt: 'desc' },
          take: 20
        }
      }
    });

    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado.' });
    }

    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar produto.' });
  }
});

router.post('/', authMiddleware, checkPermission('products', 'create'), async (req, res) => {
  try {
    const { name, description, price, stock, unit, expiryDate } = req.body;

    if (!name || !price || !unit) {
      return res.status(400).json({ error: 'Campos obrigatórios não preenchidos.' });
    }

    const product = await prisma.product.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        stock: stock ? parseInt(stock) : 0,
        unit,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        complexId: req.user.complexId
      }
    });

    res.status(201).json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar produto.' });
  }
});

router.put('/:id', authMiddleware, checkPermission('products', 'edit'), async (req, res) => {
  try {
    const { name, description, price, stock, unit, expiryDate } = req.body;

    const product = await prisma.product.findFirst({
      where: {
        id: req.params.id,
        complexId: req.user.complexId
      }
    });

    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado.' });
    }

    const priceChanged = price && parseFloat(price) !== product.price;

    if (priceChanged) {
      const productInOpenTabs = await prisma.tabItem.count({
        where: {
          productId: req.params.id,
          tab: { status: 'OPEN' }
        }
      });

      if (productInOpenTabs > 0) {
        return res.status(400).json({
          error: 'Não é possível alterar o preço de produto que está em comandas abertas',
          openTabs: productInOpenTabs
        });
      }
    }

    const updatedProduct = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        name,
        description,
        price: parseFloat(price),
        stock: parseInt(stock),
        unit,
        expiryDate: expiryDate ? new Date(expiryDate) : null
      }
    });

    res.json(updatedProduct);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar produto.' });
  }
});

router.delete('/:id', authMiddleware, checkPermission('products', 'delete'), async (req, res) => {
  try {
    const product = await prisma.product.findFirst({
      where: {
        id: req.params.id,
        complexId: req.user.complexId
      },
      include: {
        tabItems: {
          include: {
            tab: true
          }
        }
      }
    });

    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado.' });
    }

    const openTabsWithProduct = product.tabItems.filter(item => item.tab.status === 'OPEN');
    
    if (openTabsWithProduct.length > 0) {
      return res.status(409).json({ 
        error: 'Não é possível excluir produto que está em comandas abertas',
        openTabs: openTabsWithProduct.length
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.stockMovement.deleteMany({
        where: { productId: req.params.id }
      });

      await tx.product.delete({
        where: { id: req.params.id }
      });
    });

    res.json({ message: 'Produto deletado com sucesso.' });
  } catch (error) {
    console.error('Erro ao deletar produto:', error);
    
    if (error.code === 'P2003') {
      return res.status(409).json({ 
        error: 'Não é possível excluir produto com vínculos ativos. Verifique se não há comandas associadas.' 
      });
    }

    res.status(500).json({ error: 'Erro ao deletar produto.' });
  }
});

router.post('/:id/stock/add', authMiddleware, checkPermission('products', 'stock'), async (req, res) => {
  try {
    const { quantity, reason } = req.body;

    if (!quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Quantidade inválida.' });
    }

    const product = await prisma.product.findFirst({
      where: {
        id: req.params.id,
        complexId: req.user.complexId
      }
    });

    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado.' });
    }

    const updatedProduct = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        stock: product.stock + parseInt(quantity)
      }
    });

    await prisma.stockMovement.create({
      data: {
        productId: req.params.id,
        type: 'ENTRADA',
        quantity: parseInt(quantity),
        reason
      }
    });

    res.json(updatedProduct);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao adicionar estoque.' });
  }
});

router.post('/:id/stock/remove', authMiddleware, checkPermission('products', 'stock'), async (req, res) => {
  try {
    const { quantity, reason } = req.body;

    if (!quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Quantidade inválida.' });
    }

    const product = await prisma.product.findFirst({
      where: {
        id: req.params.id,
        complexId: req.user.complexId
      }
    });

    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado.' });
    }

    if (product.stock < parseInt(quantity)) {
      return res.status(400).json({ error: 'Estoque insuficiente.' });
    }

    const productInOpenTabs = await prisma.tabItem.findMany({
      where: {
        productId: req.params.id,
        tab: { status: 'OPEN' }
      },
      include: {
        tab: {
          include: {
            client: true
          }
        }
      }
    });

    if (productInOpenTabs.length > 0) {
      return res.status(400).json({
        error: 'Não é possível remover estoque de produto que está em comandas abertas',
        openTabs: productInOpenTabs.length,
        details: 'Feche as comandas antes de ajustar o estoque deste produto'
      });
    }

    const updatedProduct = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        stock: product.stock - parseInt(quantity)
      }
    });

    await prisma.stockMovement.create({
      data: {
        productId: req.params.id,
        type: 'SAIDA',
        quantity: parseInt(quantity),
        reason
      }
    });

    res.json(updatedProduct);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao remover estoque.' });
  }
});

module.exports = router;