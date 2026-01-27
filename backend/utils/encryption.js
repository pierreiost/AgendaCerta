/**
 * Utilitários de Criptografia para Tokens OAuth
 * Implementa criptografia AES-256-GCM para tokens sensíveis
 */

const crypto = require('crypto');

// Algoritmo de criptografia
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32;
const KEY_LENGTH = 32; // 256 bits

/**
 * Deriva uma chave a partir da chave mestra usando PBKDF2
 * @param {string} masterKey - Chave mestra
 * @param {Buffer} salt - Salt para derivação
 * @returns {Buffer} Chave derivada
 */
function deriveKey(masterKey, salt) {
  return crypto.pbkdf2Sync(masterKey, salt, 100000, KEY_LENGTH, 'sha256');
}

/**
 * Obtém a chave mestra de criptografia
 * @returns {string}
 */
function getMasterKey() {
  const key = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET;

  if (!key || key.length < 32) {
    throw new Error(
      'ENCRYPTION_KEY ou JWT_SECRET deve ter pelo menos 32 caracteres. ' +
      'Configure a variável de ambiente ENCRYPTION_KEY para maior segurança.'
    );
  }

  return key;
}

/**
 * Criptografa um texto usando AES-256-GCM
 * @param {string} plaintext - Texto a ser criptografado
 * @returns {string} Texto criptografado em formato Base64 (salt:iv:authTag:ciphertext)
 */
function encrypt(plaintext) {
  if (!plaintext) {
    return null;
  }

  try {
    const masterKey = getMasterKey();
    const salt = crypto.randomBytes(SALT_LENGTH);
    const key = deriveKey(masterKey, salt);
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    const authTag = cipher.getAuthTag();

    // Formato: salt:iv:authTag:ciphertext (tudo em Base64)
    const result = [
      salt.toString('base64'),
      iv.toString('base64'),
      authTag.toString('base64'),
      encrypted.toString('base64')
    ].join(':');

    return result;
  } catch (error) {
    console.error('[Encryption] Erro ao criptografar:', error.message);
    throw new Error('Falha na criptografia');
  }
}

/**
 * Descriptografa um texto criptografado com AES-256-GCM
 * @param {string} encryptedData - Dados criptografados (salt:iv:authTag:ciphertext)
 * @returns {string} Texto original
 */
function decrypt(encryptedData) {
  if (!encryptedData) {
    return null;
  }

  try {
    const masterKey = getMasterKey();
    const parts = encryptedData.split(':');

    if (parts.length !== 4) {
      throw new Error('Formato de dados criptografados inválido');
    }

    const [saltB64, ivB64, authTagB64, ciphertextB64] = parts;

    const salt = Buffer.from(saltB64, 'base64');
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');
    const ciphertext = Buffer.from(ciphertextB64, 'base64');

    const key = deriveKey(masterKey, salt);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString('utf8');
  } catch (error) {
    console.error('[Encryption] Erro ao descriptografar:', error.message);
    throw new Error('Falha na descriptografia - token pode estar corrompido ou inválido');
  }
}

/**
 * Verifica se um texto está criptografado (formato esperado)
 * @param {string} text - Texto a verificar
 * @returns {boolean}
 */
function isEncrypted(text) {
  if (!text || typeof text !== 'string') {
    return false;
  }

  const parts = text.split(':');
  if (parts.length !== 4) {
    return false;
  }

  // Verifica se todas as partes são Base64 válidos
  try {
    parts.forEach(part => {
      Buffer.from(part, 'base64');
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Criptografa tokens OAuth de forma segura
 * @param {Object} tokens - Objeto com access_token e refresh_token
 * @returns {Object} Objeto com tokens criptografados
 */
function encryptOAuthTokens(tokens) {
  if (!tokens) {
    return null;
  }

  return {
    accessToken: tokens.access_token ? encrypt(tokens.access_token) : null,
    refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
    expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    tokenType: tokens.token_type || 'Bearer',
    scope: tokens.scope || ''
  };
}

/**
 * Descriptografa tokens OAuth
 * @param {Object} encryptedTokens - Objeto com tokens criptografados
 * @returns {Object} Objeto com tokens descriptografados
 */
function decryptOAuthTokens(encryptedTokens) {
  if (!encryptedTokens) {
    return null;
  }

  return {
    access_token: encryptedTokens.accessToken ? decrypt(encryptedTokens.accessToken) : null,
    refresh_token: encryptedTokens.refreshToken ? decrypt(encryptedTokens.refreshToken) : null,
    expiry_date: encryptedTokens.expiryDate ? new Date(encryptedTokens.expiryDate).getTime() : null,
    token_type: encryptedTokens.tokenType || 'Bearer',
    scope: encryptedTokens.scope || ''
  };
}

/**
 * Gera um hash seguro de uma string (para comparações)
 * @param {string} text - Texto a ser hasheado
 * @returns {string} Hash SHA-256 em hexadecimal
 */
function hash(text) {
  if (!text) {
    return null;
  }

  return crypto
    .createHash('sha256')
    .update(text)
    .digest('hex');
}

/**
 * Gera um token aleatório seguro
 * @param {number} length - Tamanho do token em bytes (default: 32)
 * @returns {string} Token em formato hexadecimal
 */
function generateSecureToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Compara duas strings de forma segura (timing-safe)
 * Previne ataques de timing
 * @param {string} a - Primeira string
 * @param {string} b - Segunda string
 * @returns {boolean}
 */
function secureCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }

  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  if (bufA.length !== bufB.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}

module.exports = {
  encrypt,
  decrypt,
  isEncrypted,
  encryptOAuthTokens,
  decryptOAuthTokens,
  hash,
  generateSecureToken,
  secureCompare
};
