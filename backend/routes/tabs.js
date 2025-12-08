const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');

const router = express.Router();
const prisma = new PrismaClient();

// Listar comandas do complexo
router.get('/', authMiddleware, checkPermission('tabs', 'view'), async (req, res) => {
  try {
    const { status, clientId } = req.query;
    
    const where = {
      client: { complexId: req.user.complexId }
    };

    if (status) {
      where.status = status;
    }

    if (clientId) {
      where.clientId = clientId;
    }

    const tabs = await prisma.tab.findMany({
      where,
      include: {
        client: true,
        reservation: { include: { court: true } },
        items: { include: { product: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(tabs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar comandas.' });
  }
});

// Buscar comanda por ID
router.get('/:id', authMiddleware, checkPermission('tabs', 'view'), async (req, res) => {
  try {
    const tab = await prisma.tab.findFirst({
      where: {
        id: req.params.id,
        client: { complexId: req.user.complexId }
      },
      include: {
        client: true,
        reservation: { include: { court: true } },
        items: { include: { product: true } }
      }
    });

    if (!tab) {
      return res.status(404).json({ error: 'Comanda não encontrada.' });
    }

    res.json(tab);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar comanda.' });
  }
});

// Criar nova comanda
router.post('/', authMiddleware, checkPermission('tabs', 'create'), async (req, res) => {
  try {
    let { clientId, reservationId } = req.body;

    if (!reservationId || reservationId === '' || reservationId === 'null' || reservationId === 'undefined') {
      reservationId = null;
    }

    if (!clientId) {
      return res.status(400).json({ error: 'Cliente é obrigatório.' });
    }

    const client = await prisma.client.findFirst({
      where: { id: clientId, complexId: req.user.complexId }
    });

    if (!client) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }

    if (reservationId) {
      const reservation = await prisma.reservation.findFirst({
        where: {
          id: reservationId,
          court: { complexId: req.user.complexId }
        }
      });

      if (!reservation) {
        return res.status(404).json({ error: 'Reserva não encontrada.' });
      }
    }

    const tab = await prisma.tab.create({
      data: {
        clientId,
        reservationId: reservationId || undefined,
        status: 'OPEN'
      },
      include: {
        client: true,
        reservation: { include: { court: true } }
      }
    });

    res.status(201).json(tab);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar comanda.' });
  }
});

// Adicionar item
router.post('/:id/items', authMiddleware, checkPermission('tabs', 'edit'), async (req, res) => {
  try {
    const { productId, description, quantity, unitPrice } = req.body;

    if (!description || !quantity || !unitPrice) {
      return res.status(400).json({ error: 'Campos obrigatórios não preenchidos.' });
    }

    const tab = await prisma.tab.findFirst({
      where: {
        id: req.params.id,
        client: { complexId: req.user.complexId }
      }
    });

    if (!tab) {
      return res.status(404).json({ error: 'Comanda não encontrada.' });
    }

    if (tab.status !== 'OPEN') {
      return res.status(400).json({ error: 'Comanda não está aberta.' });
    }

    const qty = parseInt(quantity);
    const price = parseFloat(unitPrice);

    if (productId) {
      const product = await prisma.product.findUnique({
        where: { id: productId }
      });

      if (!product) {
        return res.status(404).json({ error: 'Produto não encontrado.' });
      }

      if (product.stock < qty) {
        return res.status(400).json({ 
          error: `Estoque insuficiente para ${product.name}. Disponível: ${product.stock} ${product.unit}` 
        });
      }
    }

    const total = qty * price;

    const item = await prisma.tabItem.create({
      data: {
        tabId: tab.id,
        productId: productId || undefined,
        description,
        quantity: qty,
        unitPrice: price,
        total
      },
      include: {
        product: true
      }
    });

    await prisma.tab.update({
      where: { id: tab.id },
      data: {
        total: tab.total + total
      }
    });

    res.status(201).json(item);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao adicionar item.' });
  }
});

// Remover item da comanda
router.delete('/:id/items/:itemId', authMiddleware, checkPermission('tabs', 'edit'), async (req, res) => {
  try {
    const tab = await prisma.tab.findFirst({
      where: {
        id: req.params.id,
        client: { complexId: req.user.complexId }
      }
    });

    if (!tab) {
      return res.status(404).json({ error: 'Comanda não encontrada.' });
    }

    if (tab.status !== 'OPEN') {
      return res.status(400).json({ error: 'Comanda não está aberta.' });
    }

    const item = await prisma.tabItem.findUnique({
      where: { id: req.params.itemId }
    });

    if (!item || item.tabId !== tab.id) {
      return res.status(404).json({ error: 'Item não encontrado.' });
    }

    await prisma.tabItem.delete({
      where: { id: req.params.itemId }
    });

    await prisma.tab.update({
      where: { id: tab.id },
      data: {
        total: tab.total - item.total
      }
    });

    res.json({ message: 'Item removido com sucesso.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao remover item.' });
  }
});

// Fechar comanda
router.post('/:id/close', authMiddleware, checkPermission('tabs', 'close'), async (req, res) => {
  try {
    const tab = await prisma.tab.findFirst({
      where: {
        id: req.params.id,
        client: { complexId: req.user.complexId }
      },
      include: {
        items: { include: { product: true } }
      }
    });

    if (!tab) {
      return res.status(404).json({ error: 'Comanda não encontrada.' });
    }

    if (tab.status !== 'OPEN') {
      return res.status(400).json({ error: 'Comanda já está fechada.' });
    }

    const itemsWithoutStock = [];
    
    for (const item of tab.items) {
      if (item.productId) {
        const product = await prisma.product.findUnique({
          where: { id: item.productId }
        });

        if (!product) {
          return res.status(400).json({ 
            error: `Produto ${item.description} não encontrado no sistema` 
          });
        }

        if (product.stock < item.quantity) {
          itemsWithoutStock.push({
            name: product.name,
            requested: item.quantity,
            available: product.stock,
            unit: product.unit
          });
        }
      }
    }

    if (itemsWithoutStock.length > 0) {
      const errorMessages = itemsWithoutStock.map(item => 
        `${item.name}: solicitado ${item.requested} ${item.unit}, disponível ${item.available} ${item.unit}`
      ).join('; ');

      return res.status(400).json({ 
        error: `Estoque insuficiente para: ${errorMessages}`,
        itemsWithoutStock
      });
    }

    await prisma.$transaction(async (tx) => {
      for (const item of tab.items) {
        if (item.productId) {
          const product = item.product;

          await tx.product.update({
            where: { id: product.id },
            data: {
              stock: product.stock - item.quantity
            }
          });

          await tx.stockMovement.create({
            data: {
              productId: product.id,
              type: 'SAIDA',
              quantity: item.quantity,
              reason: `Venda - Comanda #${tab.id.substring(0, 8)}`
            }
          });
        }
      }

      await tx.tab.update({
        where: { id: tab.id },
        data: {
          status: 'PAID',
          paidAt: new Date()
        }
      });
    });

    const closedTab = await prisma.tab.findUnique({
      where: { id: tab.id },
      include: {
        client: true,
        reservation: { include: { court: true } },
        items: { include: { product: true } }
      }
    });

    res.json(closedTab);
  } catch (error) {
    console.error('Erro ao fechar comanda:', error);
    res.status(500).json({ error: 'Erro ao fechar comanda.' });
  }
});

// Cancelar comanda
router.delete('/:id', authMiddleware, checkPermission('tabs', 'cancel'), async (req, res) => {
  try {
    const tab = await prisma.tab.findFirst({
      where: {
        id: req.params.id,
        client: { complexId: req.user.complexId }
      }
    });

    if (!tab) {
      return res.status(404).json({ error: 'Comanda não encontrada.' });
    }

    await prisma.tab.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED' }
    });

    res.json({ message: 'Comanda cancelada com sucesso.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao cancelar comanda.' });
  }
});

module.exports = router;