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

// Listar recursos
router.get('/', authMiddleware, checkPermission('resources', 'view'), async (req, res) => {
  try {
    const resources = await prisma.resource.findMany({
      where: { complexId: req.user.complexId },
      include: {
        resourceType: true
      },
      orderBy: { name: 'asc' }
    });

    res.json(resources);
  } catch (error) {
    console.error('Erro ao listar recursos:', error);
    res.status(500).json({ error: 'Erro ao listar recursos' });
  }
});

// Buscar recurso por ID
router.get('/:id',
  authMiddleware,
  checkPermission('resources', 'view'),
  [
    param('id').isUUID().withMessage('ID inválido'),
    validate
  ],
  async (req, res) => {
    try {
      const resource = await prisma.resource.findFirst({
        where: {
          id: req.params.id,
          complexId: req.user.complexId
        },
        include: {
          resourceType: true
        }
      });

      if (!resource) {
        return res.status(404).json({ error: 'Recurso não encontrada' });
      }

      res.json(resource);
    } catch (error) {
      console.error('Erro ao buscar recurso:', error);
      res.status(500).json({ error: 'Erro ao buscar recurso' });
    }
  }
);

// Criar recurso
router.post('/',
  authMiddleware,
  checkPermission('resources', 'create'),
  [
    body('name')
      .trim()
      .notEmpty().withMessage('Nome é obrigatório')
      .isLength({ min: 3, max: 100 }).withMessage('Nome deve ter entre 3 e 100 caracteres'),
    body('resourceTypeId')
      .isUUID().withMessage('Tipo de recurso inválido'),
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
      const { name, resourceTypeId, pricePerHour, description, status } = req.body;

      const resourceType = await prisma.resourceType.findFirst({
        where: {
          id: resourceTypeId,
          OR: [
            { complexId: req.user.complexId },
            { isDefault: true }
          ]
        }
      });

      if (!resourceType) {
        return res.status(404).json({ error: 'Tipo de recurso não encontrado' });
      }

      const resource = await prisma.resource.create({
        data: {
          name: name.trim(),
          resourceTypeId,
          pricePerHour: parseFloat(pricePerHour),
          description: description?.trim() || null,
          status: status || 'AVAILABLE',
          complexId: req.user.complexId
        },
        include: {
          resourceType: true
        }
      });

      res.status(201).json(resource);
    } catch (error) {
      console.error('Erro ao criar recurso:', error);
      res.status(500).json({ error: 'Erro ao criar recurso' });
    }
  }
);

// Atualizar recurso
router.put('/:id',
  authMiddleware,
  checkPermission('resources', 'edit')t'),
  [
    param('id').isUUID().withMessage('ID inválido'),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 3, max: 100 }).withMessage('Nome deve ter entre 3 e 100 caracteres'),
    body('resourceTypeId')
      .optional()
      .isUUID().withMessage('Tipo de recurso inválido'),
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
      const { name, resourceTypeId, pricePerHour, description, status } = req.body;

      const resource = await prisma.resource.findFirst({
        where: {
          id: req.params.id,
          complexId: req.user.complexId
        }
      });

      if (!resource) {
        return res.status(404).json({ error: 'Recurso não encontrada' });
      }

      if (resourceTypeId) {
        const resourceType = await prisma.resourceType.findFirst({
          where: {
            id: resourceTypeId,
            OR: [
              { complexId: req.user.complexId },
              { isDefault: true }
            ]
          }
        });

        if (!resourceType) {
          return res.status(404).json({ error: 'Tipo de recurso não encontrado' });
        }
      }

      const updatedResource = await prisma.resource.update({
        where: { id: req.params.id },
        data: {
          ...(name && { name: name.trim() }),
          ...(resourceTypeId && { resourceTypeId }),
          ...(pricePerHour && { pricePerHour: parseFloat(pricePerHour) }),
          ...(description !== undefined && { description: description?.trim() || null }),
          ...(status && { status })
        },
        include: {
          resourceType: true
        }
      });

      res.json(updatedResource);
    } catch (error) {
      console.error('Erro ao atualizar recurso:', error);
      res.status(500).json({ error: 'Erro ao atualizar recurso' });
    }
  }
);

// Deletar recurso
router.delete('/:id',
  authMiddleware,
  ccheckPermission('resources', 'delete')'),
  [
    param('id').isUUID().withMessage('ID inválido'),
    validate
  ],
  async (req, res) => {
    try {
      const resource = await prisma.resource.findFirst({
        where: {
          id: req.params.id,
          complexId: req.user.complexId
        }
      });

      if (!resource) {
        return res.status(404).json({ error: 'Recurso não encontrada' });
      }

      const now = new Date();

      // Verifica apenas reservas FUTURAS e ATIVAS
      const activeReservations = await prisma.reservation.count({
        where: {
          resourceId: req.params.id,
          status: { not: 'CANCELLED' },
          startTime: { gte: now }
        }
      });

      if (activeReservations > 0) {
        return res.status(409).json({ 
          error: 'Não é possível deletar recurso com reservas futuras ativas',
          activeReservations: activeReservations
        });
      }

      // Usa transação para deletar tudo na ordem correta
      await prisma.$transaction(async (tx) => {
        // 1. Busca todas as reservas da recurso
        const reservations = await tx.reservation.findMany({
          where: { resourceId: req.params.id },
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
            where: { resourceId: req.params.id }
          });
        }

        // 6. Finalmente deleta a recurso
        await tx.resource.delete({
          where: { id: req.params.id }
        });
      });

      res.json({ message: 'Recurso deletada com sucesso' });
    } catch (error) {
      console.error('Erro ao deletar recurso:', error);
      res.status(500).json({ error: 'Erro ao deletar recurso' });
    }
  }
);

module.exports = router;