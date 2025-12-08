const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de permissões...');

  const permissions = [
    // Produtos
    { module: 'products', action: 'view', name: 'Visualizar Produtos', description: 'Permite visualizar a lista de produtos' },
    { module: 'products', action: 'create', name: 'Criar Produtos', description: 'Permite adicionar novos produtos' },
    { module: 'products', action: 'edit', name: 'Editar Produtos', description: 'Permite editar informações de produtos' },
    { module: 'products', action: 'delete', name: 'Excluir Produtos', description: 'Permite excluir produtos do sistema' },
    { module: 'products', action: 'stock', name: 'Gerenciar Estoque', description: 'Permite adicionar/remover estoque' },

    // Clientes
    { module: 'clients', action: 'view', name: 'Visualizar Clientes', description: 'Permite visualizar a lista de clientes' },
    { module: 'clients', action: 'create', name: 'Criar Clientes', description: 'Permite cadastrar novos clientes' },
    { module: 'clients', action: 'edit', name: 'Editar Clientes', description: 'Permite editar dados de clientes' },
    { module: 'clients', action: 'delete', name: 'Excluir Clientes', description: 'Permite excluir clientes do sistema' },

    // Comandas
    { module: 'tabs', action: 'view', name: 'Visualizar Comandas', description: 'Permite visualizar comandas abertas/fechadas' },
    { module: 'tabs', action: 'create', name: 'Criar Comandas', description: 'Permite criar novas comandas' },
    { module: 'tabs', action: 'edit', name: 'Editar Comandas', description: 'Permite adicionar/remover itens da comanda' },
    { module: 'tabs', action: 'close', name: 'Fechar Comandas', description: 'Permite fechar e finalizar comandas' },
    { module: 'tabs', action: 'cancel', name: 'Cancelar Comandas', description: 'Permite cancelar comandas' },

    // Quadras
    { module: 'courts', action: 'view', name: 'Visualizar Quadras', description: 'Permite visualizar lista de quadras' },
    { module: 'courts', action: 'create', name: 'Criar Quadras', description: 'Permite cadastrar novas quadras' },
    { module: 'courts', action: 'edit', name: 'Editar Quadras', description: 'Permite editar informações de quadras' },
    { module: 'courts', action: 'delete', name: 'Excluir Quadras', description: 'Permite excluir quadras do sistema' },

    // Reservas
    { module: 'reservations', action: 'view', name: 'Visualizar Reservas', description: 'Permite visualizar agenda e reservas' },
    { module: 'reservations', action: 'create', name: 'Criar Reservas', description: 'Permite fazer novas reservas' },
    { module: 'reservations', action: 'edit', name: 'Editar Reservas', description: 'Permite editar horários de reservas' },
    { module: 'reservations', action: 'cancel', name: 'Cancelar Reservas', description: 'Permite cancelar reservas' },

    // Usuários
    { module: 'users', action: 'view', name: 'Visualizar Usuários', description: 'Permite visualizar lista de funcionários' },
    { module: 'users', action: 'create', name: 'Criar Usuários', description: 'Permite cadastrar novos funcionários' },
    { module: 'users', action: 'edit', name: 'Editar Usuários', description: 'Permite editar dados de funcionários' },
    { module: 'users', action: 'delete', name: 'Excluir Usuários', description: 'Permite excluir funcionários do sistema' },

    // Dashboard
    { module: 'dashboard', action: 'view', name: 'Visualizar Dashboard', description: 'Permite acessar o painel principal' },
    
    // Notificações
    { module: 'notifications', action: 'view', name: 'Visualizar Notificações', description: 'Permite acessar central de notificações' },
  ];

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { module_action: { module: permission.module, action: permission.action } },
      update: {},
      create: permission,
    });
  }

  console.log(`✅ ${permissions.length} permissões criadas/atualizadas!`);
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
