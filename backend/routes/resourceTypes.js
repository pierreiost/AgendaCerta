const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');
const { body, param, validationResult } = require('express-validator');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: ResourceTypes
 *   description: Gestão de Tipos de Recurso
 */
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

/**
 * @swagger
 * /resource-types:
 *   get:
 *     summary: Lista todos os tipos de recurso (padrão e personalizados)
 *     tags: [ResourceTypes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de tipos de recurso
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ResourceType'
 *       401:
 *         description: Não autorizado
 */
// Listar tipos de recurso (padrão + do complexo)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const resourceTypes = await prisma.resourceType.findMany({
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

    res.json(resourceTypes);
  } catch (error) {
    console.error('Erro ao buscar tipos de recurso:', error);
    res.status(500).json({ error: 'Erro ao buscar tipos de recurso' });
  }
});

/**
 * @swagger
 * /resource-types:
 *   post:
 *     summary: Cria um novo tipo de recurso personalizado
 *     tags: [ResourceTypes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nome do novo tipo de recurso
 *     responses:
 *       201:
 *         description: Tipo de recurso criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ResourceType'
 *       400:
 *         description: Dados inválidos
 *       409:
 *         description: Já existe um tipo de recurso com este nome
 */
// Criar novo tipo de recurso
router.post('/', 
  authMiddleware, 
  checkPermission('resources', 'create'),
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
      const existing = await prisma.resourceType.findFirst({
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
          error: 'Já existe um tipo de recurso com este nome' 
        });
      }

      const resourceType = await prisma.resourceType.create({
        data: {
          name: name.trim(),
          complexId: req.user.complexId
        }
      });

      res.status(201).json(resourceType);
    } catch (error) {
      console.error('Erro ao criar tipo de recurso:', error);
      res.status(500).json({ error: 'Erro ao criar tipo de recurso' });
    }
  }
);

/**
 * @swagger
 * /resource-types/{id}:
 *   put:
 *     summary: Atualiza um tipo de recurso personalizado
 *     tags: [ResourceTypes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID do tipo de recurso a ser atualizado
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Novo nome do tipo de recurso
 *     responses:
 *       200:
 *         description: Tipo de recurso atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ResourceType'
 *       400:
 *         description: Dados inválidos
 *       404:
 *         description: Tipo de recurso não encontrado ou não pode ser editado
 *       409:
 *         description: Já existe um tipo de recurso com este nome
 */
// Atualizar tipo de recurso (apenas tipos personalizados)
router.put('/:id',
  authMiddleware,
  checkPermission('resources', 'edit'),
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

      const resourceType = await prisma.resourceType.findFirst({
        where: {
          id: req.params.id,
          complexId: req.user.complexId,
          isDefault: false
        }
      });

      if (!resourceType) {
        return res.status(404).json({ 
          error: 'Tipo de recurso não encontrado ou não pode ser editado' 
        });
      }

      // Verificar se o novo nome já existe
      const existing = await prisma.resourceType.findFirst({
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
          error: 'Já existe um tipo de recurso com este nome' 
        });
      }

      const updated = await prisma.resourceType.update({
        where: { id: req.params.id },
        data: { name: name.trim() }
      });

      res.json(updated);
    } catch (error) {
      console.error('Erro ao atualizar tipo de recurso:', error);
      res.status(500).json({ error: 'Erro ao atualizar tipo de recurso' });
    }
  }
);

/**
 * @swagger
 * /resource-types/{id}:
 *   delete:
 *     summary: Deleta um tipo de recurso personalizado
 *     tags: [ResourceTypes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID do tipo de recurso a ser deletado
 *     responses:
 *       200:
 *         description: Tipo de recurso excluído com sucesso
 *       404:
 *         description: Tipo de recurso não encontrado ou não pode ser excluído
 *       409:
 *         description: Conflito (recursos vinculados)
 */
// Deletar tipo de recurso (apenas tipos personalizados sem recursos vinculadas)
router.delete('/:id',
  authMiddleware,
  chcheckPermission('resources', 'delete')),
  [
    param('id').isUUID().withMessage('ID inválido'),
    validate
  ],
  async (req, res) => {
    try {
      const resourceType = await prisma.resourceType.findFirst({
        where: {
          id: req.params.id,
          complexId: req.user.complexId,
          isDefault: false
        },
        include: {
          resources: true
        }
      });

      if (!resourceType) {
        return res.status(404).json({ 
          error: 'Tipo de recurso não encontrado ou não pode ser excluído' 
        });
      }

      if (resourceType.resources.length > 0) {
        return res.status(409).json({ 
          error: 'Não é possível excluir tipo de recurso com recursos vinculadas',
          resourcesCount: resourceType.resources.length
        });
      }

      await prisma.resourceType.delete({
        where: { id: req.params.id }
      });

      res.json({ message: 'Tipo de recurso excluído com sucesso' });
    } catch (error) {
      console.error('Erro ao deletar tipo de recurso:', error);
      res.status(500).json({ error: 'Erro ao deletar tipo de recurso' });
    }
  }
);

module.exports = router;
