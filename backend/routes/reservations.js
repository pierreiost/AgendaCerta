const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', authMiddleware, checkPermission('reservations', 'view'), async (req, res) => {
  try {
    const reservations = await prisma.reservation.findMany({
      where: {
        court: { complexId: req.user.complexId }
      },
      include: {
        court: true,
        client: true
      },
      orderBy: { startTime: 'desc' }
    });

    res.json(reservations);
  } catch (error) {
    console.error('Erro ao buscar reservas:', error);
    res.status(500).json({ error: 'Erro ao buscar reservas' });
  }
});

router.get('/:id', authMiddleware, checkPermission('reservations', 'view'), async (req, res) => {
  try {
    const reservation = await prisma.reservation.findFirst({
      where: {
        id: req.params.id,
        court: { complexId: req.user.complexId }
      },
      include: {
        court: true,
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

router.post('/', authMiddleware, checkPermission('reservations', 'create'), async (req, res) => {
  try {
    const { courtId, clientId, startTime, durationInHours, isRecurring, frequency, endDate } = req.body;

    const court = await prisma.court.findFirst({
      where: {
        id: courtId,
        complexId: req.user.complexId
      }
    });

    if (!court) {
      return res.status(404).json({ error: 'Quadra não encontrada' });
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
            courtId,
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
            courtId,
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
          courtId,
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
          courtId,
          clientId,
          startTime: start,
          endTime: end,
          isRecurring: false,
          status: 'CONFIRMED'
        },
        include: {
          court: true,
          client: true
        }
      });

      res.status(201).json(reservation);
    }
  } catch (error) {
    console.error('Erro ao criar reserva:', error);
    res.status(500).json({ error: 'Erro ao criar reserva' });
  }
});

router.put('/:id', authMiddleware, checkPermission('reservations', 'edit'), async (req, res) => {
  try {
    const { startTime, durationInHours, status } = req.body;

    const reservation = await prisma.reservation.findFirst({
      where: {
        id: req.params.id,
        court: { complexId: req.user.complexId }
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
        court: true,
        client: true
      }
    });

    res.json(updatedReservation);
  } catch (error) {
    console.error('Erro ao atualizar reserva:', error);
    res.status(500).json({ error: 'Erro ao atualizar reserva' });
  }
});

router.delete('/:id', authMiddleware, checkPermission('reservations', 'cancel'), async (req, res) => {
  try {
    const reservation = await prisma.reservation.findFirst({
      where: {
        id: req.params.id,
        court: { complexId: req.user.complexId }
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

router.post('/cancel-multiple', authMiddleware, checkPermission('reservations', 'cancel'), async (req, res) => {
  try {
    const { reservationIds } = req.body;

    if (!Array.isArray(reservationIds) || reservationIds.length === 0) {
      return res.status(400).json({ error: 'Lista de IDs inválida' });
    }

    const reservations = await prisma.reservation.findMany({
      where: {
        id: { in: reservationIds },
        court: { complexId: req.user.complexId }
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

    const result = await prisma.reservation.updateMany({
      where: {
        id: { in: reservationIds },
        court: { complexId: req.user.complexId }
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
        reservations: { include: { court: true } }
      }
    });

    if (!group) {
      return res.status(404).json({ error: 'Grupo de recorrência não encontrado' });
    }

    if (group.reservations.length > 0 && 
        group.reservations[0].court.complexId !== req.user.complexId) {
      return res.status(403).json({ error: 'Sem permissão para cancelar este grupo' });
    }

    const now = new Date();
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