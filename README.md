# AgendaCerta

![Status](https://img.shields.io/badge/status-em%20produção-success)
![License](https://img.shields.io/badge/license-MIT-blue)
![Node](https://img.shields.io/badge/node-%3E%3D18.0-brightgreen)
![React](https://img.shields.io/badge/react-18-blue)
![PostgreSQL](https://img.shields.io/badge/postgresql-14+-blue)

Sistema completo e profissional para **gestão de agendamentos e serviços**, oferecendo controle total sobre reservas, clientes, recursos, estoque, comandas e integração bidirecional com **Google Calendar**.

---

## 📋 Índice

- [Sobre o Projeto](#-sobre-o-projeto)
- [Funcionalidades](#-funcionalidades)
- [Tecnologias](#-tecnologias)
- [Instalação](#-instalação)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Variáveis de Ambiente](#-variáveis-de-ambiente)
- [Scripts Disponíveis](#-scripts-disponíveis)
- [API Endpoints](#-api-endpoints)
- [Integração com Google Calendar](#-integração-com-google-calendar)
- [Testes](#-testes)
- [Deploy em Produção](#-deploy-em-produção)
- [Segurança](#-segurança)
- [Contribuindo](#-contribuindo)
- [Licença](#-licença)

---

## 🎯 Sobre o Projeto

O **AgendaCerta** foi desenvolvido para resolver os principais desafios na administração de estabelecimentos que trabalham com agendamentos e serviços:

- ✅ Eliminar conflitos de agendamento
- ✅ Profissionalizar a gestão financeira
- ✅ Controlar estoque de produtos
- ✅ Gerenciar clientes e históricos
- ✅ Automatizar processos manuais
- ✅ Integrar com Google Calendar (sincronização bidirecional)
- ✅ Gerar insights para tomadas de decisão

O sistema foi construído pensando em **simplicidade**, **segurança** e **escalabilidade**, oferecendo uma interface moderna e funcionalidades robustas para administradores, funcionários e proprietários de estabelecimentos.

---

## ✨ Funcionalidades

### 👥 Sistema de Usuários e Permissões

- **Super Admin** (Desenvolvedores)
  - Aprovação/rejeição de novos estabelecimentos
  - Suspensão e reativação de contas
  - Painel administrativo completo
  - Estatísticas globais do sistema

- **Admin** (Donos de Estabelecimentos)
  - Gerenciamento completo do próprio estabelecimento
  - Cadastro de funcionários (Semi Admin)
  - Controle de permissões granulares
  - Acesso a todos os recursos

- **Semi Admin** (Funcionários)
  - Acesso limitado conforme permissões
  - Operações do dia a dia (reservas, comandas)
  - Visualização de dados do estabelecimento

### 📅 Sistema de Agendamento

- **Calendário Visual Inteligente**
  - Visualização por dia, semana ou mês
  - Interface drag-and-drop
  - Cores e status claros
  - Filtros avançados (recurso, data, cliente, status)

- **Tipos de Reserva**
  - **Avulsas**: Agendamentos únicos
  - **Recorrentes**: Mensalistas e contratos fixos
  - Validação automática de conflitos
  - Bloqueio de horários para manutenção

- **Recursos Avançados**
  - Edição e cancelamento de reservas
  - Histórico completo de alterações
  - Notificações automáticas
  - Gestão de horários de pico

### 🔄 Integração com Google Calendar

- **Sincronização Bidirecional**
  - Criar agendamento no AgendaCerta → Cria evento no Google Calendar
  - Atualizar agendamento no AgendaCerta → Atualiza evento no Google Calendar
  - Cancelar agendamento no AgendaCerta → Exclui evento no Google Calendar
  - Alterar evento no Google Calendar → Atualiza agendamento no AgendaCerta
  - Excluir evento no Google Calendar → Cancela agendamento no AgendaCerta

- **Recursos da Integração**
  - Autenticação OAuth 2.0 segura
  - Renovação automática de tokens
  - Retry logic com backoff exponencial
  - Tratamento robusto de erros
  - Webhooks para sincronização em tempo real
  - Health check da integração
  - Logs detalhados

### 🏢 Gerenciamento de Recursos

- Cadastro detalhado (nome, tipo, capacidade, preço/hora)
- Controle de status (Disponível, Ocupado, Manutenção)
- Upload de fotos e descrições
- Análise de rentabilidade por recurso
- Configuração de horários de funcionamento

### 👤 Gerenciamento de Clientes

- Cadastro completo com CPF, telefone e email
- Histórico detalhado de reservas
- Histórico de comandas e consumo
- Busca rápida e filtros
- Dados de fidelidade e frequência

### 📦 Controle de Estoque

- Cadastro de produtos com código de barras
- Controle de entrada e saída
- Alertas de estoque baixo
- Histórico de movimentações
- Relatórios de vendas

### 🧾 Sistema de Comandas

- Abertura de comandas vinculadas a reservas ou clientes
- Adição de produtos e serviços
- Cálculo automático de totais
- Fechamento e pagamento
- Histórico completo

### 📊 Dashboard e Relatórios

- **Métricas em Tempo Real**
  - Receita do dia/mês
  - Agendamentos ativos
  - Taxa de ocupação
  - Produtos mais vendidos

- **Gráficos Interativos**
  - Receita por período
  - Ocupação por recurso
  - Clientes mais frequentes
  - Produtos em estoque

### 🔒 Segurança

- Autenticação JWT
- Criptografia de senhas (bcrypt)
- Proteção contra SQL Injection
- Proteção contra XSS
- Rate limiting
- Validação de entrada
- Isolamento de dados por estabelecimento (multi-tenancy)

---

## 🛠️ Tecnologias

### **Backend**
- **Node.js** 18.x (LTS)
- **Express** 4.x - Framework web
- **Prisma** 5.x - ORM
- **PostgreSQL** 14+ - Banco de dados
- **JWT** - Autenticação
- **bcryptjs** - Criptografia de senhas
- **express-validator** - Validação de entrada
- **googleapis** - Integração com Google Calendar
- **Swagger** - Documentação da API
- **Jest** + **Supertest** - Testes automatizados

### **Frontend**
- **React** 18.x
- **React Router** 6.x - Roteamento
- **Axios** - Cliente HTTP
- **Lucide React** - Ícones
- **FullCalendar** - Calendário interativo
- **Recharts** - Gráficos
- **date-fns** - Manipulação de datas

### **DevOps**
- **PM2** - Gerenciador de processos
- **Nginx** - Servidor web e proxy reverso
- **Certbot** - Certificados SSL
- **Git** - Controle de versão

---

## 📦 Instalação

### **Pré-requisitos**

- Node.js 18.x ou superior
- PostgreSQL 14 ou superior
- npm ou yarn
- Git

### **Passo 1: Clonar o Repositório**

```bash
git clone https://github.com/pierreiost/AgendaCerta.git
cd AgendaCerta
```

### **Passo 2: Configurar o Backend**

```bash
cd backend

# Instalar dependências
npm install

# Copiar arquivo de exemplo de variáveis de ambiente
cp .env.example .env

# Editar o arquivo .env com suas configurações
nano .env
```

**Arquivo `.env` mínimo:**

```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/agendacerta"
JWT_SECRET="sua-chave-secreta-muito-longa-e-aleatoria"
PORT=5000
```

```bash
# Executar migrações do Prisma
npx prisma migrate dev

# (Opcional) Popular o banco com dados de exemplo
npm run prisma:seed

# Iniciar o servidor
npm run dev
```

O backend estará rodando em `http://localhost:5000`

### **Passo 3: Configurar o Frontend**

```bash
cd ../frontend

# Instalar dependências
npm install

# Copiar arquivo de exemplo de variáveis de ambiente
cp .env.example .env

# Editar o arquivo .env
nano .env
```

**Arquivo `.env`:**

```env
REACT_APP_API_URL=http://localhost:5000
```

```bash
# Iniciar o servidor de desenvolvimento
npm start
```

O frontend estará rodando em `http://localhost:3000`

### **Passo 4: Acessar o Sistema**

1. Abra o navegador em `http://localhost:3000`
2. Faça login com as credenciais padrão (se usou o seed):
   - **Email:** `admin@agendacerta.com`
   - **Senha:** `admin123`

---

## 📁 Estrutura do Projeto

```
AgendaCerta/
├── backend/
│   ├── __tests__/              # Testes automatizados
│   │   ├── integration/        # Testes de integração
│   │   └── helpers/            # Helpers para testes
│   ├── docs/                   # Documentação
│   │   └── GOOGLE_CALENDAR_SETUP.md
│   ├── middleware/             # Middlewares (auth, permissions)
│   ├── prisma/                 # Schema e migrações do Prisma
│   │   ├── schema.prisma       # Modelo de dados
│   │   ├── migrations/         # Migrações SQL
│   │   └── seed.js             # Dados de exemplo
│   ├── routes/                 # Rotas da API
│   │   ├── auth.js
│   │   ├── clients.js
│   │   ├── googleCalendar.js
│   │   ├── products.js
│   │   ├── reservations.js
│   │   ├── resources.js
│   │   ├── resourceTypes.js
│   │   ├── tabs.js
│   │   └── users.js
│   ├── services/               # Serviços (lógica de negócio)
│   │   └── googleCalendarService.js
│   ├── validators/             # Validadores de entrada
│   │   └── validators.js
│   ├── server.js               # Ponto de entrada
│   ├── package.json
│   └── .env                    # Variáveis de ambiente
│
├── frontend/
│   ├── public/                 # Arquivos públicos
│   │   ├── index.html
│   │   └── favicon.svg
│   ├── src/
│   │   ├── components/         # Componentes reutilizáveis
│   │   │   ├── GoogleCalendarIntegration.js
│   │   │   └── Header.js
│   │   ├── pages/              # Páginas da aplicação
│   │   │   ├── Clients.js
│   │   │   ├── Dashboard.js
│   │   │   ├── Login.js
│   │   │   ├── Products.js
│   │   │   ├── Profile.js
│   │   │   ├── Register.js
│   │   │   ├── Reservations.js
│   │   │   ├── Resources.js
│   │   │   ├── SuperAdminPanel.js
│   │   │   ├── TabDetails.js
│   │   │   ├── Tabs.js
│   │   │   └── Users.js
│   │   ├── services/           # Serviços de API
│   │   │   └── api.js
│   │   ├── utils/              # Utilitários
│   │   ├── App.js              # Componente principal
│   │   └── index.js            # Ponto de entrada
│   ├── package.json
│   └── .env                    # Variáveis de ambiente
│
├── PRODUCTION_DEPLOYMENT.md    # Guia de deploy em produção
├── README.md                   # Este arquivo
└── .gitignore
```

---

## 🔐 Variáveis de Ambiente

### **Backend (.env)**

```env
# Ambiente
NODE_ENV=development

# Porta do servidor
PORT=5000

# URLs
BACKEND_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3000

# Banco de Dados PostgreSQL
DATABASE_URL="postgresql://usuario:senha@localhost:5432/agendacerta"

# JWT
JWT_SECRET=sua-chave-secreta-muito-longa-e-aleatoria-aqui-min-32-chars
JWT_EXPIRES_IN=7d

# Google Calendar Integration (Opcional)
GOOGLE_CLIENT_ID=seu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-sua-client-secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/google-calendar/oauth2callback
GOOGLE_WEBHOOK_TOKEN=seu-token-webhook-secreto-aleatorio
```

### **Frontend (.env)**

```env
REACT_APP_API_URL=http://localhost:5000
```

---

## 📜 Scripts Disponíveis

### **Backend**

```bash
# Desenvolvimento
npm run dev              # Iniciar servidor em modo de desenvolvimento (nodemon)

# Produção
npm start                # Iniciar servidor em modo de produção

# Prisma
npm run prisma:generate  # Gerar cliente Prisma
npm run prisma:migrate   # Executar migrações
npm run prisma:seed      # Popular banco com dados de exemplo

# Testes
npm test                 # Executar todos os testes
npm run test:watch       # Executar testes em modo watch
npm run test:coverage    # Gerar relatório de cobertura
```

### **Frontend**

```bash
# Desenvolvimento
npm start                # Iniciar servidor de desenvolvimento

# Produção
npm run build            # Criar build de produção
npm test                 # Executar testes
```

---

## 🔌 API Endpoints

### **Autenticação**

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/auth/register` | Registrar novo usuário |
| POST | `/api/auth/login` | Fazer login |
| GET | `/api/auth/me` | Obter dados do usuário logado |

### **Clientes**

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/clients` | Listar clientes (com paginação) |
| GET | `/api/clients/:id` | Obter cliente específico |
| POST | `/api/clients` | Criar novo cliente |
| PUT | `/api/clients/:id` | Atualizar cliente |
| DELETE | `/api/clients/:id` | Excluir cliente |

### **Recursos**

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/resources` | Listar recursos |
| GET | `/api/resources/:id` | Obter recurso específico |
| POST | `/api/resources` | Criar novo recurso |
| PUT | `/api/resources/:id` | Atualizar recurso |
| DELETE | `/api/resources/:id` | Excluir recurso |

### **Agendamentos (Reservations)**

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/reservations` | Listar agendamentos (com paginação) |
| GET | `/api/reservations/:id` | Obter agendamento específico |
| POST | `/api/reservations` | Criar novo agendamento |
| PUT | `/api/reservations/:id` | Atualizar agendamento |
| DELETE | `/api/reservations/:id` | Cancelar agendamento |

### **Google Calendar**

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/google-calendar/auth` | Iniciar autenticação OAuth 2.0 |
| GET | `/api/google-calendar/oauth2callback` | Callback do Google |
| GET | `/api/google-calendar/status` | Verificar status da integração |
| GET | `/api/google-calendar/health` | Health check da integração |
| POST | `/api/google-calendar/watch` | Iniciar sincronização bidirecional |
| POST | `/api/google-calendar/webhook` | Receber notificações do Google |

**Documentação completa da API:** `http://localhost:5000/api-docs` (Swagger)

---

## 🔄 Integração com Google Calendar

O AgendaCerta possui integração bidirecional completa com o Google Calendar.

### **Configuração**

1. Siga o guia completo em [`backend/docs/GOOGLE_CALENDAR_SETUP.md`](backend/docs/GOOGLE_CALENDAR_SETUP.md)
2. Configure as credenciais do Google Cloud
3. Adicione as variáveis de ambiente no `.env`
4. Autentique no AgendaCerta (Perfil → Conectar Google Calendar)

### **Funcionalidades**

- ✅ Sincronização automática de agendamentos
- ✅ Retry logic com backoff exponencial
- ✅ Tratamento robusto de erros
- ✅ Renovação automática de tokens
- ✅ Webhooks para sincronização em tempo real
- ✅ Logs detalhados para debugging

### **Fluxo de Sincronização**

```
AgendaCerta                     Google Calendar
    |                                |
    |--- Criar Agendamento --------->|
    |<-- Evento Criado --------------|
    |                                |
    |--- Atualizar Agendamento ----->|
    |<-- Evento Atualizado ----------|
    |                                |
    |<-- Evento Alterado ------------|
    |--- Agendamento Atualizado -----|
    |                                |
    |--- Cancelar Agendamento ------>|
    |<-- Evento Excluído ------------|
```

---

## 🧪 Testes

O AgendaCerta possui **48 testes automatizados** cobrindo:

- ✅ Autenticação (12 testes)
- ✅ CRUD de Recursos (11 testes)
- ✅ CRUD de Agendamentos (11 testes)
- ✅ Segurança e Autorização (14 testes)

### **Executar Testes**

```bash
cd backend

# Executar todos os testes
npm test

# Executar testes em modo watch
npm run test:watch

# Gerar relatório de cobertura
npm run test:coverage
```

### **Configurar Banco de Dados de Teste**

Crie um arquivo `.env.test`:

```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/agendacerta_test"
JWT_SECRET="test-secret-key"
NODE_ENV="test"
```

---

## 🚀 Deploy em Produção

Para fazer o deploy em produção, siga o guia completo:

📚 **[PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md)**

O guia cobre:
- ✅ Configuração do servidor (Ubuntu, Node.js, Nginx, PM2)
- ✅ Setup do banco de dados PostgreSQL
- ✅ Deploy do backend e frontend
- ✅ Configuração do Google Cloud
- ✅ Variáveis de ambiente
- ✅ SSL/HTTPS com Certbot
- ✅ Monitoramento e logs
- ✅ Backup automático
- ✅ Checklist final

---

## 🔒 Segurança

### **Autenticação e Autorização**
- JWT com expiração configurável
- Senhas criptografadas com bcrypt (10 rounds)
- Permissões granulares por recurso
- Isolamento de dados por estabelecimento (multi-tenancy)

### **Proteção contra Ataques**
- SQL Injection (Prisma ORM)
- XSS (express-validator, xss-clean)
- Rate Limiting (express-rate-limit)
- Helmet (headers de segurança)
- HPP (HTTP Parameter Pollution)
- Mongo Sanitize (NoSQL Injection)

### **Boas Práticas**
- Variáveis de ambiente para dados sensíveis
- HTTPS obrigatório em produção
- Validação de entrada em todas as rotas
- Logs de auditoria
- Tokens de webhook para validação

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Para contribuir:

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Adicionar MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

### **Padrões de Código**

- Use ESLint para linting
- Siga o padrão de commits convencionais
- Adicione testes para novas funcionalidades
- Documente mudanças significativas

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

## 📞 Suporte

- **Email:** agendacerta@gmail.com
- **WhatsApp:** (53) 98125-9200
- **GitHub:** https://github.com/pierreiost/AgendaCerta

---

## 🙏 Agradecimentos

- Equipe do Prisma pela excelente ORM
- Google pela API do Calendar
- Comunidade open source

---

**Desenvolvido com ❤️ pela equipe AgendaCerta**

**Última atualização:** Dezembro de 2024
