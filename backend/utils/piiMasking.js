/**
 * Utilitários de Mascaramento de PII (Personally Identifiable Information)
 * Conformidade com LGPD - Lei Geral de Proteção de Dados
 */

/**
 * Mascara uma string, mostrando apenas os primeiros e últimos caracteres
 * @param {string} str - String a ser mascarada
 * @param {number} visibleStart - Quantidade de caracteres visíveis no início (default: 2)
 * @param {number} visibleEnd - Quantidade de caracteres visíveis no final (default: 2)
 * @param {string} maskChar - Caractere usado para mascarar (default: '*')
 * @returns {string} String mascarada
 */
function maskString(str, visibleStart = 2, visibleEnd = 2, maskChar = '*') {
  if (!str || typeof str !== 'string') {
    return '[REDACTED]';
  }

  const length = str.length;

  if (length <= visibleStart + visibleEnd) {
    return maskChar.repeat(length);
  }

  const start = str.substring(0, visibleStart);
  const end = str.substring(length - visibleEnd);
  const middle = maskChar.repeat(Math.min(length - visibleStart - visibleEnd, 8));

  return `${start}${middle}${end}`;
}

/**
 * Mascara um email, preservando parte do usuário e domínio
 * @param {string} email - Email a ser mascarado
 * @returns {string} Email mascarado
 */
function maskEmail(email) {
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return '[EMAIL_REDACTED]';
  }

  const [user, domain] = email.split('@');
  const maskedUser = maskString(user, 1, 1);

  // Mascara parte do domínio também
  const domainParts = domain.split('.');
  const maskedDomain = domainParts.length > 1
    ? `${maskString(domainParts[0], 1, 1)}.${domainParts.slice(1).join('.')}`
    : maskString(domain, 1, 1);

  return `${maskedUser}@${maskedDomain}`;
}

/**
 * Mascara um telefone, mostrando apenas os últimos 4 dígitos
 * @param {string} phone - Telefone a ser mascarado
 * @returns {string} Telefone mascarado
 */
function maskPhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return '[PHONE_REDACTED]';
  }

  // Remove caracteres não numéricos
  const digits = phone.replace(/\D/g, '');

  if (digits.length < 4) {
    return '*'.repeat(digits.length);
  }

  const visiblePart = digits.slice(-4);
  const maskedPart = '*'.repeat(digits.length - 4);

  return `${maskedPart}${visiblePart}`;
}

/**
 * Mascara um CPF
 * @param {string} cpf - CPF a ser mascarado
 * @returns {string} CPF mascarado
 */
function maskCPF(cpf) {
  if (!cpf || typeof cpf !== 'string') {
    return '[CPF_REDACTED]';
  }

  const digits = cpf.replace(/\D/g, '');

  if (digits.length !== 11) {
    return maskString(cpf, 3, 2);
  }

  // Formato: ***.***.***-XX
  return `***.***.***.${digits.slice(-2)}`;
}

/**
 * Mascara um CNPJ
 * @param {string} cnpj - CNPJ a ser mascarado
 * @returns {string} CNPJ mascarado
 */
function maskCNPJ(cnpj) {
  if (!cnpj || typeof cnpj !== 'string') {
    return '[CNPJ_REDACTED]';
  }

  const digits = cnpj.replace(/\D/g, '');

  if (digits.length !== 14) {
    return maskString(cnpj, 2, 2);
  }

  // Formato: **.***.***/****.XX
  return `**.***.***/****.${digits.slice(-2)}`;
}

/**
 * Mascara um nome, mostrando apenas iniciais
 * @param {string} name - Nome completo a ser mascarado
 * @returns {string} Nome mascarado
 */
function maskName(name) {
  if (!name || typeof name !== 'string') {
    return '[NAME_REDACTED]';
  }

  const parts = name.trim().split(/\s+/);

  if (parts.length === 1) {
    return maskString(parts[0], 1, 1);
  }

  // Mostra primeira inicial e última inicial
  const firstInitial = parts[0].charAt(0).toUpperCase();
  const lastPart = parts[parts.length - 1];
  const lastMasked = maskString(lastPart, 1, 0);

  return `${firstInitial}. ${lastMasked}`;
}

/**
 * Mascara um ID (UUID ou outro)
 * @param {string} id - ID a ser mascarado
 * @returns {string} ID mascarado
 */
function maskId(id) {
  if (!id || typeof id !== 'string') {
    return '[ID_REDACTED]';
  }

  // Para UUIDs, mostra apenas os primeiros 8 caracteres
  if (id.length >= 8) {
    return `${id.substring(0, 8)}...`;
  }

  return maskString(id, 2, 2);
}

/**
 * Mascara um objeto, aplicando mascaramento aos campos sensíveis
 * @param {Object} obj - Objeto a ser mascarado
 * @param {string[]} sensitiveFields - Lista de campos sensíveis
 * @returns {Object} Objeto com campos mascarados
 */
function maskObject(obj, sensitiveFields = []) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const defaultSensitiveFields = [
    'email', 'phone', 'telefone', 'celular',
    'cpf', 'cnpj', 'rg',
    'fullName', 'firstName', 'lastName', 'nome', 'name',
    'password', 'senha', 'secret',
    'accessToken', 'refreshToken', 'token',
    'creditCard', 'cardNumber', 'cvv'
  ];

  const fieldsToMask = [...new Set([...defaultSensitiveFields, ...sensitiveFields])];
  const masked = { ...obj };

  for (const field of fieldsToMask) {
    if (masked[field] !== undefined) {
      const value = masked[field];

      if (field.toLowerCase().includes('email')) {
        masked[field] = maskEmail(value);
      } else if (field.toLowerCase().includes('phone') || field.toLowerCase().includes('telefone') || field.toLowerCase().includes('celular')) {
        masked[field] = maskPhone(value);
      } else if (field.toLowerCase() === 'cpf') {
        masked[field] = maskCPF(value);
      } else if (field.toLowerCase() === 'cnpj') {
        masked[field] = maskCNPJ(value);
      } else if (field.toLowerCase().includes('name') || field.toLowerCase().includes('nome')) {
        masked[field] = maskName(value);
      } else if (field.toLowerCase().includes('token') || field.toLowerCase().includes('password') || field.toLowerCase().includes('secret')) {
        masked[field] = '[REDACTED]';
      } else {
        masked[field] = maskString(String(value));
      }
    }
  }

  return masked;
}

/**
 * Cria uma versão segura para logs de um objeto de reserva
 * @param {Object} reservation - Objeto de reserva
 * @returns {Object} Objeto seguro para logging
 */
function createSafeLogReservation(reservation) {
  if (!reservation) return null;

  return {
    id: maskId(reservation.id),
    resourceId: maskId(reservation.resourceId),
    clientId: maskId(reservation.clientId),
    startTime: reservation.startTime,
    endTime: reservation.endTime,
    status: reservation.status,
    client: reservation.client ? {
      id: maskId(reservation.client.id),
      fullName: maskName(reservation.client.fullName),
      phone: maskPhone(reservation.client.phone),
      email: maskEmail(reservation.client.email)
    } : null,
    resource: reservation.resource ? {
      id: maskId(reservation.resource.id),
      name: reservation.resource.name // Nome do recurso não é PII
    } : null
  };
}

/**
 * Cria uma versão segura para logs de um erro
 * Remove dados sensíveis que possam estar em mensagens de erro
 * @param {Error|string} error - Erro a ser sanitizado
 * @returns {Object} Erro sanitizado
 */
function sanitizeError(error) {
  if (!error) return { message: 'Unknown error' };

  const message = error.message || String(error);

  // Padrões de dados sensíveis a serem removidos
  const patterns = [
    // Emails
    { regex: /[\w.-]+@[\w.-]+\.\w+/gi, replacement: '[EMAIL_REDACTED]' },
    // Telefones brasileiros
    { regex: /\(?\d{2}\)?[\s.-]?\d{4,5}[\s.-]?\d{4}/g, replacement: '[PHONE_REDACTED]' },
    // CPFs
    { regex: /\d{3}\.?\d{3}\.?\d{3}-?\d{2}/g, replacement: '[CPF_REDACTED]' },
    // CNPJs
    { regex: /\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/g, replacement: '[CNPJ_REDACTED]' },
    // UUIDs (parcialmente)
    { regex: /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, replacement: '[UUID_REDACTED]' },
    // Tokens JWT (parcialmente)
    { regex: /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, replacement: '[JWT_REDACTED]' }
  ];

  let sanitizedMessage = message;
  for (const pattern of patterns) {
    sanitizedMessage = sanitizedMessage.replace(pattern.regex, pattern.replacement);
  }

  return {
    message: sanitizedMessage,
    code: error.code,
    name: error.name,
    // Não incluir stack trace em produção
    ...(process.env.NODE_ENV === 'development' ? { stack: error.stack } : {})
  };
}

/**
 * Logger seguro que automaticamente mascara PII
 */
const safeLogger = {
  info: (message, data = {}) => {
    console.log(`[INFO] ${message}`, maskObject(data));
  },

  warn: (message, data = {}) => {
    console.warn(`[WARN] ${message}`, maskObject(data));
  },

  error: (message, error = null, data = {}) => {
    console.error(
      `[ERROR] ${message}`,
      sanitizeError(error),
      maskObject(data)
    );
  },

  debug: (message, data = {}) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${message}`, maskObject(data));
    }
  }
};

module.exports = {
  maskString,
  maskEmail,
  maskPhone,
  maskCPF,
  maskCNPJ,
  maskName,
  maskId,
  maskObject,
  createSafeLogReservation,
  sanitizeError,
  safeLogger
};
