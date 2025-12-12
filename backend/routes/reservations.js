const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');
const { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } = require('../services/googleCalendarService');
const { checkPermission } = require('../middleware/permissions');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Reservations
 *   description: Gestão de Agendamentos (Reservas)
 */
const prisma = new PrismaClient();

/**
 * @swagger
 * /reservations:
 *   get:
 *     summary: Lista todos os agendamentos do complexo
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de agendamentos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Reservation'
 *       401:
 *         description: Não autorizado
 */
router.get('/', authMiddleware, checkPermission('reservations', 'view'), async (req, res) => {
  try {
    // Paginação
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const where = {
      resource: { complexId: req.user.complexId }
    };

    const [reservations, total] = await Promise.all([
      prisma.reservation.findMany({
        where,
        skip,
        take: limit,
        include: {
          resource: true,
          client: true
        },
        orderBy: { startTime: 'desc' }
      }),
      prisma.reservation.count({ where })
    ]);

    res.json({
      data: reservations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao buscar reservas:', error);
    res.status(500).json({ error: 'Erro ao buscar reservas' });
  }
});

/**
 * @swagger
 * /reservations/{id}:
 *   get:
 *     summary: Busca um agendamento pelo ID
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID do agendamento
 *     responses:
 *       200:
 *         description: Detalhes do agendamento
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Reservation'
 *       404:
 *         description: Agendamento não encontrado
 */
router.get('/:id', authMiddleware, checkPermission('reservations', 'view'), async (req, res) => {
  try {
    const reservation = await prisma.reservation.findFirst({
      where: {
        id: req.params.id,
        resource: { complexId: req.user.complexId }
      },
      include: {
        resource: true,
        client: true
      }
    });

    if (!reservation) {
      return res.status(404).json({ error: 'Reserva não encontrada' });
    }

    res.json(reservation);
  } catch (error) {
    console.error('Erro ao buscar reserva:', error);
    res.status(500).json({ error: 'Erro ao buscar reserva' });
  }
});

/**
 * @swagger
 * /reservations:
 *   post:
 *     summary: Cria um novo agendamento (reserva)
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - resourceId
 *               - clientId
 *               - startTime
 *               - durationInHours
 *             properties:
 *               resourceId:
 *                 type: string
 *                 format: uuid
 *                 description: ID do recurso
 *               clientId:
 *                 type: string
 *                 format: uuid
 *                 description: ID do cliente
 *               startTime:
 *                 type: string
 *                 format: date-time
 *                 description: Horário de início
 *               durationInHours:
 *                 type: number
 *                 format: float
 *                 description: Duração em horas (ex: 1.5)
 *               isRecurring:
 *                 type: boolean
 *                 description: Se é uma reserva recorrente
 *               frequency:
 *                 type: string
 *                 enum: [WEEKLY, MONTHLY]
 *                 description: Frequência da recorrência (se isRecurring for true)
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 description: Data final da recorrência (se isRecurring for true)
 *     responses:
 *       201:
 *         description: Agendamento criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Reservation'
 *       400:
 *         description: Dados inválidos
 *       404:
 *         description: Recurso ou Cliente não encontrado
 *       409:
 *         description: Conflito de horário
 */
router.post('/', authMiddleware, checkPermission('reservations', 'create'), async (req, res) => {
  try {
    const { resourceId, clientId, startTime, durationInHours, isRecurring, frequency, endDate } = req.body;

    const resource = await prisma.resource.findFirst({
      where: {
        id: resourceId,
        complexId: req.user.complexId
      }
    });

    if (!resource) {
      return res.status(404).json({ error: 'Recurso não encontrado' });
    }

    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        complexId: req.user.complexId
      }
    });

    if (!client) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    const start = new Date(startTime);
    const duration = parseFloat(durationInHours);

    if (isNaN(duration) || duration < 0.5 || duration > 12) {
      return res.status(400).json({ 
        error: 'Duração inválida. Deve ser entre 0.5 e 12 horas' 
      });
    }

    const durationInMilliseconds = duration * 60 * 60 * 1000;
    const end = new Date(start.getTime() + durationInMilliseconds);

    if (isRecurring) {
      if (!frequency || !endDate) {
        return res.status(400).json({ 
          error: 'Frequência e data final são obrigatórias para reservas recorrentes' 
        });
      }

      const recurringGroup = await prisma.recurringGroup.create({
        data: {
          frequency,
          dayOfWeek: frequency === 'WEEKLY' ? start.getDay() : null,
          startDate: start,
          endDate: new Date(endDate)
        }
      });

      const reservations = [];
      let currentDate = new Date(start);
      const finalDate = new Date(endDate);

      while (currentDate <= finalDate) {
        const reservationStart = new Date(currentDate);
        const reservationEnd = new Date(currentDate.getTime() + durationInMilliseconds);

        const conflict = await prisma.reservation.findFirst({
          where: {
            resourceId,
            status: { not: 'CANCELLED' },
            OR: [
              { AND: [{ startTime: { lte: reservationStart } }, { endTime: { gt: reservationStart } }] },
              { AND: [{ startTime: { lt: reservationEnd } }, { endTime: { gte: reservationEnd } }] },
              { AND: [{ startTime: { gte: reservationStart } }, { endTime: { lte: reservationEnd } }] }
            ]
          }
        });

        if (!conflict) {
          reservations.push({
            resourceId,
            clientId,
            startTime: reservationStart,
            endTime: reservationEnd,
            isRecurring: true,
            recurringGroupId: recurringGroup.id,
            status: 'CONFIRMED'
          });
        }

        if (frequency === 'WEEKLY') {
          currentDate.setDate(currentDate.getDate() + 7);
        } else if (frequency === 'MONTHLY') {
          currentDate.setMonth(currentDate.getMonth() + 1);
        }
      }

      if (reservations.length === 0) {
        await prisma.recurringGroup.delete({ where: { id: recurringGroup.id } });
        return res.status(409).json({ 
          error: 'Todos os horários estão ocupados' 
        });
      }

      const createdReservations = await prisma.reservation.createMany({
        data: reservations
      });

      res.status(201).json({
        message: `${reservations.length} reservas recorrentes criadas com sucesso!`,
        recurringGroupId: recurringGroup.id,
        count: createdReservations.count
      });

    } else {
      const conflict = await prisma.reservation.findFirst({
        where: {
          resourceId,
          status: { not: 'CANCELLED' },
          OR: [
            { AND: [{ startTime: { lte: start } }, { endTime: { gt: start } }] },
            { AND: [{ startTime: { lt: end } }, { endTime: { gte: end } }] },
            { AND: [{ startTime: { gte: start } }, { endTime: { lte: end } }] }
          ]
        },
        include: { client: true }
      });

      if (conflict) {
        return res.status(409).json({ 
          error: 'Horário já está reservado',
          conflictWith: {
            client: conflict.client.fullName,
            startTime: conflict.startTime,
            endTime: conflict.endTime
          }
        });
      }

      const reservation = await prisma.reservation.create({
        data: {
          resourceId,
          clientId,
          startTime: start,
          endTime: end,
          isRecurring: false,
          status: 'CONFIRMED'
        },
        include: {
          resource: true,
          client: true
        }
      });

      // Sincronização com Google Calendar
      const googleCalendarEventId = await createCalendarEvent(req.user.complexId, reservation);
      if (googleCalendarEventId) {
        await prisma.reservation.update({
          where: { id: reservation.id },
          data: { googleCalendarEventId }
        });
        reservation.googleCalendarEventId = googleCalendarEventId;
      }

      res.status(201).json(reservation);
    }
  } catch (error) {
    console.error('Erro ao criar reserva:', error);
    res.status(500).json({ error: 'Erro ao criar reserva' });
  }
});

/**
 * @swagger
 * /reservations/{id}:
 *   put:
 *     summary: Atualiza um agendamento existente
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID do agendamento a ser atualizado
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               startTime:
 *                 type: string
 *                 format: date-time
 *                 description: Novo horário de início
 *               durationInHours:
 *                 type: number
 *                 format: float
 *                 description: Nova duração em horas
 *               status:
 *                 type: string
 *                 enum: [CONFIRMED, PENDING, CANCELLED]
 *                 description: Novo status
 *     responses:
 *       200:
 *         description: Agendamento atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Reservation'
 *       400:
 *         description: Não é possível editar (ex: comanda aberta)
 *       404:
 *         description: Agendamento não encontrado
 */
router.put('/:id', authMiddleware, checkPermission('reservations', 'edit'), async (req, res) => {
  try {
    const { startTime, durationInHours, status } = req.body;

    const reservation = await prisma.reservation.findFirst({
      where: {
        id: req.params.id,
        resource: { complexId: req.user.complexId }
      },
      include: {
        tabs: { where: { status: 'OPEN' } }
      }
    });

    if (!reservation) {
      return res.status(404).json({ error: 'Reserva não encontrada' });
    }

    if (reservation.status === 'CANCELLED') {
      return res.status(400).json({ 
        error: 'Não é possível editar uma reserva cancelada' 
      });
    }

    const now = new Date();

    if (reservation.startTime < now) {
      return res.status(400).json({
        error: 'Não é possível editar reserva que já começou'
      });
    }

    if (reservation.tabs && reservation.tabs.length > 0) {
      return res.status(400).json({
        error: 'Não é possível editar reserva com comanda aberta. Feche a comanda primeiro.',
        openTabs: reservation.tabs.length
      });
    }

    const updatedReservation = await prisma.reservation.update({
      where: { id: req.params.id },
      data: {
        startTime: startTime ? new Date(startTime) : undefined,
        endTime: startTime && durationInHours 
          ? new Date(new Date(startTime).getTime() + (durationInHours * 60 * 60 * 1000))
          : undefined,
        status
      },
      include: {
        resource: true,
        client: true
      }
    });

    // Sincronização com Google Calendar
    if (updatedReservation.googleCalendarEventId) {
      await updateCalendarEvent(req.user.complexId, updatedReservation);
    }

    res.json(updatedReservation);
  } catch (error) {
    console.error('Erro ao atualizar reserva:', error);
    res.status(500).json({ error: 'Erro ao atualizar reserva' });
  }
});

/**
 * @swagger
 * /reservations/{id}:
 *   delete:
 *     summary: Cancela um agendamento
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID do agendamento a ser cancelado
 *     responses:
 *       200:
 *         description: Agendamento cancelado com sucesso
 *       400:
 *         description: Não é possível cancelar (ex: comanda aberta)
 *       404:
 *         description: Agendamento não encontrado
 */
router.delete('/:id', authMiddleware, checkPermission('reservations', 'cancel'), async (req, res) => {
  try {
    const reservation = await prisma.reservation.findFirst({
      where: {
        id: req.params.id,
        resource: { complexId: req.user.complexId }
      },
      include: {
        tabs: { where: { status: 'OPEN' } }
      }
    });

    if (!reservation) {
      return res.status(404).json({ error: 'Reserva não encontrada' });
    }

    if (reservation.tabs && reservation.tabs.length > 0) {
      return res.status(400).json({
        error: 'Não é possível cancelar reserva com comanda aberta. Feche as comandas primeiro.',
        openTabs: reservation.tabs.length
      });
    }

    // Excluir do Google Calendar se existir
    if (reservation.googleCalendarEventId) {
      await deleteCalendarEvent(req.user.complexId, reservation.googleCalendarEventId);
    }

    await prisma.reservation.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED' }
    });

    res.json({ 
      message: 'Reserva cancelada com sucesso',
      reservationId: req.params.id
    });
  } catch (error) {
    console.error('Erro ao cancelar reserva:', error);
    res.status(500).json({ error: 'Erro ao cancelar reserva' });
  }
});

/**
 * @swagger
 * /reservations/cancel-multiple:
 *   post:
 *     summary: Cancela múltiplos agendamentos (recorrentes)
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reservationIds
 *             properties:
 *               reservationIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: Lista de IDs de agendamentos a serem cancelados
 *     responses:
 *       200:
 *         description: Agendamentos cancelados com sucesso
 *       400:
 *         description: Dados inválidos
 */
router.post('/cancel-multiple', authMiddleware, checkPermission('reservations', 'cancel'), async (req, res) => {
  try {
    const { reservationIds } = req.body;

    if (!Array.isArray(reservationIds) || reservationIds.length === 0) {
      return res.status(400).json({ error: 'Lista de IDs inválida' });
    }

    const reservations = await prisma.reservation.findMany({
      where: {
        id: { in: reservationIds },
        resource: { complexId: req.user.complexId }
      },
      include: {
        tabs: { where: { status: 'OPEN' } }
      }
    });

    if (reservations.length !== reservationIds.length) {
      return res.status(404).json({ error: 'Algumas reservas não foram encontradas' });
    }

    const reservationsWithOpenTabs = reservations.filter(r => r.tabs && r.tabs.length > 0);
    
    if (reservationsWithOpenTabs.length > 0) {
      return res.status(400).json({
        error: 'Não é possível cancelar reservas com comandas abertas',
        reservationsWithOpenTabs: reservationsWithOpenTabs.map(r => r.id)
      });
    }

    // Obter os IDs dos eventos do Google Calendar antes de cancelar
    const eventIdsToCancel = reservations
      .filter(r => r.googleCalendarEventId)
      .map(r => r.googleCalendarEventId);

    // Cancelar no Google Calendar (assíncrono, não bloqueia a resposta)
    eventIdsToCancel.forEach(eventId => {
      deleteCalendarEvent(req.user.complexId, eventId).catch(console.error);
    });

    const result = await prisma.reservation.updateMany({
      where: {
        id: { in: reservationIds },
        resource: { complexId: req.user.complexId }
      },
      data: { status: 'CANCELLED' }
    });

    res.json({ 
      message: `${result.count} reservas canceladas com sucesso`,
      cancelledCount: result.count
    });
  } catch (error) {
    console.error('Erro ao cancelar reservas:', error);
    res.status(500).json({ error: 'Erro ao cancelar reservas múltiplas' });
  }
});

router.delete('/recurring-group/:groupId', authMiddleware, checkPermission('reservations', 'cancel'), async (req, res) => {
  try {
    const { groupId } = req.params;

    const group = await prisma.recurringGroup.findFirst({
      where: { id: groupId },
      include: {
        reservations: { include: { resource: true } }
      }
    });

    if (!group) {
      return res.status(404).json({ error: 'Grupo de recorrência não encontrado' });
    }

    if (group.reservations.length > 0 && 
        group.reservations[0].resource.complexId !== req.user.complexId) {
      return res.status(403).json({ error: 'Sem permissão para cancelar este grupo' });
    }

    const now = new Date();
    // Obter os IDs dos eventos do Google Calendar antes de cancelar
    const eventIdsToCancel = group.reservations
      .filter(r => r.googleCalendarEventId && r.startTime >= now && r.status !== 'CANCELLED')
      .map(r => r.googleCalendarEventId);

    // Cancelar no Google Calendar (assíncrono, não bloqueia a resposta)
    eventIdsToCancel.forEach(eventId => {
      deleteCalendarEvent(req.user.complexId, eventId).catch(console.error);
    });

    const result = await prisma.reservation.updateMany({
      where: {
        recurringGroupId: groupId,
        startTime: { gte: now },
        status: { not: 'CANCELLED' }
      },
      data: { status: 'CANCELLED' }
    });

    res.json({ 
      message: 'Reservas recorrentes canceladas com sucesso',
      cancelledCount: result.count
    });
  } catch (error) {
    console.error('Erro ao cancelar grupo de reservas:', error);
    res.status(500).json({ error: 'Erro ao cancelar grupo de reservas' });
  }
});

module.exports = router;