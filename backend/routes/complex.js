/**
 * Rotas para gerenciamento do Complexo (Venue)
 * Inclui atualização de identidade visual (cores e logo)
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const prisma = require('../lib/prisma');
const { authMiddleware } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');

const router = express.Router();

// Configuração do Multer para upload de arquivos em memória
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido. Use JPEG, PNG, GIF, WebP ou SVG.'), false);
    }
  },
});

// Validadores para cores hex
const colorValidation = (fieldName) =>
  body(fieldName)
    .optional()
    .trim()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage(`${fieldName} deve ser uma cor hexadecimal válida (ex: #10b981)`);

const visualIdentityValidation = [
  colorValidation('primaryColor'),
  colorValidation('accentColor'),
  body('logoUrl')
    .optional()
    .trim()
    .isURL()
    .withMessage('logoUrl deve ser uma URL válida'),
];

/**
 * GET /complex
 * Retorna dados do complexo atual do usuário
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: {
        complex: true,
      },
    });

    if (!user?.complex) {
      return res.status(404).json({ error: 'Complexo não encontrado' });
    }

    res.json(user.complex);
  } catch (error) {
    console.error('Erro ao buscar complexo:', error);
    res.status(500).json({ error: 'Erro ao buscar dados do complexo' });
  }
});

/**
 * PUT /complex/visual-identity
 * Atualiza a identidade visual do complexo (cores e logo URL)
 * Requer permissão de admin
 */
router.put(
  '/visual-identity',
  authMiddleware,
  checkPermission('settings', 'edit'),
  visualIdentityValidation,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: errors.array().map((err) => err.msg),
        });
      }

      const { primaryColor, accentColor, logoUrl } = req.body;

      // Buscar o complexId do usuário
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { complexId: true, role: true },
      });

      if (!user?.complexId) {
        return res.status(404).json({ error: 'Complexo não encontrado' });
      }

      // Apenas ADMIN pode alterar identidade visual
      if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({
          error: 'Apenas administradores podem alterar a identidade visual',
        });
      }

      // Atualizar o complexo
      const updatedComplex = await prisma.complex.update({
        where: { id: user.complexId },
        data: {
          ...(primaryColor !== undefined && { primaryColor }),
          ...(accentColor !== undefined && { accentColor }),
          ...(logoUrl !== undefined && { logoUrl }),
        },
        select: {
          id: true,
          name: true,
          primaryColor: true,
          accentColor: true,
          logoUrl: true,
        },
      });

      res.json(updatedComplex);
    } catch (error) {
      console.error('Erro ao atualizar identidade visual:', error);
      res.status(500).json({ error: 'Erro ao atualizar identidade visual' });
    }
  }
);

/**
 * POST /complex/upload-logo
 * Faz upload de um logo para o Supabase Storage e atualiza a URL no complexo
 * Requer permissão de admin
 */
router.post(
  '/upload-logo',
  authMiddleware,
  checkPermission('settings', 'edit'),
  upload.single('logo'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
      }

      // Buscar o complexId do usuário
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { complexId: true, role: true },
      });

      if (!user?.complexId) {
        return res.status(404).json({ error: 'Complexo não encontrado' });
      }

      // Apenas ADMIN pode fazer upload de logo
      if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({
          error: 'Apenas administradores podem alterar o logo',
        });
      }

      // Verificar se Supabase está configurado
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseKey) {
        // Fallback: salvar em disco local se Supabase não configurado
        return res.status(501).json({
          error: 'Supabase Storage não configurado. Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.',
        });
      }

      // Importar Supabase client dinamicamente
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Gerar nome único para o arquivo
      const fileExt = path.extname(req.file.originalname).toLowerCase();
      const fileName = `${user.complexId}/logo_${Date.now()}${fileExt}`;

      // Fazer upload para Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from('logos')
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: true,
        });

      if (uploadError) {
        console.error('Erro no upload para Supabase:', uploadError);
        return res.status(500).json({
          error: 'Erro ao fazer upload do arquivo',
          details: uploadError.message,
        });
      }

      // Obter URL pública
      const { data: publicUrl } = supabase.storage.from('logos').getPublicUrl(fileName);

      if (!publicUrl?.publicUrl) {
        return res.status(500).json({ error: 'Erro ao obter URL pública do logo' });
      }

      // Atualizar o complexo com a nova URL
      const updatedComplex = await prisma.complex.update({
        where: { id: user.complexId },
        data: { logoUrl: publicUrl.publicUrl },
        select: {
          id: true,
          name: true,
          primaryColor: true,
          accentColor: true,
          logoUrl: true,
        },
      });

      res.json({
        message: 'Logo atualizado com sucesso',
        logoUrl: publicUrl.publicUrl,
        complex: updatedComplex,
      });
    } catch (error) {
      console.error('Erro ao fazer upload do logo:', error);
      res.status(500).json({ error: 'Erro ao processar upload do logo' });
    }
  }
);

/**
 * DELETE /complex/logo
 * Remove o logo do complexo
 */
router.delete(
  '/logo',
  authMiddleware,
  checkPermission('settings', 'delete'),
  async (req, res) => {
    try {
      // Buscar o complexId do usuário
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { complexId: true, role: true },
      });

      if (!user?.complexId) {
        return res.status(404).json({ error: 'Complexo não encontrado' });
      }

      // Apenas ADMIN pode remover logo
      if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({
          error: 'Apenas administradores podem remover o logo',
        });
      }

      // Buscar logo atual para deletar do storage
      const complex = await prisma.complex.findUnique({
        where: { id: user.complexId },
        select: { logoUrl: true },
      });

      // Se houver um logo, tentar deletar do Supabase Storage
      if (complex?.logoUrl) {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (supabaseUrl && supabaseKey) {
          try {
            const { createClient } = require('@supabase/supabase-js');
            const supabase = createClient(supabaseUrl, supabaseKey);

            // Extrair o path do arquivo da URL
            const urlPath = new URL(complex.logoUrl).pathname;
            const filePath = urlPath.split('/logos/')[1];

            if (filePath) {
              await supabase.storage.from('logos').remove([filePath]);
            }
          } catch (deleteError) {
            console.warn('Aviso: Não foi possível deletar arquivo do storage:', deleteError.message);
          }
        }
      }

      // Remover URL do banco
      const updatedComplex = await prisma.complex.update({
        where: { id: user.complexId },
        data: { logoUrl: null },
        select: {
          id: true,
          name: true,
          primaryColor: true,
          accentColor: true,
          logoUrl: true,
        },
      });

      res.json({
        message: 'Logo removido com sucesso',
        complex: updatedComplex,
      });
    } catch (error) {
      console.error('Erro ao remover logo:', error);
      res.status(500).json({ error: 'Erro ao remover logo' });
    }
  }
);

/**
 * PUT /complex
 * Atualiza dados gerais do complexo (nome, etc.)
 */
router.put(
  '/',
  authMiddleware,
  checkPermission('settings', 'edit'),
  [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage('Nome deve ter entre 3 e 100 caracteres'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: errors.array().map((err) => err.msg),
        });
      }

      const { name } = req.body;

      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { complexId: true, role: true },
      });

      if (!user?.complexId) {
        return res.status(404).json({ error: 'Complexo não encontrado' });
      }

      if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({
          error: 'Apenas administradores podem alterar dados do complexo',
        });
      }

      const updatedComplex = await prisma.complex.update({
        where: { id: user.complexId },
        data: {
          ...(name && { name }),
        },
      });

      res.json(updatedComplex);
    } catch (error) {
      console.error('Erro ao atualizar complexo:', error);
      res.status(500).json({ error: 'Erro ao atualizar dados do complexo' });
    }
  }
);

module.exports = router;
