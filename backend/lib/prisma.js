/**
 * Singleton do Prisma Client
 * Evita múltiplas instâncias do Prisma em desenvolvimento (hot reload)
 * e garante uma única conexão em produção
 */

const { PrismaClient } = require('@prisma/client');

// Verificar se já existe uma instância global
const globalForPrisma = global;

// Criar ou reutilizar instância
const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'error', 'warn']
    : ['error'],
});

// Em desenvolvimento, salvar no global para reutilizar entre hot reloads
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

module.exports = prisma;
