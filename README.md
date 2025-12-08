# 🏐 QuadraCerta - Sistema de Gerenciamento de Complexos Esportivos

![Status](https://img.shields.io/badge/status-em%20produção-success)
![License](https://img.shields.io/badge/license-MIT-blue)
![Node](https://img.shields.io/badge/node-%3E%3D16.13-brightgreen)
![React](https://img.shields.io/badge/react-18-blue)

Sistema completo e profissional para gestão de complexos esportivos, oferecendo controle total sobre agendamentos, clientes, estoque, comandas e muito mais.

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
- [Modelo de Dados](#-modelo-de-dados)
- [Deploy](#-deploy)
- [Segurança](#-segurança)
- [Contribuindo](#-contribuindo)
- [Licença](#-licença)

---

## 🎯 Sobre o Projeto

O **QuadraCerta** foi desenvolvido para resolver os principais desafios na administração de complexos esportivos:

- ✅ Eliminar conflitos de agendamento
- ✅ Profissionalizar a gestão financeira
- ✅ Controlar estoque de produtos
- ✅ Gerenciar clientes e históricos
- ✅ Automatizar processos manuais
- ✅ Gerar insights para tomadas de decisão

O sistema foi construído pensando em **simplicidade**, **segurança** e **escalabilidade**, oferecendo uma interface moderna inspirada no Google e funcionalidades robustas para administradores, funcionários e proprietários de complexos.

---

## ✨ Funcionalidades

### 👥 Sistema de Usuários e Permissões

- **Super Admin** (Desenvolvedores)
  - Aprovação/rejeição de novos complexos
  - Suspensão e reativação de contas
  - Painel administrativo completo
  - Estatísticas globais do sistema

- **Admin** (Donos de Complexos)
  - Gerenciamento completo do próprio complexo
  - Cadastro de funcionários (Semi Admin)
  - Controle de permissões granulares
  - Acesso a todos os recursos

- **Semi Admin** (Funcionários)
  - Acesso limitado conforme permissões
  - Operações do dia a dia (reservas, comandas)
  - Visualização de dados do complexo

### 📅 Sistema de Agendamento

- **Calendário Visual Inteligente**
  - Visualização por dia, semana ou mês
  - Interface drag-and-drop
  - Cores e status claros
  - Filtros avançados (quadra, data, cliente, status)

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

### 🏟️ Gerenciamento de Quadras

- Cadastro detalhado (nome, esporte, capacidade, preço/hora)
- Controle de status (Disponível, Ocupada, Manutenção)
- Upload de fotos e descrições
- Análise de rentabilidade por quadra
- Configuração de horários de funcionamento

### 👤 Gerenciamento de Clientes

- Cadastro completo com CPF, telefone e email
- Histórico detalhado de reservas
- Histórico de comandas e consumo
- Busca rápida e filtros
- Dados de fidelidade e frequência

### 📦 Controle de Estoque

- Cadastro de produtos (nome, preço, estoque, validade)
- Movimentação de entrada e saída
- Alertas automáticos de estoque baixo
- Atualização automática ao fechar comandas
- Relatórios de produtos mais vendidos

### 🧾 Sistema de Comandas (Tabs)

- Abertura vinculada a cliente ou reserva
- Adição/remoção de produtos em tempo real
- Cálculo automático de totais
- Fechamento com atualização de estoque
- Histórico completo de comandas
- Controle de comandas abertas/fechadas/canceladas

### 📊 Dashboard e Relatórios

- Visão geral do complexo
- Receita por período
- Taxa de ocupação das quadras
- Produtos mais vendidos
- Clientes mais frequentes
- Próximos agendamentos
- Métricas de performance

### 🔔 Sistema de Notificações

- Notificações em tempo real
- Alertas de reservas próximas
- Avisos de estoque baixo
- Notificações de novas aprovações (Super Admin)

---

## 🚀 Tecnologias

### Backend

- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **Prisma ORM** - ORM type-safe
- **PostgreSQL** - Banco de dados (produção)
- **SQLite** - Banco de dados (desenvolvimento)
- **JWT** - Autenticação segura
- **bcryptjs** - Hash de senhas
- **helmet** - Segurança HTTP
- **express-validator** - Validação de dados
- **express-rate-limit** - Proteção contra ataques
- **cors** - Controle de origem cruzada

### Frontend

- **React 18** - Biblioteca UI
- **React Router v6** - Roteamento
- **Context API** - Gerenciamento de estado
- **Axios** - Cliente HTTP
- **date-fns** - Manipulação de datas
- **Lucide React** - Ícones modernos
- **CSS Modules** - Estilização modular

### DevOps e Deploy

- **Vercel** - Hospedagem frontend
- **Railway** - Hospedagem backend
- **Git** - Controle de versão
- **npm** - Gerenciador de pacotes

---

## 📦 Instalação

### Pré-requisitos

- Node.js 16.13 ou superior
- npm ou yarn
- Git

### Passo a Passo

#### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/quadracerta.git
cd quadracerta
```

#### 2. Instale as dependências

**Opção 1: Comando integrado**
```bash
npm run install-all
```

**Opção 2: Manual**
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

#### 3. Configure as variáveis de ambiente

Crie um arquivo `.env` no diretório `backend/`:

```env
# Banco de Dados
DATABASE_URL="file:./dev.db"  # SQLite para desenvolvimento
# DATABASE_URL="postgresql://user:password@localhost:5432/quadracerta"  # PostgreSQL para produção

# Autenticação
JWT_SECRET="sua_chave_secreta_super_segura_aqui"

# Servidor
PORT=5000
NODE_ENV=development

# Frontend (opcional)
FRONTEND_URL="http://localhost:3000"
```

#### 4. Configure o banco de dados

```bash
cd backend

# Gera o Prisma Client
npx prisma generate

# Executa as migrações
npx prisma migrate dev --name init

# (Opcional) Popula com dados de exemplo
npx prisma db seed
```

#### 5. Inicie os servidores

**Opção 1: Terminais separados**

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm start
```

**Opção 2: Comando integrado**

```bash
npm run dev
```

#### 6. Acesse o sistema

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend API: [http://localhost:5000](http://localhost:5000)

---

## 📁 Estrutura do Projeto

```
quadracerta/
│
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma           # Schema do banco de dados
│   │   └── migrations/             # Migrações do banco
│   │
│   ├── routes/                     # Rotas da API
│   │   ├── auth.js                 # Autenticação (login, register)
│   │   ├── admin.js                # Painel Super Admin
│   │   ├── users.js                # Gerenciamento de usuários
│   │   ├── courts.js               # Gerenciamento de quadras
│   │   ├── courtTypes.js           # Tipos de quadras/esportes
│   │   ├── clients.js              # Gerenciamento de clientes
│   │   ├── reservations.js         # Sistema de reservas
│   │   ├── products.js             # Controle de estoque
│   │   ├── tabs.js                 # Sistema de comandas
│   │   ├── dashboard.js            # Estatísticas e métricas
│   │   ├── notifications.js        # Notificações em tempo real
│   │   └── permissions.js          # Sistema de permissões
│   │
│   ├── middleware/
│   │   └── auth.js                 # Middleware de autenticação e permissões
│   │
│   ├── server.js                   # Servidor principal Express
│   ├── package.json                # Dependências do backend
│   └── .env                        # Variáveis de ambiente (não commitado)
│
├── frontend/
│   ├── public/
│   │   ├── index.html              # HTML principal
│   │   └── assets/                 # Imagens, ícones, etc.
│   │
│   ├── src/
│   │   ├── components/             # Componentes reutilizáveis
│   │   │   ├── Header.js           # Cabeçalho da aplicação
│   │   │   ├── Sidebar.js          # Menu lateral
│   │   │   ├── Calendar.js         # Componente de calendário
│   │   │   ├── MaskedInput.js      # Inputs com máscara
│   │   │   ├── RoleRoute.js        # Proteção de rotas por role
│   │   │   └── ...
│   │   │
│   │   ├── contexts/               # Contexts do React
│   │   │   └── AuthContext.js      # Contexto de autenticação
│   │   │
│   │   ├── pages/                  # Páginas da aplicação
│   │   │   ├── Login.js            # Tela de login
│   │   │   ├── Register.js         # Tela de registro
│   │   │   ├── Dashboard.js        # Dashboard principal
│   │   │   ├── Users.js            # Gerenciamento de funcionários
│   │   │   ├── Courts.js           # Gerenciamento de quadras
│   │   │   ├── Clients.js          # Gerenciamento de clientes
│   │   │   ├── Reservations.js     # Sistema de reservas
│   │   │   ├── Products.js         # Controle de estoque
│   │   │   ├── Tabs.js             # Comandas
│   │   │   ├── TabDetails.js       # Detalhes da comanda
│   │   │   ├── Profile.js          # Perfil do usuário
│   │   │   ├── Notifications.js    # Central de notificações
│   │   │   └── SuperAdminPanel.js  # Painel Super Admin
│   │   │
│   │   ├── services/               # Serviços de API
│   │   │   └── api.js              # Configuração do Axios
│   │   │
│   │   ├── styles/                 # Arquivos de estilo
│   │   │   └── App.css             # Estilos globais
│   │   │
│   │   ├── App.js                  # Componente raiz + rotas
│   │   └── index.js                # Entry point React
│   │
│   └── package.json                # Dependências do frontend
│
├── README.md                       # Este arquivo
├── package.json                    # Scripts globais
└── .gitignore                      # Arquivos ignorados pelo Git
```

---

## 🔐 Variáveis de Ambiente

### Backend (.env)

```env
# Banco de Dados
DATABASE_URL="file:./dev.db"                    # Desenvolvimento
# DATABASE_URL="postgresql://..."              # Produção

# Segurança
JWT_SECRET="sua_chave_super_segura_256_bits"   # Mínimo 32 caracteres

# Servidor
PORT=5000
NODE_ENV=development                            # development | production

# CORS (opcional)
FRONTEND_URL="http://localhost:3000"            # URL do frontend
```

### Frontend

O frontend usa a URL do backend configurada em `src/services/api.js`:

```javascript
// Desenvolvimento
const API_URL = 'http://localhost:5000';

// Produção
const API_URL = 'https://seu-backend.railway.app';
```

---

## 🛠️ Scripts Disponíveis

### Raiz do Projeto

```bash
npm run install-all    # Instala dependências do backend e frontend
npm run dev            # Inicia backend e frontend simultaneamente
```

### Backend

```bash
npm run dev            # Inicia servidor em modo desenvolvimento (nodemon)
npm start              # Inicia servidor em produção
npx prisma studio      # Abre interface visual do banco de dados
npx prisma migrate dev # Cria nova migração do banco
npx prisma generate    # Gera o Prisma Client
```

### Frontend

```bash
npm start              # Inicia aplicação React (development)
npm run build          # Build para produção
npm test               # Executa testes
```

---

## 🔌 API Endpoints

### Autenticação

| Método | Endpoint | Descrição | Autenticação |
|--------|----------|-----------|--------------|
| POST | `/api/auth/register` | Registrar novo complexo | Não |
| POST | `/api/auth/login` | Login no sistema | Não |
| GET | `/api/auth/me` | Obter dados do usuário logado | Sim |

### Usuários

| Método | Endpoint | Descrição | Permissão |
|--------|----------|-----------|-----------|
| GET | `/api/users` | Listar funcionários | users:view |
| POST | `/api/users` | Criar funcionário | users:create |
| GET | `/api/users/:id` | Buscar funcionário | users:view |
| PUT | `/api/users/:id` | Atualizar funcionário | users:edit |
| DELETE | `/api/users/:id` | Deletar funcionário | users:delete |
| PUT | `/api/users/:id/permissions` | Atualizar permissões | users:edit |

### Quadras

| Método | Endpoint | Descrição | Permissão |
|--------|----------|-----------|-----------|
| GET | `/api/courts` | Listar quadras | courts:view |
| POST | `/api/courts` | Criar quadra | courts:create |
| GET | `/api/courts/:id` | Buscar quadra | courts:view |
| PUT | `/api/courts/:id` | Atualizar quadra | courts:edit |
| DELETE | `/api/courts/:id` | Deletar quadra | courts:delete |

### Clientes

| Método | Endpoint | Descrição | Permissão |
|--------|----------|-----------|-----------|
| GET | `/api/clients` | Listar clientes | clients:view |
| POST | `/api/clients` | Criar cliente | clients:create |
| GET | `/api/clients/:id` | Buscar cliente (com histórico) | clients:view |
| PUT | `/api/clients/:id` | Atualizar cliente | clients:edit |
| DELETE | `/api/clients/:id` | Deletar cliente | clients:delete |

### Reservas

| Método | Endpoint | Descrição | Permissão |
|--------|----------|-----------|-----------|
| GET | `/api/reservations` | Listar reservas (com filtros) | reservations:view |
| POST | `/api/reservations` | Criar reserva | reservations:create |
| GET | `/api/reservations/:id` | Buscar reserva | reservations:view |
| PUT | `/api/reservations/:id` | Atualizar reserva | reservations:edit |
| DELETE | `/api/reservations/:id` | Cancelar reserva | reservations:cancel |

**Parâmetros de Query para Listagem:**
- `courtId` - Filtrar por quadra
- `clientId` - Filtrar por cliente
- `startDate` - Filtrar por data inicial
- `endDate` - Filtrar por data final
- `status` - Filtrar por status (ACTIVE, CANCELLED)

### Produtos (Estoque)

| Método | Endpoint | Descrição | Permissão |
|--------|----------|-----------|-----------|
| GET | `/api/products` | Listar produtos | products:view |
| POST | `/api/products` | Criar produto | products:create |
| GET | `/api/products/:id` | Buscar produto | products:view |
| PUT | `/api/products/:id` | Atualizar produto | products:edit |
| POST | `/api/products/:id/stock/add` | Adicionar estoque | products:edit |
| POST | `/api/products/:id/stock/remove` | Remover estoque | products:edit |
| DELETE | `/api/products/:id` | Deletar produto | products:delete |

### Comandas

| Método | Endpoint | Descrição | Permissão |
|--------|----------|-----------|-----------|
| GET | `/api/tabs` | Listar comandas | tabs:view |
| POST | `/api/tabs` | Criar comanda | tabs:create |
| GET | `/api/tabs/:id` | Buscar comanda | tabs:view |
| POST | `/api/tabs/:id/items` | Adicionar item | tabs:edit |
| DELETE | `/api/tabs/:id/items/:itemId` | Remover item | tabs:edit |
| POST | `/api/tabs/:id/close` | Fechar comanda | tabs:close |
| DELETE | `/api/tabs/:id` | Cancelar comanda | tabs:cancel |

### Dashboard

| Método | Endpoint | Descrição | Permissão |
|--------|----------|-----------|-----------|
| GET | `/api/dashboard/overview` | Estatísticas gerais | Autenticado |
| GET | `/api/dashboard/upcoming` | Próximos horários | Autenticado |
| GET | `/api/dashboard/revenue` | Relatório de receitas | Autenticado |
| GET | `/api/dashboard/occupancy` | Taxa de ocupação | Autenticado |

### Super Admin

| Método | Endpoint | Descrição | Permissão |
|--------|----------|-----------|-----------|
| GET | `/api/admin/pending` | Listar complexos pendentes | SUPER_ADMIN |
| PUT | `/api/admin/:id/approve` | Aprovar complexo | SUPER_ADMIN |
| PUT | `/api/admin/:id/reject` | Rejeitar complexo | SUPER_ADMIN |
| PUT | `/api/admin/:id/suspend` | Suspender complexo | SUPER_ADMIN |
| PUT | `/api/admin/:id/reactivate` | Reativar complexo | SUPER_ADMIN |
| GET | `/api/admin/stats` | Estatísticas gerais | SUPER_ADMIN |

### Notificações

| Método | Endpoint | Descrição | Permissão |
|--------|----------|-----------|-----------|
| GET | `/api/notifications` | Listar notificações | Autenticado |
| PUT | `/api/notifications/:id/read` | Marcar como lida | Autenticado |

---

## 📊 Modelo de Dados

### User (Usuário)
```prisma
model User {
  id          String   @id @default(cuid())
  firstName   String
  lastName    String
  email       String   @unique
  password    String
  cpf         String?
  cnpj        String?
  phone       String?
  role        Role     @default(SEMI_ADMIN)
  status      UserStatus @default(PENDING)
  complexId   String?
  complex     Complex? @relation(fields: [complexId])
  permissions String?  // JSON com permissões
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

enum Role {
  SUPER_ADMIN
  ADMIN
  SEMI_ADMIN
}

enum UserStatus {
  PENDING
  ACTIVE
  REJECTED
  SUSPENDED
}
```

### Complex (Complexo Esportivo)
```prisma
model Complex {
  id      String  @id @default(cuid())
  name    String
  cnpj    String  @unique
  users   User[]
  courts  Court[]
  clients Client[]
  products Product[]
}
```

### Court (Quadra)
```prisma
model Court {
  id           String    @id @default(cuid())
  name         String
  sportType    String    // futebol, beach tennis, vôlei, etc.
  capacity     Int
  pricePerHour Float
  description  String?
  status       CourtStatus @default(AVAILABLE)
  complexId    String
  complex      Complex   @relation(fields: [complexId])
  reservations Reservation[]
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}

enum CourtStatus {
  AVAILABLE
  OCCUPIED
  MAINTENANCE
}
```

### Client (Cliente)
```prisma
model Client {
  id           String        @id @default(cuid())
  fullName     String
  phone        String
  email        String?
  cpf          String?
  complexId    String
  complex      Complex       @relation(fields: [complexId])
  reservations Reservation[]
  tabs         Tab[]
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
}
```

### Reservation (Reserva)
```prisma
model Reservation {
  id               String          @id @default(cuid())
  courtId          String
  court            Court           @relation(fields: [courtId])
  clientId         String
  client           Client          @relation(fields: [clientId])
  startTime        DateTime
  endTime          DateTime
  status           ReservationStatus @default(ACTIVE)
  isRecurring      Boolean         @default(false)
  recurringGroupId String?
  recurringGroup   RecurringGroup? @relation(fields: [recurringGroupId])
  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt
}

enum ReservationStatus {
  ACTIVE
  CANCELLED
}
```

### RecurringGroup (Grupo de Recorrência)
```prisma
model RecurringGroup {
  id           String        @id @default(cuid())
  frequency    String        // WEEKLY, BIWEEKLY, MONTHLY
  dayOfWeek    Int           // 0-6 (Domingo-Sábado)
  startDate    DateTime
  endDate      DateTime?
  reservations Reservation[]
}
```

### Product (Produto)
```prisma
model Product {
  id         String   @id @default(cuid())
  name       String
  description String?
  price      Float
  stock      Int      @default(0)
  unit       String   // un, kg, litro, etc.
  expiryDate DateTime?
  complexId  String
  complex    Complex  @relation(fields: [complexId])
  tabItems   TabItem[]
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}
```

### Tab (Comanda)
```prisma
model Tab {
  id            String   @id @default(cuid())
  clientId      String
  client        Client   @relation(fields: [clientId])
  reservationId String?
  total         Float    @default(0)
  status        TabStatus @default(OPEN)
  items         TabItem[]
  paidAt        DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

enum TabStatus {
  OPEN
  CLOSED
  CANCELLED
}
```

### TabItem (Item da Comanda)
```prisma
model TabItem {
  id          String  @id @default(cuid())
  tabId       String
  tab         Tab     @relation(fields: [tabId])
  productId   String?
  product     Product? @relation(fields: [productId])
  description String
  quantity    Float
  unitPrice   Float
  total       Float
}
```

---

## 🚀 Deploy

### Backend (Railway)

1. **Crie uma conta no Railway**
2. **Crie um novo projeto**
3. **Conecte seu repositório GitHub**
4. **Configure as variáveis de ambiente:**
   ```env
   DATABASE_URL=postgresql://...
   JWT_SECRET=sua_chave_secreta
   NODE_ENV=production
   FRONTEND_URL=https://seu-frontend.vercel.app
   ```
5. **Railway detecta automaticamente o Node.js e faz deploy**

### Frontend (Vercel)

1. **Crie uma conta no Vercel**
2. **Importe seu repositório**
3. **Configure:**
   - Build Command: `npm run build`
   - Output Directory: `build`
   - Root Directory: `frontend`
4. **Configure a variável de ambiente:**
   ```
   REACT_APP_API_URL=https://seu-backend.railway.app
   ```
5. **Deploy automático a cada push**

### Banco de Dados PostgreSQL

**Opção 1: Railway**
- Adicione PostgreSQL no seu projeto Railway
- Copie a DATABASE_URL gerada

**Opção 2: Supabase**
- Crie um projeto no Supabase
- Copie a connection string

**Opção 3: Neon**
- Crie um banco serverless no Neon
- Copie a connection string

---

## 🛡️ Segurança

### Medidas Implementadas

✅ **Autenticação JWT**
- Tokens seguros com expiração
- Refresh tokens (opcional)

✅ **Hash de Senhas**
- bcryptjs com salt rounds

✅ **Rate Limiting**
- Proteção contra força bruta
- Limite de requisições por IP

✅ **Validação de Dados**
- express-validator em todas as rotas
- Sanitização de inputs

✅ **Headers de Segurança**
- helmet.js configurado
- CSP, HSTS, etc.

✅ **CORS Configurado**
- Apenas origens permitidas

✅ **Proteção XSS**
- xss-clean middleware

✅ **SQL Injection Protection**
- Prisma ORM com queries parametrizadas

✅ **Permissões Granulares**
- Sistema de roles e permissões por módulo

### Boas Práticas

- ✅ Nunca commitar arquivos `.env`
- ✅ Usar HTTPS em produção
- ✅ Manter dependências atualizadas
- ✅ Logs de segurança
- ✅ Backups regulares do banco

---

## 🤝 Contribuindo

Contribuições são muito bem-vindas! Para contribuir:

1. **Fork o projeto**
2. **Crie uma branch para sua feature**
   ```bash
   git checkout -b feature/MinhaNovaFeature
   ```
3. **Commit suas mudanças**
   ```bash
   git commit -m 'Adiciona nova funcionalidade X'
   ```
4. **Push para a branch**
   ```bash
   git push origin feature/MinhaNovaFeature
   ```
5. **Abra um Pull Request**

### Padrões de Código

- Use ESLint e Prettier
- Siga o padrão de commits semânticos
- Escreva testes para novas funcionalidades
- Documente código complexo
- Mantenha o código limpo e legível

---

## 📝 Licença

Este projeto está sob a licença **MIT**. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

## 👥 Autores

- **QuadraCerta Team** - Desenvolvimento e manutenção

---

## 📧 Suporte

Para dúvidas, sugestões ou reportar bugs:

- 📧 Email: suporte@quadracerta.com
- 💬 Issues: [GitHub Issues](https://github.com/seu-usuario/quadracerta/issues)
- 📚 Documentação: [Wiki do Projeto](https://github.com/seu-usuario/quadracerta/wiki)

---

## 🎉 Agradecimentos

- Comunidade React
- Comunidade Node.js
- Prisma Team
- Todos os contribuidores

---

<div align="center">

**Feito com ❤️ para revolucionar a gestão de complexos esportivos**

⭐ Se este projeto foi útil, considere dar uma estrela!

</div>