/**
 * Script para inicializar o bucket 'logos' no Supabase Storage
 *
 * Este script deve ser executado uma vez durante o deploy inicial
 * ou pode ser chamado na inicialização do servidor para garantir
 * que o bucket exista.
 *
 * Uso:
 *   node scripts/initSupabaseStorage.js
 *
 * Variáveis de ambiente necessárias:
 *   - SUPABASE_URL: URL do projeto Supabase
 *   - SUPABASE_SERVICE_ROLE_KEY: Chave de serviço (não a chave anon)
 */

const { createClient } = require('@supabase/supabase-js');

const BUCKET_NAME = 'logos';
const BUCKET_CONFIG = {
  public: true,
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  fileSizeLimit: 2 * 1024 * 1024, // 2MB max
};

/**
 * Inicializa o Supabase Storage e cria o bucket de logos se não existir
 */
async function initializeStorage() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias');
    console.error('   Configure estas variáveis no arquivo .env');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log('🚀 Inicializando Supabase Storage...');

  try {
    // Verificar se o bucket já existe
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      throw new Error(`Erro ao listar buckets: ${listError.message}`);
    }

    const bucketExists = buckets?.some((bucket) => bucket.name === BUCKET_NAME);

    if (bucketExists) {
      console.log(`✅ Bucket '${BUCKET_NAME}' já existe`);

      // Atualizar configurações do bucket (se necessário)
      const { error: updateError } = await supabase.storage.updateBucket(BUCKET_NAME, {
        public: BUCKET_CONFIG.public,
        allowedMimeTypes: BUCKET_CONFIG.allowedMimeTypes,
        fileSizeLimit: BUCKET_CONFIG.fileSizeLimit,
      });

      if (updateError) {
        console.warn(`⚠️  Não foi possível atualizar configurações: ${updateError.message}`);
      } else {
        console.log(`✅ Configurações do bucket atualizadas`);
      }
    } else {
      // Criar o bucket
      const { data, error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: BUCKET_CONFIG.public,
        allowedMimeTypes: BUCKET_CONFIG.allowedMimeTypes,
        fileSizeLimit: BUCKET_CONFIG.fileSizeLimit,
      });

      if (createError) {
        throw new Error(`Erro ao criar bucket: ${createError.message}`);
      }

      console.log(`✅ Bucket '${BUCKET_NAME}' criado com sucesso`);
    }

    // Configurar políticas de acesso (RLS)
    console.log('📋 Configurando políticas de acesso...');

    // As políticas de RLS devem ser configuradas via SQL no Supabase Dashboard
    // ou através de uma migração. Aqui apenas documentamos as políticas necessárias.
    console.log(`
📝 Políticas de RLS recomendadas para o bucket '${BUCKET_NAME}':

-- Permitir leitura pública (bucket público)
CREATE POLICY "Logos são públicos" ON storage.objects
FOR SELECT USING (bucket_id = '${BUCKET_NAME}');

-- Permitir upload apenas para usuários autenticados do mesmo complexo
CREATE POLICY "Usuários autenticados podem fazer upload" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = '${BUCKET_NAME}'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = (
    SELECT complex_id::text FROM users WHERE id = auth.uid()
  )
);

-- Permitir delete apenas para admins do mesmo complexo
CREATE POLICY "Admins podem deletar logos do próprio complexo" ON storage.objects
FOR DELETE USING (
  bucket_id = '${BUCKET_NAME}'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = (
    SELECT complex_id::text FROM users WHERE id = auth.uid()
  )
  AND (
    SELECT role FROM users WHERE id = auth.uid()
  ) = 'ADMIN'
);
`);

    console.log('✅ Inicialização do Storage concluída!');
    return true;
  } catch (error) {
    console.error('❌ Erro na inicialização:', error.message);
    return false;
  }
}

/**
 * Função para ser usada em outros módulos (inicialização do servidor)
 */
async function ensureStorageBucket() {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('⚠️  Supabase Storage não configurado (variáveis de ambiente ausentes)');
      return false;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: buckets } = await supabase.storage.listBuckets();

    if (!buckets?.some((b) => b.name === BUCKET_NAME)) {
      await supabase.storage.createBucket(BUCKET_NAME, BUCKET_CONFIG);
      console.log(`✅ Bucket '${BUCKET_NAME}' criado automaticamente`);
    }

    return true;
  } catch (error) {
    console.warn(`⚠️  Não foi possível verificar/criar bucket: ${error.message}`);
    return false;
  }
}

// Exportar para uso em outros módulos
module.exports = {
  initializeStorage,
  ensureStorageBucket,
  BUCKET_NAME,
  BUCKET_CONFIG,
};

// Executar se chamado diretamente
if (require.main === module) {
  require('dotenv').config();
  initializeStorage();
}
