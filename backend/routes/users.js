const express = require('express');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { body, validationResult } = require('express-validator');
const { authMiddleware } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');

const router = express.Router();
const prisma = new PrismaClient();

const userValidation = [
  body('firstName').trim().notEmpty().withMessage('Nome é obrigatório'),
  body('lastName').trim().notEmpty().withMessage('Sobrenome é obrigatório'),
  body('email').isEmail().withMessage('Email inválido'),
  body('phone').notEmpty().withMessage('Telefone é obrigatório'),
  body('role').isIn(['ADMIN', 'SEMI_ADMIN']).withMessage('Função inválida')
];

router.get('/', authMiddleware, checkPermission('users', 'view'), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        complexId: req.user.complexId,
        role: { not: 'SUPER_ADMIN' }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        cpf: true,
        role: true,
        createdAt: true,
        permissions: {
          include: {
            permission: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(users);
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
});

router.get('/:id', authMiddleware, checkPermission('users', 'view'), async (req, res) => {
  try {
    const user = await prisma.user.findFirst({
      where: {
        id: req.params.id,
        complexId: req.user.complexId,
        role: { not: 'SUPER_ADMIN' }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        cpf: true,
        role: true,
        createdAt: true,
        permissions: {
          include: {
            permission: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json(user);
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
});

router.post('/', authMiddleware, checkPermission('users', 'create'), userValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Dados inválidos',
        details: errors.array().map(err => err.msg)
      });
    }

    const { firstName, lastName, email, password, phone, cpf, role, permissionIds } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      return res.status(409).json({ error: 'Email já está em uso' });
    }

    if (role === 'ADMIN' && req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Sem permissão para criar administradores' });
    }

    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Senha deve ter no mínimo 8 caracteres' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        phone,
        cpf: cpf || null,
        role,
        complexId: req.user.complexId,
        status: 'ACTIVE'
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        cpf: true,
        role: true,
        createdAt: true
      }
    });

    if (role === 'SEMI_ADMIN' && Array.isArray(permissionIds) && permissionIds.length > 0) {
      try {
        await prisma.userPermission.createMany({
          data: permissionIds.map(permissionId => ({
            userId: user.id,
            permissionId: permissionId
          })),
          skipDuplicates: true
        });

        console.log(`✅ Permissões salvas para o usuário ${user.email}:`, permissionIds);
      } catch (permError) {
        console.error('Erro ao salvar permissões:', permError);
      }
    }

    res.status(201).json({
      ...user,
      message: 'Usuário criado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
});

router.put('/:id', authMiddleware, checkPermission('users', 'edit'), userValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Dados inválidos',
        details: errors.array().map(err => err.msg)
      });
    }

    const { firstName, lastName, email, phone, cpf, role } = req.body;

    const user = await prisma.user.findFirst({
      where: {
        id: req.params.id,
        complexId: req.user.complexId,
        role: { not: 'SUPER_ADMIN' }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    if (user.id === req.user.userId) {
      return res.status(403).json({ 
        error: 'Não é possível editar seu próprio usuário por aqui. Use a página de perfil.' 
      });
    }

    if (email && email.toLowerCase() !== user.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (emailExists) {
        return res.status(409).json({ error: 'Email já está em uso' });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        firstName: firstName?.trim(),
        lastName: lastName?.trim(),
        email: email ? email.toLowerCase() : undefined,
        phone,
        cpf,
        role
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        cpf: true,
        role: true,
        updatedAt: true
      }
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
});

router.put('/:id/reset-password', authMiddleware, checkPermission('users', 'edit'), async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ error: 'Nova senha é obrigatória' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Senha deve ter no mínimo 8 caracteres' });
    }

    const user = await prisma.user.findFirst({
      where: {
        id: req.params.id,
        complexId: req.user.complexId,
        role: { not: 'SUPER_ADMIN' }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    if (user.id === req.user.userId) {
      return res.status(403).json({ 
        error: 'Use a página de perfil para alterar sua própria senha' 
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: req.params.id },
      data: { password: hashedPassword }
    });

    res.json({ message: 'Senha resetada com sucesso' });
  } catch (error) {
    console.error('Erro ao resetar senha:', error);
    res.status(500).json({ error: 'Erro ao resetar senha' });
  }
});

router.delete('/:id', authMiddleware, checkPermission('users', 'delete'), async (req, res) => {
  try {
    const user = await prisma.user.findFirst({
      where: {
        id: req.params.id,
        complexId: req.user.complexId,
        role: { not: 'SUPER_ADMIN' }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    if (user.id === req.user.userId) {
      return res.status(403).json({ error: 'Não é possível deletar seu próprio usuário' });
    }

    await prisma.user.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Usuário deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar usuário:', error);
    res.status(500).json({ error: 'Erro ao deletar usuário' });
  }
});

module.exports = router;