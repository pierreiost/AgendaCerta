require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const rateLimit = require('express-rate-limit');

// Usar singleton do Prisma
const prisma = require('./lib/prisma');

const userRoutes = require('./routes/users');
const authRoutes = require('./routes/auth');
const resourceRoutes = require('./routes/resources');
const clientRoutes = require('./routes/clients');
const reservationRoutes = require('./routes/reservations');
const productRoutes = require('./routes/products');
const tabRoutes = require('./routes/tabs');
const dashboardRoutes = require('./routes/dashboard');
const notificationRoutes = require('./routes/notifications');
const permissionRoutes = require('./routes/permissions');
const adminRoutes = require('./routes/admin');
const resourceTypesRoutes = require('./routes/resourceTypes');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const googleCalendarRoutes = require('./routes/googleCalendar');

const app = express();

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AgendaCerta API',
      version: '1.0.0',
      description: 'Documentação da API do AgendaCerta, um sistema de agendamento e gestão de recursos.',
    },
    servers: [
      {
        url: '/api',
        description: 'Servidor Principal',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Resource: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            resourceTypeId: { type: 'string', format: 'uuid' },
            pricePerHour: { type: 'number', format: 'float' },
            description: { type: 'string', nullable: true },
            status: { type: 'string', enum: ['AVAILABLE', 'OCCUPIED', 'MAINTENANCE'] },
            complexId: { type: 'string', format: 'uuid' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            resourceType: { $ref: '#/components/schemas/ResourceType' },
          },
        },
        ResourceType: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            isDefault: { type: 'boolean' },
            complexId: { type: 'string', format: 'uuid', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Reservation: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            resourceId: { type: 'string', format: 'uuid' },
            clientId: { type: 'string', format: 'uuid' },
            startTime: { type: 'string', format: 'date-time' },
            endTime: { type: 'string', format: 'date-time' },
            status: { type: 'string', enum: ['CONFIRMED', 'PENDING', 'CANCELLED'] },
            isRecurring: { type: 'boolean' },
            recurringGroupId: { type: 'string', format: 'uuid', nullable: true },
            googleCalendarEventId: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            resource: { $ref: '#/components/schemas/Resource' },
            client: { $ref: '#/components/schemas/Client' },
          },
        },
        Client: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            fullName: { type: 'string' },
            phone: { type: 'string' },
            email: { type: 'string', nullable: true },
            cpf: { type: 'string', nullable: true },
            complexId: { type: 'string', format: 'uuid' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://agendacerta.site',
  'https://www.agendacerta.site',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log(`[CORS] Origem bloqueada: ${origin}`);
      callback(new Error('Origem não permitida pelo CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(mongoSanitize());
app.use(xss());
app.use(hpp());

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: {
    error: 'Muitas requisições deste IP. Tente novamente em 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  message: {
    error: 'Muitas tentativas de login. Tente novamente em 2 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: {
    error: 'Muitas criações de recursos. Tente novamente em 1 hora.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', generalLimiter);

// Disponibilizar prisma para rotas via app.locals
app.locals.prisma = prisma;

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/products', productRoutes);
app.use('/api/tabs', tabRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/resource-types', resourceTypesRoutes);
app.use('/api/google-calendar', googleCalendarRoutes);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check melhorado - verifica conexão com banco
app.get('/api/health', async (req, res) => {
  try {
    // Verificar conexão com o banco de dados
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      status: 'healthy',
      message: 'AgendaCerta API is running',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      message: 'AgendaCerta API has issues',
      database: 'disconnected',
      timestamp: new Date().toISOString()
    });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);

  if (err.message === 'Origem não permitida pelo CORS') {
    return res.status(403).json({
      error: 'Acesso negado - origem não permitida'
    });
  }

  if (err.code === 'P2002') {
    return res.status(409).json({
      error: 'Já existe um registro com estes dados únicos'
    });
  }

  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'JSON inválido na requisição'
    });
  }

  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Erro interno do servidor'
    : err.message;

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`\n[SERVER] Rodando na porta ${PORT}`);
  console.log(`[SERVER] Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[SERVER] Segurança ativada:`);
  console.log(`   - Helmet (Headers seguros)`);
  console.log(`   - CORS restritivo`);
  console.log(`   - Rate limiting`);
  console.log(`   - XSS Protection`);
  console.log(`   - Documentação da API (Swagger)`);
  console.log(`   - NoSQL Injection Protection`);
  console.log(`   - HPP Protection\n`);
});

const gracefulShutdown = async (signal) => {
  console.log(`\n[SERVER] ${signal} recebido. Encerrando servidor...`);

  server.close(async () => {
    console.log('[SERVER] Servidor HTTP encerrado');

    try {
      await prisma.$disconnect();
      console.log('[SERVER] Prisma desconectado');
      process.exit(0);
    } catch (error) {
      console.error('[SERVER] Erro ao desconectar Prisma:', error);
      process.exit(1);
    }
  });

  setTimeout(() => {
    console.error('[SERVER] Tempo esgotado. Forçando encerramento...');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
  console.error('[SERVER] Unhandled Rejection:', reason);
  gracefulShutdown('unhandledRejection');
});

process.on('uncaughtException', (error) => {
  console.error('[SERVER] Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

module.exports = app;
