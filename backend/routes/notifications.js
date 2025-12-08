const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const notifications = [];
    const now = new Date();
    const in30Minutes = new Date(now.getTime() + 30 * 60 * 1000);

    console.log('🔔 Buscando notificações...');
    console.log('⏰ Hora atual:', now.toISOString());

    const lowStockProducts = await prisma.product.findMany({
      where: {
        complexId: req.user.complexId,
        stock: { lt: 10 }
      },
      select: {
        id: true,
        name: true,
        stock: true,
        unit: true
      }
    });

    console.log(`📦 Produtos com estoque baixo: ${lowStockProducts.length}`);

    lowStockProducts.forEach(product => {
      notifications.push({
        id: `stock-${product.id}`,
        type: 'LOW_STOCK',
        priority: product.stock === 0 ? 'HIGH' : 'MEDIUM',
        title: product.stock === 0 ? 'Produto sem estoque' : 'Estoque baixo',
        message: `${product.name}: ${product.stock} ${product.unit}`,
        link: '/products',
        createdAt: now
      });
    });

    const upcomingReservations = await prisma.reservation.findMany({
      where: {
        court: { complexId: req.user.complexId },
        status: 'CONFIRMED',
        startTime: {
          gte: now,
          lte: in30Minutes
        }
      },
      include: {
        court: { select: { name: true } },
        client: { select: { fullName: true, phone: true } }
      },
      orderBy: { startTime: 'asc' }
    });

    console.log(`📅 Reservas nos próximos 30min: ${upcomingReservations.length}`);

    upcomingReservations.forEach(reservation => {
      const reservationTime = new Date(reservation.startTime);
      const minutesUntil = Math.round((reservationTime - now) / (1000 * 60));
      
      notifications.push({
        id: `reservation-${reservation.id}`,
        type: 'UPCOMING_RESERVATION',
        priority: minutesUntil <= 10 ? 'HIGH' : 'MEDIUM',
        title: 'Reserva próxima',
        message: `${reservation.client.fullName} - ${reservation.court.name} em ${minutesUntil} min`,
        link: '/reservations',
        createdAt: now
      });
    });

    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
    const oldOpenTabs = await prisma.tab.findMany({
      where: {
        client: { complexId: req.user.complexId },
        status: 'OPEN',
        createdAt: { lte: fourHoursAgo }
      },
      include: {
        client: { select: { fullName: true } }
      },
      orderBy: { createdAt: 'asc' }
    });

    console.log(`💰 Comandas antigas: ${oldOpenTabs.length}`);

    oldOpenTabs.forEach(tab => {
      const hoursOpen = Math.round((now - new Date(tab.createdAt)) / (1000 * 60 * 60));
      notifications.push({
        id: `tab-${tab.id}`,
        type: 'OLD_OPEN_TAB',
        priority: 'MEDIUM',
        title: 'Comanda aberta há muito tempo',
        message: `${tab.client.fullName} - ${hoursOpen}h aberta - R$ ${tab.total.toFixed(2)}`,
        link: `/tabs/${tab.id}`,
        createdAt: tab.createdAt
      });
    });

    const maintenanceCourts = await prisma.court.findMany({
      where: {
        complexId: req.user.complexId,
        status: 'MAINTENANCE'
      },
      select: {
        id: true,
        name: true,
        courtType: {
          select: {
            name: true
          }
        }
      }
    });

    console.log(`🔧 Quadras em manutenção: ${maintenanceCourts.length}`);

    maintenanceCourts.forEach(court => {
      notifications.push({
        id: `maintenance-${court.id}`,
        type: 'MAINTENANCE',
        priority: 'LOW',
        title: 'Quadra em manutenção',
        message: `${court.name} - ${court.courtType.name}`,
        link: '/courts',
        createdAt: now
      });
    });

    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const expiringProducts = await prisma.product.findMany({
      where: {
        complexId: req.user.complexId,
        expiryDate: {
          gte: now,
          lte: in7Days
        }
      },
      select: {
        id: true,
        name: true,
        expiryDate: true,
        stock: true
      }
    });

    console.log(`⚠️ Produtos vencendo: ${expiringProducts.length}`);

    expiringProducts.forEach(product => {
      const daysUntilExpiry = Math.ceil((new Date(product.expiryDate) - now) / (1000 * 60 * 60 * 24));
      notifications.push({
        id: `expiry-${product.id}`,
        type: 'EXPIRING_PRODUCT',
        priority: daysUntilExpiry <= 2 ? 'HIGH' : 'MEDIUM',
        title: 'Produto próximo do vencimento',
        message: `${product.name} vence em ${daysUntilExpiry} dia(s)`,
        link: '/products',
        createdAt: now
      });
    });

    const pendingReservations = await prisma.reservation.findMany({
      where: {
        court: { complexId: req.user.complexId },
        status: 'PENDING',
        startTime: { gte: now }
      },
      include: {
        court: { select: { name: true } },
        client: { select: { fullName: true } }
      }
    });

    console.log(`📋 Reservas pendentes: ${pendingReservations.length}`);

    pendingReservations.forEach(reservation => {
      notifications.push({
        id: `pending-${reservation.id}`,
        type: 'PENDING_RESERVATION',
        priority: 'MEDIUM',
        title: 'Reserva pendente de confirmação',
        message: `${reservation.client.fullName} - ${reservation.court.name}`,
        link: '/reservations',
        createdAt: reservation.createdAt
      });
    });

    const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    notifications.sort((a, b) => {
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    console.log(`✅ Total de notificações: ${notifications.length}`);

    res.json({
      notifications,
      count: notifications.length,
      unreadCount: notifications.length,
      summary: {
        high: notifications.filter(n => n.priority === 'HIGH').length,
        medium: notifications.filter(n => n.priority === 'MEDIUM').length,
        low: notifications.filter(n => n.priority === 'LOW').length
      }
    });

  } catch (error) {
    console.error('❌ Erro ao buscar notificações:', error);
    res.status(500).json({ error: 'Erro ao buscar notificações' });
  }
});

router.get('/summary', authMiddleware, async (req, res) => {
  try {
    const now = new Date();
    let count = 0;

    const criticalAlerts = await Promise.all([
      prisma.product.count({
        where: {
          complexId: req.user.complexId,
          stock: 0
        }
      }),
      prisma.reservation.count({
        where: {
          court: { complexId: req.user.complexId },
          status: 'CONFIRMED',
          startTime: {
            gte: now,
            lte: new Date(now.getTime() + 15 * 60 * 1000)
          }
        }
      }),
      prisma.tab.count({
        where: {
          client: { complexId: req.user.complexId },
          status: 'OPEN',
          createdAt: { lte: new Date(now.getTime() - 6 * 60 * 60 * 1000) }
        }
      })
    ]);

    count = criticalAlerts.reduce((sum, val) => sum + val, 0);

    res.json({ count });

  } catch (error) {
    console.error('❌ Erro ao buscar resumo de notificações:', error);
    res.status(500).json({ error: 'Erro ao buscar resumo' });
  }
});

module.exports = router;