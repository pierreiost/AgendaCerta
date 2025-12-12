const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Limpa o banco de dados de teste antes de cada suite de testes
 */
const cleanDatabase = async () => {
  const tables = [
    'StockMovement',
    'TabItem',
    'Tab',
    'Reservation',
    'RecurringGroup',
    'Product',
    'Client',
    'Resource',
    'ResourceType',
    'GoogleCalendarToken',
    'Notification',
    'UserPermission',
    'Permission',
    'User',
    'Complex',
  ];

  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
    } catch (error) {
      // Ignora erros de tabelas que não existem
      if (!error.message.includes('does not exist')) {
        console.error(`Erro ao limpar tabela ${table}:`, error.message);
      }
    }
  }
};

/**
 * Cria um complexo de teste
 */
const createTestComplex = async () => {
  return await prisma.complex.create({
    data: {
      name: 'Complexo Teste',
      address: 'Rua Teste, 123',
      phone: '11999999999',
    },
  });
};

/**
 * Cria um usuário de teste
 */
const createTestUser = async (complexId, role = 'ADMIN') => {
  const bcrypt = require('bcryptjs');
  const hashedPassword = await bcrypt.hash('senha123', 10);

  return await prisma.user.create({
    data: {
      fullName: 'Usuário Teste',
      email: `teste${Date.now()}@teste.com`,
      password: hashedPassword,
      phone: '11999999999',
      role,
      complexId,
    },
  });
};

/**
 * Gera um token JWT para o usuário de teste
 */
const generateTestToken = (user) => {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      complexId: user.complexId,
    },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
};

/**
 * Cria um tipo de recurso de teste
 */
const createTestResourceType = async (complexId) => {
  return await prisma.resourceType.create({
    data: {
      name: 'Sala de Reunião',
      isDefault: false,
      complexId,
    },
  });
};

/**
 * Cria um recurso de teste
 */
const createTestResource = async (complexId, resourceTypeId) => {
  return await prisma.resource.create({
    data: {
      name: 'Sala 1',
      resourceTypeId,
      pricePerHour: 50.0,
      description: 'Sala de reunião para 10 pessoas',
      status: 'AVAILABLE',
      complexId,
    },
  });
};

/**
 * Cria um cliente de teste
 */
const createTestClient = async (complexId) => {
  return await prisma.client.create({
    data: {
      fullName: 'Cliente Teste',
      phone: '11988888888',
      email: `cliente${Date.now()}@teste.com`,
      complexId,
    },
  });
};

/**
 * Fecha a conexão com o banco de dados
 */
const closeDatabase = async () => {
  await prisma.$disconnect();
};

module.exports = {
  prisma,
  cleanDatabase,
  createTestComplex,
  createTestUser,
  generateTestToken,
  createTestResourceType,
  createTestResource,
  createTestClient,
  closeDatabase,
};
