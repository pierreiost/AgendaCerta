const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const permissions = await prisma.permission.findMany({
      orderBy: [
        { module: 'asc' },
        { action: 'asc' }
      ]
    });

    const grouped = permissions.reduce((acc, perm) => {
      if (!acc[perm.module]) {
        acc[perm.module] = [];
      }
      acc[perm.module].push(perm);
      return acc;
    }, {});

    res.json({
      permissions,
      grouped
    });
  } catch (error) {
    console.error('Erro ao listar permissões:', error);
    res.status(500).json({ error: 'Erro ao listar permissões' });
  }
});

router.post('/seed', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Sem permissão' });
    }

    const existingCount = await prisma.permission.count();
    
    if (existingCount > 0) {
      return res.json({ 
        message: 'Permissões já existem no banco', 
        count: existingCount 
      });
    }

    const permissions = [
      { module: 'products', action: 'view', name: 'Visualizar Produtos', description: 'Permite visualizar lista de produtos' },
      { module: 'products', action: 'create', name: 'Criar Produtos', description: 'Permite cadastrar novos produtos' },
      { module: 'products', action: 'edit', name: 'Editar Produtos', description: 'Permite editar dados de produtos' },
      { module: 'products', action: 'delete', name: 'Excluir Produtos', description: 'Permite excluir produtos do sistema' },
      { module: 'products', action: 'stock', name: 'Gerenciar Estoque', description: 'Permite adicionar e remover itens do estoque' },
      
      { module: 'clients', action: 'view', name: 'Visualizar Clientes', description: 'Permite visualizar lista de clientes' },
      { module: 'clients', action: 'create', name: 'Criar Clientes', description: 'Permite cadastrar novos clientes' },
      { module: 'clients', action: 'edit', name: 'Editar Clientes', description: 'Permite editar dados de clientes' },
      { module: 'clients', action: 'delete', name: 'Excluir Clientes', description: 'Permite excluir clientes do sistema' },
      
      { module: 'tabs', action: 'view', name: 'Visualizar Comandas', description: 'Permite visualizar comandas' },
      { module: 'tabs', action: 'create', name: 'Criar Comandas', description: 'Permite abrir novas comandas' },
      { module: 'tabs', action: 'edit', name: 'Editar Comandas', description: 'Permite adicionar itens às comandas' },
      { module: 'tabs', action: 'close', name: 'Fechar Comandas', description: 'Permite fechar comandas' },
      { module: 'tabs', action: 'cancel', name: 'Cancelar Comandas', description: 'Permite cancelar comandas' },
      
      { module: 'courts', action: 'view', name: 'Visualizar Quadras', description: 'Permite visualizar lista de quadras' },
      { module: 'courts', action: 'create', name: 'Criar Quadras', description: 'Permite cadastrar novas quadras' },
      { module: 'courts', action: 'edit', name: 'Editar Quadras', description: 'Permite editar dados de quadras' },
      { module: 'courts', action: 'delete', name: 'Excluir Quadras', description: 'Permite excluir quadras do sistema' },
      
      { module: 'reservations', action: 'view', name: 'Visualizar Reservas', description: 'Permite visualizar reservas' },
      { module: 'reservations', action: 'create', name: 'Criar Reservas', description: 'Permite criar novas reservas' },
      { module: 'reservations', action: 'edit', name: 'Editar Reservas', description: 'Permite editar reservas' },
      { module: 'reservations', action: 'cancel', name: 'Cancelar Reservas', description: 'Permite cancelar reservas' },
      
      { module: 'users', action: 'view', name: 'Visualizar Usuários', description: 'Permite visualizar lista de funcionários' },
      { module: 'users', action: 'create', name: 'Criar Usuários', description: 'Permite cadastrar novos funcionários' },
      { module: 'users', action: 'edit', name: 'Editar Usuários', description: 'Permite editar dados de funcionários' },
      { module: 'users', action: 'delete', name: 'Excluir Usuários', description: 'Permite excluir funcionários do sistema' },
      
      { module: 'dashboard', action: 'view', name: 'Visualizar Dashboard', description: 'Permite acessar o painel principal' },
      
      { module: 'notifications', action: 'view', name: 'Visualizar Notificações', description: 'Permite acessar central de notificações' },
    ];

    for (const permission of permissions) {
      await prisma.permission.upsert({
        where: { module_action: { module: permission.module, action: permission.action } },
        update: {},
        create: permission,
      });
    }

    const count = await prisma.permission.count();

    res.json({ 
      message: 'Permissões inicializadas com sucesso', 
      count 
    });
  } catch (error) {
    console.error('Erro ao inicializar permissões:', error);
    res.status(500).json({ error: 'Erro ao inicializar permissões' });
  }
});

router.get('/user/:userId', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN' && req.user.userId !== req.params.userId) {
      return res.status(403).json({ error: 'Sem permissão para visualizar' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.params.userId },
      include: {
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

    const permissionIds = user.permissions.map(up => up.permissionId);
    const permissionsList = user.permissions.map(up => ({
      id: up.permission.id,
      module: up.permission.module,
      action: up.permission.action,
      name: up.permission.name
    }));

    res.json({
      userId: user.id,
      role: user.role,
      permissions: permissionsList,
      permissionIds
    });
  } catch (error) {
    console.error('Erro ao buscar permissões do usuário:', error);
    res.status(500).json({ error: 'Erro ao buscar permissões' });
  }
});

router.put('/user/:userId', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Sem permissão para alterar permissões' });
    }

    const { permissionIds } = req.body;

    if (!Array.isArray(permissionIds)) {
      return res.status(400).json({ error: 'permissionIds deve ser um array' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.params.userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      return res.status(400).json({ 
        error: 'Administradores têm todas as permissões automaticamente' 
      });
    }

    await prisma.userPermission.deleteMany({
      where: { userId: req.params.userId }
    });

    if (permissionIds.length > 0) {
      await prisma.userPermission.createMany({
        data: permissionIds.map(permissionId => ({
          userId: req.params.userId,
          permissionId
        }))
      });
    }

    const updatedPermissions = await prisma.userPermission.findMany({
      where: { userId: req.params.userId },
      include: {
        permission: true
      }
    });

    res.json({
      message: 'Permissões atualizadas com sucesso',
      permissions: updatedPermissions.map(up => ({
        id: up.permission.id,
        module: up.permission.module,
        action: up.permission.action,
        name: up.permission.name
      }))
    });
  } catch (error) {
    console.error('Erro ao atualizar permissões:', error);
    res.status(500).json({ error: 'Erro ao atualizar permissões' });
  }
});

router.post('/check', authMiddleware, async (req, res) => {
  try {
    const { module, action } = req.body;

    if (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN') {
      return res.json({ hasPermission: true });
    }

    const hasPermission = await prisma.userPermission.findFirst({
      where: {
        userId: req.user.userId,
        permission: {
          module,
          action
        }
      }
    });

    res.json({ hasPermission: !!hasPermission });
  } catch (error) {
    console.error('Erro ao verificar permissão:', error);
    res.status(500).json({ error: 'Erro ao verificar permissão' });
  }
});

module.exports = router;