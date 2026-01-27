const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');
const { validateIDOR } = require('../middleware/idorValidation');
const { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } = require('../services/googleCalendarService');
const { body, param, query, validationResult } = require('express-validator');

// Usar singleton do Prisma
const prisma = require('../lib/prisma');

const router = express.Router();

/**
 * Middleware de validação
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: errors.array()[0].msg,
      code: 'VALIDATION_ERROR',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

/**
 * Validadores para reservas
 */
const reservationValidators = {
  create: [
    body('resourceId')
      .notEmpty().withMessage('Recurso é obrigatório')
      .isUUID().withMessage('ID do recurso inválido'),

    body('clientId')
      .notEmpty().withMessage('Cliente é obrigatório')
      .isUUID().withMessage('ID do cliente inválido'),

    body('startTime')
      .notEmpty().withMessage('Horário de início é obrigatório')
      .isISO8601().withMessage('Data/hora de início inválida'),

    body('durationInHours')
      .notEmpty().withMessage('Duração é obrigatória')
      .isFloat({ min: 0.5, max: 12 }).withMessage('Duração deve ser entre 0.5 e 12 horas'),

    body('isRecurring')
      .optional()
      .isBoolean().withMessage('isRecurring deve ser true ou false'),

    body('frequency')
      .if(body('isRecurring').equals(true))
      .notEmpty().withMessage('Frequência é obrigatória para reservas recorrentes')
      .isIn(['WEEKLY', 'MONTHLY']).withMessage('Frequência inválida'),

    body('endDate')
      .if(body('isRecurring').equals(true))
      .notEmpty().withMessage('Data final é obrigatória para reservas recorrentes')
      .isISO8601().withMessage('Data final inválida'),

    validate
  ],

  update: [
    param('id')
      .isUUID().withMessage('ID da reserva inválido'),

    body('startTime')
      .optional()
      .isISO8601().withMessage('Data/hora de início inválida'),

    body('durationInHours')
      .optional()
      .isFloat({ min: 0.5, max: 12 }).withMessage('Duração deve ser entre 0.5 e 12 horas'),

    body('status')
      .optional()
      .isIn(['CONFIRMED', 'PENDING', 'CANCELLED']).withMessage('Status inválido'),

    validate
  ],

  query: [
    query('startDate')
      .optional()
      .isISO8601().withMessage('Data de início inválida'),

    query('endDate')
      .optional()
      .isISO8601().withMessage('Data final inválida'),

    query('resourceId')
      .optional()
      .isUUID().withMessage('ID do recurso inválido'),

    query('status')
      .optional()
      .isIn(['CONFIRMED', 'PENDING', 'CANCELLED']).withMessage('Status inválido'),

    query('page')
      .optional()
      .isInt({ min: 1 }).withMessage('Página deve ser um número positivo'),

    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('Limite deve ser entre 1 e 100'),

    validate
  ],

  cancelMultiple: [
    body('reservationIds')
      .isArray({ min: 1 }).withMessage('Lista de IDs é obrigatória')
      .custom((value) => {
        if (!value.every(id => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))) {
          throw new Error('Todos os IDs devem ser UUIDs válidos');
        }
        return true;
      }),

    validate
  ]
};

/**
 * @swagger
 * tags:
 *   name: Reservations
 *   description: Gestão de Agendamentos (Reservas)
 */

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
 */
router.get('/',
  authMiddleware,
  checkPermission('reservations', 'view'),
  reservationValidators.query,
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;

      const where = {
        resource: { complexId: req.user.complexId }
      };

      // Filtros opcionais
      if (req.query.resourceId) {
        where.resourceId = req.query.resourceId;
      }
      if (req.query.status) {
        where.status = req.query.status;
      }
      if (req.query.startDate) {
        where.startTime = { gte: new Date(req.query.startDate) };
      }
      if (req.query.endDate) {
        where.endTime = { ...where.endTime, lte: new Date(req.query.endDate) };
      }

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
      console.error('[Reservations] Erro ao buscar reservas:', error.message);
      res.status(500).json({ error: 'Erro ao buscar reservas' });
    }
  }
);

/**
 * @swagger
 * /reservations/check-conflict:
 *   get:
 *     summary: Verifica conflito de horário
 *     tags: [Reservations]
 */
router.get('/check-conflict',
  authMiddleware,
  checkPermission('reservations', 'view'),
  async (req, res) => {
    try {
      const { resourceId, startTime, endTime, excludeId } = req.query;

      if (!resourceId || !startTime || !endTime) {
        return res.status(400).json({
          error: 'resourceId, startTime e endTime são obrigatórios'
        });
      }

      const start = new Date(startTime);
      const end = new Date(endTime);

      const where = {
        resourceId,
        status: { not: 'CANCELLED' },
        resource: { complexId: req.user.complexId },
        OR: [
          { AND: [{ startTime: { lte: start } }, { endTime: { gt: start } }] },
          { AND: [{ startTime: { lt: end } }, { endTime: { gte: end } }] },
          { AND: [{ startTime: { gte: start } }, { endTime: { lte: end } }] }
        ]
      };

      if (excludeId) {
        where.id = { not: excludeId };
      }

      const conflict = await prisma.reservation.findFirst({
        where,
        include: { client: true }
      });

      res.json({
        hasConflict: !!conflict,
        conflictingBooking: conflict
      });
    } catch (error) {
      console.error('[Reservations] Erro ao verificar conflito:', error.message);
      res.status(500).json({ error: 'Erro ao verificar conflito' });
    }
  }
);

/**
 * @swagger
 * /reservations/{id}:
 *   get:
 *     summary: Busca um agendamento pelo ID
 *     tags: [Reservations]
 */
router.get('/:id',
  authMiddleware,
  checkPermission('reservations', 'view'),
  validateIDOR('reservation'),
  async (req, res) => {
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
      console.error('[Reservations] Erro ao buscar reserva:', error.message);
      res.status(500).json({ error: 'Erro ao buscar reserva' });
    }
  }
);

/**
 * @swagger
 * /reservations:
 *   post:
 *     summary: Cria um novo agendamento (reserva)
 *     tags: [Reservations]
 */
router.post('/',
  authMiddleware,
  checkPermission('reservations', 'create'),
  reservationValidators.create,
  async (req, res) => {
    try {
      const { resourceId, clientId, startTime, durationInHours, isRecurring, frequency, endDate } = req.body;

      // Validar que o recurso pertence ao complexo do usuário
      const resource = await prisma.resource.findFirst({
        where: {
          id: resourceId,
          complexId: req.user.complexId
        }
      });

      if (!resource) {
        return res.status(404).json({ error: 'Recurso não encontrado' });
      }

      // Validar que o cliente pertence ao complexo do usuário
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
      const durationInMilliseconds = duration * 60 * 60 * 1000;
      const end = new Date(start.getTime() + durationInMilliseconds);

      // Validar que não é no passado
      if (start < new Date()) {
        return res.status(400).json({
          error: 'Não é possível criar reserva com horário no passado'
        });
      }

      if (isRecurring) {
        if (!frequency || !endDate) {
          return res.status(400).json({
            error: 'Frequência e data final são obrigatórias para reservas recorrentes'
          });
        }

        // Usar transação para criar grupo de recorrência e reservas
        const result = await prisma.$transaction(async (tx) => {
          const recurringGroup = await tx.recurringGroup.create({
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

            const conflict = await tx.reservation.findFirst({
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
            // Rollback - deletar grupo se não houver reservas
            await tx.recurringGroup.delete({ where: { id: recurringGroup.id } });
            throw new Error('CONFLICT_ALL');
          }

          await tx.reservation.createMany({ data: reservations });

          return { recurringGroup, count: reservations.length };
        });

        res.status(201).json({
          message: `${result.count} reservas recorrentes criadas com sucesso!`,
          recurringGroupId: result.recurringGroup.id,
          count: result.count
        });

      } else {
        // Verificar conflito
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
            code: 'CONFLICT',
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
      if (error.message === 'CONFLICT_ALL') {
        return res.status(409).json({
          error: 'Todos os horários estão ocupados'
        });
      }
      console.error('[Reservations] Erro ao criar reserva:', error.message);
      res.status(500).json({ error: 'Erro ao criar reserva' });
    }
  }
);

/**
 * @swagger
 * /reservations/{id}:
 *   put:
 *     summary: Atualiza um agendamento existente
 *     tags: [Reservations]
 */
router.put('/:id',
  authMiddleware,
  checkPermission('reservations', 'edit'),
  validateIDOR('reservation'),
  reservationValidators.update,
  async (req, res) => {
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

      if (reservation.startTime < now && status !== 'CANCELLED') {
        return res.status(400).json({
          error: 'Não é possível editar reserva que já começou'
        });
      }

      if (reservation.tabs && reservation.tabs.length > 0) {
        return res.status(400).json({
          error: 'Não é possível editar reserva com comanda aberta. Feche a comanda primeiro.',
          code: 'OPEN_TAB',
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
      console.error('[Reservations] Erro ao atualizar reserva:', error.message);
      res.status(500).json({ error: 'Erro ao atualizar reserva' });
    }
  }
);

/**
 * @swagger
 * /reservations/{id}:
 *   delete:
 *     summary: Cancela um agendamento
 *     tags: [Reservations]
 */
router.delete('/:id',
  authMiddleware,
  checkPermission('reservations', 'cancel'),
  validateIDOR('reservation'),
  async (req, res) => {
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
          code: 'OPEN_TAB',
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
      console.error('[Reservations] Erro ao cancelar reserva:', error.message);
      res.status(500).json({ error: 'Erro ao cancelar reserva' });
    }
  }
);

/**
 * @swagger
 * /reservations/cancel-multiple:
 *   post:
 *     summary: Cancela múltiplos agendamentos
 *     tags: [Reservations]
 */
router.post('/cancel-multiple',
  authMiddleware,
  checkPermission('reservations', 'cancel'),
  reservationValidators.cancelMultiple,
  async (req, res) => {
    try {
      const { reservationIds } = req.body;

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
        return res.status(404).json({
          error: 'Algumas reservas não foram encontradas ou não pertencem ao seu estabelecimento'
        });
      }

      const reservationsWithOpenTabs = reservations.filter(r => r.tabs && r.tabs.length > 0);

      if (reservationsWithOpenTabs.length > 0) {
        return res.status(400).json({
          error: 'Não é possível cancelar reservas com comandas abertas',
          code: 'OPEN_TAB',
          reservationsWithOpenTabs: reservationsWithOpenTabs.map(r => r.id)
        });
      }

      // Obter os IDs dos eventos do Google Calendar
      const eventIdsToCancel = reservations
        .filter(r => r.googleCalendarEventId)
        .map(r => r.googleCalendarEventId);

      // Cancelar no Google Calendar (assíncrono)
      eventIdsToCancel.forEach(eventId => {
        deleteCalendarEvent(req.user.complexId, eventId).catch(err =>
          console.error('[Reservations] Erro ao cancelar evento no Google:', err.message)
        );
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
      console.error('[Reservations] Erro ao cancelar reservas:', error.message);
      res.status(500).json({ error: 'Erro ao cancelar reservas múltiplas' });
    }
  }
);

/**
 * @swagger
 * /reservations/recurring-group/{groupId}:
 *   delete:
 *     summary: Cancela grupo de reservas recorrentes
 *     tags: [Reservations]
 */
router.delete('/recurring-group/:groupId',
  authMiddleware,
  checkPermission('reservations', 'cancel'),
  async (req, res) => {
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

      // Verificar se pertence ao complexo do usuário
      if (group.reservations.length > 0 &&
          group.reservations[0].resource.complexId !== req.user.complexId) {
        return res.status(403).json({
          error: 'Sem permissão para cancelar este grupo',
          code: 'IDOR_ACCESS_DENIED'
        });
      }

      const now = new Date();

      // Obter os IDs dos eventos do Google Calendar
      const eventIdsToCancel = group.reservations
        .filter(r => r.googleCalendarEventId && r.startTime >= now && r.status !== 'CANCELLED')
        .map(r => r.googleCalendarEventId);

      // Cancelar no Google Calendar (assíncrono)
      eventIdsToCancel.forEach(eventId => {
        deleteCalendarEvent(req.user.complexId, eventId).catch(err =>
          console.error('[Reservations] Erro ao cancelar evento no Google:', err.message)
        );
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
      console.error('[Reservations] Erro ao cancelar grupo de reservas:', error.message);
      res.status(500).json({ error: 'Erro ao cancelar grupo de reservas' });
    }
  }
);

module.exports = router;
