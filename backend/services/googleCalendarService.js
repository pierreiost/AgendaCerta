const { google } = require('googleapis');
const { PrismaClient } = require('@prisma/client');
const { maskId, maskName, maskEmail, maskPhone, safeLogger, createSafeLogReservation, sanitizeError } = require('../utils/piiMasking');
const { encrypt, decrypt, isEncrypted } = require('../utils/encryption');

const prisma = new PrismaClient();

// Configuração do OAuth 2.0
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Configuração de retry
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 1000, // 1 segundo
  maxDelay: 10000, // 10 segundos
  backoffMultiplier: 2,
};

/**
 * Aguarda um período de tempo (usado para retry com backoff exponencial).
 * @param {number} ms - Milissegundos para aguardar.
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Executa uma função com retry automático em caso de falha.
 * LGPD: Logs sanitizados sem PII
 * @param {Function} fn - A função a ser executada.
 * @param {string} operationName - Nome da operação (para logs).
 * @param {number} retryCount - Contador de tentativas (uso interno).
 * @returns {Promise<any>} O resultado da função ou null em caso de falha total.
 */
async function retryOperation(fn, operationName, retryCount = 0) {
  try {
    return await fn();
  } catch (error) {
    const isRetryable = isRetryableError(error);
    const shouldRetry = retryCount < RETRY_CONFIG.maxRetries && isRetryable;

    if (shouldRetry) {
      const delay = Math.min(
        RETRY_CONFIG.initialDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, retryCount),
        RETRY_CONFIG.maxDelay
      );

      // LGPD: Log sem dados sensíveis
      safeLogger.warn(
        `[GoogleCalendar] ${operationName} falhou (tentativa ${retryCount + 1}/${RETRY_CONFIG.maxRetries}). ` +
        `Tentando novamente em ${delay}ms...`,
        { errorCode: error.code, status: error.response?.status }
      );

      await sleep(delay);
      return retryOperation(fn, operationName, retryCount + 1);
    }

    // Falha definitiva - LGPD: Log sanitizado
    safeLogger.error(
      `[GoogleCalendar] ${operationName} falhou definitivamente após ${retryCount} tentativas.`,
      error,
      { operation: operationName }
    );

    // Log detalhado do erro (sem PII)
    logError(operationName, error);

    return null;
  }
}

/**
 * Verifica se um erro é retryable (temporário) ou não.
 * @param {Error} error - O erro a ser verificado.
 * @returns {boolean} True se o erro é retryable, false caso contrário.
 */
function isRetryableError(error) {
  // Erros de rede ou timeout
  if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
    return true;
  }

  // Erros HTTP retryable (rate limiting, server errors)
  if (error.response) {
    const status = error.response.status;
    // 429 (Too Many Requests), 500 (Internal Server Error), 502 (Bad Gateway), 503 (Service Unavailable)
    if (status === 429 || status >= 500) {
      return true;
    }
  }

  // Erros de autenticação não são retryable (precisam de nova autenticação)
  if (error.message && error.message.includes('invalid_grant')) {
    return false;
  }

  return false;
}

/**
 * Registra um erro detalhado no log - LGPD COMPLIANT
 * Não inclui PII (nome, email, telefone) nos logs
 * @param {string} operation - Nome da operação.
 * @param {Error} error - O erro ocorrido.
 */
function logError(operation, error) {
  // LGPD: Sanitizar mensagem de erro para remover PII acidentalmente incluído
  const sanitized = sanitizeError(error);

  const errorLog = {
    timestamp: new Date().toISOString(),
    operation,
    message: sanitized.message,
    code: error.code,
    status: error.response?.status,
    statusText: error.response?.statusText,
    // LGPD: Não incluir data bruta que pode conter PII
    // LGPD: Não incluir stack em produção
    ...(process.env.NODE_ENV === 'development' ? { stack: error.stack } : {})
  };

  console.error('[GoogleCalendar] Erro detalhado:', JSON.stringify(errorLog, null, 2));
}

/**
 * Descriptografa um token se estiver criptografado
 * @param {string} token - Token possivelmente criptografado
 * @returns {string} Token descriptografado
 */
function getDecryptedToken(token) {
  if (!token) return null;

  try {
    // Verifica se o token está no formato criptografado
    if (isEncrypted(token)) {
      return decrypt(token);
    }
    // Token não criptografado (legado) - retorna como está
    return token;
  } catch (error) {
    safeLogger.error('[GoogleCalendar] Erro ao descriptografar token', error);
    return null;
  }
}

/**
 * Criptografa um token para armazenamento seguro
 * @param {string} token - Token a ser criptografado
 * @returns {string} Token criptografado
 */
function getEncryptedToken(token) {
  if (!token) return null;

  try {
    return encrypt(token);
  } catch (error) {
    safeLogger.error('[GoogleCalendar] Erro ao criptografar token', error);
    // Em caso de falha, armazenar sem criptografia (não ideal, mas não perde o token)
    return token;
  }
}

/**
 * Obtém um cliente Google Calendar autenticado para um complexo.
 * Se o token de acesso estiver expirado, ele é renovado automaticamente usando o refresh token.
 * SEGURANÇA: Tokens são armazenados criptografados
 * @param {string} complexId - O ID do complexo.
 * @returns {Promise<google.calendar.Calendar | null>} O cliente Google Calendar ou null se não houver token.
 */
async function getAuthenticatedCalendarClient(complexId) {
  try {
    const tokenRecord = await prisma.googleCalendarToken.findUnique({
      where: { complexId },
    });

    if (!tokenRecord) {
      // LGPD: Não logar o complexId completo
      safeLogger.warn(`[GoogleCalendar] Nenhum token encontrado para o complexo.`, {
        complexId: maskId(complexId)
      });
      return null;
    }

    // SEGURANÇA: Descriptografar tokens antes de usar
    const accessToken = getDecryptedToken(tokenRecord.accessToken);
    const refreshToken = getDecryptedToken(tokenRecord.refreshToken);

    if (!accessToken || !refreshToken) {
      safeLogger.error('[GoogleCalendar] Falha ao descriptografar tokens');
      return null;
    }

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
      expiry_date: tokenRecord.expiryDate.getTime(),
    });

    // Verifica se o token expirou
    if (new Date() > tokenRecord.expiryDate) {
      // LGPD: Log sem ID completo
      safeLogger.info(`[GoogleCalendar] Token expirado. Renovando...`, {
        complexId: maskId(complexId)
      });

      try {
        const { credentials } = await oauth2Client.refreshAccessToken();

        // SEGURANÇA: Criptografar o novo access token antes de salvar
        const encryptedAccessToken = getEncryptedToken(credentials.access_token);

        // Atualiza o token no banco de dados (criptografado)
        await prisma.googleCalendarToken.update({
          where: { complexId },
          data: {
            accessToken: encryptedAccessToken,
            expiryDate: new Date(credentials.expiry_date),
          },
        });

        oauth2Client.setCredentials(credentials);

        // LGPD: Log sem dados sensíveis
        safeLogger.info(`[GoogleCalendar] Token renovado com sucesso.`, {
          complexId: maskId(complexId)
        });
      } catch (error) {
        // LGPD: Não expor detalhes do erro que possam conter tokens
        safeLogger.error(
          `[GoogleCalendar] Erro ao renovar token. Usuário precisará autenticar novamente.`,
          error,
          { complexId: maskId(complexId) }
        );

        // Se a renovação falhar (ex: refresh token revogado), remove o token
        await prisma.googleCalendarToken.delete({
          where: { complexId },
        });

        return null;
      }
    }

    return google.calendar({ version: 'v3', auth: oauth2Client });
  } catch (error) {
    safeLogger.error(
      `[GoogleCalendar] Erro ao obter cliente autenticado.`,
      error,
      { complexId: maskId(complexId) }
    );
    return null;
  }
}

/**
 * Cria um evento no Google Calendar.
 * LGPD: Logs não contêm PII do cliente
 * @param {string} complexId - O ID do complexo.
 * @param {object} reservation - O objeto de reserva do AgendaCerta.
 * @returns {Promise<string | null>} O ID do evento do Google Calendar ou null em caso de falha.
 */
async function createCalendarEvent(complexId, reservation) {
  return retryOperation(async () => {
    const calendar = await getAuthenticatedCalendarClient(complexId);
    if (!calendar) {
      throw new Error('Cliente Google Calendar não autenticado');
    }

    // Validação de dados
    if (!reservation.client || !reservation.client.fullName) {
      throw new Error('Dados do cliente inválidos');
    }
    if (!reservation.resource || !reservation.resource.name) {
      throw new Error('Dados do recurso inválidos');
    }
    if (!reservation.startTime || !reservation.endTime) {
      throw new Error('Horários de início e fim são obrigatórios');
    }

    const event = {
      summary: `Agendamento: ${reservation.client.fullName}`,
      location: reservation.resource.name,
      description: `Cliente: ${reservation.client.fullName}\nLocal: ${reservation.resource.name}\nStatus: ${reservation.status}`,
      start: {
        dateTime: reservation.startTime.toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
      end: {
        dateTime: reservation.endTime.toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
      extendedProperties: {
        private: {
          agendaCertaReservationId: reservation.id,
          agendaCertaComplexId: complexId,
        },
      },
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });

    // LGPD: Log sem PII - usar apenas IDs mascarados
    safeLogger.info(`[GoogleCalendar] Evento criado com sucesso`, {
      eventId: maskId(response.data.id),
      reservationId: maskId(reservation.id)
    });

    return response.data.id;
  }, `createCalendarEvent (reserva: ${maskId(reservation.id)})`);
}

/**
 * Atualiza um evento no Google Calendar.
 * LGPD: Logs não contêm PII do cliente
 * @param {string} complexId - O ID do complexo.
 * @param {object} reservation - O objeto de reserva do AgendaCerta.
 * @returns {Promise<boolean>} True se a atualização for bem-sucedida, false caso contrário.
 */
async function updateCalendarEvent(complexId, reservation) {
  if (!reservation.googleCalendarEventId) {
    // LGPD: Log com ID mascarado
    safeLogger.warn(`[GoogleCalendar] Reserva não possui googleCalendarEventId. Pulando atualização.`, {
      reservationId: maskId(reservation.id)
    });
    return false;
  }

  const result = await retryOperation(async () => {
    const calendar = await getAuthenticatedCalendarClient(complexId);
    if (!calendar) {
      throw new Error('Cliente Google Calendar não autenticado');
    }

    // Validação de dados
    if (!reservation.client || !reservation.client.fullName) {
      throw new Error('Dados do cliente inválidos');
    }
    if (!reservation.resource || !reservation.resource.name) {
      throw new Error('Dados do recurso inválidos');
    }

    const event = {
      summary: `Agendamento: ${reservation.client.fullName}`,
      location: reservation.resource.name,
      description: `Cliente: ${reservation.client.fullName}\nLocal: ${reservation.resource.name}\nStatus: ${reservation.status}`,
      start: {
        dateTime: reservation.startTime.toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
      end: {
        dateTime: reservation.endTime.toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
      extendedProperties: {
        private: {
          agendaCertaReservationId: reservation.id,
          agendaCertaComplexId: complexId,
        },
      },
    };

    await calendar.events.update({
      calendarId: 'primary',
      eventId: reservation.googleCalendarEventId,
      resource: event,
    });

    // LGPD: Log sem PII
    safeLogger.info(`[GoogleCalendar] Evento atualizado com sucesso`, {
      eventId: maskId(reservation.googleCalendarEventId),
      reservationId: maskId(reservation.id)
    });

    return true;
  }, `updateCalendarEvent (reserva: ${maskId(reservation.id)}, evento: ${maskId(reservation.googleCalendarEventId)})`);

  return result !== null;
}

/**
 * Exclui um evento no Google Calendar.
 * @param {string} complexId - O ID do complexo.
 * @param {string} googleCalendarEventId - O ID do evento no Google Calendar.
 * @returns {Promise<boolean>} True se a exclusão for bem-sucedida, false caso contrário.
 */
async function deleteCalendarEvent(complexId, googleCalendarEventId) {
  if (!googleCalendarEventId) {
    safeLogger.warn('[GoogleCalendar] googleCalendarEventId não fornecido. Pulando exclusão.');
    return false;
  }

  const result = await retryOperation(async () => {
    const calendar = await getAuthenticatedCalendarClient(complexId);
    if (!calendar) {
      throw new Error('Cliente Google Calendar não autenticado');
    }

    await calendar.events.delete({
      calendarId: 'primary',
      eventId: googleCalendarEventId,
    });

    // LGPD: Log com ID mascarado
    safeLogger.info(`[GoogleCalendar] Evento excluído com sucesso`, {
      eventId: maskId(googleCalendarEventId)
    });

    return true;
  }, `deleteCalendarEvent (evento: ${maskId(googleCalendarEventId)})`);

  return result !== null;
}

/**
 * Sincroniza um evento do Google Calendar para o AgendaCerta.
 * LGPD: Não loga dados do evento que podem conter PII
 * @param {string} complexId - O ID do complexo.
 * @param {string} googleCalendarEventId - O ID do evento no Google Calendar.
 * @returns {Promise<void>}
 */
async function syncEventFromGoogle(complexId, googleCalendarEventId) {
  await retryOperation(async () => {
    const calendar = await getAuthenticatedCalendarClient(complexId);
    if (!calendar) {
      throw new Error('Cliente Google Calendar não autenticado');
    }

    const response = await calendar.events.get({
      calendarId: 'primary',
      eventId: googleCalendarEventId,
    });

    const event = response.data;
    const isDeleted = event.status === 'cancelled';
    const agendaCertaReservationId = event.extendedProperties?.private?.agendaCertaReservationId;

    if (isDeleted) {
      // Evento foi excluído no Google Calendar
      if (agendaCertaReservationId) {
        await prisma.reservation.update({
          where: { id: agendaCertaReservationId },
          data: { status: 'CANCELLED' },
        });
        // LGPD: Log com ID mascarado
        safeLogger.info(`[Sync] Reserva cancelada devido à exclusão no Google Calendar.`, {
          reservationId: maskId(agendaCertaReservationId)
        });
      }
      return true;
    }

    // Evento foi criado ou atualizado no Google Calendar
    if (agendaCertaReservationId) {
      // Atualiza a reserva existente
      const updateData = {};

      if (event.start?.dateTime) {
        updateData.startTime = new Date(event.start.dateTime);
      }
      if (event.end?.dateTime) {
        updateData.endTime = new Date(event.end.dateTime);
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.reservation.update({
          where: { id: agendaCertaReservationId },
          data: updateData,
        });
        // LGPD: Log com ID mascarado
        safeLogger.info(`[Sync] Reserva atualizada pelo Google Calendar.`, {
          reservationId: maskId(agendaCertaReservationId)
        });
      }
    } else {
      // Evento não originado no AgendaCerta - ignorar
      // LGPD: Log com ID mascarado
      safeLogger.info(`[Sync] Evento não originado no AgendaCerta. Ignorando criação.`, {
        eventId: maskId(googleCalendarEventId)
      });
    }

    return true;
  }, `syncEventFromGoogle (evento: ${maskId(googleCalendarEventId)})`);
}

/**
 * Verifica a saúde da integração com o Google Calendar.
 * @param {string} complexId - O ID do complexo.
 * @returns {Promise<object>} Status da integração.
 */
async function checkIntegrationHealth(complexId) {
  try {
    const calendar = await getAuthenticatedCalendarClient(complexId);

    if (!calendar) {
      return {
        status: 'disconnected',
        message: 'Nenhum token de autenticação encontrado',
        authenticated: false,
      };
    }

    // Tenta fazer uma chamada simples para verificar se a autenticação está funcionando
    await calendar.calendarList.list({ maxResults: 1 });

    return {
      status: 'connected',
      message: 'Integração funcionando corretamente',
      authenticated: true,
    };
  } catch (error) {
    // LGPD: Não expor detalhes técnicos do erro
    return {
      status: 'error',
      message: 'Erro na conexão com Google Calendar',
      authenticated: false,
      error: {
        code: error.code,
        status: error.response?.status,
      },
    };
  }
}

/**
 * Salva tokens OAuth de forma segura (criptografados)
 * @param {string} complexId - ID do complexo
 * @param {object} tokens - Tokens OAuth do Google
 * @returns {Promise<void>}
 */
async function saveOAuthTokens(complexId, tokens) {
  try {
    // SEGURANÇA: Criptografar tokens antes de salvar
    const encryptedAccessToken = getEncryptedToken(tokens.access_token);
    const encryptedRefreshToken = getEncryptedToken(tokens.refresh_token);

    await prisma.googleCalendarToken.upsert({
      where: { complexId },
      create: {
        complexId,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiryDate: new Date(tokens.expiry_date),
        tokenType: tokens.token_type || 'Bearer',
        scope: tokens.scope || '',
      },
      update: {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiryDate: new Date(tokens.expiry_date),
        tokenType: tokens.token_type || 'Bearer',
        scope: tokens.scope || '',
      },
    });

    safeLogger.info('[GoogleCalendar] Tokens OAuth salvos com segurança (criptografados)', {
      complexId: maskId(complexId)
    });
  } catch (error) {
    safeLogger.error('[GoogleCalendar] Erro ao salvar tokens OAuth', error, {
      complexId: maskId(complexId)
    });
    throw error;
  }
}

module.exports = {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  getAuthenticatedCalendarClient,
  syncEventFromGoogle,
  checkIntegrationHealth,
  saveOAuthTokens,
  // Exportar utilitários de criptografia para uso em rotas
  getEncryptedToken,
  getDecryptedToken,
};
