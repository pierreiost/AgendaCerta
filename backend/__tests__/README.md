# Testes Automatizados - AgendaCerta Backend

Este diretório contém os testes automatizados para o backend do AgendaCerta.

## Estrutura

```
__tests__/
├── integration/          # Testes de integração (rotas, API)
│   ├── auth.test.js      # Testes de autenticação (login, registro)
│   ├── resources.test.js # Testes de CRUD de recursos
│   ├── reservations.test.js # Testes de CRUD de agendamentos
│   └── security.test.js  # Testes de segurança (autorização, validação)
├── unit/                 # Testes unitários (funções isoladas)
├── helpers/              # Utilitários e helpers para testes
│   └── testSetup.js      # Configuração e funções auxiliares
└── README.md             # Este arquivo
```

## Pré-requisitos

1. **Banco de Dados de Teste**: Configure um banco de dados PostgreSQL separado para testes.
2. **Variáveis de Ambiente**: Crie um arquivo `.env.test` no diretório `backend/` com as configurações de teste:

```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/agendacerta_test"
JWT_SECRET="test-secret-key"
NODE_ENV="test"
```

## Executar os Testes

### Todos os testes
```bash
npm test
```

### Testes em modo watch (desenvolvimento)
```bash
npm run test:watch
```

### Testes com cobertura de código
```bash
npm run test:coverage
```

### Executar um arquivo de teste específico
```bash
npm test -- auth.test.js
```

## Cobertura de Testes

Os testes cobrem:

### 1. **Autenticação (auth.test.js)**
- ✅ Registro de novos usuários
- ✅ Login com credenciais válidas
- ✅ Validação de email e senha
- ✅ Proteção de rotas autenticadas
- ✅ Verificação de token JWT

### 2. **Recursos (resources.test.js)**
- ✅ Listagem de recursos
- ✅ Criação de novos recursos
- ✅ Atualização de recursos existentes
- ✅ Exclusão de recursos
- ✅ Validação de campos obrigatórios

### 3. **Agendamentos (reservations.test.js)**
- ✅ Listagem de agendamentos
- ✅ Criação de novos agendamentos
- ✅ Validação de duração
- ✅ Detecção de conflitos de horário
- ✅ Atualização de agendamentos
- ✅ Cancelamento de agendamentos

### 4. **Segurança (security.test.js)**
- ✅ Autorização baseada em permissões (ADMIN vs USER)
- ✅ Validação de entrada (email, senha, preços)
- ✅ Proteção contra injeção (SQL, XSS)
- ✅ Proteção de token JWT (expiração, assinatura)
- ✅ Isolamento de dados entre complexos

## Boas Práticas

1. **Isolamento**: Cada teste é independente e não depende de outros testes.
2. **Limpeza**: O banco de dados é limpo antes de cada suite de testes.
3. **Dados de Teste**: Use os helpers em `testSetup.js` para criar dados de teste consistentes.
4. **Asserts Claros**: Use expects descritivos para facilitar a identificação de falhas.

## Adicionar Novos Testes

1. Crie um novo arquivo em `__tests__/integration/` ou `__tests__/unit/`
2. Importe os helpers necessários de `testSetup.js`
3. Siga o padrão de estrutura dos testes existentes
4. Execute os testes para verificar se passam

## Troubleshooting

### Erro: "Can't reach database server"
- Verifique se o banco de dados de teste está rodando
- Confirme a `DATABASE_URL` no `.env.test`

### Erro: "Port already in use"
- Certifique-se de que o servidor não está rodando em outro terminal
- Use `--detectOpenHandles` para identificar conexões abertas

### Testes falhando aleatoriamente
- Verifique se o banco de dados está sendo limpo corretamente
- Confirme que os testes não têm dependências entre si

## Contribuindo

Ao adicionar novas funcionalidades ao backend, sempre adicione testes correspondentes para garantir a qualidade e a segurança do código.
