# Backend do AgendaCerta

Este diretório contém o código do backend do AgendaCerta, construído com Node.js, Express e Prisma (PostgreSQL).

## Configuração do Ambiente

### 1. Variáveis de Ambiente (`.env`)

Crie um arquivo `.env` na raiz deste diretório (`/home/ubuntu/AgendaCerta/backend/.env`) e preencha com as seguintes informações:

\`\`\`dotenv
# Configuração do Banco de Dados
DATABASE_URL="postgresql://user:password@localhost:5432/agenda_certa?schema=public"

# Credenciais do Google Cloud para OAuth 2.0
# Estas credenciais devem ser obtidas no Google Cloud Console (Tipo de Aplicação: Web Application)
GOOGLE_CLIENT_ID="SEU_CLIENT_ID_AQUI"
GOOGLE_CLIENT_SECRET="SEU_CLIENT_SECRET_AQUI"
# A URI de redirecionamento deve ser a rota de callback do seu backend
GOOGLE_REDIRECT_URI="http://localhost:5000/api/google-calendar/oauth2callback"

# URL base do seu backend (necessário para o Webhook do Google Calendar)
BACKEND_URL="http://localhost:5000"

# URL do seu frontend (necessário para o redirecionamento pós-autenticação)
FRONTEND_URL="http://localhost:3000"

# Chave secreta para JWT (Mude para uma string longa e aleatória)
JWT_SECRET="SUA_CHAVE_SECRETA_AQUI"

# Porta do Servidor
PORT=5000
\`\`\`

### 2. Instalação de Dependências

Certifique-se de estar no diretório `backend` e instale as dependências:

\`\`\`bash
npm install
\`\`\`

### 3. Configuração do Banco de Dados

**a) Migrações do Prisma:**

Se você ainda não aplicou as migrações, execute:

\`\`\`bash
npx prisma migrate dev --name init
\`\`\`

**b) Geração do Cliente Prisma:**

Sempre que o `schema.prisma` for alterado, você deve gerar o cliente:

\`\`\`bash
npx prisma generate
\`\`\`

## Execução

Para iniciar o servidor de desenvolvimento:

\`\`\`bash
npm start
# ou
node server.js
\`\`\`

## Teste da Integração com Google Calendar

Para testar a integração bidirecional:

1.  **Inicie o Backend e o Frontend.**
2.  **Autenticação:** No frontend, o usuário deve ser redirecionado para a rota de autenticação (ex: um botão que chama `/api/google-calendar/auth`).
3.  **Vigilância (Webhooks):** Após a autenticação bem-sucedida, o frontend deve chamar a rota `/api/google-calendar/watch` para que o Google comece a enviar notificações de alteração para o seu webhook.

**Observação:** A rota de webhook (`/api/google-calendar/webhook`) precisa ser acessível publicamente para o Google. Se você estiver testando localmente, precisará usar ferramentas como **ngrok** ou **localtunnel** para expor sua porta local (ex: `5000`) à internet.

\`\`\`bash
# Exemplo usando ngrok
ngrok http 5000
\`\`\`

Se você usar uma ferramenta como o `ngrok`, lembre-se de atualizar a variável `BACKEND_URL` no seu `.env` para a URL fornecida pelo `ngrok` (ex: `https://abcdef123456.ngrok.io`).
\`\`\`
