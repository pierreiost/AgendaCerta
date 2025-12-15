# Guia Completo de Deploy em Produção - AgendaCerta

Este guia fornece instruções detalhadas para configurar e fazer o deploy do **AgendaCerta** em ambiente de produção.

---

## 📋 Índice

1. [Pré-requisitos](#-pré-requisitos)
2. [Configuração do Servidor](#-configuração-do-servidor)
3. [Configuração do Banco de Dados](#-configuração-do-banco-de-dados)
4. [Deploy do Backend](#-deploy-do-backend)
5. [Deploy do Frontend](#-deploy-do-frontend)
6. [Configuração do Google Cloud](#-configuração-do-google-cloud)
7. [Variáveis de Ambiente](#-variáveis-de-ambiente)
8. [SSL/HTTPS](#-sslhttps)
9. [Monitoramento e Logs](#-monitoramento-e-logs)
10. [Backup e Recuperação](#-backup-e-recuperação)
11. [Checklist Final](#-checklist-final)

---

## 🎯 Pré-requisitos

### **Infraestrutura**
- ✅ Servidor Linux (Ubuntu 20.04+ ou 22.04 recomendado)
- ✅ Mínimo: 2 CPU, 4GB RAM, 20GB SSD
- ✅ Recomendado: 4 CPU, 8GB RAM, 50GB SSD
- ✅ Domínio próprio (ex: `agendacerta.com.br`)
- ✅ Acesso SSH ao servidor

### **Serviços Externos**
- ✅ Conta no Google Cloud (para Google Calendar API)
- ✅ Banco de dados PostgreSQL (pode ser no mesmo servidor ou serviço gerenciado)
- ✅ Serviço de email (opcional, para notificações)

### **Conhecimentos**
- ✅ Comandos básicos de Linux
- ✅ Git e GitHub
- ✅ Node.js e npm
- ✅ Nginx (servidor web)

---

## 🖥️ Configuração do Servidor

### **Passo 1: Conectar ao Servidor via SSH**

```bash
ssh root@seu-servidor-ip
# ou
ssh ubuntu@seu-servidor-ip
```

### **Passo 2: Atualizar o Sistema**

```bash
sudo apt update && sudo apt upgrade -y
```

### **Passo 3: Instalar Node.js 18.x (LTS)**

```bash
# Adicionar repositório do Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Instalar Node.js e npm
sudo apt install -y nodejs

# Verificar instalação
node -v  # Deve mostrar v18.x.x
npm -v   # Deve mostrar 9.x.x ou superior
```

### **Passo 4: Instalar Git**

```bash
sudo apt install -y git

# Verificar instalação
git --version
```

### **Passo 5: Instalar Nginx**

```bash
sudo apt install -y nginx

# Verificar status
sudo systemctl status nginx

# Habilitar inicialização automática
sudo systemctl enable nginx
```

### **Passo 6: Instalar PM2 (Gerenciador de Processos)**

```bash
sudo npm install -g pm2

# Verificar instalação
pm2 -v
```

### **Passo 7: Configurar Firewall**

```bash
# Permitir SSH, HTTP e HTTPS
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Verificar status
sudo ufw status
```

---

## 🗄️ Configuração do Banco de Dados

### **Opção 1: PostgreSQL no Mesmo Servidor**

#### **Passo 1: Instalar PostgreSQL**

```bash
sudo apt install -y postgresql postgresql-contrib

# Verificar status
sudo systemctl status postgresql
```

#### **Passo 2: Criar Banco de Dados e Usuário**

```bash
# Entrar no PostgreSQL
sudo -u postgres psql

# Dentro do PostgreSQL:
CREATE DATABASE agendacerta;
CREATE USER agendacerta_user WITH ENCRYPTED PASSWORD 'SuaSenhaSegura123!';
GRANT ALL PRIVILEGES ON DATABASE agendacerta TO agendacerta_user;
\q
```

#### **Passo 3: Configurar Acesso Remoto (Opcional)**

Edite o arquivo de configuração:
```bash
sudo nano /etc/postgresql/14/main/postgresql.conf
```

Encontre e altere:
```
listen_addresses = 'localhost'  # Mudar para '*' se quiser acesso remoto
```

Edite o arquivo de autenticação:
```bash
sudo nano /etc/postgresql/14/main/pg_hba.conf
```

Adicione ao final:
```
host    agendacerta    agendacerta_user    127.0.0.1/32    md5
```

Reinicie o PostgreSQL:
```bash
sudo systemctl restart postgresql
```

### **Opção 2: PostgreSQL Gerenciado (Recomendado para Produção)**

**Provedores sugeridos:**
- **AWS RDS** (https://aws.amazon.com/rds/postgresql/)
- **DigitalOcean Managed Databases** (https://www.digitalocean.com/products/managed-databases)
- **Heroku Postgres** (https://www.heroku.com/postgres)
- **Supabase** (https://supabase.com/) - Gratuito até certo ponto

**Vantagens:**
- ✅ Backups automáticos
- ✅ Alta disponibilidade
- ✅ Escalabilidade fácil
- ✅ Monitoramento integrado

---

## 🚀 Deploy do Backend

### **Passo 1: Clonar o Repositório**

```bash
# Criar diretório para a aplicação
sudo mkdir -p /var/www
cd /var/www

# Clonar o repositório
sudo git clone https://github.com/pierreiost/AgendaCerta.git
cd AgendaCerta

# Dar permissões ao usuário atual
sudo chown -R $USER:$USER /var/www/AgendaCerta
```

### **Passo 2: Configurar o Backend**

```bash
cd backend

# Instalar dependências
npm install --production

# Copiar o arquivo de exemplo de variáveis de ambiente
cp .env.example .env

# Editar as variáveis de ambiente (ver seção abaixo)
nano .env
```

### **Passo 3: Executar Migrações do Prisma**

```bash
# Gerar o cliente Prisma
npx prisma generate

# Executar migrações
npx prisma migrate deploy

# (Opcional) Popular o banco com dados iniciais
npm run prisma:seed
```

### **Passo 4: Testar o Backend Localmente**

```bash
# Iniciar o servidor em modo de desenvolvimento
npm run dev

# Em outro terminal, testar
curl http://localhost:5000/api/health
```

Se funcionar, pressione `Ctrl+C` para parar.

### **Passo 5: Configurar PM2 para Rodar o Backend**

```bash
# Iniciar o backend com PM2
pm2 start server.js --name agendacerta-backend

# Salvar a configuração do PM2
pm2 save

# Configurar PM2 para iniciar automaticamente no boot
pm2 startup
# Copie e execute o comando que o PM2 mostrar

# Verificar status
pm2 status
pm2 logs agendacerta-backend
```

### **Passo 6: Configurar Nginx como Proxy Reverso**

Crie o arquivo de configuração:
```bash
sudo nano /etc/nginx/sites-available/agendacerta
```

Cole o seguinte conteúdo:
```nginx
server {
    listen 80;
    server_name api.agendacerta.com.br;  # Substitua pelo seu domínio

    # Logs
    access_log /var/log/nginx/agendacerta-access.log;
    error_log /var/log/nginx/agendacerta-error.log;

    # Proxy para o backend
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Limite de tamanho de upload
    client_max_body_size 10M;
}
```

Ative o site:
```bash
sudo ln -s /etc/nginx/sites-available/agendacerta /etc/nginx/sites-enabled/

# Testar configuração
sudo nginx -t

# Recarregar Nginx
sudo systemctl reload nginx
```

---

## 🎨 Deploy do Frontend

### **Passo 1: Configurar o Frontend**

```bash
cd /var/www/AgendaCerta/frontend

# Instalar dependências
npm install

# Copiar o arquivo de exemplo de variáveis de ambiente
cp .env.example .env

# Editar as variáveis de ambiente
nano .env
```

Adicione:
```env
REACT_APP_API_URL=https://api.agendacerta.com.br
```

### **Passo 2: Build do Frontend**

```bash
# Criar build de produção
npm run build

# O build será criado na pasta 'build/'
```

### **Passo 3: Configurar Nginx para Servir o Frontend**

Crie o arquivo de configuração:
```bash
sudo nano /etc/nginx/sites-available/agendacerta-frontend
```

Cole o seguinte conteúdo:
```nginx
server {
    listen 80;
    server_name agendacerta.com.br www.agendacerta.com.br;  # Substitua pelo seu domínio

    root /var/www/AgendaCerta/frontend/build;
    index index.html;

    # Logs
    access_log /var/log/nginx/agendacerta-frontend-access.log;
    error_log /var/log/nginx/agendacerta-frontend-error.log;

    # Servir arquivos estáticos
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache para assets estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Desabilitar cache para index.html
    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # Limite de tamanho de upload
    client_max_body_size 10M;
}
```

Ative o site:
```bash
sudo ln -s /etc/nginx/sites-available/agendacerta-frontend /etc/nginx/sites-enabled/

# Testar configuração
sudo nginx -t

# Recarregar Nginx
sudo systemctl reload nginx
```

---

## ☁️ Configuração do Google Cloud

### **Passo 1: Criar Projeto no Google Cloud**

1. Acesse https://console.cloud.google.com/
2. Crie um novo projeto chamado "AgendaCerta Produção"
3. Anote o **Project ID**

### **Passo 2: Ativar APIs Necessárias**

1. Vá em **APIs e Serviços** > **Biblioteca**
2. Ative as seguintes APIs:
   - **Google Calendar API**
   - **Google+ API** (para autenticação)

### **Passo 3: Configurar Tela de Consentimento OAuth**

1. Vá em **APIs e Serviços** > **Tela de consentimento OAuth**
2. Selecione **"Externo"**
3. Preencha:
   - **Nome do app:** AgendaCerta
   - **E-mail de suporte:** seu-email@dominio.com
   - **Domínio do app:** agendacerta.com.br
   - **E-mail do desenvolvedor:** seu-email@dominio.com
4. **Escopos:** Adicione:
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/calendar.events`
5. **Publicar o app** (sair do modo "Teste")

### **Passo 4: Criar Credenciais OAuth 2.0**

1. Vá em **APIs e Serviços** > **Credenciais**
2. Clique em **Criar credenciais** > **ID do cliente OAuth**
3. Tipo: **Aplicativo da Web**
4. Nome: **AgendaCerta Backend Produção**
5. **URIs de redirecionamento autorizados:**
   - `https://api.agendacerta.com.br/api/google-calendar/oauth2callback`
6. Clique em **Criar**
7. **Copie e guarde:**
   - **ID do cliente** (GOOGLE_CLIENT_ID)
   - **Chave secreta do cliente** (GOOGLE_CLIENT_SECRET)

---

## 🔐 Variáveis de Ambiente

### **Backend (.env)**

Crie o arquivo `/var/www/AgendaCerta/backend/.env`:

```env
# Ambiente
NODE_ENV=production

# Porta do servidor
PORT=5000

# URLs
BACKEND_URL=https://api.agendacerta.com.br
FRONTEND_URL=https://agendacerta.com.br

# Banco de Dados PostgreSQL
DATABASE_URL="postgresql://agendacerta_user:SuaSenhaSegura123!@localhost:5432/agendacerta"

# JWT
JWT_SECRET=sua-chave-secreta-muito-longa-e-aleatoria-aqui-min-32-chars
JWT_EXPIRES_IN=7d

# Google Calendar Integration
GOOGLE_CLIENT_ID=123456789-abc123def456.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123def456
GOOGLE_REDIRECT_URI=https://api.agendacerta.com.br/api/google-calendar/oauth2callback
GOOGLE_WEBHOOK_TOKEN=seu-token-webhook-secreto-aleatorio

# Email (Opcional - para notificações futuras)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-de-app

# Sentry (Opcional - para monitoramento de erros)
SENTRY_DSN=https://seu-sentry-dsn-aqui
```

### **Frontend (.env)**

Crie o arquivo `/var/www/AgendaCerta/frontend/.env`:

```env
REACT_APP_API_URL=https://api.agendacerta.com.br
```

### **Segurança das Variáveis de Ambiente**

```bash
# Definir permissões corretas
chmod 600 /var/www/AgendaCerta/backend/.env
chmod 600 /var/www/AgendaCerta/frontend/.env

# Garantir que o .env não está no Git
echo ".env" >> /var/www/AgendaCerta/backend/.gitignore
echo ".env" >> /var/www/AgendaCerta/frontend/.gitignore
```

---

## 🔒 SSL/HTTPS

### **Passo 1: Instalar Certbot**

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### **Passo 2: Obter Certificados SSL**

```bash
# Para o backend
sudo certbot --nginx -d api.agendacerta.com.br

# Para o frontend
sudo certbot --nginx -d agendacerta.com.br -d www.agendacerta.com.br
```

### **Passo 3: Renovação Automática**

```bash
# Testar renovação
sudo certbot renew --dry-run

# Configurar renovação automática (já vem configurado por padrão)
sudo systemctl status certbot.timer
```

### **Passo 4: Verificar Configuração HTTPS**

Acesse:
- https://agendacerta.com.br
- https://api.agendacerta.com.br/api/health

---

## 📊 Monitoramento e Logs

### **Logs do Backend (PM2)**

```bash
# Ver logs em tempo real
pm2 logs agendacerta-backend

# Ver logs salvos
pm2 logs agendacerta-backend --lines 100

# Limpar logs
pm2 flush
```

### **Logs do Nginx**

```bash
# Logs de acesso
sudo tail -f /var/log/nginx/agendacerta-access.log

# Logs de erro
sudo tail -f /var/log/nginx/agendacerta-error.log
```

### **Monitoramento do PM2**

```bash
# Status dos processos
pm2 status

# Monitoramento em tempo real
pm2 monit

# Informações detalhadas
pm2 info agendacerta-backend
```

### **Monitoramento do Sistema**

```bash
# Uso de CPU e memória
htop

# Espaço em disco
df -h

# Processos
ps aux | grep node
```

---

## 💾 Backup e Recuperação

### **Backup do Banco de Dados**

#### **Script de Backup Automático**

Crie o arquivo `/var/www/scripts/backup-db.sh`:

```bash
#!/bin/bash

# Configurações
DB_NAME="agendacerta"
DB_USER="agendacerta_user"
BACKUP_DIR="/var/backups/agendacerta"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/agendacerta_$DATE.sql.gz"

# Criar diretório de backup se não existir
mkdir -p $BACKUP_DIR

# Fazer backup
PGPASSWORD="SuaSenhaSegura123!" pg_dump -U $DB_USER -h localhost $DB_NAME | gzip > $BACKUP_FILE

# Remover backups com mais de 7 dias
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "Backup concluído: $BACKUP_FILE"
```

Dar permissão de execução:
```bash
chmod +x /var/www/scripts/backup-db.sh
```

#### **Agendar Backup Diário (Cron)**

```bash
# Editar crontab
crontab -e

# Adicionar linha para backup diário às 2h da manhã
0 2 * * * /var/www/scripts/backup-db.sh >> /var/log/backup-agendacerta.log 2>&1
```

### **Restaurar Backup**

```bash
# Descompactar e restaurar
gunzip < /var/backups/agendacerta/agendacerta_YYYYMMDD_HHMMSS.sql.gz | \
  PGPASSWORD="SuaSenhaSegura123!" psql -U agendacerta_user -h localhost agendacerta
```

---

## ✅ Checklist Final

### **Antes do Deploy**
- [ ] Servidor configurado e atualizado
- [ ] Node.js 18.x instalado
- [ ] PostgreSQL instalado e configurado
- [ ] Nginx instalado e configurado
- [ ] PM2 instalado
- [ ] Firewall configurado
- [ ] Domínio apontando para o servidor

### **Deploy do Backend**
- [ ] Repositório clonado
- [ ] Dependências instaladas
- [ ] Variáveis de ambiente configuradas
- [ ] Migrações do Prisma executadas
- [ ] Backend rodando com PM2
- [ ] Nginx configurado como proxy reverso
- [ ] SSL/HTTPS configurado

### **Deploy do Frontend**
- [ ] Build de produção criado
- [ ] Nginx configurado para servir o frontend
- [ ] SSL/HTTPS configurado
- [ ] Cache configurado

### **Google Cloud**
- [ ] Projeto criado
- [ ] APIs ativadas
- [ ] Tela de consentimento configurada
- [ ] Credenciais OAuth criadas
- [ ] URIs de redirecionamento corretos

### **Segurança**
- [ ] Variáveis de ambiente protegidas (chmod 600)
- [ ] JWT_SECRET gerado aleatoriamente
- [ ] GOOGLE_WEBHOOK_TOKEN configurado
- [ ] Firewall ativo
- [ ] SSL/HTTPS funcionando

### **Monitoramento**
- [ ] PM2 salvando logs
- [ ] Nginx salvando logs
- [ ] Backup automático configurado
- [ ] Renovação automática de SSL configurada

### **Testes**
- [ ] Frontend acessível via HTTPS
- [ ] Backend acessível via HTTPS
- [ ] Login funcionando
- [ ] Criação de agendamento funcionando
- [ ] Integração com Google Calendar funcionando
- [ ] Webhooks funcionando

---

## 🆘 Solução de Problemas

### **Backend não inicia**
```bash
# Ver logs do PM2
pm2 logs agendacerta-backend

# Verificar variáveis de ambiente
cat /var/www/AgendaCerta/backend/.env

# Testar conexão com banco de dados
psql -U agendacerta_user -h localhost -d agendacerta
```

### **Erro 502 Bad Gateway**
```bash
# Verificar se o backend está rodando
pm2 status

# Verificar logs do Nginx
sudo tail -f /var/log/nginx/agendacerta-error.log

# Reiniciar Nginx
sudo systemctl restart nginx
```

### **SSL não funciona**
```bash
# Verificar certificados
sudo certbot certificates

# Renovar certificados
sudo certbot renew

# Verificar configuração do Nginx
sudo nginx -t
```

---

## 📞 Suporte

- **Email:** agendacerta@gmail.com
- **WhatsApp:** (53) 98125-9200
- **Documentação:** https://github.com/pierreiost/AgendaCerta

---

**Última atualização:** Dezembro de 2024
