const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const checkPermission = (module, action) => {
  return async (req, res, next) => {
    try {
      // SUPER_ADMIN e ADMIN têm acesso total
      if (req.user.role === 'SUPER_ADMIN' || req.user.role === 'ADMIN') {
        return next();
      }

      // Buscar permissão do usuário
      const hasPermission = await prisma.userPermission.findFirst({
        where: {
          userId: req.user.userId,
          permission: {
            module,
            action
          }
        }
      });

      if (!hasPermission) {
        const actionMessages = {
          view: 'Você não tem permissão para acessar este módulo',
          create: 'Você não tem permissão para criar registros neste módulo',
          edit: 'Você não tem permissão para fazer alterações neste módulo',
          delete: 'Você não tem permissão para excluir registros neste módulo',
          stock: 'Você não tem permissão para gerenciar o estoque',
          close: 'Você não tem permissão para fechar comandas',
          cancel: 'Você não tem permissão para cancelar registros'
        };

        return res.status(403).json({
          error: actionMessages[action] || 'Você não tem permissão para realizar esta ação'
        });
      }

      next();
    } catch (error) {
      console.error('Erro ao verificar permissão:', error);
      res.status(500).json({ error: 'Erro ao verificar permissões' });
    }
  };
};

const getUserPermissions = async (userId, role) => {
  // ADMIN e SUPER_ADMIN têm todas as permissões
  if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
    const allPermissions = await prisma.permission.findMany({
      select: {
        module: true,
        action: true
      }
    });
    return allPermissions.map(p => `${p.module}.${p.action}`);
  }

  // Buscar permissões específicas do usuário
  const userPermissions = await prisma.userPermission.findMany({
    where: { userId },
    include: {
      permission: {
        select: {
          module: true,
          action: true
        }
      }
    }
  });

  return userPermissions.map(up => `${up.permission.module}.${up.permission.action}`);
};

module.exports = {
  checkPermission,
  getUserPermissions
};
