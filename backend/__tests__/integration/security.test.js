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

describe('Security Tests', () => {
  let testComplex;
  let adminUser;
  let regularUser;
  let adminToken;
  let regularToken;
  let resourceType;
  let testResource;

  beforeAll(async () => {
    await cleanDatabase();
    testComplex = await createTestComplex();
    adminUser = await createTestUser(testComplex.id, 'ADMIN');
    regularUser = await createTestUser(testComplex.id, 'USER');
    adminToken = generateTestToken(adminUser);
    regularToken = generateTestToken(regularUser);
    resourceType = await createTestResourceType(testComplex.id);
    testResource = await createTestResource(testComplex.id, resourceType.id);
  });

  afterAll(async () => {
    await cleanDatabase();
    await closeDatabase();
  });

  describe('Autorização baseada em Permissões', () => {
    it('deve permitir que ADMIN acesse rotas protegidas', async () => {
      const response = await request(app)
        .get('/api/resources')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });

    it('deve bloquear USER sem permissão de criar recursos', async () => {
      const response = await request(app)
        .post('/api/resources')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          name: 'Sala Não Autorizada',
          resourceTypeId: resourceType.id,
          pricePerHour: 50.0,
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });

    it('deve bloquear USER sem permissão de deletar recursos', async () => {
      const response = await request(app)
        .delete(`/api/resources/${testResource.id}`)
        .set('Authorization', `Bearer ${regularToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Validação de Entrada', () => {
    it('deve rejeitar email inválido no registro', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          fullName: 'Teste Validação',
          email: 'emailinvalido',
          password: 'senha123',
          phone: '11999999999',
          complexName: 'Complexo Teste',
          address: 'Rua Teste',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('deve rejeitar senha muito curta no registro', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          fullName: 'Teste Validação',
          email: `teste${Date.now()}@teste.com`,
          password: '123',
          phone: '11999999999',
          complexName: 'Complexo Teste',
          address: 'Rua Teste',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('deve rejeitar preço negativo ao criar recurso', async () => {
      const response = await request(app)
        .post('/api/resources')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Sala Preço Negativo',
          resourceTypeId: resourceType.id,
          pricePerHour: -50.0,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Proteção contra Injeção', () => {
    it('deve sanitizar entrada com caracteres especiais', async () => {
      const response = await request(app)
        .post('/api/resources')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: '<script>alert("XSS")</script>',
          resourceTypeId: resourceType.id,
          pricePerHour: 50.0,
        });

      // Deve criar o recurso, mas sanitizar o nome
      if (response.status === 201) {
        expect(response.body.name).not.toContain('<script>');
      }
    });

    it('deve rejeitar tentativa de SQL injection', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: "admin' OR '1'='1",
          password: "password' OR '1'='1",
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Proteção de Token JWT', () => {
    it('deve rejeitar token expirado', async () => {
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(
        {
          id: adminUser.id,
          email: adminUser.email,
          role: adminUser.role,
          complexId: adminUser.complexId,
        },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '-1h' } // Token expirado há 1 hora
      );

      const response = await request(app)
        .get('/api/resources')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('deve rejeitar token com assinatura inválida', async () => {
      const jwt = require('jsonwebtoken');
      const invalidToken = jwt.sign(
        {
          id: adminUser.id,
          email: adminUser.email,
          role: adminUser.role,
          complexId: adminUser.complexId,
        },
        'wrong-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/resources')
        .set('Authorization', `Bearer ${invalidToken}`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('deve rejeitar token malformado', async () => {
      const response = await request(app)
        .get('/api/resources')
        .set('Authorization', 'Bearer tokenmalformado123');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Isolamento de Dados entre Complexos', () => {
    let otherComplex;
    let otherUser;
    let otherToken;
    let otherResourceType;
    let otherResource;

    beforeAll(async () => {
      // Criar um segundo complexo
      otherComplex = await prisma.complex.create({
        data: {
          name: 'Outro Complexo',
          address: 'Outra Rua, 456',
          phone: '11988888888',
        },
      });

      otherUser = await createTestUser(otherComplex.id, 'ADMIN');
      otherToken = generateTestToken(otherUser);

      otherResourceType = await prisma.resourceType.create({
        data: {
          name: 'Outro Tipo',
          isDefault: false,
          complexId: otherComplex.id,
        },
      });

      otherResource = await prisma.resource.create({
        data: {
          name: 'Outro Recurso',
          resourceTypeId: otherResourceType.id,
          pricePerHour: 75.0,
          status: 'AVAILABLE',
          complexId: otherComplex.id,
        },
      });
    });

    it('não deve permitir acesso a recursos de outro complexo', async () => {
      const response = await request(app)
        .get(`/api/resources/${otherResource.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('não deve permitir atualização de recursos de outro complexo', async () => {
      const response = await request(app)
        .put(`/api/resources/${otherResource.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Tentativa de Atualização',
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('não deve permitir exclusão de recursos de outro complexo', async () => {
      const response = await request(app)
        .delete(`/api/resources/${otherResource.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });
});
