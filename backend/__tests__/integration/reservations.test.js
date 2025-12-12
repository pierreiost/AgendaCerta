const request = require('supertest');
const app = require('../../server');
const {
  prisma,
  cleanDatabase,
  createTestComplex,
  createTestUser,
  generateTestToken,
  createTestResourceType,
  createTestResource,
  createTestClient,
  closeDatabase,
} = require('../helpers/testSetup');

describe('Reservations Routes', () => {
  let testComplex;
  let testUser;
  let token;
  let resourceType;
  let testResource;
  let testClient;

  beforeAll(async () => {
    await cleanDatabase();
    testComplex = await createTestComplex();
    testUser = await createTestUser(testComplex.id, 'ADMIN');
    token = generateTestToken(testUser);
    resourceType = await createTestResourceType(testComplex.id);
    testResource = await createTestResource(testComplex.id, resourceType.id);
    testClient = await createTestClient(testComplex.id);
  });

  afterAll(async () => {
    await cleanDatabase();
    await closeDatabase();
  });

  describe('GET /api/reservations', () => {
    it('deve listar todos os agendamentos do complexo', async () => {
      // Criar alguns agendamentos de teste
      const startTime1 = new Date(Date.now() + 24 * 60 * 60 * 1000); // Amanhã
      const endTime1 = new Date(startTime1.getTime() + 2 * 60 * 60 * 1000); // +2 horas

      await prisma.reservation.create({
        data: {
          resourceId: testResource.id,
          clientId: testClient.id,
          startTime: startTime1,
          endTime: endTime1,
          status: 'CONFIRMED',
        },
      });

      const response = await request(app)
        .get('/api/reservations')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
    });

    it('deve retornar erro sem autenticação', async () => {
      const response = await request(app).get('/api/reservations');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/reservations', () => {
    it('deve criar um novo agendamento com sucesso', async () => {
      const startTime = new Date(Date.now() + 48 * 60 * 60 * 1000); // Daqui a 2 dias

      const response = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          resourceId: testResource.id,
          clientId: testClient.id,
          startTime: startTime.toISOString(),
          durationInHours: 2,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('resourceId', testResource.id);
      expect(response.body).toHaveProperty('clientId', testClient.id);
      expect(response.body).toHaveProperty('status', 'CONFIRMED');
    });

    it('deve retornar erro ao criar agendamento sem campos obrigatórios', async () => {
      const response = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          resourceId: testResource.id,
          // Faltando clientId, startTime, durationInHours
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('deve retornar erro ao criar agendamento com duração inválida', async () => {
      const startTime = new Date(Date.now() + 72 * 60 * 60 * 1000);

      const response = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          resourceId: testResource.id,
          clientId: testClient.id,
          startTime: startTime.toISOString(),
          durationInHours: 15, // Maior que 12 horas
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Duração inválida');
    });

    it('deve retornar erro ao criar agendamento com conflito de horário', async () => {
      const startTime = new Date(Date.now() + 96 * 60 * 60 * 1000); // Daqui a 4 dias

      // Criar primeiro agendamento
      await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          resourceId: testResource.id,
          clientId: testClient.id,
          startTime: startTime.toISOString(),
          durationInHours: 2,
        });

      // Tentar criar segundo agendamento no mesmo horário
      const response = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          resourceId: testResource.id,
          clientId: testClient.id,
          startTime: startTime.toISOString(),
          durationInHours: 2,
        });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('já está reservado');
    });

    it('deve retornar erro ao criar agendamento com recurso inexistente', async () => {
      const fakeResourceId = '00000000-0000-0000-0000-000000000000';
      const startTime = new Date(Date.now() + 120 * 60 * 60 * 1000);

      const response = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          resourceId: fakeResourceId,
          clientId: testClient.id,
          startTime: startTime.toISOString(),
          durationInHours: 2,
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Recurso não encontrado');
    });
  });

  describe('PUT /api/reservations/:id', () => {
    let testReservation;

    beforeEach(async () => {
      const startTime = new Date(Date.now() + 144 * 60 * 60 * 1000); // Daqui a 6 dias
      const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

      testReservation = await prisma.reservation.create({
        data: {
          resourceId: testResource.id,
          clientId: testClient.id,
          startTime,
          endTime,
          status: 'CONFIRMED',
        },
      });
    });

    it('deve atualizar um agendamento com sucesso', async () => {
      const newStartTime = new Date(Date.now() + 168 * 60 * 60 * 1000); // Daqui a 7 dias

      const response = await request(app)
        .put(`/api/reservations/${testReservation.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          startTime: newStartTime.toISOString(),
          durationInHours: 3,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', testReservation.id);
      expect(new Date(response.body.startTime).getTime()).toBeCloseTo(
        newStartTime.getTime(),
        -3
      );
    });

    it('deve retornar 404 ao tentar atualizar agendamento inexistente', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .put(`/api/reservations/${fakeId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          status: 'CANCELLED',
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/reservations/:id', () => {
    let testReservation;

    beforeEach(async () => {
      const startTime = new Date(Date.now() + 192 * 60 * 60 * 1000); // Daqui a 8 dias
      const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

      testReservation = await prisma.reservation.create({
        data: {
          resourceId: testResource.id,
          clientId: testClient.id,
          startTime,
          endTime,
          status: 'CONFIRMED',
        },
      });
    });

    it('deve cancelar um agendamento com sucesso', async () => {
      const response = await request(app)
        .delete(`/api/reservations/${testReservation.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('cancelada com sucesso');

      // Verificar se o agendamento foi realmente cancelado
      const cancelledReservation = await prisma.reservation.findUnique({
        where: { id: testReservation.id },
      });

      expect(cancelledReservation.status).toBe('CANCELLED');
    });

    it('deve retornar 404 ao tentar cancelar agendamento inexistente', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .delete(`/api/reservations/${fakeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });
});
