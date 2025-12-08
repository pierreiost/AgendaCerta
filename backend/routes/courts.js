const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');
const { body, param, validationResult } = require('express-validator');

const router = express.Router();
const prisma = new PrismaClient();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Dados inválidos',
      details: errors.array().map(err => ({
        field: err.path || err.param,
        message: err.msg
      }))
    });
  }
  next();
};

// Listar quadras
router.get('/', authMiddleware, checkPermission('courts', 'view'), async (req, res) => {
  try {
    const courts = await prisma.court.findMany({
      where: { complexId: req.user.complexId },
      include: {
        courtType: true
      },
      orderBy: { name: 'asc' }
    });

    res.json(courts);
  } catch (error) {
    console.error('Erro ao listar quadras:', error);
    res.status(500).json({ error: 'Erro ao listar quadras' });
  }
});

// Buscar quadra por ID
router.get('/:id',
  authMiddleware,
  checkPermission('courts', 'view'),
  [
    param('id').isUUID().withMessage('ID inválido'),
    validate
  ],
  async (req, res) => {
    try {
      const court = await prisma.court.findFirst({
        where: {
          id: req.params.id,
          complexId: req.user.complexId
        },
        include: {
          courtType: true
        }
      });

      if (!court) {
        return res.status(404).json({ error: 'Quadra não encontrada' });
      }

      res.json(court);
    } catch (error) {
      console.error('Erro ao buscar quadra:', error);
      res.status(500).json({ error: 'Erro ao buscar quadra' });
    }
  }
);

// Criar quadra
router.post('/',
  authMiddleware,
  checkPermission('courts', 'create'),
  [
    body('name')
      .trim()
      .notEmpty().withMessage('Nome é obrigatório')
      .isLength({ min: 3, max: 100 }).withMessage('Nome deve ter entre 3 e 100 caracteres'),
    body('courtTypeId')
      .isUUID().withMessage('Tipo de quadra inválido'),
    body('pricePerHour')
      .isFloat({ min: 0 }).withMessage('Preço deve ser um valor positivo'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage('Descrição muito longa (máximo 500 caracteres)'),
    body('status')
      .optional()
      .isIn(['AVAILABLE', 'OCCUPIED', 'MAINTENANCE']).withMessage('Status inválido'),
    validate
  ],
  async (req, res) => {
    try {
      const { name, courtTypeId, pricePerHour, description, status } = req.body;

      const courtType = await prisma.courtType.findFirst({
        where: {
          id: courtTypeId,
          OR: [
            { complexId: req.user.complexId },
            { isDefault: true }
          ]
        }
      });

      if (!courtType) {
        return res.status(404).json({ error: 'Tipo de quadra não encontrado' });
      }

      const court = await prisma.court.create({
        data: {
          name: name.trim(),
          courtTypeId,
          pricePerHour: parseFloat(pricePerHour),
          description: description?.trim() || null,
          status: status || 'AVAILABLE',
          complexId: req.user.complexId
        },
        include: {
          courtType: true
        }
      });

      res.status(201).json(court);
    } catch (error) {
      console.error('Erro ao criar quadra:', error);
      res.status(500).json({ error: 'Erro ao criar quadra' });
    }
  }
);

// Atualizar quadra
router.put('/:id',
  authMiddleware,
  checkPermission('courts', 'edit'),
  [
    param('id').isUUID().withMessage('ID inválido'),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 3, max: 100 }).withMessage('Nome deve ter entre 3 e 100 caracteres'),
    body('courtTypeId')
      .optional()
      .isUUID().withMessage('Tipo de quadra inválido'),
    body('pricePerHour')
      .optional()
      .isFloat({ min: 0 }).withMessage('Preço deve ser um valor positivo'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage('Descrição muito longa (máximo 500 caracteres)'),
    body('status')
      .optional()
      .isIn(['AVAILABLE', 'OCCUPIED', 'MAINTENANCE']).withMessage('Status inválido'),
    validate
  ],
  async (req, res) => {
    try {
      const { name, courtTypeId, pricePerHour, description, status } = req.body;

      const court = await prisma.court.findFirst({
        where: {
          id: req.params.id,
          complexId: req.user.complexId
        }
      });

      if (!court) {
        return res.status(404).json({ error: 'Quadra não encontrada' });
      }

      if (courtTypeId) {
        const courtType = await prisma.courtType.findFirst({
          where: {
            id: courtTypeId,
            OR: [
              { complexId: req.user.complexId },
              { isDefault: true }
            ]
          }
        });

        if (!courtType) {
          return res.status(404).json({ error: 'Tipo de quadra não encontrado' });
        }
      }

      const updatedCourt = await prisma.court.update({
        where: { id: req.params.id },
        data: {
          ...(name && { name: name.trim() }),
          ...(courtTypeId && { courtTypeId }),
          ...(pricePerHour && { pricePerHour: parseFloat(pricePerHour) }),
          ...(description !== undefined && { description: description?.trim() || null }),
          ...(status && { status })
        },
        include: {
          courtType: true
        }
      });

      res.json(updatedCourt);
    } catch (error) {
      console.error('Erro ao atualizar quadra:', error);
      res.status(500).json({ error: 'Erro ao atualizar quadra' });
    }
  }
);

// Deletar quadra
router.delete('/:id',
  authMiddleware,
  checkPermission('courts', 'delete'),
  [
    param('id').isUUID().withMessage('ID inválido'),
    validate
  ],
  async (req, res) => {
    try {
      const court = await prisma.court.findFirst({
        where: {
          id: req.params.id,
          complexId: req.user.complexId
        }
      });

      if (!court) {
        return res.status(404).json({ error: 'Quadra não encontrada' });
      }

      const now = new Date();

      // Verifica apenas reservas FUTURAS e ATIVAS
      const activeReservations = await prisma.reservation.count({
        where: {
          courtId: req.params.id,
          status: { not: 'CANCELLED' },
          startTime: { gte: now }
        }
      });

      if (activeReservations > 0) {
        return res.status(409).json({ 
          error: 'Não é possível deletar quadra com reservas futuras ativas',
          activeReservations: activeReservations
        });
      }

      // Usa transação para deletar tudo na ordem correta
      await prisma.$transaction(async (tx) => {
        // 1. Busca todas as reservas da quadra
        const reservations = await tx.reservation.findMany({
          where: { courtId: req.params.id },
          select: { id: true }
        });

        const reservationIds = reservations.map(r => r.id);

        if (reservationIds.length > 0) {
          // 2. Busca todas as comandas vinculadas às reservas
          const tabs = await tx.tab.findMany({
            where: { reservationId: { in: reservationIds } },
            select: { id: true }
          });

          const tabIds = tabs.map(t => t.id);

          // 3. Deleta items das comandas
          if (tabIds.length > 0) {
            await tx.tabItem.deleteMany({
              where: { tabId: { in: tabIds } }
            });
          }

          // 4. Deleta as comandas
          if (tabIds.length > 0) {
            await tx.tab.deleteMany({
              where: { id: { in: tabIds } }
            });
          }

          // 5. Deleta as reservas
          await tx.reservation.deleteMany({
            where: { courtId: req.params.id }
          });
        }

        // 6. Finalmente deleta a quadra
        await tx.court.delete({
          where: { id: req.params.id }
        });
      });

      res.json({ message: 'Quadra deletada com sucesso' });
    } catch (error) {
      console.error('Erro ao deletar quadra:', error);
      res.status(500).json({ error: 'Erro ao deletar quadra' });
    }
  }
);

module.exports = router;