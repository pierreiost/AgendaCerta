const express = require('express');
const { google } = require('googleapis');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');
const { checkIntegrationHealth } = require('../services/googleCalendarService');

const router = express.Router();
const prisma = new PrismaClient();

// Configuração do OAuth 2.0
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Escopos necessários:
// https://www.googleapis.com/auth/calendar.events - para criar, editar e excluir eventos
// https://www.googleapis.com/auth/calendar - acesso total ao calendário (mais simples para o MVP)
const SCOPES = ['https://www.googleapis.com/auth/calendar'];

// 1. Iniciar o fluxo de autenticação
router.get('/auth', authMiddleware, checkPermission('settings', 'edit'), (req, res) => {
  // O complexId é necessário para associar o token ao complexo
  const complexId = req.user.complexId; 
  
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Necessário para obter o refresh token
    scope: SCOPES,
    state: complexId, // Usamos o state para passar o complexId de volta
    prompt: 'consent', // Força a exibição da tela de consentimento para garantir o refresh token
  });

  res.json({ authUrl });
});

// 2. Callback do Google após a autorização
router.get('/oauth2callback', async (req, res) => {
  const { code, state } = req.query;
  const complexId = state;

  if (!code || !complexId) {
    return res.status(400).send('Código de autorização ou ID do complexo ausente.');
  }

  try {
    // Troca o código de autorização por tokens
    const { tokens } = await oauth2Client.getToken(code);
    
    // O refresh token só é fornecido na primeira vez, ou se o usuário revogar o acesso.
    // Ele é essencial para manter o acesso offline.
    if (!tokens.refresh_token) {
        // Se não houver refresh token, tentamos buscar o token existente no banco de dados
        const existingToken = await prisma.googleCalendarToken.findUnique({
            where: { complexId }
        });

        if (existingToken) {
            tokens.refresh_token = existingToken.refreshToken;
        } else {
            // Se ainda assim não tiver, é um erro, pois precisamos do refresh token.
            return res.status(500).send('Erro: Refresh token não recebido. Tente novamente e garanta que a tela de consentimento foi exibida.');
        }
    }

    // Salva ou atualiza os tokens no banco de dados
    await prisma.googleCalendarToken.upsert({
      where: { complexId },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiryDate: new Date(tokens.expiry_date),
        tokenType: tokens.token_type,
        scope: tokens.scope,
      },
      create: {
        complexId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiryDate: new Date(tokens.expiry_date),
        tokenType: tokens.token_type,
        scope: tokens.scope,
      },
    });

    // Redireciona o usuário de volta para o frontend com uma mensagem de sucesso
    // O frontend deve ser configurado para lidar com este redirecionamento
    res.redirect(`${process.env.FRONTEND_URL}/settings?googleAuth=success`);

  } catch (error) {
    console.error('Erro ao obter tokens do Google:', error);
    res.redirect(`${process.env.FRONTEND_URL}/settings?googleAuth=error&message=Erro ao obter tokens do Google`);
  }
});

// 3. Rota para verificar o status da integração
router.get('/status', authMiddleware, checkPermission('settings', 'view'), async (req, res) => {
    try {
        const token = await prisma.googleCalendarToken.findUnique({
            where: { complexId: req.user.complexId }
        });

        if (token) {
            // Verifica se o token expirou
            const isExpired = new Date() > token.expiryDate;
            res.json({ 
                status: 'integrated', 
                isExpired,
                expiryDate: token.expiryDate
            });
        } else {
            res.json({ status: 'not_integrated' });
        }
    } catch (error) {
        console.error('Erro ao verificar status do Google Calendar:', error);
        res.status(500).json({ error: 'Erro ao verificar status' });
    }
});

// 3.5. Rota para verificar a saúde da integração (health check)
router.get('/health', authMiddleware, checkPermission('settings', 'view'), async (req, res) => {
    try {
        const health = await checkIntegrationHealth(req.user.complexId);
        res.json(health);
    } catch (error) {
        console.error('Erro ao verificar saúde da integração:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Erro ao verificar saúde da integração',
            error: error.message 
        });
    }
});

// 4. Rota para receber notificações de alteração do Google Calendar (Webhooks)
router.post('/webhook', async (req, res) => {
  // Validação de segurança: Verificar se a requisição vem do Google
  const channelToken = req.header('X-Goog-Channel-Token');
  const expectedToken = process.env.GOOGLE_WEBHOOK_TOKEN;
  
  if (expectedToken && channelToken !== expectedToken) {
    console.warn('[Webhook] Token inválido. Requisição rejeitada.');
    return res.status(401).send('Unauthorized');
  }
  
  const channelId = req.header('X-Goog-Channel-ID');
  const resourceId = req.header('X-Goog-Resource-ID');
  const resourceState = req.header('X-Goog-Resource-State');
  const messageNumber = req.header('X-Goog-Message-Number');

  // O Google exige que a resposta seja 200 OK imediatamente para confirmar o recebimento
  res.status(200).send('OK');

  // Ignorar a notificação de sincronização inicial
  if (resourceState === 'sync') {
    console.log(`[Webhook] Sincronização inicial recebida para o canal ${channelId}. Ignorando.`);
    return;
  }

  console.log(`[Webhook] Notificação recebida: Channel ID: ${channelId}, Resource State: ${resourceState}, Message Number: ${messageNumber}`);

  try {
    // Encontrar o complexo associado ao canal (usando o resourceId como chave)
    // Para o MVP, vamos assumir que o resourceId é o complexId, mas em produção
    // seria necessário um modelo para mapear channelId/resourceId para complexId.
    const complexId = resourceId; 

    const calendar = await getAuthenticatedCalendarClient(complexId);
    if (!calendar) {
      console.error(`[Webhook] Cliente de calendário não autenticado para o complexo ${complexId}`);
      return;
    }

    // Lógica para buscar as alterações (delta sync)
    // Para o MVP, vamos apenas registrar a notificação. A implementação completa
    // exigiria a busca de eventos alterados usando o pageToken ou syncToken.
    // Isso será implementado em uma fase posterior, se necessário.

    // Para cada evento alterado, chamar a função de sincronização
    // A API de eventos do Google não nos diz qual evento foi alterado, então precisamos
    // listar os eventos recentes e verificar qual mudou. Para o MVP, vamos assumir
    // que a notificação se refere a um único evento e que podemos obter o ID do evento
    // a partir de um campo que não existe na notificação real. Portanto, esta parte
    // é uma simplificação e precisaria ser aprimorada em um ambiente de produção.
    // A abordagem correta seria usar o syncToken para obter apenas as alterações.

    // *** SIMPLIFICAÇÃO PARA O MVP ***
    // Vamos assumir que o webhook nos envia o ID do evento no corpo da requisição (o que não é verdade).
    // Em um cenário real, teríamos que usar o syncToken.
    const { eventId } = req.body; // Esta linha é uma suposição para o MVP
    if (eventId) {
      await syncEventFromGoogle(complexId, eventId);
    }

    console.log(`[Webhook] Processando alteração para o complexo ${complexId}.`);

  } catch (error) {
    console.error('[Webhook] Erro ao processar notificação do Google Calendar:', error);
  }
});

// 5. Rota para iniciar a vigilância (watch) do calendário
router.post('/watch', authMiddleware, checkPermission('settings', 'edit'), async (req, res) => {
  const complexId = req.user.complexId;
  const calendar = await getAuthenticatedCalendarClient(complexId);

  if (!calendar) {
    return res.status(400).json({ error: 'Integração com Google Calendar não configurada.' });
  }

  // URL para onde o Google enviará as notificações (precisa ser acessível publicamente)
  const webhookUrl = `${process.env.BACKEND_URL}/api/google-calendar/webhook`; 

  try {
    const response = await calendar.events.watch({
      calendarId: 'primary',
      resource: {
        id: complexId, // Usando complexId como ID do canal (channelId)
        type: 'web_hook',
        address: webhookUrl,
        // O resourceId é o complexId para este MVP
        // O token é opcional, mas pode ser usado para verificar a integridade
      },
    });

    // Salvar informações do canal para poder parar a vigilância depois
    // Para o MVP, vamos apenas retornar o sucesso. Em produção, seria necessário
    // um modelo para armazenar o channelId e o resourceId.

    res.json({ 
      message: 'Vigilância do Google Calendar iniciada com sucesso.',
      channelId: response.data.id,
      resourceId: response.data.resourceId,
    });

  } catch (error) {
    console.error('Erro ao iniciar vigilância do Google Calendar:', error);
    res.status(500).json({ error: 'Erro ao iniciar vigilância do Google Calendar.' });
  }
});

module.exports = router;
