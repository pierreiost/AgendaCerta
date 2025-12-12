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
  closeDatabase,
} = require('../helpers/testSetup');

describe('Resources Routes', () => {
  let testComplex;
  let testUser;
  let token;
  let resourceType;

  beforeAll(async () => {
    await cleanDatabase();
    testComplex = await createTestComplex();
    testUser = await createTestUser(testComplex.id, 'ADMIN');
    token = generateTestToken(testUser);
    resourceType = await createTestResourceType(testComplex.id);
  });

  afterAll(async () => {
    await cleanDatabase();
    await closeDatabase();
  });

  describe('GET /api/resources', () => {
    it('deve listar todos os recursos do complexo', async () => {
      // Criar alguns recursos de teste
      await createTestResource(testComplex.id, resourceType.id);
      await createTestResource(testComplex.id, resourceType.id);

      const response = await request(app)
        .get('/api/resources')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
    });

    it('deve retornar erro sem autenticação', async () => {
      const response = await request(app).get('/api/resources');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/resources/:id', () => {
    let testResource;

    beforeAll(async () => {
      testResource = await createTestResource(testComplex.id, resourceType.id);
    });

    it('deve retornar um recurso específico', async () => {
      const response = await request(app)
        .get(`/api/resources/${testResource.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', testResource.id);
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('resourceType');
    });

    it('deve retornar 404 para recurso inexistente', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/resources/${fakeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/resources', () => {
    it('deve criar um novo recurso com sucesso', async () => {
      const response = await request(app)
        .post('/api/resources')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Sala 2',
          resourceTypeId: resourceType.id,
          pricePerHour: 75.0,
          description: 'Sala de reunião para 15 pessoas',
          status: 'AVAILABLE',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name', 'Sala 2');
      expect(response.body).toHaveProperty('pricePerHour', 75.0);
    });

    it('deve retornar erro ao criar recurso sem campos obrigatórios', async () => {
      const response = await request(app)
        .post('/api/resources')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Sala Incompleta',
          // Faltando resourceTypeId e pricePerHour
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('deve retornar erro ao criar recurso com tipo de recurso inválido', async () => {
      const fakeTypeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .post('/api/resources')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Sala 3',
          resourceTypeId: fakeTypeId,
          pricePerHour: 50.0,
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/resources/:id', () => {
    let testResource;

    beforeEach(async () => {
      testResource = await createTestResource(testComplex.id, resourceType.id);
    });

    it('deve atualizar um recurso com sucesso', async () => {
      const response = await request(app)
        .put(`/api/resources/${testResource.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Sala Atualizada',
          pricePerHour: 100.0,
          description: 'Descrição atualizada',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('name', 'Sala Atualizada');
      expect(response.body).toHaveProperty('pricePerHour', 100.0);
    });

    it('deve retornar 404 ao tentar atualizar recurso inexistente', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .put(`/api/resources/${fakeId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Sala Inexistente',
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/resources/:id', () => {
    let testResource;

    beforeEach(async () => {
      testResource = await createTestResource(testComplex.id, resourceType.id);
    });

    it('deve excluir um recurso com sucesso', async () => {
      const response = await request(app)
        .delete(`/api/resources/${testResource.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');

      // Verificar se o recurso foi realmente excluído
      const checkResponse = await request(app)
        .get(`/api/resources/${testResource.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(checkResponse.status).toBe(404);
    });

    it('deve retornar 404 ao tentar excluir recurso inexistente', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .delete(`/api/resources/${fakeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });
});
