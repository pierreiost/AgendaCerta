/**
 * Middleware de Validação IDOR (Insecure Direct Object Reference)
 * Previne que usuários acessem dados de outros estabelecimentos
 * alterando apenas o ID na requisição
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Cache simples para reduzir consultas ao banco
 * TTL: 5 minutos
 */
const validationCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Limpa entradas expiradas do cache
 */
function cleanExpiredCache() {
  const now = Date.now();
  for (const [key, value] of validationCache.entries()) {
    if (now > value.expiresAt) {
      validationCache.delete(key);
    }
  }
}

// Limpar cache a cada minuto
setInterval(cleanExpiredCache, 60 * 1000);

/**
 * Gera chave única para o cache
 */
function getCacheKey(type, id, complexId) {
  return `${type}:${id}:${complexId}`;
}

/**
 * Verifica se um registro pertence ao complexo do usuário
 * @param {string} type - Tipo do recurso (resource, client, reservation, product, tab)
 * @param {string} id - ID do registro
 * @param {string} complexId - ID do complexo do usuário
 * @returns {Promise<boolean>}
 */
async function validateOwnership(type, id, complexId) {
  if (!id || !complexId) {
    return false;
  }

  const cacheKey = getCacheKey(type, id, complexId);

  // Verificar cache
  const cached = validationCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.isValid;
  }

  let isValid = false;

  try {
    switch (type) {
      case 'resource':
        const resource = await prisma.resource.findFirst({
          where: { id, complexId },
          select: { id: true }
        });
        isValid = !!resource;
        break;

      case 'client':
        const client = await prisma.client.findFirst({
          where: { id, complexId },
          select: { id: true }
        });
        isValid = !!client;
        break;

      case 'reservation':
        const reservation = await prisma.reservation.findFirst({
          where: {
            id,
            resource: { complexId }
          },
          select: { id: true }
        });
        isValid = !!reservation;
        break;

      case 'product':
        const product = await prisma.product.findFirst({
          where: { id, complexId },
          select: { id: true }
        });
        isValid = !!product;
        break;

      case 'tab':
        const tab = await prisma.tab.findFirst({
          where: {
            id,
            client: { complexId }
          },
          select: { id: true }
        });
        isValid = !!tab;
        break;

      case 'user':
        const user = await prisma.user.findFirst({
          where: { id, complexId },
          select: { id: true }
        });
        isValid = !!user;
        break;

      case 'resourceType':
        const resourceType = await prisma.resourceType.findFirst({
          where: {
            id,
            OR: [
              { complexId },
              { isDefault: true }
            ]
          },
          select: { id: true }
        });
        isValid = !!resourceType;
        break;

      default:
        console.warn(`[IDOR] Tipo de recurso desconhecido: ${type}`);
        isValid = false;
    }
  } catch (error) {
    console.error(`[IDOR] Erro ao validar ownership:`, error.message);
    isValid = false;
  }

  // Armazenar no cache
  validationCache.set(cacheKey, {
    isValid,
    expiresAt: Date.now() + CACHE_TTL
  });

  return isValid;
}

/**
 * Middleware factory para validação IDOR
 * @param {string} resourceType - Tipo do recurso a ser validado
 * @param {string} paramName - Nome do parâmetro na URL (default: 'id')
 * @returns {Function} Middleware Express
 */
const validateIDOR = (resourceType, paramName = 'id') => {
  return async (req, res, next) => {
    const resourceId = req.params[paramName] || req.body[`${resourceType}Id`];
    const complexId = req.user?.complexId;

    if (!complexId) {
      return res.status(401).json({
        error: 'Não autorizado: complexId não encontrado no token',
        code: 'IDOR_NO_COMPLEX'
      });
    }

    if (!resourceId) {
      return res.status(400).json({
        error: `ID do ${resourceType} é obrigatório`,
        code: 'IDOR_MISSING_ID'
      });
    }

    // SUPER_ADMIN pode acessar qualquer recurso
    if (req.user?.role === 'SUPER_ADMIN') {
      return next();
    }

    const isValid = await validateOwnership(resourceType, resourceId, complexId);

    if (!isValid) {
      // Log de tentativa de acesso não autorizado (para auditoria)
      console.warn(`[IDOR] Tentativa de acesso não autorizado:`, {
        userId: req.user?.userId,
        complexId,
        resourceType,
        resourceId,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });

      return res.status(403).json({
        error: 'Acesso negado: recurso não pertence ao seu estabelecimento',
        code: 'IDOR_ACCESS_DENIED'
      });
    }

    next();
  };
};

/**
 * Middleware para validar múltiplos IDs de uma vez (batch operations)
 * @param {string} resourceType - Tipo do recurso
 * @param {string} bodyField - Nome do campo no body que contém o array de IDs
 * @returns {Function} Middleware Express
 */
const validateIDORBatch = (resourceType, bodyField) => {
  return async (req, res, next) => {
    const resourceIds = req.body[bodyField];
    const complexId = req.user?.complexId;

    if (!complexId) {
      return res.status(401).json({
        error: 'Não autorizado: complexId não encontrado no token',
        code: 'IDOR_NO_COMPLEX'
      });
    }

    if (!Array.isArray(resourceIds) || resourceIds.length === 0) {
      return res.status(400).json({
        error: `Lista de IDs (${bodyField}) é obrigatória`,
        code: 'IDOR_MISSING_IDS'
      });
    }

    // SUPER_ADMIN pode acessar qualquer recurso
    if (req.user?.role === 'SUPER_ADMIN') {
      return next();
    }

    // Validar todos os IDs em paralelo
    const validations = await Promise.all(
      resourceIds.map(id => validateOwnership(resourceType, id, complexId))
    );

    const invalidIds = resourceIds.filter((_, index) => !validations[index]);

    if (invalidIds.length > 0) {
      console.warn(`[IDOR] Tentativa de acesso em batch não autorizado:`, {
        userId: req.user?.userId,
        complexId,
        resourceType,
        invalidIds,
        ip: req.ip,
        timestamp: new Date().toISOString()
      });

      return res.status(403).json({
        error: 'Acesso negado: alguns recursos não pertencem ao seu estabelecimento',
        code: 'IDOR_BATCH_ACCESS_DENIED',
        invalidCount: invalidIds.length
      });
    }

    next();
  };
};

/**
 * Middleware para definir contexto do banco de dados (para RLS)
 * Define variáveis de sessão que serão usadas pelas políticas RLS
 */
const setDatabaseContext = async (req, res, next) => {
  if (!req.user) {
    return next();
  }

  try {
    // Define o contexto para a sessão atual
    // Isso é usado pelas funções SQL get_current_complex_id() e get_current_user_id()
    await prisma.$executeRawUnsafe(
      `SELECT set_config('app.current_complex_id', $1, true),
              set_config('app.current_user_id', $2, true)`,
      req.user.complexId || '',
      req.user.userId || ''
    );
  } catch (error) {
    // Não bloquear a requisição se o contexto não puder ser definido
    console.warn('[RLS Context] Erro ao definir contexto:', error.message);
  }

  next();
};

/**
 * Limpa o cache de validação para um recurso específico
 * Útil quando um recurso é criado, atualizado ou deletado
 */
function invalidateCache(type, id, complexId) {
  const cacheKey = getCacheKey(type, id, complexId);
  validationCache.delete(cacheKey);
}

/**
 * Limpa todo o cache de validação
 */
function clearCache() {
  validationCache.clear();
}

module.exports = {
  validateIDOR,
  validateIDORBatch,
  validateOwnership,
  setDatabaseContext,
  invalidateCache,
  clearCache
};
