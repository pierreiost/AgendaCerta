const { google } = require('googleapis');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Configuração do OAuth 2.0
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

/**
 * Obtém um cliente Google Calendar autenticado para um complexo.
 * Se o token de acesso estiver expirado, ele é renovado automaticamente usando o refresh token.
 * @param {string} complexId - O ID do complexo.
 * @returns {Promise<google.calendar.Calendar | null>} O cliente Google Calendar ou null se não houver token.
 */
async function getAuthenticatedCalendarClient(complexId) {
  const tokenRecord = await prisma.googleCalendarToken.findUnique({
    where: { complexId },
  });

  if (!tokenRecord) {
    return null;
  }

  oauth2Client.setCredentials({
    access_token: tokenRecord.accessToken,
    refresh_token: tokenRecord.refreshToken,
    expiry_date: tokenRecord.expiryDate.getTime(),
  });

  // Verifica se o token expirou
  if (new Date() > tokenRecord.expiryDate) {
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
    } catch (error) {
      console.error('Erro ao renovar o token de acesso do Google Calendar:', error);
      // Se a renovação falhar, o usuário precisará se autenticar novamente
      return null;
    }
  }

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

/**
 * Cria um evento no Google Calendar.
 * @param {string} complexId - O ID do complexo.
 * @param {object} reservation - O objeto de reserva do AgendaCerta.
 * @returns {Promise<string | null>} O ID do evento do Google Calendar ou null em caso de falha.
 */
async function createCalendarEvent(complexId, reservation) {
  const calendar = await getAuthenticatedCalendarClient(complexId);
  if (!calendar) return null;

  try {
    const event = {
      summary: `Agendamento: ${reservation.client.fullName}`,
      location: reservation.court.name,
      description: `Cliente: ${reservation.client.fullName}\nQuadra: ${reservation.court.name}\nStatus: ${reservation.status}`,
      start: {
        dateTime: reservation.startTime.toISOString(),
        timeZone: 'America/Sao_Paulo', // Assumindo fuso horário padrão
      },
      end: {
        dateTime: reservation.endTime.toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
      // Adicionar o ID da reserva como propriedade estendida para sincronização bidirecional
      extendedProperties: {
        private: {
          agendaCertaReservationId: reservation.id,
        },
      },
    };

    const response = await calendar.events.insert({
      calendarId: 'primary', // Usar o calendário principal do usuário
      resource: event,
    });

    return response.data.id;
  } catch (error) {
    console.error('Erro ao criar evento no Google Calendar:', error);
    return null;
  }
}

/**
 * Atualiza um evento no Google Calendar.
 * @param {string} complexId - O ID do complexo.
 * @param {object} reservation - O objeto de reserva do AgendaCerta.
 * @returns {Promise<boolean>} True se a atualização for bem-sucedida, false caso contrário.
 */
async function updateCalendarEvent(complexId, reservation) {
  const calendar = await getAuthenticatedCalendarClient(complexId);
  if (!calendar || !reservation.googleCalendarEventId) return false;

  try {
    const event = {
      summary: `Agendamento: ${reservation.client.fullName}`,
      location: reservation.court.name,
      description: `Cliente: ${reservation.client.fullName}\nQuadra: ${reservation.court.name}\nStatus: ${reservation.status}`,
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
        },
      },
    };

    await calendar.events.update({
      calendarId: 'primary',
      eventId: reservation.googleCalendarEventId,
      resource: event,
    });

    return true;
  } catch (error) {
    console.error('Erro ao atualizar evento no Google Calendar:', error);
    return false;
  }
}

/**
 * Exclui um evento no Google Calendar.
 * @param {string} complexId - O ID do complexo.
 * @param {string} googleCalendarEventId - O ID do evento no Google Calendar.
 * @returns {Promise<boolean>} True se a exclusão for bem-sucedida, false caso contrário.
 */
async function deleteCalendarEvent(complexId, googleCalendarEventId) {
  const calendar = await getAuthenticatedCalendarClient(complexId);
  if (!calendar || !googleCalendarEventId) return false;

  try {
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: googleCalendarEventId,
    });

    return true;
  } catch (error) {
    console.error('Erro ao excluir evento no Google Calendar:', error);
    return false;
  }
}

/**
 * Sincroniza um evento do Google Calendar para o AgendaCerta.
 * @param {string} complexId - O ID do complexo.
 * @param {string} googleCalendarEventId - O ID do evento no Google Calendar.
 * @returns {Promise<void>}
 */
async function syncEventFromGoogle(complexId, googleCalendarEventId) {
  const calendar = await getAuthenticatedCalendarClient(complexId);
  if (!calendar) return;

  try {
    const response = await calendar.events.get({
      calendarId: 'primary',
      eventId: googleCalendarEventId,
    });

    const event = response.data;
    const isDeleted = event.status === 'cancelled';
    const agendaCertaReservationId = event.extendedProperties?.private?.agendaCertaReservationId;

    if (isDeleted) {
      // 1. Evento foi excluído no Google Calendar
      if (agendaCertaReservationId) {
        // Se o evento foi criado pelo AgendaCerta, cancelamos a reserva
        await prisma.reservation.update({
          where: { id: agendaCertaReservationId },
          data: { status: 'CANCELLED' },
        });
        console.log(`[Sync] Reserva ${agendaCertaReservationId} cancelada devido à exclusão no Google Calendar.`);
      }
      // Se não foi criado pelo AgendaCerta, ignoramos (não queremos excluir agendamentos de terceiros)
      return;
    }

    // 2. Evento foi criado ou atualizado no Google Calendar
    // Se o evento foi criado pelo AgendaCerta, apenas atualizamos os dados
    if (agendaCertaReservationId) {
      // Atualiza a reserva existente
      await prisma.reservation.update({
        where: { id: agendaCertaReservationId },
        data: {
          startTime: event.start.dateTime ? new Date(event.start.dateTime) : undefined,
          endTime: event.end.dateTime ? new Date(event.end.dateTime) : undefined,
          // Não atualizamos clientId ou courtId, pois o Google Calendar não tem essa informação de forma confiável
          // Apenas a data/hora e o status (se for o caso)
        },
      });
      console.log(`[Sync] Reserva ${agendaCertaReservationId} atualizada pelo Google Calendar.`);
    } else {
      // *** DECISÃO CRÍTICA ***
      // Para manter a simplicidade e evitar a criação de lógica complexa de mapeamento de clientes/quadras
      // a partir do título/descrição do evento do Google, vamos **IGNORAR** a criação de novos agendamentos
      // que não foram originados no AgendaCerta. A sincronização bidirecional será focada em:
      // 1. Atualizar agendamentos criados no AgendaCerta (mudança de hora/data/cancelamento).
      // 2. Cancelar agendamentos criados no AgendaCerta.
      
      console.log(`[Sync] Evento ${googleCalendarEventId} não originado no AgendaCerta. Ignorando criação.`);
    }

  } catch (error) {
    console.error(`[Sync] Erro ao sincronizar evento ${googleCalendarEventId} do Google Calendar:`, error);
  }
}

module.exports = {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  getAuthenticatedCalendarClient,
  syncEventFromGoogle,
};
