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
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

// Listar tipos de quadra (padrão + do complexo)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const courtTypes = await prisma.courtType.findMany({
      where: {
        OR: [
          { isDefault: true },
          { complexId: req.user.complexId }
        ]
      },
      orderBy: [
        { isDefault: 'desc' },
        { name: 'asc' }
      ]
    });

    res.json(courtTypes);
  } catch (error) {
    console.error('Erro ao buscar tipos de quadra:', error);
    res.status(500).json({ error: 'Erro ao buscar tipos de quadra' });
  }
});

// Criar novo tipo de quadra
router.post('/', 
  authMiddleware, 
  checkPermission('courts', 'create'),
  [
    body('name')
      .trim()
      .notEmpty().withMessage('Nome do tipo é obrigatório')
      .isLength({ min: 2, max: 50 }).withMessage('Nome deve ter entre 2 e 50 caracteres'),
    validate
  ],
  async (req, res) => {
    try {
      const { name } = req.body;

      // Verificar se já existe
      const existing = await prisma.courtType.findFirst({
        where: {
          name,
          OR: [
            { isDefault: true },
            { complexId: req.user.complexId }
          ]
        }
      });

      if (existing) {
        return res.status(409).json({ 
          error: 'Já existe um tipo de quadra com este nome' 
        });
      }

      const courtType = await prisma.courtType.create({
        data: {
          name: name.trim(),
          complexId: req.user.complexId
        }
      });

      res.status(201).json(courtType);
    } catch (error) {
      console.error('Erro ao criar tipo de quadra:', error);
      res.status(500).json({ error: 'Erro ao criar tipo de quadra' });
    }
  }
);

// Atualizar tipo de quadra (apenas tipos personalizados)
router.put('/:id',
  authMiddleware,
  checkPermission('courts', 'edit'),
  [
    param('id').isUUID().withMessage('ID inválido'),
    body('name')
      .trim()
      .notEmpty().withMessage('Nome do tipo é obrigatório')
      .isLength({ min: 2, max: 50 }).withMessage('Nome deve ter entre 2 e 50 caracteres'),
    validate
  ],
  async (req, res) => {
    try {
      const { name } = req.body;

      const courtType = await prisma.courtType.findFirst({
        where: {
          id: req.params.id,
          complexId: req.user.complexId,
          isDefault: false
        }
      });

      if (!courtType) {
        return res.status(404).json({ 
          error: 'Tipo de quadra não encontrado ou não pode ser editado' 
        });
      }

      // Verificar se o novo nome já existe
      const existing = await prisma.courtType.findFirst({
        where: {
          name: name.trim(),
          id: { not: req.params.id },
          OR: [
            { isDefault: true },
            { complexId: req.user.complexId }
          ]
        }
      });

      if (existing) {
        return res.status(409).json({ 
          error: 'Já existe um tipo de quadra com este nome' 
        });
      }

      const updated = await prisma.courtType.update({
        where: { id: req.params.id },
        data: { name: name.trim() }
      });

      res.json(updated);
    } catch (error) {
      console.error('Erro ao atualizar tipo de quadra:', error);
      res.status(500).json({ error: 'Erro ao atualizar tipo de quadra' });
    }
  }
);

// Deletar tipo de quadra (apenas tipos personalizados sem quadras vinculadas)
router.delete('/:id',
  authMiddleware,
  checkPermission('courts', 'delete'),
  [
    param('id').isUUID().withMessage('ID inválido'),
    validate
  ],
  async (req, res) => {
    try {
      const courtType = await prisma.courtType.findFirst({
        where: {
          id: req.params.id,
          complexId: req.user.complexId,
          isDefault: false
        },
        include: {
          courts: true
        }
      });

      if (!courtType) {
        return res.status(404).json({ 
          error: 'Tipo de quadra não encontrado ou não pode ser excluído' 
        });
      }

      if (courtType.courts.length > 0) {
        return res.status(409).json({ 
          error: 'Não é possível excluir tipo de quadra com quadras vinculadas',
          courtsCount: courtType.courts.length
        });
      }

      await prisma.courtType.delete({
        where: { id: req.params.id }
      });

      res.json({ message: 'Tipo de quadra excluído com sucesso' });
    } catch (error) {
      console.error('Erro ao deletar tipo de quadra:', error);
      res.status(500).json({ error: 'Erro ao deletar tipo de quadra' });
    }
  }
);

module.exports = router;
