const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Apenas SUPER_ADMIN pode acessar estas rotas
const checkSuperAdmin = (req, res, next) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Acesso restrito a Super Administradores' });
  }
  next();
};

// Listar todos os complexos pendentes de aprovação
router.get('/pending', authMiddleware, checkSuperAdmin, async (req, res) => {
  try {
    const pendingUsers = await prisma.user.findMany({
      where: {
        status: 'PENDING',
        role: 'ADMIN'
      },
      include: {
        complex: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(pendingUsers);
  } catch (error) {
    console.error('Erro ao buscar cadastros pendentes:', error);
    res.status(500).json({ error: 'Erro ao buscar cadastros pendentes' });
  }
});

// Listar todos os complexos (aprovados, pendentes, rejeitados)
router.get('/all', authMiddleware, checkSuperAdmin, async (req, res) => {
  try {
    const { status } = req.query;

    const where = {
      role: 'ADMIN'
    };

    if (status) {
      where.status = status;
    }

    const users = await prisma.user.findMany({
      where,
      include: {
        complex: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(users);
  } catch (error) {
    console.error('Erro ao buscar complexos:', error);
    res.status(500).json({ error: 'Erro ao buscar complexos' });
  }
});

// Aprovar um complexo
router.post('/approve/:userId', authMiddleware, checkSuperAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { complex: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    if (user.role !== 'ADMIN') {
      return res.status(400).json({ error: 'Apenas administradores de complexo podem ser aprovados' });
    }

    if (user.status === 'ACTIVE') {
      return res.status(400).json({ error: 'Este usuário já está ativo' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        status: 'ACTIVE'
      },
      include: {
        complex: true
      }
    });

    res.json({
      message: 'Complexo aprovado com sucesso!',
      user: updatedUser
    });
  } catch (error) {
    console.error('Erro ao aprovar complexo:', error);
    res.status(500).json({ error: 'Erro ao aprovar complexo' });
  }
});

// Rejeitar um complexo
router.post('/reject/:userId', authMiddleware, checkSuperAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { complex: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    if (user.role !== 'ADMIN') {
      return res.status(400).json({ error: 'Apenas administradores de complexo podem ser rejeitados' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        status: 'REJECTED'
      },
      include: {
        complex: true
      }
    });

    // Aqui você pode enviar um email informando a rejeição
    console.log(`Complexo rejeitado: ${user.complex?.name}. Motivo: ${reason}`);

    res.json({
      message: 'Complexo rejeitado',
      user: updatedUser
    });
  } catch (error) {
    console.error('Erro ao rejeitar complexo:', error);
    res.status(500).json({ error: 'Erro ao rejeitar complexo' });
  }
});

// Suspender um complexo ativo
router.post('/suspend/:userId', authMiddleware, checkSuperAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { complex: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        status: 'SUSPENDED'
      },
      include: {
        complex: true
      }
    });

    console.log(`Complexo suspenso: ${user.complex?.name}. Motivo: ${reason}`);

    res.json({
      message: 'Complexo suspenso',
      user: updatedUser
    });
  } catch (error) {
    console.error('Erro ao suspender complexo:', error);
    res.status(500).json({ error: 'Erro ao suspender complexo' });
  }
});

// Reativar um complexo suspenso
router.post('/reactivate/:userId', authMiddleware, checkSuperAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { complex: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    if (user.status !== 'SUSPENDED') {
      return res.status(400).json({ error: 'Apenas usuários suspensos podem ser reativados' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        status: 'ACTIVE'
      },
      include: {
        complex: true
      }
    });

    res.json({
      message: 'Complexo reativado com sucesso!',
      user: updatedUser
    });
  } catch (error) {
    console.error('Erro ao reativar complexo:', error);
    res.status(500).json({ error: 'Erro ao reativar complexo' });
  }
});

// Estatísticas para o dashboard do SUPER_ADMIN
router.get('/stats', authMiddleware, checkSuperAdmin, async (req, res) => {
  try {
    const [total, pending, active, rejected, suspended] = await Promise.all([
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.user.count({ where: { role: 'ADMIN', status: 'PENDING' } }),
      prisma.user.count({ where: { role: 'ADMIN', status: 'ACTIVE' } }),
      prisma.user.count({ where: { role: 'ADMIN', status: 'REJECTED' } }),
      prisma.user.count({ where: { role: 'ADMIN', status: 'SUSPENDED' } })
    ]);

    res.json({
      total,
      pending,
      active,
      rejected,
      suspended
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

module.exports = router;
