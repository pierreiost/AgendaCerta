const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');
const { validateIDOR } = require('../middleware/idorValidation');
const { body, param, query, validationResult } = require('express-validator');

// Usar singleton do Prisma
const prisma = require('../lib/prisma');

const router = express.Router();

/**
 * Middleware de validação
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: errors.array()[0].msg,
      code: 'VALIDATION_ERROR',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

/**
 * Validadores para clientes
 */
const clientValidators = {
  create: [
    body('fullName')
      .trim()
      .notEmpty().withMessage('Nome completo é obrigatório')
      .isLength({ min: 3, max: 100 }).withMessage('Nome deve ter entre 3 e 100 caracteres'),

    body('phone')
      .trim()
      .notEmpty().withMessage('Telefone é obrigatório')
      .isLength({ min: 10, max: 15 }).withMessage('Telefone inválido'),

    body('email')
      .optional({ nullable: true, checkFalsy: true })
      .trim()
      .isEmail().withMessage('Email inválido')
      .normalizeEmail(),

    body('cpf')
      .optional({ nullable: true, checkFalsy: true })
      .trim()
      .isLength({ min: 11, max: 14 }).withMessage('CPF inválido'),

    validate
  ],

  update: [
    param('id')
      .isUUID().withMessage('ID inválido'),

    body('fullName')
      .optional()
      .trim()
      .isLength({ min: 3, max: 100 }).withMessage('Nome deve ter entre 3 e 100 caracteres'),

    body('phone')
      .optional()
      .trim()
      .isLength({ min: 10, max: 15 }).withMessage('Telefone inválido'),

    body('email')
      .optional({ nullable: true, checkFalsy: true })
      .trim()
      .isEmail().withMessage('Email inválido')
      .normalizeEmail(),

    body('cpf')
      .optional({ nullable: true, checkFalsy: true })
      .trim()
      .isLength({ min: 11, max: 14 }).withMessage('CPF inválido'),

    validate
  ],

  query: [
    query('page')
      .optional()
      .isInt({ min: 1 }).withMessage('Página deve ser um número positivo'),

    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('Limite deve ser entre 1 e 100'),

    validate
  ]
};

/**
 * @swagger
 * tags:
 *   name: Clients
 *   description: Gestão de Clientes
 */

/**
 * @swagger
 * /clients:
 *   get:
 *     summary: Lista todos os clientes do complexo
 *     tags: [Clients]
 */
router.get('/',
  authMiddleware,
  checkPermission('clients', 'view'),
  clientValidators.query,
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;

      const where = { complexId: req.user.complexId };

      // Filtro por nome/telefone
      if (req.query.search) {
        where.OR = [
          { fullName: { contains: req.query.search, mode: 'insensitive' } },
          { phone: { contains: req.query.search } },
          { email: { contains: req.query.search, mode: 'insensitive' } }
        ];
      }

      const [clients, total] = await Promise.all([
        prisma.client.findMany({
          where,
          skip,
          take: limit,
          orderBy: { fullName: 'asc' }
        }),
        prisma.client.count({ where })
      ]);

      res.json({
        data: clients,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('[Clients] Erro ao listar clientes:', error.message);
      res.status(500).json({ error: 'Erro ao listar clientes.' });
    }
  }
);

/**
 * @swagger
 * /clients/{id}:
 *   get:
 *     summary: Busca um cliente pelo ID
 *     tags: [Clients]
 */
router.get('/:id',
  authMiddleware,
  checkPermission('clients', 'view'),
  validateIDOR('client'),
  async (req, res) => {
    try {
      const client = await prisma.client.findFirst({
        where: {
          id: req.params.id,
          complexId: req.user.complexId
        },
        include: {
          reservations: {
            include: {
              resource: true
            },
            orderBy: { createdAt: 'desc' },
            take: 10
          },
          tabs: {
            orderBy: { createdAt: 'desc' },
            take: 10
          }
        }
      });

      if (!client) {
        return res.status(404).json({ error: 'Cliente não encontrado.' });
      }

      res.json(client);
    } catch (error) {
      console.error('[Clients] Erro ao buscar cliente:', error.message);
      res.status(500).json({ error: 'Erro ao buscar cliente.' });
    }
  }
);

/**
 * @swagger
 * /clients/{id}/history:
 *   get:
 *     summary: Busca histórico completo de um cliente
 *     tags: [Clients]
 */
router.get('/:id/history',
  authMiddleware,
  checkPermission('clients', 'view'),
  validateIDOR('client'),
  async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const client = await prisma.client.findFirst({
        where: {
          id: req.params.id,
          complexId: req.user.complexId
        }
      });

      if (!client) {
        return res.status(404).json({ error: 'Cliente não encontrado.' });
      }

      const now = new Date();

      const totalReservations = await prisma.reservation.count({
        where: {
          clientId: req.params.id
        }
      });

      const closedTabs = await prisma.tab.findMany({
        where: {
          clientId: req.params.id,
          status: 'PAID'
        },
        select: {
          total: true
        }
      });

      const totalSpent = closedTabs.reduce((sum, tab) => sum + tab.total, 0);

      const upcomingReservations = await prisma.reservation.findMany({
        where: {
          clientId: req.params.id,
          startTime: { gte: now },
          status: { not: 'CANCELLED' }
        },
        include: {
          resource: true
        },
        orderBy: { startTime: 'asc' },
        take: 3
      });

      const [reservations, totalCount] = await Promise.all([
        prisma.reservation.findMany({
          where: {
            clientId: req.params.id
          },
          include: {
            resource: true
          },
          orderBy: { startTime: 'desc' },
          skip: skip,
          take: parseInt(limit)
        }),
        prisma.reservation.count({
          where: { clientId: req.params.id }
        })
      ]);

      res.json({
        client,
        statistics: {
          totalReservations,
          totalSpent: parseFloat(totalSpent.toFixed(2))
        },
        upcomingReservations,
        history: {
          reservations,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalCount / parseInt(limit)),
            totalItems: totalCount,
            itemsPerPage: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('[Clients] Erro ao buscar histórico do cliente:', error.message);
      res.status(500).json({ error: 'Erro ao buscar histórico do cliente.' });
    }
  }
);

/**
 * @swagger
 * /clients:
 *   post:
 *     summary: Cria um novo cliente
 *     tags: [Clients]
 */
router.post('/',
  authMiddleware,
  checkPermission('clients', 'create'),
  clientValidators.create,
  async (req, res) => {
    try {
      const { fullName, phone, email, cpf } = req.body;

      const client = await prisma.client.create({
        data: {
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: email?.trim() || null,
          cpf: cpf?.trim() || null,
          complexId: req.user.complexId
        }
      });

      res.status(201).json(client);
    } catch (error) {
      console.error('[Clients] Erro ao criar cliente:', error.message);
      res.status(500).json({ error: 'Erro ao criar cliente.' });
    }
  }
);

/**
 * @swagger
 * /clients/{id}:
 *   put:
 *     summary: Atualiza um cliente existente
 *     tags: [Clients]
 */
router.put('/:id',
  authMiddleware,
  checkPermission('clients', 'edit'),
  validateIDOR('client'),
  clientValidators.update,
  async (req, res) => {
    try {
      const { fullName, phone, email, cpf } = req.body;

      const client = await prisma.client.findFirst({
        where: {
          id: req.params.id,
          complexId: req.user.complexId
        }
      });

      if (!client) {
        return res.status(404).json({ error: 'Cliente não encontrado.' });
      }

      const updatedClient = await prisma.client.update({
        where: { id: req.params.id },
        data: {
          ...(fullName && { fullName: fullName.trim() }),
          ...(phone && { phone: phone.trim() }),
          email: email?.trim() || null,
          cpf: cpf?.trim() || null
        }
      });

      res.json(updatedClient);
    } catch (error) {
      console.error('[Clients] Erro ao atualizar cliente:', error.message);
      res.status(500).json({ error: 'Erro ao atualizar cliente.' });
    }
  }
);

/**
 * @swagger
 * /clients/{id}:
 *   delete:
 *     summary: Deleta um cliente
 *     tags: [Clients]
 */
router.delete('/:id',
  authMiddleware,
  checkPermission('clients', 'delete'),
  validateIDOR('client'),
  async (req, res) => {
    try {
      const client = await prisma.client.findFirst({
        where: {
          id: req.params.id,
          complexId: req.user.complexId
        }
      });

      if (!client) {
        return res.status(404).json({ error: 'Cliente não encontrado.' });
      }

      const now = new Date();

      // Verifica apenas reservas FUTURAS e ATIVAS
      const activeReservations = await prisma.reservation.count({
        where: {
          clientId: req.params.id,
          status: { not: 'CANCELLED' },
          endTime: { gte: now }
        }
      });

      if (activeReservations > 0) {
        return res.status(400).json({
          error: 'Não é possível deletar cliente com reservas futuras ativas. Cancele as reservas primeiro.',
          code: 'ACTIVE_RESERVATIONS',
          activeReservations
        });
      }

      // Verifica comandas abertas
      const openTabs = await prisma.tab.count({
        where: {
          clientId: req.params.id,
          status: 'OPEN'
        }
      });

      if (openTabs > 0) {
        return res.status(400).json({
          error: 'Não é possível deletar cliente com comandas abertas. Feche as comandas primeiro.',
          code: 'OPEN_TABS',
          openTabs
        });
      }

      // Usa transação para deletar tudo na ordem correta
      await prisma.$transaction(async (tx) => {
        // 1. Busca todas as comandas do cliente
        const tabs = await tx.tab.findMany({
          where: { clientId: req.params.id },
          select: { id: true }
        });

        const tabIds = tabs.map(t => t.id);

        // 2. Deleta items das comandas
        if (tabIds.length > 0) {
          await tx.tabItem.deleteMany({
            where: { tabId: { in: tabIds } }
          });
        }

        // 3. Deleta as comandas
        await tx.tab.deleteMany({
          where: { clientId: req.params.id }
        });

        // 4. Deleta as reservas
        await tx.reservation.deleteMany({
          where: { clientId: req.params.id }
        });

        // 5. Finalmente deleta o cliente
        await tx.client.delete({
          where: { id: req.params.id }
        });
      });

      res.json({ message: 'Cliente deletado com sucesso.' });
    } catch (error) {
      console.error('[Clients] Erro ao deletar cliente:', error.message);
      res.status(500).json({ error: 'Erro ao deletar cliente.' });
    }
  }
);

module.exports = router;
