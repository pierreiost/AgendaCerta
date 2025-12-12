const request = require('supertest');
const app = require('../../server');
const {
  prisma,
  cleanDatabase,
  createTestComplex,
  createTestUser,
  closeDatabase,
} = require('../helpers/testSetup');

describe('Auth Routes', () => {
  let testComplex;

  beforeAll(async () => {
    await cleanDatabase();
    testComplex = await createTestComplex();
  });

  afterAll(async () => {
    await cleanDatabase();
    await closeDatabase();
  });

  describe('POST /api/auth/register', () => {
    it('deve registrar um novo usuário com sucesso', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          fullName: 'Novo Usuário',
          email: `novo${Date.now()}@teste.com`,
          password: 'senha123',
          phone: '11999999999',
          complexName: 'Novo Complexo',
          address: 'Rua Nova, 456',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email');
      expect(response.body.user.role).toBe('SUPER_ADMIN');
    });

    it('deve retornar erro ao tentar registrar com email duplicado', async () => {
      const email = `duplicado${Date.now()}@teste.com`;

      // Primeiro registro
      await request(app)
        .post('/api/auth/register')
        .send({
          fullName: 'Usuário 1',
          email,
          password: 'senha123',
          phone: '11999999999',
          complexName: 'Complexo 1',
          address: 'Rua 1',
        });

      // Segundo registro com mesmo email
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          fullName: 'Usuário 2',
          email,
          password: 'senha456',
          phone: '11988888888',
          complexName: 'Complexo 2',
          address: 'Rua 2',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('deve retornar erro ao tentar registrar sem campos obrigatórios', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          fullName: 'Usuário Incompleto',
          // Faltando email, password, etc.
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/login', () => {
    let testUser;

    beforeAll(async () => {
      testUser = await createTestUser(testComplex.id);
    });

    it('deve fazer login com sucesso com credenciais válidas', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'senha123',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testUser.email);
    });

    it('deve retornar erro com email inválido', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'emailinvalido@teste.com',
          password: 'senha123',
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('deve retornar erro com senha inválida', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'senhaerrada',
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('deve retornar erro sem email ou senha', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/auth/me', () => {
    let testUser;
    let token;

    beforeAll(async () => {
      testUser = await createTestUser(testComplex.id);
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'senha123',
        });
      token = loginResponse.body.token;
    });

    it('deve retornar os dados do usuário autenticado', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', testUser.id);
      expect(response.body).toHaveProperty('email', testUser.email);
      expect(response.body).not.toHaveProperty('password');
    });

    it('deve retornar erro sem token de autenticação', async () => {
      const response = await request(app).get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('deve retornar erro com token inválido', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer tokeninvalido');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });
});
