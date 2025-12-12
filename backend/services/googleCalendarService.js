const { google } = require('googleapis');
const { PrismaClient } = require('@prisma/client');

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
      
      console.warn(
        `[GoogleCalendar] ${operationName} falhou (tentativa ${retryCount + 1}/${RETRY_CONFIG.maxRetries}). ` +
        `Erro: ${error.message}. Tentando novamente em ${delay}ms...`
      );
      
      await sleep(delay);
      return retryOperation(fn, operationName, retryCount + 1);
    }

    // Falha definitiva
    console.error(
      `[GoogleCalendar] ${operationName} falhou definitivamente após ${retryCount} tentativas. ` +
      `Erro: ${error.message}`
    );
    
    // Log detalhado do erro
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
 * Registra um erro detalhado no log.
 * @param {string} operation - Nome da operação.
 * @param {Error} error - O erro ocorrido.
 */
function logError(operation, error) {
  const errorLog = {
    timestamp: new Date().toISOString(),
    operation,
    message: error.message,
    code: error.code,
    status: error.response?.status,
    statusText: error.response?.statusText,
    data: error.response?.data,
    stack: error.stack,
  };

  console.error('[GoogleCalendar] Erro detalhado:', JSON.stringify(errorLog, null, 2));
}

/**
 * Obtém um cliente Google Calendar autenticado para um complexo.
 * Se o token de acesso estiver expirado, ele é renovado automaticamente usando o refresh token.
 * @param {string} complexId - O ID do complexo.
 * @returns {Promise<google.calendar.Calendar | null>} O cliente Google Calendar ou null se não houver token.
 */
async function getAuthenticatedCalendarClient(complexId) {
  try {
    const tokenRecord = await prisma.googleCalendarToken.findUnique({
      where: { complexId },
    });

    if (!tokenRecord) {
      console.warn(`[GoogleCalendar] Nenhum token encontrado para o complexo ${complexId}.`);
      return null;
    }

    oauth2Client.setCredentials({
      access_token: tokenRecord.accessToken,
      refresh_token: tokenRecord.refreshToken,
      expiry_date: tokenRecord.expiryDate.getTime(),
    });

    // Verifica se o token expirou
    if (new Date() > tokenRecord.expiryDate) {
      console.log(`[GoogleCalendar] Token expirado para o complexo ${complexId}. Renovando...`);
      
      try {
        const { credentials } = await oauth2Client.refreshAccessToken();
        
        // Atualiza o token no banco de dados
        await prisma.googleCalendarToken.update({
          where: { complexId },
          data: {
            accessToken: credentials.access_token,
            expiryDate: new Date(credentials.expiry_date),
          },
        });
        
        oauth2Client.setCredentials(credentials);
        console.log(`[GoogleCalendar] Token renovado com sucesso para o complexo ${complexId}.`);
      } catch (error) {
        console.error(`[GoogleCalendar] Erro ao renovar o token para o complexo ${complexId}:`, error.message);
        
        // Se a renovação falhar (ex: refresh token revogado), marca o token como inválido
        await prisma.googleCalendarToken.delete({
          where: { complexId },
        });
        
        console.warn(`[GoogleCalendar] Token removido. O usuário precisará se autenticar novamente.`);
        return null;
      }
    }

    return google.calendar({ version: 'v3', auth: oauth2Client });
  } catch (error) {
    console.error(`[GoogleCalendar] Erro ao obter cliente autenticado para o complexo ${complexId}:`, error.message);
    return null;
  }
}

/**
 * Cria um evento no Google Calendar.
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

    console.log(`[GoogleCalendar] Evento criado com sucesso: ${response.data.id} para reserva ${reservation.id}`);
    return response.data.id;
  }, `createCalendarEvent (reserva: ${reservation.id})`);
}

/**
 * Atualiza um evento no Google Calendar.
 * @param {string} complexId - O ID do complexo.
 * @param {object} reservation - O objeto de reserva do AgendaCerta.
 * @returns {Promise<boolean>} True se a atualização for bem-sucedida, false caso contrário.
 */
async function updateCalendarEvent(complexId, reservation) {
  if (!reservation.googleCalendarEventId) {
    console.warn(`[GoogleCalendar] Reserva ${reservation.id} não possui googleCalendarEventId. Pulando atualização.`);
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

    console.log(`[GoogleCalendar] Evento atualizado com sucesso: ${reservation.googleCalendarEventId} para reserva ${reservation.id}`);
    return true;
  }, `updateCalendarEvent (reserva: ${reservation.id}, evento: ${reservation.googleCalendarEventId})`);

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
    console.warn('[GoogleCalendar] googleCalendarEventId não fornecido. Pulando exclusão.');
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

    console.log(`[GoogleCalendar] Evento excluído com sucesso: ${googleCalendarEventId}`);
    return true;
  }, `deleteCalendarEvent (evento: ${googleCalendarEventId})`);

  return result !== null;
}

/**
 * Sincroniza um evento do Google Calendar para o AgendaCerta.
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
        console.log(`[Sync] Reserva ${agendaCertaReservationId} cancelada devido à exclusão no Google Calendar.`);
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
        console.log(`[Sync] Reserva ${agendaCertaReservationId} atualizada pelo Google Calendar.`);
      }
    } else {
      // Evento não originado no AgendaCerta - ignorar
      console.log(`[Sync] Evento ${googleCalendarEventId} não originado no AgendaCerta. Ignorando criação.`);
    }

    return true;
  }, `syncEventFromGoogle (evento: ${googleCalendarEventId})`);
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
    return {
      status: 'error',
      message: error.message,
      authenticated: false,
      error: {
        code: error.code,
        status: error.response?.status,
      },
    };
  }
}

module.exports = {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  getAuthenticatedCalendarClient,
  syncEventFromGoogle,
  checkIntegrationHealth,
};
