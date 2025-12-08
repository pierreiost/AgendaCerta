const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createSuperAdmin() {
  try {
    console.log('🔧 Criando Super Admin...');

    const email = 'quadracerta@gmail.com';
    const password = 'Pelotas200@';

    // Verificar se já existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      console.log('⚠️  Usuário já existe!');
      console.log('📧 Email:', existingUser.email);
      console.log('👤 Role:', existingUser.role);
      
      if (existingUser.role !== 'SUPER_ADMIN') {
        // Atualizar para SUPER_ADMIN
        await prisma.user.update({
          where: { email },
          data: {
            role: 'SUPER_ADMIN',
            status: 'ACTIVE',
            complexId: null
          }
        });
        console.log('✅ Usuário atualizado para SUPER_ADMIN!');
      } else {
        console.log('✅ Usuário já é SUPER_ADMIN!');
      }
      return;
    }

    // Criar hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Criar Super Admin
    const superAdmin = await prisma.user.create({
      data: {
        firstName: 'Super',
        lastName: 'Admin',
        email: email,
        password: hashedPassword,
        phone: '(53) 99999-9999',
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        complexId: null,
        cpf: null,
        cnpj: null
      }
    });

    console.log('✅ Super Admin criado com sucesso!');
    console.log('📧 Email:', superAdmin.email);
    console.log('🔑 Senha: Pelotas200@');
    console.log('👤 Role:', superAdmin.role);
    console.log('');
    console.log('🎉 Agora você pode fazer login!');

  } catch (error) {
    console.error('❌ Erro ao criar Super Admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createSuperAdmin();
