# Configuração da Integração com Google Calendar

Este guia fornece instruções passo a passo para configurar a integração bidirecional do **AgendaCerta** com o **Google Calendar**.

---

## 📋 Pré-requisitos

- Conta do Google (Gmail)
- Acesso ao [Google Cloud Console](https://console.cloud.google.com/)
- Backend do AgendaCerta rodando localmente ou em produção
- Acesso de administrador no AgendaCerta

---

## 🔧 Passo 1: Criar um Projeto no Google Cloud

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/)
2. Clique em **"Selecionar um projeto"** no topo da página
3. Clique em **"Novo Projeto"**
4. Preencha:
   - **Nome do projeto:** `AgendaCerta` (ou o nome que preferir)
   - **Organização:** Deixe em branco (ou selecione se tiver)
5. Clique em **"Criar"**
6. Aguarde a criação do projeto e selecione-o

---

## 🔑 Passo 2: Ativar a API do Google Calendar

1. No menu lateral, vá em **"APIs e Serviços"** > **"Biblioteca"**
2. Pesquise por **"Google Calendar API"**
3. Clique no resultado **"Google Calendar API"**
4. Clique em **"Ativar"**
5. Aguarde a ativação (pode levar alguns segundos)

---

## 🛡️ Passo 3: Configurar a Tela de Consentimento OAuth

1. No menu lateral, vá em **"APIs e Serviços"** > **"Tela de consentimento OAuth"**
2. Selecione **"Externo"** (para permitir que qualquer usuário com conta Google use)
3. Clique em **"Criar"**
4. Preencha as informações obrigatórias:
   - **Nome do app:** `AgendaCerta`
   - **E-mail de suporte do usuário:** Seu email
   - **Logotipo do app:** (Opcional) Faça upload do logo do AgendaCerta
   - **Domínio do app:** (Opcional) Seu domínio (ex: `agendacerta.com.br`)
   - **E-mail do desenvolvedor:** Seu email
5. Clique em **"Salvar e continuar"**
6. **Escopos:** Clique em **"Adicionar ou remover escopos"**
   - Pesquise e adicione: `https://www.googleapis.com/auth/calendar`
   - Pesquise e adicione: `https://www.googleapis.com/auth/calendar.events`
7. Clique em **"Atualizar"** e depois **"Salvar e continuar"**
8. **Usuários de teste:** (Apenas se o app estiver em modo "Teste")
   - Adicione os emails dos usuários que poderão testar a integração
9. Clique em **"Salvar e continuar"**
10. Revise as informações e clique em **"Voltar ao painel"**

---

## 🔐 Passo 4: Criar Credenciais OAuth 2.0

1. No menu lateral, vá em **"APIs e Serviços"** > **"Credenciais"**
2. Clique em **"Criar credenciais"** > **"ID do cliente OAuth"**
3. Selecione **"Aplicativo da Web"**
4. Preencha:
   - **Nome:** `AgendaCerta Backend`
   - **URIs de redirecionamento autorizados:** Adicione:
     - **Desenvolvimento:** `http://localhost:5000/api/google-calendar/oauth2callback`
     - **Produção:** `https://seu-dominio.com/api/google-calendar/oauth2callback`
5. Clique em **"Criar"**
6. **Copie as credenciais:**
   - **ID do cliente:** `GOOGLE_CLIENT_ID`
   - **Chave secreta do cliente:** `GOOGLE_CLIENT_SECRET`
7. Clique em **"OK"**

---

## ⚙️ Passo 5: Configurar as Variáveis de Ambiente no Backend

1. Abra o arquivo `.env` no diretório `backend/`
2. Adicione as seguintes variáveis:

```env
# Google Calendar Integration
GOOGLE_CLIENT_ID=seu-client-id-aqui
GOOGLE_CLIENT_SECRET=sua-client-secret-aqui
GOOGLE_REDIRECT_URI=http://localhost:5000/api/google-calendar/oauth2callback

# Backend URL (para webhooks)
BACKEND_URL=http://localhost:5000
```

3. **Para produção**, altere:
   - `GOOGLE_REDIRECT_URI=https://seu-dominio.com/api/google-calendar/oauth2callback`
   - `BACKEND_URL=https://seu-dominio.com`

4. Salve o arquivo `.env`

---

## 🚀 Passo 6: Iniciar o Backend

1. Certifique-se de que todas as dependências estão instaladas:
```bash
cd backend
npm install
```

2. Execute as migrações do Prisma (se ainda não executou):
```bash
npx prisma migrate dev
```

3. Inicie o servidor:
```bash
npm run dev
```

4. Verifique se o backend está rodando em `http://localhost:5000`

---

## 🔗 Passo 7: Autenticar o Google Calendar no AgendaCerta

1. Acesse o **AgendaCerta** no navegador
2. Faça login como **ADMIN** ou **SUPER_ADMIN**
3. Vá em **Perfil** ou **Configurações**
4. Procure a seção **"Integração com Google Calendar"**
5. Clique em **"Conectar Google Calendar"**
6. Você será redirecionado para a página de login do Google
7. Faça login com sua conta Google
8. **Conceda as permissões** solicitadas (acesso ao Google Calendar)
9. Você será redirecionado de volta para o AgendaCerta
10. Se tudo estiver correto, você verá a mensagem **"Integração conectada com sucesso!"**

---

## 🔄 Passo 8: Ativar a Sincronização Bidirecional (Webhooks)

Para que o AgendaCerta receba notificações quando eventos forem alterados no Google Calendar, você precisa configurar webhooks.

### **8.1. Expor o Backend Publicamente (Desenvolvimento)**

Se você estiver testando localmente, use o **ngrok** para expor o backend:

1. Instale o ngrok: https://ngrok.com/download
2. Execute o ngrok:
```bash
ngrok http 5000
```
3. Copie a URL pública gerada (ex: `https://abc123.ngrok.io`)
4. Atualize a variável `BACKEND_URL` no `.env`:
```env
BACKEND_URL=https://abc123.ngrok.io
```
5. Reinicie o backend

### **8.2. Iniciar a Vigilância (Watch)**

1. No AgendaCerta, vá em **Perfil** ou **Configurações**
2. Na seção **"Integração com Google Calendar"**, clique em **"Iniciar Sincronização Bidirecional"**
3. O sistema criará um "watch" no Google Calendar
4. A partir de agora, qualquer alteração no Google Calendar será sincronizada automaticamente para o AgendaCerta

**Nota:** O "watch" expira após 7 dias. Você precisará renovar clicando novamente no botão.

---

## ✅ Passo 9: Testar a Integração

### **Teste 1: Criar Agendamento no AgendaCerta**
1. Crie um novo agendamento no AgendaCerta
2. Abra o Google Calendar (https://calendar.google.com)
3. Verifique se o evento foi criado automaticamente

### **Teste 2: Atualizar Agendamento no AgendaCerta**
1. Edite um agendamento existente no AgendaCerta (mude a hora)
2. Abra o Google Calendar
3. Verifique se o evento foi atualizado

### **Teste 3: Cancelar Agendamento no AgendaCerta**
1. Cancele um agendamento no AgendaCerta
2. Abra o Google Calendar
3. Verifique se o evento foi removido

### **Teste 4: Alterar Evento no Google Calendar**
1. Abra o Google Calendar
2. Edite um evento criado pelo AgendaCerta (mude a hora)
3. Aguarde alguns segundos
4. Verifique no AgendaCerta se o agendamento foi atualizado

### **Teste 5: Excluir Evento no Google Calendar**
1. Abra o Google Calendar
2. Exclua um evento criado pelo AgendaCerta
3. Aguarde alguns segundos
4. Verifique no AgendaCerta se o agendamento foi cancelado

---

## 🐛 Solução de Problemas

### **Erro: "Cliente Google Calendar não autenticado"**
- **Causa:** O token de acesso expirou ou foi revogado
- **Solução:** Refaça a autenticação no AgendaCerta (Passo 7)

### **Erro: "invalid_grant"**
- **Causa:** O refresh token foi revogado ou expirou
- **Solução:** Revogue o acesso no Google e refaça a autenticação

### **Webhooks não estão funcionando**
- **Causa:** O backend não está acessível publicamente
- **Solução:** Verifique se o `BACKEND_URL` está correto e se o ngrok está rodando (desenvolvimento) ou se o domínio está configurado corretamente (produção)

### **Erro: "Rate limit exceeded"**
- **Causa:** Muitas requisições à API do Google Calendar em pouco tempo
- **Solução:** Aguarde alguns minutos. O sistema tem retry automático.

### **Eventos duplicados no Google Calendar**
- **Causa:** Múltiplas autenticações ou bugs na sincronização
- **Solução:** Revogue o acesso e refaça a autenticação. Se persistir, entre em contato com o suporte.

---

## 📚 Recursos Adicionais

- [Documentação oficial do Google Calendar API](https://developers.google.com/calendar/api/guides/overview)
- [OAuth 2.0 para aplicações web](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Push Notifications (Webhooks)](https://developers.google.com/calendar/api/guides/push)

---

## 🔒 Segurança

- **Nunca compartilhe** suas credenciais (`GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`)
- **Não commite** o arquivo `.env` no Git
- **Use HTTPS** em produção
- **Revogue o acesso** se suspeitar de comprometimento

---

## 📧 Suporte

Se você encontrar problemas ou tiver dúvidas, entre em contato:
- **Email:** agendacerta@gmail.com
- **WhatsApp:** (53) 98125-9200

---

**Última atualização:** Dezembro de 2024
